'use client'

import { useState, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { Inter, Source_Serif_4 } from 'next/font/google'
import { loginSchema } from '@/app/auth/lib/validation'
import { networkAuthError, safeAuthError } from '@/app/auth/lib/client/error-message'
import Link from 'next/link'
import { SiteFooter } from '@/app/components/SiteFooter'

// ---------------------------------------------------------------------------
// Fuentes (equivalente a los <link> de Google Fonts del HTML original)
// ---------------------------------------------------------------------------
const inter = Inter({
    subsets: ['latin'],
    weight: ['300', '400', '700', '900'],
    style: ['normal', 'italic'],
    variable: '--font-inter',
})

const sourceSerif = Source_Serif_4({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-source-serif',
})

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" {...props}>
            <path
                fill="#4285F4"
                d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.5-9.4 6.5-16.2z"
            />
            <path
                fill="#34A853"
                d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.3 15.5 46 24 46z"
            />
            <path
                fill="#FBBC05"
                d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.7l7.3-5.4z"
            />
            <path
                fill="#EA4335"
                d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.7 4.5 14.3l7.3 5.7c1.7-5.2 6.5-9.3 12.2-9.3z"
            />
        </svg>
    )
}

// ---------------------------------------------------------------------------
// Tipos de estado del formulario
// ---------------------------------------------------------------------------
type FieldState = 'idle' | 'valid' | 'invalid'

