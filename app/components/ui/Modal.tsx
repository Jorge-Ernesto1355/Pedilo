'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = {
    open: boolean
    title: string
    description?: string
    onClose: () => void
    children: ReactNode
    size?: 'sm' | 'lg' | 'xl'
    closeDisabled?: boolean
}

export function Modal({
    open,
    title,
    description,
    onClose,
    children,
    size = 'sm',
    closeDisabled = false,
}: ModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !closeDisabled) onClose()
            if (event.key !== 'Tab') return

            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )
            if (!focusable?.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [closeDisabled, onClose, open])

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-[#0B1730]/35 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-[3px] sm:items-center sm:p-6"
                    role="presentation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target && !closeDisabled) onClose()
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        aria-describedby={description ? 'modal-description' : undefined}
                        className={`flex max-h-[calc(100dvh-0.5rem)] w-full min-h-0 flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_28px_90px_-34px_rgba(13,36,87,.4)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] ${size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'}`}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8EEF6] px-4 py-4 sm:gap-5 sm:px-7 sm:py-5">
                            <div>
                                <h2
                                    id="modal-title"
                                    className="font-display text-xl tracking-[-.035em] text-[#12234A]"
                                >
                                    {title}
                                </h2>
                                {description && (
                                    <p
                                        id="modal-description"
                                        className="mt-1.5 text-sm leading-6 text-[#65738A]"
                                    >
                                        {description}
                                    </p>
                                )}
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={onClose}
                                disabled={closeDisabled}
                                aria-label="Cerrar"
                                className="grid size-9 shrink-0 place-items-center rounded-lg text-[#65738A] transition hover:bg-[#F0F4FA] hover:text-[#12234A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 disabled:cursor-wait disabled:opacity-40"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-5">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
