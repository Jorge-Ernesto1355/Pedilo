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
    size?: 'sm' | 'lg'
}

export function Modal({ open, title, description, onClose, children, size = 'sm' }: ModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose()
            if (event.key !== 'Tab') return

            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
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
    }, [onClose, open])

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1730]/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
                    role="presentation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) onClose()
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        aria-describedby={description ? 'modal-description' : undefined}
                        className={`w-full overflow-hidden border border-[#DCE5F3] bg-white shadow-[0_28px_90px_-34px_rgba(13,36,87,.4)] sm:rounded-[24px] ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'}`}
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex items-start justify-between gap-5 border-b border-[#E8EEF6] px-5 py-5 sm:px-7">
                            <div>
                                <h2 id="modal-title" className="font-display text-xl tracking-[-.035em] text-[#12234A]">{title}</h2>
                                {description && <p id="modal-description" className="mt-1.5 text-sm leading-6 text-[#65738A]">{description}</p>}
                            </div>
                            <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#65738A] transition hover:bg-[#F0F4FA] hover:text-[#12234A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15">
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="max-h-[min(72vh,680px)] overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