const reveal = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
}

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [emailState, setEmailState] = useState<FieldState>('idle')
    const [passState, setPassState] = useState<FieldState>('idle')
    const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>(
        {},
    )
    const [authError, setAuthError] = useState('')
    const [remember, setRemember] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (loading) return

        const parsed = loginSchema.safeParse({ email, password, remember })
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors
            setValidationErrors({
                email: fieldErrors.email?.[0],
                password: fieldErrors.password?.[0],
            })
            setEmailState(fieldErrors.email ? 'invalid' : 'valid')
            setPassState(fieldErrors.password ? 'invalid' : 'valid')
            setAuthError('')
            return
        }

        setValidationErrors({})
        setLoading(true)
        setSuccess(false)
        setAuthError('')

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed.data),
                credentials: 'same-origin',
            })
            if (!response.ok) {
                if (response.status === 429) {
                    setAuthError('Demasiados intentos. Intenta de nuevo más tarde.')
                } else if (response.status === 502 || response.status === 503) {
                    setAuthError('No se pudo conectar con el servidor. Intenta de nuevo.')
                } else if (response.status === 504) {
                    setAuthError('El servidor tardó demasiado. Intenta de nuevo.')
                } else {
                    setAuthError(safeAuthError(response.status, 'login'))
                }
                return
            }
            setSuccess(true)
            // Force a fresh server render so the previous account's RSC tree
            // cannot be reused after a successful login.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign('/dashboard')
        } catch {
            setAuthError(networkAuthError)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main
            id="main-content"
            className={`${inter.variable} ${sourceSerif.variable} grid min-h-screen grid-cols-1 bg-[#F5F7FB] font-[var(--font-space-grotesk)] md:grid-cols-[1fr_1.15fr]`}
        >
            {/* ============ IZQUIERDA: panel de historia ============ */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative isolate flex min-h-[auto] flex-col justify-between overflow-hidden bg-[#1E40AF] p-8 text-white sm:p-12 md:min-h-screen lg:p-16"
            >
                {/* imagen de fondo */}
                <div className="absolute inset-0 -z-20 opacity-[.28]">
                    <Image
                        src="/reassurance-bg.jpg"
                        alt=""
                        fill
                        priority
                        className="object-cover object-center"
                    />
                </div>
                {/* velos de degradado */}
                <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#1E40AF]/[.82] to-[#0F1E6E]/[.92]" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1E40AF]/35 to-[#0F1E5A]/55" />

                {/* logo */}
                <motion.a
                    href="/"
                    aria-label="Inicio de Pedilo"
                    className="flex items-center gap-2.5 font-[var(--font-inter)] text-xl font-black tracking-tight"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12 }}
                    whileHover={{ x: 3 }}
                >
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-white text-sm font-black text-[#1E40AF]">
                        P
                    </span>
                    Pedilo
                </motion.a>

                {/* mensaje central */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    transition={{ staggerChildren: 0.12, delayChildren: 0.18 }}
                    className="max-w-none md:max-w-[40ch]"
                >
                    <motion.p
                        variants={reveal}
                        transition={{ duration: 0.45 }}
                        className="mb-4 font-[var(--font-inter)] text-xs font-bold uppercase tracking-[.22em] text-white/70"
                    >
                        Tu negocio, en control
                    </motion.p>
                    <motion.h1
                        variants={reveal}
                        transition={{ duration: 0.55 }}
                        className="mb-5 font-[var(--font-fraunces)] text-[clamp(2.2rem,10vw,4.8rem)] font-black leading-[.92] tracking-[-.04em] md:text-[clamp(2.8rem,5.2vw,4.9rem)]"
                    >
                        Todo empieza aquí.
                    </motion.h1>
                    <motion.p
                        variants={reveal}
                        transition={{ duration: 0.55 }}
                        className="max-w-none font-[var(--font-source-serif)] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-[1.6] text-white/90 md:max-w-[34ch]"
                    >
                        Administra pedidos, inventario, ventas e informes desde un solo lugar. Menos
                        complicaciones, más tiempo para hacer crecer tu negocio.
                    </motion.p>
                </motion.div>

                {/* pie de página */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.56 }}
                    className="mt-8 max-w-none md:mt-0 md:max-w-[40ch]"
                >
                    <p className="mb-4 border-t border-white/20 pt-5 font-[var(--font-inter)] text-[13px] tracking-[.02em] text-white/75">
                        Organiza tu menú y recibe pedidos con más claridad.
                    </p>
                    <Link
                        href="/auth/register"
                        className="group inline-flex items-center gap-[7px] font-[var(--font-inter)] text-[15px] font-bold text-white"
                    >
                        &iquest;Eres nuevo en Pedilo? Crea una cuenta
                        <span className="transition-all duration-300 group-hover:translate-x-1">
                            →
                        </span>
                    </Link>
                </motion.div>
            </motion.section>

            {/* ============ DERECHA: panel blanco ============ */}
            <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-18">
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.12 }}
                    className="mx-auto w-full max-w-[440px]"
                >
                    {/* tarjeta de inicio de sesión */}
                    <section className="rounded-[20px] border border-[#EAECF2] bg-white p-7 shadow-[0_24px_60px_-20px_rgba(30,64,175,.16),0_4px_14px_rgba(16,24,40,.05)] sm:p-9 lg:p-11">
                        <h2 className="mb-2 font-[var(--font-inter)] text-[clamp(1.8rem,3vw,2.3rem)] font-black tracking-[-.03em] text-[#1D4ED8]">
                            Tu negocio te espera
                        </h2>
                        <p className="mb-7 font-[var(--font-source-serif)] text-[15px] text-[#5B6577]">
                            Inicia sesi&oacute;n en tu cuenta de Pedilo.
                        </p>

                        <form noValidate onSubmit={handleSubmit}>
                            {/* email */}
                            <motion.div
                                animate={
                                    emailState === 'invalid' ? { x: [-7, 7, -5, 0] } : { x: 0 }
                                }
                                transition={{ duration: 0.3 }}
                                className="mb-5"
                            >
                                <label
                                    htmlFor="email"
                                    className="mb-2 block font-[var(--font-inter)] text-[13px] font-bold tracking-[.01em] text-[#1A202C]"
                                >
                                    Correo electr&oacute;nico
                                </label>
                                <div className="relative">
                                    <input
                                        data-testid="login-email"
                                        type="email"
                                        aria-label="Correo electrónico"
                                        id="email"
                                        name="email"
                                        autoComplete="email"
                                        placeholder="you@yourbusiness.com"
                                        required
                                        aria-describedby="err-email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setEmailState('idle')
                                            setValidationErrors((current) => ({
                                                ...current,
                                                email: undefined,
                                            }))
                                            setAuthError('')
                                        }}
                                        className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-4 py-3.5 font-[var(--font-source-serif)] text-base text-[#1A202C] transition-colors placeholder:text-[#A6ADBC] focus:border-[#1E40AF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/[.14] ${
                                            emailState === 'invalid'
                                                ? 'border-[#D92D20] bg-[#FFFBFA]'
                                                : emailState === 'valid'
                                                  ? 'border-[#12996a]'
                                                  : 'border-[#DCE0EA]'
                                        }`}
                                    />
                                </div>
                                <AnimatePresence initial={false}>
                                    {emailState === 'invalid' && (
                                        <motion.p
                                            id="err-email"
                                            initial={{ opacity: 0, height: 0, y: -4 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -4 }}
                                            className="mt-[7px] font-[var(--font-inter)] text-[12.5px] text-[#B42318]"
                                        >
                                            {validationErrors.email ??
                                                'Ingresa un correo electrónico válido.'}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* password */}
                            <motion.div
                                animate={passState === 'invalid' ? { x: [-7, 7, -5, 0] } : { x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mb-5"
                            >
                                <label
                                    htmlFor="password"
                                    className="mb-2 block font-[var(--font-inter)] text-[13px] font-bold tracking-[.01em] text-[#1A202C]"
                                >
                                    Contrase&ntilde;a
                                </label>
                                <div className="relative">
                                    <input
                                        data-testid="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        aria-label="Contraseña"
                                        name="password"
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        required
                                        aria-describedby="err-pass"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setPassState('idle')
                                            setValidationErrors((current) => ({
                                                ...current,
                                                password: undefined,
                                            }))
                                            setAuthError('')
                                        }}
                                        className={`w-full rounded-[11px] border-[1.5px] bg-[#FBFCFE] px-4 py-3.5 pr-16 font-[var(--font-source-serif)] text-base text-[#1A202C] transition-colors placeholder:text-[#A6ADBC] focus:border-[#1E40AF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/[.14] ${
                                            passState === 'invalid'
                                                ? 'border-[#D92D20] bg-[#FFFBFA]'
                                                : passState === 'valid'
                                                  ? 'border-[#12996a]'
                                                  : 'border-[#DCE0EA]'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        aria-pressed={showPassword}
                                        aria-label={
                                            showPassword
                                                ? 'Ocultar contraseña'
                                                : 'Mostrar contraseña'
                                        }
                                        onClick={() => setShowPassword((s) => !s)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 font-[var(--font-inter)] text-xs font-bold uppercase tracking-[.06em] text-[#1E40AF] transition-colors hover:bg-[#1E40AF]/[.08]"
                                    >
                                        {showPassword ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                                <AnimatePresence initial={false}>
                                    {passState === 'invalid' && (
                                        <motion.p
                                            id="err-pass"
                                            initial={{ opacity: 0, height: 0, y: -4 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -4 }}
                                            className="mt-[7px] font-[var(--font-inter)] text-[12.5px] text-[#B42318]"
                                        >
                                            {validationErrors.password ?? 'Ingresa tu contraseña.'}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* recordarme / olvidé contraseña */}
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-2 font-[var(--font-source-serif)] text-sm text-[#3C4557]">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="h-[17px] w-[17px] cursor-pointer accent-[#1E40AF]"
                                    />
                                    Recu&eacute;rdame
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="font-[var(--font-inter)] text-[13.5px] font-bold text-[#1E40AF] hover:underline"
                                >
                                    &iquest;Olvidaste tu contrase&ntilde;a?
                                </Link>
                            </div>

                            <AnimatePresence initial={false}>
                                {authError && (
                                    <motion.p
                                        role="alert"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mb-4 text-center font-[var(--font-inter)] text-sm font-semibold text-[#B42318]"
                                    >
                                        {authError}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* botón enviar */}
                            <motion.button
                                data-testid="login-submit"
                                type="submit"
                                disabled={loading}
                                aria-busy={loading}
                                whileHover={
                                    loading
                                        ? undefined
                                        : {
                                              y: -2,
                                              boxShadow: '0 14px 26px -8px rgba(30,64,175,.55)',
                                          }
                                }
                                whileTap={loading ? undefined : { scale: 0.98 }}
                                className="flex w-full items-center justify-center gap-2.5 rounded-[11px] bg-[#1E40AF] py-4 font-[var(--font-inter)] text-base font-bold tracking-[.01em] text-white shadow-[0_10px_22px_-8px_rgba(30,64,175,.5)] transition-transform hover:bg-[#1B3796] active:scale-[.982] disabled:cursor-progress disabled:opacity-85"
                            >
                                {loading && (
                                    <span
                                        aria-hidden="true"
                                        className="h-[17px] w-[17px] animate-spin rounded-full border-[2.5px] border-white/40 border-t-white"
                                    />
                                )}
                                <span className={loading ? 'opacity-85' : ''}>
                                    Iniciar sesi&oacute;n
                                </span>
                            </motion.button>

                            <AnimatePresence>
                                {success && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mt-4 text-center font-[var(--font-inter)] text-sm font-bold text-[#12996a]"
                                    >
                                        Sesi&oacute;n iniciada. Te llevamos a tu panel...
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* separador */}
                            <div
                                role="separator"
                                className="my-6 flex items-center gap-3.5 font-[var(--font-inter)] text-xs font-bold uppercase tracking-[.14em] text-[#9AA2B2] before:h-px before:flex-1 before:bg-[#E6E9F0] before:content-[''] after:h-px after:flex-1 after:bg-[#E6E9F0] after:content-['']"
                            >
                                o
                            </div>

                            {/* botón Google */}
                            <motion.button
                                disabled
                                type="button"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.985 }}
                                className="flex w-full items-center justify-center gap-[11px] rounded-[11px] border-[1.5px] border-[#DCE0EA] bg-white py-3.5 font-[var(--font-inter)] text-[15px] font-bold text-[#1A202C] transition-colors hover:border-[#B9C0D0] hover:bg-[#FAFBFD] active:scale-[.985]"
                            >
                                <GoogleIcon aria-hidden="true" className="opacity-45" />
                                Google estará disponible próximamente
                            </motion.button>
                        </form>
                    </section>

                    {/* fila de confianza */}

                    {/* CTA secundario */}
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.45 }}
                        className="mt-8 border-t border-[#EDEFF4] pt-6 text-center"
                    >
                        <p className="mb-4 font-[var(--font-source-serif)] text-[15px] text-[#3C4557]">
                            &iquest;A&uacute;n no tienes una cuenta?{' '}
                            <Link
                                href={RedirectedUrls.register}
                                className="group inline-flex items-center gap-1.5 font-[var(--font-inter)] font-bold text-[#1E40AF]"
                            >
                                Crea una cuenta
                                <span className="transition-all duration-300 group-hover:translate-x-1">
                                    →
                                </span>
                            </Link>
                        </p>
                    </motion.section>
                </motion.div>
            </div>
            <SiteFooter />
        </main>
    )
}

export const RedirectedUrls = {
    login: '/auth/login',
    createMenu: '/create-menu',
    register: '/auth/register',
}
