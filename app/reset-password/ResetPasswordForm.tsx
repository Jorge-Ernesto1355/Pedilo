'use client'

import { useMutation } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Inter, Source_Serif_4 } from 'next/font/google'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { resetAccountPassword } from '@/app/auth/lib/client/password-recovery'
import { resetPasswordSchema } from '@/app/auth/lib/validation'

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

function resetError(error: unknown) {
    if (!(error instanceof ApiError))
        return 'No pudimos cambiar tu contraseña. Revisa tu conexión e inténtalo de nuevo.'
    const passwordError = error.fieldErrors.newPassword?.[0]
    if (passwordError) return passwordError
    if (
        error.code === 'INVALID_TOKEN' ||
        error.code === 'TOKEN_INVALID' ||
        error.code === 'RESET_TOKEN_INVALID'
    )
        return 'Este enlace de recuperación no es válido. Solicita uno nuevo.'
    if (
        error.status === 401 ||
        error.status === 410 ||
        error.code === 'TOKEN_EXPIRED' ||
        error.code === 'RESET_TOKEN_EXPIRED' ||
        error.code === 'TOKEN_ALREADY_USED' ||
        error.code === 'RESET_TOKEN_USED'
    )
        return 'Este enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo.'
    if (error.status === 400) return 'Revisa la nueva contraseña e inténtalo de nuevo.'
    if (error.status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    return 'No pudimos cambiar tu contraseña. Inténtalo de nuevo.'
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    error,
}: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    error?: string
}) {
    const [visible, setVisible] = useState(false)
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-[#1A202C]">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-4 py-3.5 pr-12 font-[var(--font-source-serif)] text-base text-[#1A202C] outline-none transition focus:border-[#1E40AF] focus:bg-white focus:ring-4 focus:ring-[#1E40AF]/[.14] ${error ? 'border-[#D92D20]' : 'border-[#DCE0EA]'}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={
                        visible
                            ? `Ocultar ${label.toLowerCase()}`
                            : `Mostrar ${label.toLowerCase()}`
                    }
                    className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#1E40AF] hover:bg-[#EEF3FF]"
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
            {error && (
                <p id={`${id}-error`} role="alert" className="mt-2 text-[12.5px] text-[#B42318]">
                    {error}
                </p>
            )}
        </div>
    )
}

export default function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{
        newPassword?: string
        confirmPassword?: string
    }>({})
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const mutation = useMutation({ mutationFn: resetAccountPassword })

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!token || mutation.isPending) return
        const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword })
        if (!parsed.success) {
            const errors = parsed.error.flatten().fieldErrors
            setFieldErrors({
                newPassword: errors.newPassword?.[0],
                confirmPassword: errors.confirmPassword?.[0],
            })
            setError('')
            return
        }
        setFieldErrors({})
        setError('')
        mutation.mutate(
            { token, newPassword: parsed.data.newPassword },
            {
                onSuccess: () => setSuccess(true),
                onError: (nextError) => setError(resetError(nextError)),
            },
        )
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
                {!token ? (
                    <StatusState
                        icon={<AlertCircle className="size-14 text-[#B42318]" />}
                        title="Enlace no válido"
                        description="Este enlace de recuperación no es válido o está incompleto. Solicita un nuevo enlace para continuar."
                    />
                ) : success ? (
                    <StatusState
                        icon={<CheckCircle2 className="size-14 text-[#12996A]" />}
                        title="Contraseña actualizada"
                        description="Tu contraseña se cambió correctamente. Ya puedes iniciar sesión con tu nueva contraseña."
                        action
                    />
                ) : (
                    <>
                        <h1 className="mb-3 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">
                            Crea una nueva contraseña
                        </h1>
                        <p className="mb-8 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">
                            Elige una contraseña segura para volver a acceder a tu cuenta.
                        </p>
                        <form onSubmit={submit} noValidate className="space-y-5">
                            <PasswordField
                                id="new-password"
                                label="Nueva contraseña"
                                value={newPassword}
                                onChange={(value) => {
                                    setNewPassword(value)
                                    setFieldErrors((current) => ({
                                        ...current,
                                        newPassword: undefined,
                                    }))
                                    setError('')
                                }}
                                error={fieldErrors.newPassword}
                            />
                            <PasswordField
                                id="confirm-password"
                                label="Confirmar contraseña"
                                value={confirmPassword}
                                onChange={(value) => {
                                    setConfirmPassword(value)
                                    setFieldErrors((current) => ({
                                        ...current,
                                        confirmPassword: undefined,
                                    }))
                                    setError('')
                                }}
                                error={fieldErrors.confirmPassword}
                            />
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
                                    ? 'Cambiando contraseña…'
                                    : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </>
                )}
                {!success && (
                    <Link
                        href="/auth/login"
                        className="mt-7 block text-center text-sm font-bold text-[#1E40AF] hover:underline"
                    >
                        ← Volver a iniciar sesión
                    </Link>
                )}
                <p className="mt-10 text-center text-xs text-[#98A2B3]">
                    Tu información se mantiene privada y segura.
                </p>
            </section>
        </main>
    )
}

function StatusState({
    icon,
    title,
    description,
    action = false,
}: {
    icon: React.ReactNode
    title: string
    description: string
    action?: boolean
}) {
    return (
        <div className="py-5 text-center">
            <div className="flex justify-center" aria-hidden="true">
                {icon}
            </div>
            <h1 className="mt-6 text-[clamp(2rem,7vw,2.8rem)] font-black leading-[.98] tracking-[-.045em] text-[#172554]">
                {title}
            </h1>
            <p className="mt-4 font-[var(--font-source-serif)] text-[17px] leading-7 text-[#5B6577]">
                {description}
            </p>
            {action && (
                <Link
                    href="/auth/login"
                    className="mt-8 inline-flex w-full items-center justify-center rounded-[11px] bg-[#1E40AF] py-4 text-base font-bold text-white hover:bg-[#1B3796]"
                >
                    Iniciar sesión
                </Link>
            )}
        </div>
    )
}
