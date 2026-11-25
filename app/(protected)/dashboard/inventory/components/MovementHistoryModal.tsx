'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import type { Ingredient } from '../inventory.types'
import { formatQuantity, movementCopy } from '../inventoryFormat'
import { useMovements } from '../useInventory'
import { MovementRowsSkeleton } from './InventoryModalSkeletons'

const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

export function MovementHistoryModal({
    ingredient,
    onClose,
}: {
    ingredient: Ingredient | null
    onClose: () => void
}) {
    return (
        <Modal
            open={Boolean(ingredient)}
            onClose={onClose}
            title={ingredient ? `Historial · ${ingredient.name}` : 'Historial'}
            description="Cada cambio de stock queda registrado: compras, pedidos, mermas y conteos."
            size="lg"
        >
            {ingredient && <History key={ingredient.id} ingredient={ingredient} />}
        </Modal>
    )
}

function History({ ingredient }: { ingredient: Ingredient }) {
    const [page, setPage] = useState(1)
    const query = useMovements(ingredient.id, page)
    const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.limit ?? 20)))

    if (query.isLoading) return <MovementRowsSkeleton />
    if (query.isError)
        return (
            <div role="alert" className="py-8 text-center text-sm text-[#B42318]">
                No pudimos cargar el historial.{' '}
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="font-bold underline"
                >
                    Reintentar
                </button>
            </div>
        )
    const movements = query.data?.movements ?? []
    if (movements.length === 0)
        return (
            <p className="py-8 text-center text-sm text-[#65738A]">
                Todavía no hay movimientos para este ingrediente.
            </p>
        )

    return (
        <div>
            <ul className="divide-y divide-[#F0F3F8]" data-testid="movement-list">
                {movements.map((movement) => (
                    <li key={movement.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#243556]">
                                {movementCopy[movement.type]}
                                {movement.note && (
                                    <span className="font-normal text-[#65738A]">
                                        {' '}
                                        · {movement.note}
                                    </span>
                                )}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8996A9]">
                                {dateTime.format(new Date(movement.createdAt))}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p
                                className={`text-sm font-bold tabular-nums ${movement.quantity < 0 ? 'text-[#A52A2A]' : 'text-[#1F6F45]'}`}
                            >
                                {movement.quantity > 0 ? '+' : ''}
                                {formatQuantity(movement.quantity, ingredient.unit)}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8996A9] tabular-nums">
                                Quedó en {formatQuantity(movement.stockAfter, ingredient.unit)}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-[#65738A]">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold hover:bg-[#F4F7FB] disabled:opacity-40"
                    >
                        <ChevronLeft className="size-4" /> Anterior
                    </button>
                    <span>
                        Página {page} de {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((current) => current + 1)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold hover:bg-[#F4F7FB] disabled:opacity-40"
                    >
                        Siguiente <ChevronRight className="size-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
