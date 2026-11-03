'use client';

import { FormEvent, useState } from 'react';

export default function PlatformLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Sign-in failed. Check your credentials and authenticator code.');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next?.startsWith('/') && !next.startsWith('//') ? next : '/platform');
    } catch (loginError) {
      setError((loginError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '12vh auto', padding: 24 }}>
      <h1>Operator sign-in</h1>
      <p>Use your operator account and authenticator code.</p>
      <form onSubmit={submit}>
        <label>
          Email
          <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Authenticator or backup code
          <input autoComplete="one-time-code" inputMode="numeric" required value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
