'use client'

import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, LoaderCircle, Mail } from 'lucide-react'
import { Inter, Source_Serif_4 } from 'next/font/google'
import Link from 'next/link'
import { useState } from 'react'
import { recoveryEmailSchema } from '@/app/auth/lib/validation'
import { requestPasswordReset } from '@/app/auth/lib/client/password-recovery'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type { PasswordRecoveryClient } from '@/app/auth/lib/client/password-recovery'

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '600', '700', '900'],
    variable: '--font-inter',
})
const sourceSerif = Source_Serif_4({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-source-serif',
})

function requestError(error: unknown) {
    if (error instanceof ApiError && error.status === 429) {
        return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    }
    return 'No pudimos procesar la solicitud. Revisa tu conexión e inténtalo de nuevo.'
}

export function ForgotPasswordFlow({
    client,
    initialCooldownSeconds: _initialCooldownSeconds,
}: {
    client?: PasswordRecoveryClient
    initialCooldownSeconds?: number
} = {}) {
    void _initialCooldownSeconds
    const [email, setEmail] = useState('')
    const [fieldError, setFieldError] = useState('')
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)
    const mutation = useMutation({ mutationFn: client?.requestReset ?? requestPasswordReset })

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (mutation.isPending) return

        const parsed = recoveryEmailSchema.safeParse({ email })
        if (!parsed.success) {
            setFieldError(parsed.error.issues[0]?.message ?? 'Ingresa un correo válido.')
            setError('')
            return
        }

        setFieldError('')
        setError('')
        mutation.mutate(parsed.data, {
            onSuccess: () => setSent(true),
            onError: (nextError) => setError(requestError(nextError)),
        })
    }

    return (
        <main
            className={`${inter.variable} ${sourceSerif.variable} flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 font-[var(--font-inter)] sm:px-8`}
        >
            <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,64,175,.08),transparent_40%)]" />
            <section className="relative z-10 w-full max-w-[480px] rounded-[24px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_-28px_rgba(30,64,175,.25)] sm:p-10">
                <Link
                    href="/"
                    aria-label="Inicio de Pedilo"
                    className="mb-10 flex items-center gap-2.5 text-xl font-black tracking-tight text-[#172554]"
                >
                    <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#1E40AF] text-sm text-white">
                        P
                    </span>
                    Pedilo
                </Link>

                {sent ? (
                    <div className="py-5 text-center">
                        <CheckCircle2
                            className="mx-auto size-14 text-[#12996A]"
                            aria-hidden="true"
                        />
                        <h1 className="mt-6 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">
                            Revisa tu correo
                        </h1>
                        <p className="mt-4 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">
                            Si el correo está registrado, recibirás un enlace para restablecer tu
                            contraseña.
                        </p>
                        <Link
                            href="/auth/login"
                            className="mt-8 inline-flex w-full items-center justify-center rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white hover:bg-[#1B3796]"
                        >
                            Iniciar sesión
                        </Link>
                    </div>
                ) : (
                    <>
                        <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">
                            Recupera tu contraseña
                        </h1>
                        <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">
                            Escribe el correo de tu cuenta y te enviaremos un enlace para crear una
                            nueva contraseña.
                        </p>
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                            <div>
                                <label
                                    htmlFor="recovery-email"
                                    className="mb-2 block text-[13px] font-bold text-[#1A202C]"
                                >
                                    Correo electrónico
                                </label>
                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]"
                                        aria-hidden="true"
                                    />
                                    <input
                                        data-testid="forgot-password-email"
                                        id="recovery-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value)
                                            setFieldError('')
                                            setError('')
                                        }}
                                        autoComplete="email"
                                        aria-invalid={Boolean(fieldError)}
                                        aria-describedby={
                                            fieldError ? 'recovery-email-error' : undefined
                                        }
                                        className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-11 py-3.5 font-[var(--font-source-serif)] text-base text-[#1A202C] outline-none transition focus:border-[#1E40AF] focus:bg-white focus:ring-4 focus:ring-[#1E40AF]/[.14] ${fieldError ? 'border-[#D92D20]' : 'border-[#DCE0EA]'}`}
                                    />
                                </div>
                                {fieldError && (
                                    <p
                                        id="recovery-email-error"
                                        role="alert"
                                        className="mt-2 text-[12.5px] text-[#B42318]"
                                    >
                                        {fieldError}
                                    </p>
                                )}
                            </div>
                            {error && (
                                <p
                                    role="alert"
                                    className="flex items-start gap-2 text-sm font-semibold text-[#B42318]"
                                >
                                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                    {error}
                                </p>
                            )}
                            <button
                                data-testid="forgot-password-submit"
                                type="submit"
                                disabled={mutation.isPending}
                                aria-busy={mutation.isPending}
                                className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white shadow-[0_10px_22px_-8px_rgba(30,64,175,.5)] transition hover:bg-[#1B3796] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {mutation.isPending && (
                                    <LoaderCircle
                                        className="size-5 animate-spin"
                                        aria-hidden="true"
                                    />
                                )}
                                {mutation.isPending
                                    ? 'Enviando enlace…'
                                    : 'Enviar enlace de recuperación'}
                            </button>
                        </form>
                    </>
                )}
                <Link
                    href="/auth/login"
                    className="mt-7 block text-center text-sm font-bold text-[#1E40AF] hover:underline"
                >
                    ← Volver a iniciar sesión
                </Link>
                <p className="mt-10 text-center text-xs text-[#98A2B3]">
                    Tu información se mantiene privada y segura.
                </p>
            </section>
        </main>
    )
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordFlow />
}
