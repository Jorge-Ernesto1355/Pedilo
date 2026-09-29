'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Database, LoaderCircle, Users } from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'

type DeleteAccountDialogProps = {
    open: boolean
    isDeleting: boolean
    error?: string
    onClose: () => void
    onConfirm: () => void
}

export function DeleteAccountDialog({
    open,
    isDeleting,
    error,
    onClose,
    onConfirm,
}: DeleteAccountDialogProps) {
    const reducedMotion = useReducedMotion()

    return (
        <Modal
            open={open}
            title={isDeleting ? 'Eliminando tu cuenta…' : 'Borrar cuenta'}
            description={
                isDeleting
                    ? 'Estamos limpiando tus datos de forma segura.'
                    : 'Esta acción es permanente y no se puede deshacer.'
            }
            onClose={onClose}
            closeDisabled={isDeleting}
        >
            {isDeleting ? (
                <motion.div
                    key="deleting"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center py-4 text-center"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <div className="relative grid size-24 place-items-center text-[#B42318]">
                        {!reducedMotion && (
                            <>
                                <motion.span
                                    className="absolute inset-1 rounded-full border border-[#F4B4B0]"
                                    animate={{ scale: [0.82, 1.08], opacity: [0.8, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                                />
                                <motion.span
                                    className="absolute inset-3 rounded-full border border-dashed border-[#E88781]"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                                />
                            </>
                        )}
                        <span className="relative grid size-14 place-items-center rounded-2xl bg-[#FDECEC]">
                            <LoaderCircle
                                className={`size-7 ${reducedMotion ? '' : 'animate-spin'}`}
                                aria-hidden="true"
                            />
                        </span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-[#243556]">
                        Eliminando tus datos
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-[#65738A]">
                        Estamos eliminando clientes, menús, productos y el resto de la información asociada.
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#B42318]">
                        <Database className="size-3.5" aria-hidden="true" />
                        Este proceso puede tardar unos segundos
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="confirm"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="rounded-2xl border border-[#F3C5C2] bg-[#FFF8F7] p-4">
                        <div className="flex gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FDECEC] text-[#B42318]">
                                <AlertTriangle className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-[#8F1D18]">
                                    Perderás toda la información de tu cuenta
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#9E4A45]">
                                    No podrás recuperar estos datos después de confirmar.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-2 border-t border-[#F3C5C2] pt-3 text-sm text-[#7A3834] sm:grid-cols-3">
                            <span className="inline-flex items-center gap-2">
                                <Users className="size-4" aria-hidden="true" /> Clientes
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Database className="size-4" aria-hidden="true" /> Menús
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="size-4" aria-hidden="true" /> Productos
                            </span>
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]">
                            {error}
                        </p>
                    )}

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F5F8FC]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-xl bg-[#B42318] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgb(180_35_24_/_0.18)] transition hover:bg-[#981B14] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B42318]/20"
                        >
                            Sí, borrar mi cuenta
                        </button>
                    </div>
                </motion.div>
            )}
        </Modal>
    )
}
