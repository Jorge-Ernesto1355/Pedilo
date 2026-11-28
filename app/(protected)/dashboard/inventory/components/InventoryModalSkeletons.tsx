'use client'

import type { ReactNode } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import type { Ingredient } from '../inventory.types'
import { formatQuantity } from '../inventoryFormat'
import { ghostButtonClass, primaryButtonClass } from './fields'

// Each skeleton below mirrors its modal's real header, body rows and footer
// (same title/description/size/field heights) so nothing shifts when the
// real content replaces it.

function Block({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden="true" className={`animate-pulse rounded-md bg-[#DCE7F4] ${className}`} />
    )
}

/** Mirrors `Field`: label + 42px control + optional hint line(s). */
function FieldSkeleton({
    label = 'w-24',
    hintLines = 0,
    control = 'h-[42px]',
}: {
    label?: string
    hintLines?: number
    control?: string
}) {
    return (
        <div className="space-y-1.5">
            <Block className={`h-5 ${label}`} />
            <Block className={`${control} w-full rounded-xl`} />
            {hintLines > 0 && (
                <div className="space-y-1">
                    {Array.from({ length: hintLines }, (_, index) => (
                        <Block
                            key={index}
                            className={`h-3 ${index === hintLines - 1 ? 'w-2/3' : 'w-full'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function Status({ children }: { children: ReactNode }) {
    return (
        <div role="status" aria-label="Cargando">
            {children}
        </div>
    )
}

function DisabledFooterButtons({ primary }: { primary: string }) {
    return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" disabled className={ghostButtonClass}>
                Cancelar
            </button>
            <button type="button" disabled className={primaryButtonClass}>
                {primary}
            </button>
        </div>
    )
}

export function IngredientFormModalSkeleton({
    ingredient,
    onClose,
}: {
    ingredient: Ingredient | null
    onClose: () => void
}) {
    const editing = Boolean(ingredient)
    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            description="Define cuánto tienes y cuándo quieres que te avisemos."
            size="lg"
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {editing ? (
                        <button
                            type="button"
                            disabled
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#B42318] opacity-60"
                        >
                            Archivar ingrediente
                        </button>
                    ) : (
                        <span />
                    )}
                    <DisabledFooterButtons
                        primary={editing ? 'Guardar cambios' : 'Crear ingrediente'}
                    />
                </div>
            }
        >
            <Status>
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FieldSkeleton label="w-16" />
                        <FieldSkeleton label="w-16" hintLines={editing ? 1 : 0} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {!editing && <FieldSkeleton label="w-32" hintLines={1} />}
                        <FieldSkeleton label="w-32" hintLines={2} />
                    </div>
                    <div className="space-y-4 border-t border-[#E8EEF6] pt-5">
                        <div className="space-y-2">
                            <Block className="h-6 w-64" />
                            <Block className="h-4 w-full max-w-md" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FieldSkeleton label="w-20" />
                            <FieldSkeleton label="w-24" hintLines={1} />
                        </div>
                        <Block className="h-10 w-full rounded-lg" />
                        <FieldSkeleton label="w-48" hintLines={2} />
                    </div>
                </div>
            </Status>
        </Modal>
    )
}

export function MovementModalSkeleton({
    ingredient,
    onClose,
}: {
    ingredient: Ingredient | null
    onClose: () => void
}) {
    if (!ingredient) return null
    return (
        <Modal
            open
            onClose={onClose}
            title={`Movimiento · ${ingredient.name}`}
            description={`Stock actual: ${formatQuantity(ingredient.stock, ingredient.unit)}`}
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <DisabledFooterButtons primary="Registrar" />
                </div>
            }
        >
            <Status>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((index) => (
                            <Block key={index} className="h-[42px] rounded-xl" />
                        ))}
                    </div>
                    <FieldSkeleton label="w-32" hintLines={1} />
                    <FieldSkeleton label="w-12" hintLines={1} control="h-[84px]" />
                </div>
            </Status>
        </Modal>
    )
}

/** Rows shared by the history modal skeleton and its in-modal loading state. */
export function MovementRowsSkeleton() {
    return (
        <div role="status" aria-label="Cargando" className="divide-y divide-[#F0F3F8]">
            {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex items-start justify-between gap-3 py-3">
                    <div className="space-y-1.5">
                        <Block className="h-5 w-40" />
                        <Block className="h-4 w-28" />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                        <Block className="h-5 w-20" />
                        <Block className="h-4 w-28" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function MovementHistoryModalSkeleton({
    ingredient,
    onClose,
}: {
    ingredient: Ingredient | null
    onClose: () => void
}) {
    if (!ingredient) return null
    return (
        <Modal
            open
            onClose={onClose}
            title={`Historial · ${ingredient.name}`}
            description="Cada cambio de stock queda registrado: compras, pedidos, mermas y conteos."
            size="lg"
        >
            <MovementRowsSkeleton />
        </Modal>
    )
}

export function InventorySettingsModalSkeleton({ onClose }: { onClose: () => void }) {
    return (
        <Modal
            open
            onClose={onClose}
            title="Configuración de inventario"
            description="Cuándo avisar y qué hacer cuando falta stock."
            size="lg"
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <DisabledFooterButtons primary="Guardar configuración" />
                </div>
            }
        >
            <Status>
                <div className="space-y-5">
                    <Block className="h-[66px] w-full rounded-xl" />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FieldSkeleton label="w-44" hintLines={2} />
                        <FieldSkeleton label="w-32" hintLines={2} />
                    </div>
                    <FieldSkeleton label="w-48" hintLines={1} />
                    <div className="space-y-2">
                        <Block className="h-5 w-64" />
                        {[0, 1, 2].map((index) => (
                            <Block key={index} className="h-[62px] w-full rounded-xl" />
                        ))}
                        <div className="space-y-1">
                            <Block className="h-3 w-full" />
                            <Block className="h-3 w-3/4" />
                        </div>
                    </div>
                </div>
            </Status>
        </Modal>
    )
}
