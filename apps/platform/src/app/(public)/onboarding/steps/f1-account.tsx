'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Lock, Mail, Phone, User, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, Pencil, Check, X } from 'lucide-react';
import { setCustomerCsrfToken } from './csrf';

interface F1Props {
  onSuccess: (userData: { userId: string; email: string; name: string }) => void;
  initialEmail?: string;
  initialName?: string;
}

export function F1AccountStep({ onSuccess, initialEmail = '', initialName = '' }: F1Props) {
  const [name, setName] = useState(initialName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
  const [devCode, setDevCode] = useState<string | null>(null);

  // Email edit in modal state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);

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

      setMaskedEmail(data.email || data.maskedEmail || email);
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setShowVerifyModal(true);
      setCooldown(60);
      setCanResend(false);
      setIsEditingEmail(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setEmailUpdateError('Please enter a valid email address.');
      return;
    }
    setEmailUpdateLoading(true);
    setEmailUpdateError(null);
    try {
      const res = await fetch('/api/v1/customer/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Owner',
          email: trimmed,
          phone: phone.trim(),
          password: password || 'TempPass123!@#',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update email address.');
      }

      setEmail(trimmed);
      setMaskedEmail(data.email || data.maskedEmail || trimmed);
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setCodeDigits(['', '', '', '', '', '']);
      setCooldown(60);
      setCanResend(false);
      setIsEditingEmail(false);
      setVerifyError(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setEmailUpdateError(err.message);
    } finally {
      setEmailUpdateLoading(false);
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

      if (data.csrfToken) {
        setCustomerCsrfToken(data.csrfToken);
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
      if (data.devCode) {
        setDevCode(data.devCode);
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
            <label htmlFor="f1-name" className="text-xs font-semibold text-[#14161A]">Your name</label>
            <input
              id="f1-name"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Shah"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label htmlFor="f1-email" className="text-xs font-semibold text-[#14161A]">Work email</label>
            <input
              id="f1-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-label="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@shahgroup.in"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label htmlFor="f1-phone" className="text-xs font-semibold text-[#14161A]">Mobile number</label>
            <input
              id="f1-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-label="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98450 12345"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
          </div>

          <div>
            <label htmlFor="f1-password" className="text-xs font-semibold text-[#14161A]">Password</label>
            <input
              id="f1-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
            />
            {strength.label && (
              <div role="status" aria-live="polite" className={`text-[11px] font-medium mt-1 ${strength.color}`}>{strength.label}</div>
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
          <div className="w-full max-w-md bg-white rounded-[28px] p-8 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#14161A]">Verify your email</h3>

              {!isEditingEmail ? (
                <div className="text-xs text-[#5A6170] leading-relaxed flex items-center justify-center flex-wrap gap-1">
                  <span>We sent a 6-digit confirmation code to</span>
                  <span className="font-semibold text-[#14161A] bg-gray-100 px-2 py-0.5 rounded">
                    {maskedEmail || email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmailInput(email);
                      setIsEditingEmail(true);
                      setEmailUpdateError(null);
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition"
                    title="Change or edit email address"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleUpdateEmail}
                  className="mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="verify-email-edit" className="text-[11px] font-semibold text-[#14161A]">
                      Edit your email address:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      className="text-gray-400 hover:text-gray-600 text-[11px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Cancel</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="verify-email-edit"
                      type="email"
                      required
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="e.g. orbitox.io@gmail.com"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={emailUpdateLoading || !newEmailInput.trim() || !newEmailInput.includes('@')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#14161A] text-white hover:bg-[#14161A]/90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                    >
                      {emailUpdateLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Update</span>
                        </>
                      )}
                    </button>
                  </div>
                  {emailUpdateError && (
                    <p className="text-[11px] text-red-600 font-medium">{emailUpdateError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Dev Code Banner */}
            {devCode && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-800">Dev code:</span>
                  <span className="font-mono font-bold tracking-widest bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded border border-emerald-300">
                    {devCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devCode.split('').slice(0, 6);
                    setCodeDigits(digits);
                    submitVerificationCode(devCode);
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-white px-3 py-1 rounded-full border border-emerald-300 shadow-sm transition hover:shadow cursor-pointer flex items-center gap-1"
                >
                  <span>Auto-fill</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

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

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5 text-xs text-[#5A6170]">
              <div className="flex items-center justify-between">
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

              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="text-[11px] text-[#5A6170] hover:text-[#14161A] flex items-center justify-center gap-1.5 pt-1 transition cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to edit account information</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
