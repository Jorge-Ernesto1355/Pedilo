"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Inter, Source_Serif_4 } from "next/font/google";
import {
  recoveryEmailSchema,
  resetPasswordSchema,
  verificationCodeSchema,
} from "@/app/auth/lib/validation";
import {
  getRecoveryError,
} from "@/app/auth/lib/client/error-message";
import {
  PasswordRecoveryClient,
  unavailableRecoveryClient,
} from "@/app/auth/lib/client/password-recovery";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif",
});

type Step = "email" | "code" | "password" | "success";
type Phase = "request" | "verify" | "resend" | "reset";

const steps: Step[] = ["email", "code", "password"];

function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if ([...value].some((character) => character >= "A" && character <= "Z")) score += 1;
  if ([...value].some((character) => character >= "0" && character <= "9")) score += 1;
  if ([...value].some((character) => !((character >= "A" && character <= "Z") || (character >= "a" && character <= "z") || (character >= "0" && character <= "9")))) score += 1;
  return score;
}

function StepDots({ step }: { step: Step }) {
  if (step === "success") return null;
  const activeIndex = steps.indexOf(step);
  return (
    <div className="mb-8 flex items-center gap-2" aria-label={`Paso ${activeIndex + 1} de 3`}>
      {steps.map((item, index) => (
        <span
          key={item}
          aria-hidden="true"
          className={`h-1.5 rounded-full transition-all duration-300 ${index <= activeIndex ? "w-8 bg-[#1E40AF]" : "w-2 bg-[#DCE3F0]"}`}
        />
      ))}
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-[var(--font-inter)] text-[13px] font-bold text-[#1A202C]">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-4 py-3.5 pr-20 font-[var(--font-source-serif)] text-base text-[#1A202C] outline-none transition focus:border-[#1E40AF] focus:bg-white focus:ring-4 focus:ring-[#1E40AF]/[.14] ${error ? "border-[#D92D20]" : "border-[#DCE0EA]"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 font-[var(--font-inter)] text-xs font-bold uppercase tracking-[.06em] text-[#1E40AF] hover:bg-[#1E40AF]/[.08]"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-2 font-[var(--font-inter)] text-[12.5px] text-[#B42318]" role="alert">{error}</p>}
    </div>
  );
}

export function ForgotPasswordFlow({ client = unavailableRecoveryClient, initialCooldownSeconds = 42 }: { client?: PasswordRecoveryClient; initialCooldownSeconds?: number }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirm?: string }>({});
  const [secondsLeft, setSecondsLeft] = useState(42);
  const [resendLoading, setResendLoading] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== "code" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [step, secondsLeft]);

  useEffect(() => {
    if (step === "code") codeRefs.current[0]?.focus();
  }, [step]);

  function handleError(nextError: unknown, phase: Phase) {
    setError(getRecoveryError(nextError, phase));
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const parsed = recoveryEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Ingresa un correo válido.");
      setError("");
      return;
    }
    setFieldError("");
    setError("");
    setLoading(true);
    try {
      await client.requestReset(parsed.data);
      setEmail(parsed.data.email);
      setStep("code");
      setSecondsLeft(initialCooldownSeconds);
    } catch (nextError) {
      handleError(nextError, "request");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(nextCode: string) {
    if (loading) return;
    const parsed = verificationCodeSchema.safeParse({ code: nextCode });
    if (!parsed.success) return;
    setCodeError("");
    setError("");
    setLoading(true);
    try {
      await client.verifyCode({ email, ...parsed.data });
      setStep("password");
    } catch (nextError) {
      setCodeError(getRecoveryError(nextError, "verify"));
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function updateCode(index: number, value: string) {
    const digit = [...value].filter((character) => character >= "0" && character <= "9").slice(-1)[0];
    if (!digit) return;
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);
    setCodeError("");
    if (index < 5) codeRefs.current[index + 1]?.focus();
    if (nextCode.every(Boolean)) void verifyCode(nextCode.join(""));
  }

  function handleCodeKeyDown(index: number, key: string) {
    if (key === "Backspace" && !code[index] && index > 0) {
      const nextCode = [...code];
      nextCode[index - 1] = "";
      setCode(nextCode);
      codeRefs.current[index - 1]?.focus();
    }
    if (key === "ArrowLeft" && index > 0) codeRefs.current[index - 1]?.focus();
    if (key === "ArrowRight" && index < 5) codeRefs.current[index + 1]?.focus();
  }

  function pasteCode(index: number, pasted: string) {
    const digits = [...pasted].filter((character) => character >= "0" && character <= "9").slice(0, 6);
    if (!digits) return;
    const nextCode = [...code];
    digits.forEach((digit, offset) => { if (index + offset < 6) nextCode[index + offset] = digit; });
    setCode(nextCode);
    const nextIndex = Math.min(index + digits.length, 5);
    codeRefs.current[nextIndex]?.focus();
    if (nextCode.every(Boolean)) void verifyCode(nextCode.join(""));
  }

  async function resendCode() {
    if (resendLoading || secondsLeft > 0) return;
    setResendLoading(true);
    setError("");
    try {
      await client.resendCode({ email });
      setSecondsLeft(initialCooldownSeconds);
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } catch (nextError) {
      handleError(nextError, "resend");
    } finally {
      setResendLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setPasswordErrors({ password: errors.password?.[0], confirm: errors.confirm?.[0] });
      setError("");
      return;
    }
    setPasswordErrors({});
    setError("");
    setLoading(true);
    try {
      await client.resetPassword({ email, code: code.join(""), ...parsed.data });
      setStep("success");
    } catch (nextError) {
      handleError(nextError, "reset");
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(password);
  const strengthLabels = ["", "Inicial", "Aceptable", "Buena", "Fuerte"];

  return (
    <main className={`${inter.variable} ${sourceSerif.variable} flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 font-[var(--font-inter)] sm:px-8`}>
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,64,175,.08),transparent_40%)]" />
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }} className="relative z-10 w-full max-w-[480px] rounded-[24px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_-28px_rgba(30,64,175,.25)] sm:p-10">
        <Link href="/" aria-label="Inicio de Pedilo" className="mb-10 flex items-center gap-2.5 text-xl font-black tracking-tight text-[#172554]">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#1E40AF] text-sm text-white">P</span>
          Pedilo
        </Link>
        <StepDots step={step} />
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div key="email" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
              <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">Forgot your password?</h1>
              <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">Enter the email associated with your account and we&apos;ll send you a verification code.</p>
              <form onSubmit={requestCode} noValidate className="space-y-5">
                <div>
                  <label htmlFor="recovery-email" className="mb-2 block text-[13px] font-bold text-[#1A202C]">Email</label>
                  <input id="recovery-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldError(""); setError(""); }} autoComplete="email" aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "recovery-email-error" : undefined} className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-4 py-3.5 font-[var(--font-source-serif)] text-base outline-none transition focus:border-[#1E40AF] focus:bg-white focus:ring-4 focus:ring-[#1E40AF]/[.14] ${fieldError ? "border-[#D92D20]" : "border-[#DCE0EA]"}`} />
                  {fieldError && <p id="recovery-email-error" role="alert" className="mt-2 text-[12.5px] text-[#B42318]">{fieldError}</p>}
                </div>
                {error && <p role="alert" className="text-center text-sm font-semibold text-[#B42318]">{error}</p>}
                <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white shadow-[0_10px_22px_-8px_rgba(30,64,175,.5)] transition hover:bg-[#1B3796] disabled:cursor-progress disabled:opacity-70">
                  {loading ? "Sending…" : "Send verification code"}
                </button>
              </form>
              <Link href="/auth/login" className="mt-7 block text-center text-sm font-bold text-[#1E40AF] hover:underline">← Back to login</Link>
            </motion.div>
          )}

          {step === "code" && (
            <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">Check your email</h1>
              <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">We sent a verification code to your email address.</p>
              <motion.div animate={codeError ? { x: [-7, 7, -4, 0] } : { x: 0 }} transition={{ duration: .3 }}>
                <fieldset disabled={loading} className="flex justify-between gap-1.5 sm:gap-3">
                  <legend className="sr-only">Código de verificación de 6 dígitos</legend>
                  {code.map((digit, index) => (
                    <input key={index} ref={(element) => { codeRefs.current[index] = element; if (index === 0 && element && step === "code") element.focus(); }} aria-label={`Dígito ${index + 1} de 6`} inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => handleCodeKeyDown(index, event.key)} onPaste={(event) => { event.preventDefault(); pasteCode(index, event.clipboardData.getData("text")); }} className="h-14 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-[#DCE0EA] bg-[#FBFCFE] text-center font-[var(--font-inter)] text-xl font-bold text-[#172554] outline-none transition focus:border-[#1E40AF] focus:bg-white focus:ring-4 focus:ring-[#1E40AF]/[.14] disabled:opacity-60 sm:h-16" />
                  ))}
                </fieldset>
              </motion.div>
              {codeError && <p role="alert" className="mt-3 text-center text-[12.5px] text-[#B42318]">{codeError}</p>}
              {error && <p role="alert" className="mt-3 text-center text-sm font-semibold text-[#B42318]">{error}</p>}
              <div className="mt-8 text-center text-sm text-[#5B6577]">
                <p>Didn&apos;t receive the code?</p>
                {secondsLeft > 0 ? <p className="mt-2 font-semibold text-[#7A8497]">Resend code in 00:{String(secondsLeft).padStart(2, "0")}</p> : <button type="button" onClick={resendCode} disabled={resendLoading} className="mt-2 font-bold text-[#1E40AF] hover:underline disabled:opacity-60">{resendLoading ? "Sending…" : "Resend code"}</button>}
              </div>
              <Link href="/auth/login" className="mt-8 block text-center text-sm font-bold text-[#1E40AF] hover:underline">← Back to login</Link>
            </motion.div>
          )}

          {step === "password" && (
            <motion.div key="password" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">Create a new password</h1>
              <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">Choose a new password for your Pedilo account.</p>
              <form onSubmit={resetPassword} noValidate className="space-y-5">
                <PasswordInput id="new-password" label="New password" value={password} onChange={(value) => { setPassword(value); setPasswordErrors((current) => ({ ...current, password: undefined })); setError(""); }} autoComplete="new-password" error={passwordErrors.password} />
                <div className="-mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#E7EBF3]"><motion.div className="h-full rounded-full bg-[#1E40AF]" animate={{ width: `${strength * 25}%` }} /></div>
                  <p className="mt-2 text-xs text-[#7A8497]">{password ? `Password strength: ${strengthLabels[strength]}` : "Use at least 8 characters"}</p>
                </div>
                <PasswordInput id="confirm-password" label="Confirm password" value={confirm} onChange={(value) => { setConfirm(value); setPasswordErrors((current) => ({ ...current, confirm: undefined })); setError(""); }} autoComplete="new-password" error={passwordErrors.confirm} />
                {error && <p role="alert" className="text-center text-sm font-semibold text-[#B42318]">{error}</p>}
                <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white shadow-[0_10px_22px_-8px_rgba(30,64,175,.5)] transition hover:bg-[#1B3796] disabled:cursor-progress disabled:opacity-70">{loading ? "Updating…" : "Update password"}</button>
              </form>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-[#E7F6EF] text-2xl text-[#12996A]" aria-hidden="true">✓</div>
              <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">Password updated successfully</h1>
              <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">Your password was updated successfully.</p>
              <Link href="/auth/login" className="inline-flex w-full items-center justify-center rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white hover:bg-[#1B3796]">Back to login</Link>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-10 text-center text-xs text-[#98A2B3]">Tu información se mantiene privada y segura.</p>
      </motion.section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
