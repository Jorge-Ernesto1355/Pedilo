'use client'

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { registerSchema } from '@/app/auth/lib/validation'
import { getRegisterError } from '@/app/auth/lib/client/error-message'
import { registerUser } from '@/app/auth/lib/client/register'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authClient } from '@/authClient'
import { SiteFooter } from '@/app/components/SiteFooter'

type FieldErrors = {
    name?: boolean
    email?: boolean
    password?: boolean
    confirm?: boolean
    terms?: boolean
}

const STRENGTH_COLORS = ['#DC2626', '#DC2626', '#F59E0B', '#3B82F6', '#16A34A']
const STRENGTH_WORDS = ['Muy corta', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
const STRENGTH_PCT = [0, 25, 55, 80, 100]

function getStrength(v: string) {
    let s = 0
    const isAlphaNumeric = (character: string) =>
        (character >= 'A' && character <= 'Z') ||
        (character >= 'a' && character <= 'z') ||
        (character >= '0' && character <= '9')
    if (v.length >= 8) s++
    if ([...v].some((character) => character >= 'A' && character <= 'Z')) s++
    if ([...v].some((character) => character >= '0' && character <= '9')) s++
    if ([...v].some((character) => !isAlphaNumeric(character))) s++
    return s
}

const railContainer = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
}

const railItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const errorVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    show: {
        opacity: 1,
        height: 'auto',
        marginTop: 6,
        transition: { duration: 0.25, ease: 'easeOut' as const },
    },
    exit: {
        opacity: 0,
        height: 0,
        marginTop: 0,
        transition: { duration: 0.2, ease: 'easeIn' as const },
    },
}

