'use client'

import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { verifyEmail } from '@/app/(protected)/dashboard/account/accountApi'
import { ApiError } from '@/app/auth/lib/client/api-error'

function errorMessage(error: unknown) {
    if (!(error instanceof ApiError)) return 'No pudimos conectar con el servidor. Inténtalo de nuevo.'
    if (error.status === 410 || error.code?.includes('EXPIRED')) return 'Este enlace expiró. Solicita un nuevo correo de verificación.'
    if (error.code?.includes('USED')) return 'Este enlace ya fue utilizado. Tu email podría estar verificado.'
    if (error.status === 400 || error.status === 401) return 'Este enlace no es válido. Solicita un nuevo correo de verificación.'
    return 'No pudimos verificar tu email. Inténtalo de nuevo.'
}

export default function VerifyEmailPage() {
    const token = useSearchParams().get('token')
    const mutation = useMutation({ mutationFn: verifyEmail })
    const { mutate, isIdle } = mutation
    const missingToken = !token

    useEffect(() => {
        if (token && isIdle) mutate(token)
    }, [isIdle, mutate, token])
    if (missingToken) return <VerifyState error="Este enlace de verificación no es válido porque no contiene un token." />
    if (mutation.isPending) return <VerifyState loading />
    if (mutation.isSuccess) return <VerifyState success />
    return <VerifyState error={errorMessage(mutation.error)} />
}

function VerifyState({ loading, success, error }: { loading?: boolean; success?: boolean; error?: string }) {
    return <main id="main-content" className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10"><section className="w-full max-w-[480px] rounded-[24px] border border-[#E0E7F1] bg-white p-7 text-center shadow-[0_24px_70px_-28px_rgba(30,64,175,.25)] sm:p-10">{loading ? <><LoaderCircle className="mx-auto size-12 animate-spin text-[#1E40AF]" /><h1 className="mt-5 font-display text-2xl text-[#12234A]">Verificando tu email…</h1><p className="mt-2 text-sm text-[#65738A]">Estamos confirmando tu enlace.</p></> : success ? <><CheckCircle2 className="mx-auto size-14 text-[#23814C]" /><h1 className="mt-5 font-display text-2xl text-[#12234A]">Email verificado correctamente</h1><p className="mt-2 text-sm text-[#65738A]">Tu cuenta ya está lista para continuar.</p><Link href="/dashboard" className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-[#1E40AF] px-5 py-3 text-sm font-bold text-white">Continuar</Link></> : <><AlertTriangle className="mx-auto size-14 text-[#B42318]" /><h1 className="mt-5 font-display text-2xl text-[#12234A]">No pudimos verificar tu email</h1><p className="mt-2 text-sm leading-6 text-[#65738A]">{error}</p><Link href="/auth/login" className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-[#C9D7EA] px-5 py-3 text-sm font-bold text-[#2451C5]">Volver a iniciar sesión</Link></>}</section></main>
}
