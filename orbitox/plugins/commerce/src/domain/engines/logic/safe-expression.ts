/**
 * 🪐 Safe Expression Evaluator
 * Replaces new Function / eval with an AST parser & tree-walk evaluator.
 *
 * Security guarantees:
 * - Strict token whitelisting (arithmetic, comparison, logic, member access).
 * - Explicit blocklist for dangerous symbols (process, require, eval, constructor, __proto__, etc.).
 * - Safe whitelist of allowed built-in objects & methods (Math, Number, String, Array/String utils).
 * - Step count limit & recursion depth limit to prevent ReDoS / CPU-hang attacks.
 * - Throws errors explicitly on invalid/malicious expressions.
 */

export interface EvaluationOptions {
  maxSteps?: number;
  maxDepth?: number;
}

const DEFAULT_MAX_STEPS = 1000;
const DEFAULT_MAX_DEPTH = 30;

const FORBIDDEN_IDENTIFIERS = new Set([
  'process',
  'require',
  'global',
  'globalThis',
  'window',
  'document',
  'eval',
  'Function',
  'AsyncFunction',
  'GeneratorFunction',
  'constructor',
  '__proto__',
  'prototype',
  'import',
  'module',
  'exports',
  'Proxy',
  'Reflect',
  'Symbol',
]);

