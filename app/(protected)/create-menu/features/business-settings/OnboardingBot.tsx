'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { X } from 'lucide-react'

const BotAvatarCanvas = dynamic(() => import('bot-avatars').then((module) => module.BotAvatar), {
    ssr: false,
})

type OnboardingBotProps = {
    hasBusiness: boolean
    hasWhatsapp: boolean
    isNewBusiness: boolean
    businessId: string | null
    whatsappCardId: string
    whatsappInputRef: RefObject<HTMLInputElement | null>
    didSaveWhatsapp: boolean
}

export function OnboardingBot({
    hasBusiness,
    hasWhatsapp,
    isNewBusiness,
    businessId,
    whatsappCardId,
    whatsappInputRef,
    didSaveWhatsapp,
}: OnboardingBotProps) {
    const [visible, setVisible] = useState(false)
    const [messageOpen, setMessageOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [complete, setComplete] = useState(false)
    const [exiting, setExiting] = useState(false)
    const celebrationRef = useRef(false)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dismissKey = `pedilo:onboarding-whatsapp-dismissed:${businessId ?? whatsappCardId}`
    const isComplete = complete || didSaveWhatsapp

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)')
        const updateSize = () => setIsMobile(media.matches)
        updateSize()
        media.addEventListener('change', updateSize)
        return () => media.removeEventListener('change', updateSize)
    }, [])

    useEffect(() => {
        if (!hasBusiness || hasWhatsapp || complete || didSaveWhatsapp) return

        let dismissed = false
        try {
            dismissed = window.sessionStorage.getItem(dismissKey) === 'true'
        } catch {
            // The assistant remains usable if storage is unavailable.
        }

        const showTimer = setTimeout(() => {
            setVisible(true)
            setMessageOpen(!dismissed || isNewBusiness)
        }, 800)
        return () => clearTimeout(showTimer)
    }, [businessId, complete, didSaveWhatsapp, dismissKey, hasBusiness, hasWhatsapp, isNewBusiness])

    useEffect(() => {
        if (!didSaveWhatsapp || celebrationRef.current) return
        celebrationRef.current = true
        setComplete(true)
        setVisible(true)
        setExiting(false)
        setMessageOpen(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => {
            setExiting(true)
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            hideTimer.current = setTimeout(() => setVisible(false), reducedMotion ? 0 : 260)
        }, 4000)
    }, [didSaveWhatsapp])

    useEffect(
        () => () => {
            if (hideTimer.current) clearTimeout(hideTimer.current)
        },
        [],
    )

    function closeMessage() {
        setMessageOpen(false)
        try {
            window.sessionStorage.setItem(dismissKey, 'true')
        } catch {
            // Dismissal is best effort; do not block the page if storage is unavailable.
        }
    }

    function goToWhatsapp() {
        document
            .getElementById(whatsappCardId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        whatsappInputRef.current?.focus({ preventScroll: true })
        const card = document.getElementById(whatsappCardId)
        card?.classList.add('ring-4', 'ring-indigo-200')
        window.setTimeout(() => card?.classList.remove('ring-4', 'ring-indigo-200'), 2000)
        setMessageOpen(false)
    }

    if (!visible || !hasBusiness || (hasWhatsapp && !complete && !didSaveWhatsapp)) {
        return null
    }

    return (
        <aside
            aria-label="Asistente de configuración"
            className={`pointer-events-none fixed bottom-4 right-4 z-50 flex items-end gap-3 pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:right-6 ${exiting ? 'animate-[onboarding-bot-out_250ms_ease-in_forwards] motion-reduce:animate-none' : 'animate-[onboarding-bot-in_300ms_ease-out] motion-reduce:animate-none'}`}
        >
            {messageOpen && (
                <div
                    role="status"
                    aria-live="polite"
                    className="pointer-events-auto relative w-[min(260px,calc(100vw-7rem))] origin-bottom-right animate-[onboarding-bubble-in_200ms_ease-out] rounded-[22px] border border-[#E6EAF5] bg-white p-3.5 pr-8 text-[#3B4560] shadow-[0_8px_30px_rgba(30,50,120,0.12)] motion-reduce:animate-none"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 16 22"
                        className="absolute -right-[14px] bottom-4 h-[22px] w-4 overflow-visible"
                    >
                        <path
                            d="M0.5 0.5C1.8 8 6 15.7 15 20.5L0.5 21.5V0.5Z"
                            fill="white"
                            stroke="#E6EAF5"
                            strokeLinejoin="round"
                        />
                        <path d="M0.5 1V21" stroke="white" strokeWidth="1.5" />
                    </svg>
                    <button
                        type="button"
                        onClick={closeMessage}
                        aria-label="Cerrar mensaje"
                        className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md text-[#9AA3B5] transition hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                    <p className="text-sm font-semibold leading-[1.45]">
                        {isComplete
                            ? '¡Listo! Ya puedes recibir pedidos por WhatsApp. 🎉'
                            : '¡Hola! 👋 Antes de recibir pedidos, necesitas registrar tu número de WhatsApp para que podamos enviártelos.'}
                    </p>
                    {!isComplete && (
                        <button
                            type="button"
                            onClick={goToWhatsapp}
                            className="mt-2.5 h-9 w-full rounded-lg bg-[#2438A8] px-3 text-[13px] font-semibold text-white transition hover:bg-[#1D2F93] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                        >
                            Registrar mi número
                        </button>
                    )}
                </div>
            )}
            <button
                type="button"
                aria-label="Abrir ayuda del asistente"
                onClick={() => setMessageOpen((open) => !open)}
                className="pointer-events-auto grid shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
            >
                <BotAvatarCanvas type="clover" state="default" size={isMobile ? 56 : 72} />
            </button>
        </aside>
    )
}

export type { OnboardingBotProps }
export { OnboardingBot as default }