export default function RegisterPage() {
    const [name, setname] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [terms, setTerms] = useState(false)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [authError, setAuthError] = useState('')
    const [success, setSuccess] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: () => {
            setSuccess(true)
            router.push('/auth/login')
        },
    })
    const router = useRouter()
    const loading = registerMutation.isPending || googleLoading

    const strength = getStrength(password)

    async function handleGoogleClick() {
        if (loading) return
        setGoogleLoading(true)
        setAuthError('')
        try {
            await authClient.signIn.social({
                provider: 'google',
                callbackURL: `${window.location.origin}/auth/login`,
            })
        } catch {
            setAuthError('No pudimos iniciar sesión con Google. Intenta de nuevo.')
            setGoogleLoading(false)
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (loading) return

        const parsed = registerSchema.safeParse({ name, email, password, confirm, terms })
        if (!parsed.success) {
            const newErrors: FieldErrors = {}
            for (const issue of parsed.error.issues) {
                const field = issue.path[0]
                if (
                    typeof field === 'string' &&
                    field in
                        {
                            name: true,
                            email: true,
                            password: true,
                            confirm: true,
                            terms: true,
                        }
                ) {
                    newErrors[field as keyof FieldErrors] = true
                }
            }
            setErrors(newErrors)
            setAuthError('')
            return
        }

        setErrors({})
        setSuccess(false)
        setAuthError('')

        const { confirm: _confirm, ...payload } = parsed.data
        void _confirm
        registerMutation.mutate(payload, {
            onError: (error) => setAuthError(getRegisterError(error)),
        })
    }

    const inputClass = (invalid?: boolean) =>
        `w-full rounded-[10px] border px-[14px] py-3 font-outfit text-[15px] text-slate-900 bg-white transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100 ${
            invalid ? 'border-red-600 ring-4 ring-red-100' : 'border-slate-200'
        }`

    return (
        <div className="font-outfit text-[17px] leading-[1.6] text-slate-900 bg-white">
            {/* NAV */}
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 md:px-16">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-[9px] font-poppins text-[23px] font-black tracking-[-0.02em] text-slate-900 no-underline"
                    >
                        <span className="inline-block h-3 w-3 rounded-full bg-blue-800" />
                        Pedilo
                    </Link>
                    <div className="text-[15px] text-slate-500">
                        ¿Ya tienes una cuenta?{' '}
                        <Link
                            href="/auth/login"
                            className="font-semibold text-blue-800 hover:underline"
                        >
                            Iniciar sesión
                        </Link>
                    </div>
                </div>
            </header>

            {/* REGISTER SECTION */}
            <section id="main-content" className="bg-[#F3F7FB]">
                <div className="grid min-h-[calc(100vh-58px)] grid-cols-1 items-stretch md:grid-cols-[1.05fr_0.95fr]">
                    {/* FORM PANEL */}
                    <div className="order-1 flex items-center justify-center bg-white px-6 py-10 sm:px-10 sm:py-16">
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.16, 0.84, 0.44, 1], delay: 0.1 }}
                            className="w-full max-w-[440px]"
                        >
                            <div className="mb-[22px] inline-flex items-center gap-2 font-poppins text-sm font-bold uppercase tracking-[0.14em] text-blue-800">
                                <span className="h-[10px] w-[10px] rounded-full bg-blue-800" />
                                Pedilo
                            </div>
                            <h1 className="font-poppins text-[clamp(30px,4vw,40px)] font-black tracking-[-0.02em]">
                                Crea tu cuenta
                            </h1>
                            <p className="mb-[26px] mt-[10px] text-[16px] text-slate-500">
                                Crea tu cuenta para comenzar a configurar tu menú y recibir pedidos.
                            </p>

                            <motion.button
                                type="button"
                                onClick={() => void handleGoogleClick()}
                                disabled={loading}
                                whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(15,23,42,0.1)' }}
                                whileTap={{ scale: 0.98, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex w-full items-center justify-center gap-[11px] rounded-[11px] border border-slate-200 bg-white p-[13px] font-outfit text-[15px] font-semibold disabled:cursor-wait disabled:opacity-60"
                            >
                                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                                    <path
                                        fill="#FFC107"
                                        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
                                    />
                                    <path
                                        fill="#FF3D00"
                                        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                                    />
                                    <path
                                        fill="#4CAF50"
                                        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
                                    />
                                    <path
                                        fill="#1976D2"
                                        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
                                    />
                                </svg>
                                {googleLoading ? 'Conectando con Google…' : 'Continuar con Google'}
                            </motion.button>

                            <div className="my-[22px] flex items-center gap-[14px] text-[13px] uppercase tracking-[0.1em] text-slate-500">
                                <span className="h-px flex-1 bg-slate-200" />o
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="mb-[6px] block text-[13px] font-semibold"
                                    >
                                        Nombre completo
                                    </label>
                                    <motion.input
                                        data-testid="register-name"
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="Juan Pérez"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setname(e.target.value)}
                                        className={inputClass(errors.name)}
                                        animate={
                                            errors.name ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                                        }
                                        transition={{ duration: 0.4 }}
                                    />
                                    <AnimatePresence initial={false}>
                                        {errors.name && (
                                            <motion.p
                                                variants={errorVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                                className="overflow-hidden text-[12.5px] font-medium text-red-600"
                                            >
                                                Por favor ingresa tu nombre completo.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-[6px] block text-[13px] font-semibold"
                                    >
                                        Correo electrónico
                                    </label>
                                    <motion.input
                                        data-testid="register-email"
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="tu@negocio.com"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputClass(errors.email)}
                                        animate={
                                            errors.email ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                                        }
                                        transition={{ duration: 0.4 }}
                                    />
                                    <AnimatePresence initial={false}>
                                        {errors.email && (
                                            <motion.p
                                                variants={errorVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                                className="overflow-hidden text-[12.5px] font-medium text-red-600"
                                            >
                                                Ingresa un correo válido.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-[6px] block text-[13px] font-semibold"
                                    >
                                        Contraseña
                                    </label>
                                    <motion.input
                                        data-testid="register-password"
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Al menos 8 caracteres"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={inputClass(errors.password)}
                                        animate={
                                            errors.password ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                                        }
                                        transition={{ duration: 0.4 }}
                                    />
                                    <div className="mt-2">
                                        <div className="h-[5px] overflow-hidden rounded bg-slate-200">
                                            <motion.div
                                                className="h-full rounded"
                                                animate={{
                                                    width: `${STRENGTH_PCT[strength]}%`,
                                                    backgroundColor: STRENGTH_COLORS[strength],
                                                }}
                                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                            />
                                        </div>
                                        <motion.div
                                            key={password ? STRENGTH_WORDS[strength] : 'hint'}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-[5px] text-[12px]"
                                            style={{
                                                color: password
                                                    ? STRENGTH_COLORS[strength]
                                                    : '#64748B',
                                            }}
                                        >
                                            {password
                                                ? `Seguridad de la contraseña: ${STRENGTH_WORDS[strength]}`
                                                : 'Usa 8+ caracteres combinando letras y números'}
                                        </motion.div>
                                    </div>
                                    <AnimatePresence initial={false}>
                                        {errors.password && (
                                            <motion.p
                                                variants={errorVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                                className="overflow-hidden text-[12.5px] font-medium text-red-600"
                                            >
                                                La contraseña debe tener al menos 8 caracteres.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <label
                                        htmlFor="confirm"
                                        className="mb-[6px] block text-[13px] font-semibold"
                                    >
                                        Confirmar contraseña
                                    </label>
                                    <motion.input
                                        data-testid="register-confirm-password"
                                        id="confirm"
                                        name="confirm"
                                        type="password"
                                        placeholder="Vuelve a escribir la contraseña"
                                        autoComplete="new-password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className={inputClass(errors.confirm)}
                                        animate={
                                            errors.confirm ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                                        }
                                        transition={{ duration: 0.4 }}
                                    />
                                    <AnimatePresence initial={false}>
                                        {errors.confirm && (
                                            <motion.p
                                                variants={errorVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                                className="overflow-hidden text-[12.5px] font-medium text-red-600"
                                            >
                                                Las contraseñas no coinciden.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <label className="mt-[18px] flex items-start gap-[10px] text-[13.5px] text-slate-500">
                                    <input
                                        data-testid="register-terms"
                                        type="checkbox"
                                        name="terms"
                                        checked={terms}
                                        onChange={(e) => setTerms(e.target.checked)}
                                        aria-invalid={Boolean(errors.terms)}
                                        aria-describedby={
                                            errors.terms ? 'register-terms-error' : undefined
                                        }
                                        className="mt-[3px] h-4 w-4 flex-shrink-0 accent-blue-800"
                                    />
                                    <span>
                                        Al crear una cuenta, aceptas los{' '}
                                        <Link
                                            href="/terminos"
                                            className="font-semibold text-blue-800 hover:underline"
                                        >
                                            Términos para Clientes
                                        </Link>{' '}
                                        y la{' '}
                                        <Link
                                            href="/privacidad"
                                            className="font-semibold text-blue-800 hover:underline"
                                        >
                                            Aviso de Privacidad
                                        </Link>
                                        .
                                    </span>
                                </label>
                                <AnimatePresence initial={false}>
                                    {errors.terms && (
                                        <motion.p
                                            id="register-terms-error"
                                            variants={errorVariants}
                                            initial="hidden"
                                            animate="show"
                                            exit="exit"
                                            className="overflow-hidden text-[12.5px] font-medium text-red-600"
                                        >
                                            Debes aceptar los términos para continuar.
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence initial={false}>
                                    {authError && (
                                        <motion.p
                                            role="alert"
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="mb-4 text-center text-[12.5px] font-medium text-red-600"
                                        >
                                            {authError}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    data-testid="register-submit"
                                    type="submit"
                                    disabled={loading}
                                    aria-busy={loading}
                                    whileHover={
                                        !loading
                                            ? {
                                                  y: -2,
                                                  boxShadow: '0 10px 24px rgba(30,64,175,0.35)',
                                              }
                                            : {}
                                    }
                                    whileTap={!loading ? { scale: 0.98, y: 0 } : {}}
                                    animate={{ backgroundColor: success ? '#16A34A' : '#1E40AF' }}
                                    transition={{ duration: 0.2 }}
                                    className="relative mt-[18px] flex w-full items-center justify-center rounded-[11px] border-none p-[15px] font-poppins text-[16px] font-bold text-white"
                                >
                                    <AnimatePresence mode="wait" initial={false}>
                                        {loading ? (
                                            <motion.span
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="inline-block h-5 w-5 animate-spin rounded-full border-[2.5px] border-white/40 border-t-white"
                                            />
                                        ) : success ? (
                                            <motion.span
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                Cuenta creada ✓
                                            </motion.span>
                                        ) : (
                                            <motion.span
                                                key="idle"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                Crear cuenta
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            </form>

                            <p className="mt-5 text-center text-[14px] text-slate-500">
                                ¿Ya tienes una cuenta?{' '}
                                <Link
                                    href="/auth/login"
                                    className="font-semibold text-blue-800 hover:underline"
                                >
                                    Iniciar sesión
                                </Link>
                            </p>
                        </motion.div>
                    </div>

                    {/* OUTCOMES RAIL */}

                    <div className="relative order-2 flex flex-col justify-center overflow-hidden bg-[#F3F7FB] px-6 py-10 sm:px-10 sm:py-16">
                        <span
                            aria-hidden
                            className="pointer-events-none absolute -right-16 -top-16 select-none font-poppins text-[clamp(180px,26vw,320px)] font-black leading-[0.8] text-[#E4EDF7]"
                        >
                            M
                        </span>

                        <motion.div
                            variants={railContainer}
                            initial="hidden"
                            animate="show"
                            className="relative z-10 max-w-[460px]"
                        >
                            <motion.div
                                variants={railItem}
                                className="mb-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-blue-800"
                            >
                                Hecho para hacer crecer tu negocio
                            </motion.div>

                            <motion.div
                                variants={railItem}
                                className="mb-[26px] flex items-start gap-4"
                            >
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 5h18" />
                                        <path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5" />
                                        <path d="M8 9h8" />
                                        <path d="M8 13h5" />
                                    </svg>
                                </div>

                                <div>
                                    <div className="font-poppins text-[20px] font-bold tracking-[-0.01em]">
                                        Tu menú, siempre disponible
                                    </div>
                                    <div className="mt-[2px] text-[14.5px] text-slate-500">
                                        Muestra tus productos, precios y opciones desde cualquier
                                        dispositivo.
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={railItem}
                                className="mb-[26px] flex items-start gap-4"
                            >
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M5 12h14" />
                                        <path d="m13 6 6 6-6 6" />
                                    </svg>
                                </div>

                                <div>
                                    <div className="font-poppins text-[20px] font-bold tracking-[-0.01em]">
                                        Recibe pedidos sin complicaciones
                                    </div>
                                    <div className="mt-[2px] text-[14.5px] text-slate-500">
                                        Tus clientes hacen su pedido y tú recibes toda la
                                        información lista para atenderlo.
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={railItem}
                                className="mb-[26px] flex items-start gap-4"
                            >
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                                    <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                </div>

                                <div>
                                    <div className="font-poppins text-[20px] font-bold tracking-[-0.01em]">
                                        Más pedidos, menos trabajo
                                    </div>
                                    <div className="mt-[2px] text-[14.5px] text-slate-500">
                                        Automatiza parte de tu proceso y dedica más tiempo a tus
                                        clientes.
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={railItem}
                                whileHover={{
                                    y: -4,
                                    boxShadow: '0 18px 48px rgba(15,23,42,0.1)',
                                }}
                                transition={{ duration: 0.25 }}
                                className="mt-[14px] rounded-2xl border border-slate-200 bg-white p-[26px] shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
                            >
                                <blockquote className="mb-[18px] font-poppins text-[17.5px] font-light leading-[1.5] tracking-[-0.01em]">
                                    &ldquo;Ahora mis clientes pueden ver el menú y hacer su pedido
                                    sin tener que preguntarme qué hay disponible.&rdquo;
                                </blockquote>

                                <div className="flex items-center gap-[13px]">
                                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-blue-100 font-poppins text-[18px] font-bold text-blue-800">
                                        M
                                    </div>

                                    <div>
                                        <div className="text-[14.5px] font-semibold">
                                            Propietario de negocio
                                        </div>
                                        <div className="text-[13px] text-slate-500">
                                            Emprendedor
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* TRUST STRIP (logos/badges pueden agregarse aquí) */}
            <section className="border-t border-slate-200 bg-[#F3F7FB]">
                <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-5 py-6 md:px-16" />
            </section>

            {/* REASSURANCE BAND */}
            <section className="relative isolate overflow-hidden bg-slate-900 text-white">
                <div
                    className="absolute inset-0 -z-10 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            'linear-gradient(115deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.78) 46%, rgba(15,23,42,0.4) 100%), url(/reassurance-bg.jpg)',
                    }}
                />
                <div className="mx-auto max-w-[680px] px-5 py-[clamp(72px,11vw,140px)] md:px-16" />
            </section>

            <SiteFooter />
        </div>
    )
}