const FORBIDDEN_PROPERTIES = new Set([
  'constructor',
  '__proto__',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

const ALLOWED_STRING_METHODS = new Set([
  'toLowerCase',
  'toUpperCase',
  'trim',
  'trimStart',
  'trimEnd',
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'slice',
  'substring',
  'charAt',
  'charCodeAt',
  'split',
  'replace',
  'replaceAll',
  'concat',
]);

const ALLOWED_ARRAY_METHODS = new Set([
  'includes',
  'indexOf',
  'lastIndexOf',
  'slice',
  'concat',
  'join',
  'at',
]);

const ALLOWED_MATH_METHODS = new Set([
  'min',
  'max',
  'round',
  'floor',
  'ceil',
  'abs',
  'pow',
  'sqrt',
  'trunc',
  'sign',
]);

const ALLOWED_DATE_METHODS = new Set([
  'getTime',
  'getFullYear',
  'getMonth',
  'getDate',
  'getDay',
  'getHours',
  'getMinutes',
  'getSeconds',
  'toISOString',
]);

// AST Node Types
export type ASTNode =
  | { type: 'Literal'; value: any }
  | { type: 'Identifier'; name: string }
  | { type: 'Array'; elements: ASTNode[] }
  | { type: 'Unary'; operator: string; argument: ASTNode }
  | { type: 'Binary'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'Logical'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'Conditional'; test: ASTNode; consequent: ASTNode; alternate: ASTNode }
  | { type: 'Member'; object: ASTNode; property: ASTNode; computed: boolean }
  | { type: 'Call'; callee: ASTNode; args: ASTNode[] };

// Tokenizer
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  | 'OPERATOR'
  | 'PUNCT'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class ExpressionParser {
  private pos = 0;
  private src = '';

  constructor(expression: string) {
    this.src = expression.trim();
  }

  public parse(): ASTNode {
    if (!this.src) {
      return { type: 'Literal', value: true };
    }
    this.pos = 0;
    const node = this.parseExpression();
    this.skipWhitespace();
    if (this.pos < this.src.length) {
      throw new Error(`Unexpected token at position ${this.pos}: "${this.src.slice(this.pos)}"`);
    }
    return node;
  }

  private parseExpression(): ASTNode {
    return this.parseTernary();
  }

  private parseTernary(): ASTNode {
    let node = this.parseNullish();
    this.skipWhitespace();
    if (this.matchChar('?')) {
      this.pos++;
      const consequent = this.parseExpression();
      this.skipWhitespace();
      if (!this.matchChar(':')) {
        throw new Error(`Expected ':' in ternary expression at position ${this.pos}`);
      }
      this.pos++;
      const alternate = this.parseExpression();
      node = { type: 'Conditional', test: node, consequent, alternate };
    }
    return node;
  }

  private parseNullish(): ASTNode {
    let left = this.parseLogicalOr();
    while (this.matchOp('??')) {
      this.pos += 2;
      const right = this.parseLogicalOr();
      left = { type: 'Logical', operator: '??', left, right };
    }
    return left;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.matchOp('||')) {
      this.pos += 2;
      const right = this.parseLogicalAnd();
      left = { type: 'Logical', operator: '||', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.matchOp('&&')) {
      this.pos += 2;
      const right = this.parseEquality();
      left = { type: 'Logical', operator: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();
    while (true) {
      if (this.matchOp('===')) {
        this.pos += 3;
        left = { type: 'Binary', operator: '===', left, right: this.parseRelational() };
      } else if (this.matchOp('!==')) {
        this.pos += 3;
        left = { type: 'Binary', operator: '!==', left, right: this.parseRelational() };
      } else if (this.matchOp('==')) {
        this.pos += 2;
        left = { type: 'Binary', operator: '==', left, right: this.parseRelational() };
      } else if (this.matchOp('!=')) {
        this.pos += 2;
        left = { type: 'Binary', operator: '!=', left, right: this.parseRelational() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();
    while (true) {
      if (this.matchOp('<=') || this.matchOp('>=')) {
        const op = this.src.slice(this.pos, this.pos + 2);
        this.pos += 2;
        left = { type: 'Binary', operator: op, left, right: this.parseAdditive() };
      } else if ((this.matchChar('<') || this.matchChar('>')) && !this.matchOp('<<') && !this.matchOp('>>')) {
        const op = this.src[this.pos]!;
        this.pos++;
        left = { type: 'Binary', operator: op, left, right: this.parseAdditive() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (true) {
      this.skipWhitespace();
      if ((this.matchChar('+') || this.matchChar('-')) && !this.matchOp('++') && !this.matchOp('--')) {
        const op = this.src[this.pos]!;
        this.pos++;
        left = { type: 'Binary', operator: op, left, right: this.parseMultiplicative() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (true) {
      this.skipWhitespace();
      if (this.matchChar('*') || this.matchChar('/') || this.matchChar('%')) {
        const op = this.src[this.pos]!;
        this.pos++;
        left = { type: 'Binary', operator: op, left, right: this.parseUnary() };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): ASTNode {
    this.skipWhitespace();
    if (this.matchChar('!')) {
      this.pos++;
      return { type: 'Unary', operator: '!', argument: this.parseUnary() };
    }
    if (this.matchChar('-') && !this.matchOp('--')) {
      this.pos++;
      return { type: 'Unary', operator: '-', argument: this.parseUnary() };
    }
    if (this.matchChar('+') && !this.matchOp('++')) {
      this.pos++;
      return { type: 'Unary', operator: '+', argument: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();

    while (true) {
      this.skipWhitespace();
      if (this.matchChar('.')) {
        this.pos++;
        this.skipWhitespace();
        const ident = this.parseIdentString();
        node = {
          type: 'Member',
          object: node,
          property: { type: 'Literal', value: ident },
          computed: false,
        };
      } else if (this.matchChar('[')) {
        this.pos++;
        const indexExpr = this.parseExpression();
        this.skipWhitespace();
        if (!this.matchChar(']')) {
          throw new Error(`Expected ']' at position ${this.pos}`);
        }
        this.pos++;
        node = {
          type: 'Member',
          object: node,
          property: indexExpr,
          computed: true,
        };
      } else if (this.matchChar('(')) {
        this.pos++;
        const args: ASTNode[] = [];
        this.skipWhitespace();
        if (!this.matchChar(')')) {
          while (true) {
            args.push(this.parseExpression());
            this.skipWhitespace();
            if (this.matchChar(',')) {
              this.pos++;
              this.skipWhitespace();
            } else {
              break;
            }
          }
        }
        if (!this.matchChar(')')) {
          throw new Error(`Expected ')' at position ${this.pos}`);
        }
        this.pos++;
        node = { type: 'Call', callee: node, args };
      } else {
        break;
      }
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    this.skipWhitespace();

    if (this.pos >= this.src.length) {
      throw new Error(`Unexpected end of expression`);
    }

    // Parentheses
    if (this.matchChar('(')) {
      this.pos++;
      const inner = this.parseExpression();
      this.skipWhitespace();
      if (!this.matchChar(')')) {
        throw new Error(`Expected ')' at position ${this.pos}`);
      }
      this.pos++;
      return inner;
    }

    // Array literal [a, b, c]
    if (this.matchChar('[')) {
      this.pos++;
      const elements: ASTNode[] = [];
      this.skipWhitespace();
      if (!this.matchChar(']')) {
        while (true) {
          elements.push(this.parseExpression());
          this.skipWhitespace();
          if (this.matchChar(',')) {
            this.pos++;
            this.skipWhitespace();
          } else {
            break;
          }
        }
      }
      if (!this.matchChar(']')) {
        throw new Error(`Expected ']' at position ${this.pos}`);
      }
      this.pos++;
      return { type: 'Array', elements };
    }

    // String literals ('...' or "...")
    if (this.matchChar("'") || this.matchChar('"')) {
      const quote = this.src[this.pos];
      this.pos++;
      let val = '';
      while (this.pos < this.src.length && this.src[this.pos] !== quote) {
        if (this.src[this.pos] === '\\') {
          this.pos++;
          if (this.pos >= this.src.length) break;
          const esc = this.src[this.pos];
          if (esc === 'n') val += '\n';
          else if (esc === 't') val += '\t';
          else if (esc === 'r') val += '\r';
          else val += esc;
        } else {
          val += this.src[this.pos];
        }
        this.pos++;
      }
      if (this.pos >= this.src.length) {
        throw new Error(`Unterminated string literal`);
      }
      this.pos++; // consume closing quote
      return { type: 'Literal', value: val };
    }

    // Number literals
    if (this.isDigit(this.src[this.pos]!)) {
      let numStr = '';
      while (this.pos < this.src.length && (this.isDigit(this.src[this.pos]!) || this.src[this.pos] === '.')) {
        numStr += this.src[this.pos];
        this.pos++;
      }
      const num = Number(numStr);
      if (isNaN(num)) {
        throw new Error(`Invalid number literal: ${numStr}`);
      }
      return { type: 'Literal', value: num };
    }

    // Identifiers or keyword literals
    const ident = this.parseIdentString();
    if (ident === 'true') return { type: 'Literal', value: true };
    if (ident === 'false') return { type: 'Literal', value: false };
    if (ident === 'null') return { type: 'Literal', value: null };
    if (ident === 'undefined') return { type: 'Literal', value: undefined };

    return { type: 'Identifier', name: ident };
  }

  private parseIdentString(): string {
    let name = '';
    while (this.pos < this.src.length && this.isIdentChar(this.src[this.pos]!)) {
      name += this.src[this.pos];
      this.pos++;
    }
    if (!name) {
      throw new Error(`Expected identifier at position ${this.pos}`);
    }
    return name;
  }

  private skipWhitespace() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) {
      this.pos++;
    }
  }

  private matchChar(ch: string): boolean {
    return this.src[this.pos] === ch;
  }

  private matchOp(op: string): boolean {
    this.skipWhitespace();
    return this.src.startsWith(op, this.pos);
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentChar(ch: string): boolean {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' ||
      ch === '$'
    );
  }
}

// Tree-Walk AST Evaluator with strict sandboxing and bounds checking
export class SafeEvaluator {
  private stepCount = 0;
  private readonly maxSteps: number;
  private readonly maxDepth: number;

  constructor(options: EvaluationOptions = {}) {
    this.maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    this.maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  }

  public evaluate(ast: ASTNode, context: Record<string, any> = {}): any {
    this.stepCount = 0;
    return this.evalNode(ast, context, 0);
  }

  private evalNode(node: ASTNode, context: Record<string, any>, depth: number): any {
    this.stepCount++;
    if (this.stepCount > this.maxSteps) {
      throw new Error(`Expression evaluation exceeded maximum step count (${this.maxSteps}).`);
    }
    if (depth > this.maxDepth) {
      throw new Error(`Expression evaluation exceeded maximum recursion depth (${this.maxDepth}).`);
    }

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Array':
        return node.elements.map((el) => this.evalNode(el, context, depth + 1));

      case 'Identifier': {
        if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
          throw new Error(`Access to forbidden identifier "${node.name}" is blocked.`);
        }
        if (node.name === 'Math') {
          return Math;
        }
        if (node.name === 'Number') {
          return Number;
        }
        if (node.name === 'String') {
          return String;
        }
        if (node.name === 'Boolean') {
          return Boolean;
        }
        if (node.name === 'Array') {
          return { isArray: Array.isArray };
        }
        if (Object.prototype.hasOwnProperty.call(context, node.name)) {
          return context[node.name];
        }
        return undefined;
      }

      case 'Unary': {
        const val = this.evalNode(node.argument, context, depth + 1);
        if (node.operator === '!') return !val;
        if (node.operator === '-') return -val;
        if (node.operator === '+') return +val;
        throw new Error(`Unsupported unary operator: ${node.operator}`);
      }

      case 'Binary': {
        const left = this.evalNode(node.left, context, depth + 1);
        const right = this.evalNode(node.right, context, depth + 1);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right === 0 ? 0 : left / right;
          case '%': return left % right;
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '<': return left < right;
          case '<=': return left <= right;
          case '>': return left > right;
          case '>=': return left >= right;
          default:
            throw new Error(`Unsupported binary operator: ${node.operator}`);
        }
      }

      case 'Logical': {
        if (node.operator === '&&') {
          const left = this.evalNode(node.left, context, depth + 1);
          return left ? this.evalNode(node.right, context, depth + 1) : left;
        }
        if (node.operator === '||') {
          const left = this.evalNode(node.left, context, depth + 1);
          return left ? left : this.evalNode(node.right, context, depth + 1);
        }
        if (node.operator === '??') {
          const left = this.evalNode(node.left, context, depth + 1);
          return left !== null && left !== undefined ? left : this.evalNode(node.right, context, depth + 1);
        }
        throw new Error(`Unsupported logical operator: ${node.operator}`);
      }

      case 'Conditional': {
        const test = this.evalNode(node.test, context, depth + 1);
        return test
          ? this.evalNode(node.consequent, context, depth + 1)
          : this.evalNode(node.alternate, context, depth + 1);
      }

      case 'Member': {
        const obj = this.evalNode(node.object, context, depth + 1);
        if (obj === null || obj === undefined) {
          return undefined;
        }
        const prop = node.computed
          ? this.evalNode(node.property, context, depth + 1)
          : (node.property as { type: 'Literal'; value: any }).value;

        const propStr = String(prop);
        if (FORBIDDEN_PROPERTIES.has(propStr)) {
          throw new Error(`Access to forbidden property "${propStr}" is blocked.`);
        }

        // Return the property if it exists directly or is an allowed method/length
        if (typeof obj === 'string') {
          if (propStr === 'length') return obj.length;
          if (ALLOWED_STRING_METHODS.has(propStr)) {
            return (obj as any)[propStr].bind(obj);
          }
          return undefined;
        }

        if (Array.isArray(obj)) {
          if (propStr === 'length') return obj.length;
          if (ALLOWED_ARRAY_METHODS.has(propStr)) {
            return (obj as any)[propStr].bind(obj);
          }
          if (typeof prop === 'number' || /^\d+$/.test(propStr)) {
            return obj[Number(propStr)];
          }
          return undefined;
        }

        if (obj === Math) {
          if (ALLOWED_MATH_METHODS.has(propStr)) {
            return (Math as any)[propStr];
          }
          throw new Error(`Math method "${propStr}" is not allowed.`);
        }

        if (obj instanceof Date) {
          if (ALLOWED_DATE_METHODS.has(propStr)) {
            return (obj as any)[propStr].bind(obj);
          }
          return undefined;
        }

        if (typeof obj === 'object') {
          if (Object.prototype.hasOwnProperty.call(obj, propStr)) {
            const val = obj[propStr];
            if (typeof val === 'function') {
              throw new Error(`Invoking custom object function "${propStr}" is blocked.`);
            }
            return val;
          }
        }

        return undefined;
      }

      case 'Call': {
        // Evaluate arguments first
        const evaluatedArgs = node.args.map((a) => this.evalNode(a, context, depth + 1));

        // Global functions whitelist: Number, String, Boolean, parseInt, parseFloat
        if (node.callee.type === 'Identifier') {
          const fnName = node.callee.name;
          if (FORBIDDEN_IDENTIFIERS.has(fnName)) {
            throw new Error(`Call to forbidden identifier "${fnName}" is blocked.`);
          }
          if (fnName === 'Number') return Number(evaluatedArgs[0]);
          if (fnName === 'String') return String(evaluatedArgs[0]);
          if (fnName === 'Boolean') return Boolean(evaluatedArgs[0]);
          if (fnName === 'parseInt') return parseInt(String(evaluatedArgs[0]), Number(evaluatedArgs[1]) || 10);
          if (fnName === 'parseFloat') return parseFloat(String(evaluatedArgs[0]));
        }

        if (node.callee.type === 'Member') {
          const fn = this.evalNode(node.callee, context, depth + 1);
          if (typeof fn === 'function') {
            return fn(...evaluatedArgs);
          }
          throw new Error(`Target is not a callable function.`);
        }

        throw new Error(`Direct invocations of non-whitelisted functions are blocked.`);
      }

      default:
        throw new Error(`Unsupported AST node type: ${(node as any).type}`);
    }
  }
}

/**
 * Parses and evaluates an expression safely against a given context.
 * Throws on syntax error, forbidden access, or step exhaustion.
 */
export function evaluateSafeExpression(
  expression: string,
  context: Record<string, any> = {},
  options?: EvaluationOptions
): any {
  const parser = new ExpressionParser(expression);
  const ast = parser.parse();
  const evaluator = new SafeEvaluator(options);
  return evaluator.evaluate(ast, context);
}

/**
 * Recursively validates an AST node against security rules.
 */
function validateASTNode(node: ASTNode): void {
  if (!node) return;
  switch (node.type) {
    case 'Identifier':
      if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
        throw new Error(`Forbidden identifier "${node.name}" is not allowed.`);
      }
      break;

    case 'Member':
      validateASTNode(node.object);
      if (!node.computed && node.property.type === 'Literal') {
        const propStr = String(node.property.value);
        if (FORBIDDEN_PROPERTIES.has(propStr) || FORBIDDEN_IDENTIFIERS.has(propStr)) {
          throw new Error(`Forbidden property "${propStr}" is not allowed.`);
        }
      } else if (node.computed) {
        validateASTNode(node.property);
      }
      break;

    case 'Unary':
      validateASTNode(node.argument);
      break;

    case 'Binary':
    case 'Logical':
      validateASTNode(node.left);
      validateASTNode(node.right);
      break;

    case 'Conditional':
      validateASTNode(node.test);
      validateASTNode(node.consequent);
      validateASTNode(node.alternate);
      break;

    case 'Call':
      validateASTNode(node.callee);
      for (const arg of node.args) {
        validateASTNode(arg);
      }
      break;

    case 'Array':
      for (const el of node.elements) {
        validateASTNode(el);
      }
      break;

    case 'Literal':
      break;
  }
}

/**
 * Validates expression syntax and ensures it contains no forbidden constructs.
 */
export function validateSafeExpression(
  expression: string
): { isValid: boolean; error?: string } {
  if (!expression || !expression.trim()) {
    return { isValid: false, error: 'Expression cannot be empty.' };
  }
  try {
    const parser = new ExpressionParser(expression);
    const ast = parser.parse();
    validateASTNode(ast);
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
}
