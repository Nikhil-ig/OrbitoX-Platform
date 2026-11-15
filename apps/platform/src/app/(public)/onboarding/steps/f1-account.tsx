'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Lock, Mail, Phone, User, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface F1Props {
  onSuccess: (userData: { userId: string; email: string; name: string }) => void;
  initialEmail?: string;
  initialName?: string;
}

export function F1AccountStep({ onSuccess, initialEmail = '', initialName = '' }: F1Props) {
  const [name, setName] = useState(initialName || 'Priya Shah');
  const [email, setEmail] = useState(initialEmail || 'priya@shahgroup.in');
  const [phone, setPhone] = useState('+91 98450 12345');
  const [password, setPassword] = useState('supersecurepassword123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '' };
    if (pwd.length < 8) return { label: 'Too short (min 8 characters)', color: 'text-amber-500' };
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (hasNum && hasSpecial && pwd.length >= 10) {
      return { label: 'Strong password', color: 'text-emerald-700 font-semibold' };
    }
    if (hasNum || hasSpecial) {
      return { label: 'Medium strength', color: 'text-blue-600 font-medium' };
    }
    return { label: 'Weak password', color: 'text-amber-600' };
  };

  const strength = getPasswordStrength(password);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showVerifyModal && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            setCanResend(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showVerifyModal, cooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/customer/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to create account.');
      }

      setMaskedEmail(data.maskedEmail || email);
      setShowVerifyModal(true);
      setCooldown(60);
      setCanResend(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...codeDigits];
    updated[index] = char;
    setCodeDigits(updated);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = updated.join('');
    if (fullCode.length === 6) {
      submitVerificationCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...codeDigits];
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i] || '';
      }
      setCodeDigits(updated);
      if (pasted.length === 6) {
        submitVerificationCode(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const submitVerificationCode = async (code: string) => {
    setVerifyError(null);
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/v1/customer/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Verification failed. Please check the code.');
      }

      setShowVerifyModal(false);
      onSuccess({
        userId: data.user.id,
        email: data.user.email,
        name: data.user.name || name,
      });
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setVerifyError(null);
    setCanResend(false);
    setCooldown(60);
    try {
      const res = await fetch('/api/v1/customer/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setVerifyError(err.message);
      setCanResend(true);
    }
  };

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      {/* Left Dark Hero Card */}
      <div className="p-8 rounded-[32px] bg-[#0D0F12] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#3D6EF5] flex items-center justify-center text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg text-white">orbitoX</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
              Your restaurant, online in two minutes.
            </h1>
            <p className="text-xs text-[#9AA3AF] mt-3 leading-relaxed">
              QR menus, table ordering, kitchen screens and GST invoices. See your own site working before you pay anything.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-8 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
            <span>Free preview of your live site, no card needed</span>
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
            <span>Pay with UPI, card or net banking when you go live</span>
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
            <span>Your data stays in India</span>
          </div>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-5">
        <div>
          <div className="text-[11px] font-semibold text-[#5A6170]">Step 1 of 3 · Your account</div>
          <h2 className="text-2xl font-bold text-[#14161A] mt-1">Create your account</h2>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="text-xs font-semibold text-[#14161A]">Your name</label>
            <input
              type="text"
              required
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Shah"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#14161A]">Work email</label>
            <input
              type="email"
              required
              aria-label="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@shahgroup.in"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#14161A]">Mobile number</label>
            <input
              type="tel"
              aria-label="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98450 12345"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#14161A]">Password</label>
            <input
              type="password"
              required
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
            {strength.label && (
              <div className={`text-[11px] font-medium mt-1 ${strength.color}`}>{strength.label}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-[#5A6170] leading-relaxed">
          We&apos;ll send a 6-digit code to your email to confirm it&apos;s you. By continuing you agree to the Terms and Privacy policy.
        </p>
      </div>

      {/* 6-Digit Email Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[28px] p-8 shadow-2xl border border-gray-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#14161A]">Verify your email</h3>
              <p className="text-xs text-[#5A6170] leading-relaxed">
                We sent a 6-digit confirmation code to{' '}
                <span className="font-semibold text-[#14161A]">{maskedEmail}</span>. Enter the code below.
              </p>
            </div>

            {verifyError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{verifyError}</span>
              </div>
            )}

            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {codeDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`Digit ${i + 1}`}
                  className="w-11 h-13 text-center text-xl font-bold rounded-2xl border-2 border-gray-200 bg-[#F8FAFC] text-[#14161A] focus:outline-none focus:border-[#14161A] focus:bg-white transition-all"
                />
              ))}
            </div>

            <button
              type="button"
              disabled={verifyLoading || codeDigits.join('').length < 6}
              onClick={() => submitVerificationCode(codeDigits.join(''))}
              className="w-full rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {verifyLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <span>Confirm code</span>
              )}
            </button>

            <div className="text-center text-xs text-[#5A6170] pt-2 border-t border-gray-100 flex items-center justify-between">
              <span>Didn&apos;t get the code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Resend code
                </button>
              ) : (
                <span className="text-gray-400">Resend in {cooldown}s</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
