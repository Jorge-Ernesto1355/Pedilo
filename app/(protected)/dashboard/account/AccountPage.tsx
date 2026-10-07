'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    ShieldCheck,
    Users,
    ShoppingBag,
    Wallet,
} from 'lucide-react'
import { accountNameSchema, passwordSchema } from '@/app/auth/lib/validation'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { useAccount, useAccountMutations } from './useAccount'
import { AccountSkeleton } from './AccountSkeleton'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { useAuthStore } from '@/store/authStore'

function formatDate(value: string) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? '—'
        : new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date)
}

function formatMoney(value: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
    }).format(value)
}

const VERIFICATION_COOLDOWN_SECONDS = 5 * 60

function formatCooldown(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function ActionButton({
    children,
    loading,
    disabled,
    onClick,
    type = 'submit',
}: {
    children: React.ReactNode
    loading?: boolean
    disabled?: boolean
    onClick?: () => void
    type?: 'button' | 'submit'
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991] disabled:cursor-wait disabled:opacity-60"
        >
            {loading && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {children}
        </button>
    )
}

function PasswordInput({
    id,
    label,
    value,
    onChange,
    autoComplete,
    error,
}: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    autoComplete: string
    error?: string
}) {
    const [visible, setVisible] = useState(false)
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#243556]">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete={autoComplete}
                    aria-invalid={Boolean(error)}
                    className={`w-full rounded-xl border bg-[#FBFCFE] px-3.5 py-3 pr-11 text-sm text-[#12234A] outline-none transition focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10 ${error ? 'border-[#D92D20]' : 'border-[#DCE5F3]'}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#65738A] hover:bg-[#EEF3FF]"
                    aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-[#B42318]" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}

export default function AccountPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const clearUser = useAuthStore((state) => state.clearUser)
    const account = useAccount()
    const mutations = useAccountMutations()
    const [name, setName] = useState<string | null>(null)
    const [nameError, setNameError] = useState('')
    const [verificationSent, setVerificationSent] = useState(false)
    const [verificationCooldownSeconds, setVerificationCooldownSeconds] = useState(0)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
    const [passwordErrors, setPasswordErrors] = useState<{
        currentPassword?: string
        newPassword?: string
        confirmPassword?: string
    }>({})

    useEffect(() => {
        if (verificationCooldownSeconds <= 0) return
        const interval = window.setInterval(() => {
            setVerificationCooldownSeconds((current) => Math.max(0, current - 1))
        }, 1000)
        return () => window.clearInterval(interval)
    }, [verificationCooldownSeconds])

    function markVerificationSent() {
        setVerificationSent(true)
        setVerificationCooldownSeconds(VERIFICATION_COOLDOWN_SECONDS)
    }

    if (account.isLoading) return <AccountSkeleton />
    if (account.isError || !account.data)
        return (
            <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8">
                <DashboardErrorState
                    title="No pudimos cargar tu cuenta"
                    description="La información de tu cuenta no está disponible en este momento. Inténtalo nuevamente."
                    onRetry={() => void account.refetch()}
                />
            </main>
        )

    const data = account.data
    const currentName = name ?? data.name

    function submitName(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const parsed = accountNameSchema.safeParse(currentName)
        if (!parsed.success) {
            setNameError(parsed.error.issues[0]?.message ?? 'Ingresa un nombre válido.')
            return
        }
        setNameError('')
        mutations.updateName.mutate(parsed.data, { onSuccess: () => setName(parsed.data) })
    }

    function submitPassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const nextErrors: typeof passwordErrors = {}
        if (!currentPassword) nextErrors.currentPassword = 'Ingresa tu contraseña actual.'
        const parsed = passwordSchema.safeParse(newPassword)
        if (!parsed.success) nextErrors.newPassword = parsed.error.issues[0]?.message
        if (!confirmPassword) nextErrors.confirmPassword = 'Confirma tu contraseña.'
        else if (newPassword !== confirmPassword)
            nextErrors.confirmPassword = 'Las contraseñas no coinciden.'
        setPasswordErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return
        mutations.changePassword.mutate(
            { currentPassword, newPassword },
            {
                onSuccess: () => {
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordErrors({})
                },
            },
        )
    }

    const mutationError = mutations.changePassword.error
    const currentPasswordError =
        mutationError instanceof ApiError &&
        (mutationError.code === 'CURRENT_PASSWORD_INCORRECT' || mutationError.status === 401)
            ? 'La contraseña actual es incorrecta.'
            : undefined

    const deleteAccountError = mutations.removeAccount.error
        ? getUserFriendlyError(mutations.removeAccount.error, {
              fallback: {
                  title: 'No se pudo borrar la cuenta',
                  description: 'Inténtalo nuevamente.',
              },
          }).description
        : 'No pudimos borrar tu cuenta. Inténtalo nuevamente.'

    return (
        <main className="mx-auto max-w-[1100px] space-y-6 px-5 py-8 sm:px-8 lg:py-10">
            <header>
                <p className="text-sm font-semibold text-[#65738A]">Preferencias personales</p>
                <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                    Cuenta
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65738A]">
                    Administra tu información personal, seguridad y verificación de correo.
                </p>
            </header>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                <article className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8996A9]">
                                Perfil
                            </p>
                            <h2 className="mt-2 font-display text-xl text-[#12234A]">
                                Información de cuenta
                            </h2>
                        </div>
                        <span className="grid size-10 place-items-center rounded-xl bg-[#EAF0FF] text-[#1E40AF]">
                            <Users className="size-5" />
                        </span>
                    </div>
                    <dl className="mt-6 divide-y divide-[#E8EEF6] text-sm">
                        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                            <dt className="font-semibold text-[#65738A]">Nombre</dt>
                            <dd className="font-semibold text-[#12234A]">{data.name || '—'}</dd>
                        </div>
                        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                            <dt className="font-semibold text-[#65738A]">Email</dt>
                            <dd className="break-all text-[#243556]">{data.email || '—'}</dd>
                        </div>
                        <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                            <dt className="font-semibold text-[#65738A]">Creada el</dt>
                            <dd className="text-[#243556]">{formatDate(data.createdAt)}</dd>
                        </div>
                    </dl>
                    <form onSubmit={submitName} className="mt-5 border-t border-[#E8EEF6] pt-5">
                        <label
                            htmlFor="account-name"
                            className="mb-2 block text-sm font-semibold text-[#243556]"
                        >
                            Editar nombre
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                id="account-name"
                                name="name"
                                autoComplete="name"
                                value={currentName}
                                onChange={(event) => {
                                    setName(event.target.value)
                                    setNameError('')
                                }}
                                className={`min-h-10 w-full rounded-xl border bg-[#FBFCFE] px-3.5 text-sm text-[#12234A] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10 ${nameError ? 'border-[#D92D20]' : 'border-[#DCE5F3]'}`}
                                aria-invalid={Boolean(nameError)}
                            />{' '}
                            <ActionButton
                                loading={mutations.updateName.isPending}
                                disabled={name === null || currentName.trim() === data.name.trim()}
                            >
                                Guardar
                            </ActionButton>
                        </div>
                        {nameError && (
                            <p className="mt-1.5 text-xs text-[#B42318]" role="alert">
                                {nameError}
                            </p>
                        )}
                    </form>
                </article>

                <article className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8996A9]">
                                Email
                            </p>
                            <h2 className="mt-2 font-display text-xl text-[#12234A]">
                                Verificación
                            </h2>
                        </div>
                        <span
                            className={`grid size-10 place-items-center rounded-xl ${data.emailVerified ? 'bg-[#E6F5EC] text-[#23814C]' : 'bg-[#FFF4DD] text-[#A15C00]'}`}
                        >
                            {data.emailVerified ? (
                                <CheckCircle2 className="size-5" />
                            ) : (
                                <Mail className="size-5" />
                            )}
                        </span>
                    </div>
                    {data.emailVerified ? (
                        <div className="mt-7 rounded-xl border border-[#CDE9D8] bg-[#F3FBF6] p-4">
                            <p className="font-bold text-[#216E41]">✓ Email verificado</p>
                            <p className="mt-1 text-sm text-[#4C765B]">
                                Tu correo está confirmado y protegido.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-7 rounded-xl border border-[#F0DDB6] bg-[#FFF9EC] p-4">
                            <p className="font-bold text-[#8A5700]">Email no verificado</p>
                            <p className="mt-1 text-sm leading-5 text-[#866B3A]">
                                Verifica tu correo para mantener tu cuenta protegida.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {!verificationSent && (
                                    <ActionButton
                                        loading={mutations.sendVerification.isPending}
                                        onClick={() =>
                                            mutations.sendVerification.mutate(undefined, {
                                                onSuccess: markVerificationSent,
                                            })
                                        }
                                        type="button"
                                    >
                                        Verificar email
                                    </ActionButton>
                                )}
                                {verificationSent && (
                                    <button
                                        type="button"
                                        disabled={
                                            verificationCooldownSeconds > 0 ||
                                            mutations.resendVerification.isPending ||
                                            mutations.sendVerification.isPending
                                        }
                                        onClick={() =>
                                            mutations.resendVerification.mutate(undefined, {
                                                onSuccess: markVerificationSent,
                                            })
                                        }
                                        className="rounded-xl border border-[#C9D7EA] px-4 py-2.5 text-sm font-bold text-[#2451C5] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {mutations.resendVerification.isPending
                                            ? 'Reenviando…'
                                            : verificationCooldownSeconds > 0
                                              ? `Reenviar en ${formatCooldown(verificationCooldownSeconds)}`
                                              : 'Reenviar'}
                                    </button>
                                )}
                            </div>
                            {verificationSent && (
                                <p className="mt-4 text-sm font-semibold text-[#216E41]">
                                    Correo enviado. Revisa tu bandeja de entrada para verificar tu
                                    email.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#F5F8FC] p-4 text-sm text-[#65738A]">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#2451C5]" />
                        <p>
                            El email es de solo lectura. Para cambiarlo, contacta al equipo de
                            soporte.
                        </p>
                    </div>
                </article>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={<Users className="size-5" />}
                    label="Clientes totales"
                    value={data.stats.customers.toLocaleString('es-MX')}
                />
                <StatCard
                    icon={<ShoppingBag className="size-5" />}
                    label="Órdenes totales"
                    value={data.stats.orders.toLocaleString('es-MX')}
                />
                <StatCard
                    icon={<Wallet className="size-5" />}
                    label="Generado desde el inicio"
                    value={formatMoney(data.stats.generated)}
                />
            </section>

            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#EAF0FF] text-[#1E40AF]">
                        <KeyRound className="size-5" />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8996A9]">
                            Seguridad
                        </p>
                        <h2 className="mt-1 font-display text-xl text-[#12234A]">
                            Cambiar contraseña
                        </h2>
                    </div>
                </div>
                <form onSubmit={submitPassword} className="mt-6 grid gap-4 md:grid-cols-3">
                    <PasswordInput
                        id="current-password"
                        label="Contraseña actual"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                        error={passwordErrors.currentPassword ?? currentPasswordError}
                    />
                    <PasswordInput
                        id="new-password"
                        label="Nueva contraseña"
                        value={newPassword}
                        onChange={(value) => {
                            setNewPassword(value)
                            setPasswordErrors((current) => ({ ...current, newPassword: undefined }))
                        }}
                        autoComplete="new-password"
                        error={passwordErrors.newPassword}
                    />
                    <PasswordInput
                        id="confirm-password"
                        label="Confirmar contraseña"
                        value={confirmPassword}
                        onChange={(value) => {
                            setConfirmPassword(value)
                            setPasswordErrors((current) => ({
                                ...current,
                                confirmPassword: undefined,
                            }))
                        }}
                        autoComplete="new-password"
                        error={passwordErrors.confirmPassword}
                    />
                    <div className="md:col-span-3">
                        <p className="text-xs text-[#65738A]">
                            Usa al menos 8 caracteres. La contraseña se envía exactamente como la
                            escribes.
                        </p>
                        <div className="mt-4">
                            <ActionButton loading={mutations.changePassword.isPending}>
                                Cambiar contraseña
                            </ActionButton>
                        </div>
                    </div>
                </form>
            </section>

            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.035)] sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#8996A9]">
                    Información y derechos
                </p>
                <h2 className="mt-2 font-display text-xl text-[#12234A]">Documentos legales</h2>
                <p className="mt-2 text-sm leading-6 text-[#65738A]">
                    Consulta cómo tratamos la información de tu cuenta y cómo presentar una
                    solicitud ARCO.
                </p>
                <nav
                    aria-label="Documentos legales de la cuenta"
                    className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#2451C5]"
                >
                    <Link href="/privacidad" className="underline underline-offset-2">
                        Aviso de Privacidad
                    </Link>
                    <Link href="/arco" className="underline underline-offset-2">
                        Procedimiento ARCO
                    </Link>
                    <a href="mailto:soporte@pedilo.mx" className="underline underline-offset-2">
                        soporte@pedilo.mx
                    </a>
                </nav>
            </section>

            <section className="rounded-2xl border border-[#F3C5C2] bg-[#FFFDFC] p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.035)] sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#B42318]">
                    Zona de peligro
                </p>
                <h2 className="mt-2 font-display text-xl text-[#12234A]">Eliminar cuenta</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65738A]">
                    Borra tu cuenta y toda la información asociada, incluyendo clientes, menús y
                    productos. Esta acción no se puede deshacer.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        mutations.removeAccount.reset()
                        setDeleteAccountOpen(true)
                    }}
                    className="mt-5 rounded-xl border border-[#E2A19C] px-4 py-2.5 text-sm font-bold text-[#B42318] transition hover:bg-[#FFF1F0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B42318]/15"
                >
                    Borrar cuenta
                </button>
            </section>

            <DeleteAccountDialog
                open={deleteAccountOpen}
                isDeleting={mutations.removeAccount.isPending}
                error={mutations.removeAccount.isError ? deleteAccountError : undefined}
                onClose={() => {
                    if (!mutations.removeAccount.isPending) setDeleteAccountOpen(false)
                }}
                onConfirm={() => {
                    if (mutations.removeAccount.isPending) return
                    mutations.removeAccount.mutate(undefined, {
                        onSuccess: () => {
                            queryClient.clear()
                            clearUser()
                            router.replace('/auth/login')
                        },
                    })
                }}
            />
        </main>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <article className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#EAF0FF] text-[#1E40AF]">
                {icon}
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-[#8996A9]">
                {label}
            </p>
            <p className="mt-2 break-words font-display text-2xl tracking-[-.04em] text-[#12234A]">
                {value}
            </p>
        </article>
    )
}
