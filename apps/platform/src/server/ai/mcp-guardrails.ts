import 'server-only';
import crypto from 'node:crypto';

export interface InjectionScanResult {
  blocked: boolean;
  matches: string[];
}

export interface RedactionResult<T = unknown> {
  value: T;
  redactionsApplied: number;
  secretsFiltered: number;
}

const INJECTION_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: 'instruction_override', pattern: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|rules)\b/i },
  { id: 'policy_bypass', pattern: /\b(bypass|disable|skip|override)\s+(guardrail|approval|mfa|step[\s-]?up|rls|auth)\b/i },
  { id: 'prompt_delimiter', pattern: /(<\|im_start\|>|<\|system\|>|\[INST\]|<<SYS>>)/i },
  { id: 'sql_smuggling', pattern: /;\s*(drop|truncate|delete\s+from|alter|grant|revoke)\b|\bunion\s+all?\s+select\b/i },
  { id: 'shell_escape', pattern: /\$\([^)]+\)|`\s*(rm|curl|wget|bash|sh)\b/i },
];

const SENSITIVE_KEY_PATTERN = /(password|passcode|secret|private[_-]?key|api[_-]?key|token|csrf|mfa.*sealed|signature.*key)/i;
const EMAIL_KEY_PATTERN = /(email|contactEmail|billingEmail)/i;
const PHONE_KEY_PATTERN = /(phone|mobile)/i;

const PEM_BLOCK_RE = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;
const SECRET_TOKEN_RE = /\b(Bearer\s+[A-Za-z0-9._\-]{12,}|(?:ox_live|ox_test|sk_live|sk_test|rzp_live|rzp_test|whsec)_[A-Za-z0-9_\-]{8,})\b/gi;
const EMAIL_VALUE_RE = /\b([A-Za-z0-9._%+\-]{1,64})@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/g;
const PHONE_VALUE_RE = /(?:^|\s)(\+?[1-9]\d{9,14})(?=\s|$)/g;
const CARD_VALUE_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function isLuhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

/**
 * Scans untrusted MCP inputs or prompt strings for prompt-injection / policy-escape markers.
 */
export function scanPromptInjection(input: unknown, depth = 0): InjectionScanResult {
  if (depth > 12 || input === null || input === undefined) {
    return { blocked: false, matches: [] };
  }

  const matches = new Set<string>();

  if (typeof input === 'string') {
    for (const rule of INJECTION_RULES) {
      if (rule.pattern.test(input)) {
        matches.add(rule.id);
      }
    }
    return { blocked: matches.size > 0, matches: Array.from(matches) };
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const sub = scanPromptInjection(item, depth + 1);
      for (const m of sub.matches) matches.add(m);
    }
    return { blocked: matches.size > 0, matches: Array.from(matches) };
  }

  if (typeof input === 'object') {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const kRes = scanPromptInjection(k, depth + 1);
      const vRes = scanPromptInjection(v, depth + 1);
      for (const m of kRes.matches) matches.add(m);
      for (const m of vRes.matches) matches.add(m);
    }
  }

  return { blocked: matches.size > 0, matches: Array.from(matches) };
}

function maskEmail(local: string, domain: string): string {
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

/**
 * Redacts PII and cryptographic/auth secrets recursively and returns exact counts.
 */
export function redactSensitiveData<T>(input: T, options: { maskEmails?: boolean } = {}): RedactionResult<T> {
  const maskEmails = options.maskEmails ?? true;
  let redactionsApplied = 0;
  let secretsFiltered = 0;

  function redactString(raw: string, keyName?: string): string {
    let out = raw;

    out = out.replace(PEM_BLOCK_RE, () => {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_PRIVATE_KEY]';
    });

    out = out.replace(SECRET_TOKEN_RE, () => {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_SECRET]';
    });

    out = out.replace(CARD_VALUE_RE, (candidate) => {
      const digits = candidate.replace(/[\s-]/g, '');
      if (isLuhnValid(digits)) {
        redactionsApplied += 1;
        return `[REDACTED_CARD_LAST4:${digits.slice(-4)}]`;
      }
      return candidate;
    });

    if (maskEmails) {
      out = out.replace(EMAIL_VALUE_RE, (_full, local: string, domain: string) => {
        redactionsApplied += 1;
        return maskEmail(local, domain);
      });
    } else if (keyName && EMAIL_KEY_PATTERN.test(keyName)) {
      out = out.replace(EMAIL_VALUE_RE, (_full, local: string, domain: string) => {
        redactionsApplied += 1;
        return maskEmail(local, domain);
      });
    }

    if (keyName && PHONE_KEY_PATTERN.test(keyName)) {
      if (out.trim().length > 0 && out !== '[REDACTED_PHONE]') {
        redactionsApplied += 1;
        return '[REDACTED_PHONE]';
      }
    } else {
      out = out.replace(PHONE_VALUE_RE, (full) => {
        redactionsApplied += 1;
        const leadingSpace = full.startsWith(' ') ? ' ' : '';
        return `${leadingSpace}[REDACTED_PHONE]`;
      });
    }

    return out;
  }

  function visit(value: unknown, depth: number, keyName?: string): unknown {
    if (depth > 12 || value === null || value === undefined) return value;

    if (keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_SECRET]';
    }

    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return redactString(value, keyName);
    if (typeof value === 'number' || typeof value === 'boolean') return value;

    if (Array.isArray(value)) {
      return value.map((item) => visit(item, depth + 1, keyName));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        result[k] = visit(v, depth + 1, k);
      }
      return result;
    }

    return String(value);
  }

  return {
    value: visit(input, 0) as T,
    redactionsApplied,
    secretsFiltered,
  };
}

/**
 * Computes a deterministic SHA-256 hash over canonical JSON so approvals cannot suffer parameter tampering.
 */
export function canonicalJsonHash(value: unknown): string {
  function sortKeys(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = sortKeys((v as Record<string, unknown>)[k]);
      }
      return sorted;
    }
    return v;
  }
  return crypto.createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');
}
