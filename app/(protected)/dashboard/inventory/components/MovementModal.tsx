'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type { Ingredient, MovementInput } from '../inventory.types'
import { formatQuantity, maxQuantity, maxQuantityLabel, unitLabels } from '../inventoryFormat'
import {
    Field,
    FormError,
    ghostButtonClass,
    inputClass,
    parseDecimal,
    primaryButtonClass,
    quantityOnly,
} from './fields'

type MovementType = MovementInput['type']

const options: { type: MovementType; label: string; hint: string }[] = [
    { type: 'PURCHASE', label: 'Compra', hint: 'Suma lo que recibiste.' },
    { type: 'WASTE', label: 'Merma', hint: 'Resta lo que se desperdició.' },
    { type: 'ADJUSTMENT', label: 'Conteo', hint: 'Fija el stock a lo que contaste.' },
]

type Props = {
    open: boolean
    ingredient: Ingredient | null
    initialType: MovementType
    isSaving: boolean
    error?: unknown
    onClose: () => void
    onSave: (input: MovementInput) => void
}

export function MovementModal(props: Props) {
    return (
        <MovementForm key={`${props.ingredient?.id ?? 'none'}:${props.initialType}`} {...props} />
    )
}

function MovementForm({ open, ingredient, initialType, isSaving, error, onClose, onSave }: Props) {
    const [type, setType] = useState<MovementType>(initialType)
    const [quantity, setQuantity] = useState('')
    const [note, setNote] = useState('')
    const [quantityError, setQuantityError] = useState('')

    const parsed = parseDecimal(quantity)
    const preview =
        ingredient && parsed !== null && parsed >= 0
            ? type === 'PURCHASE'
                ? ingredient.stock + parsed
                : type === 'WASTE'
                  ? ingredient.stock - parsed
                  : parsed
            : null

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (parsed === null || parsed < 0 || (type !== 'ADJUSTMENT' && parsed === 0)) {
            setQuantityError(
                type === 'ADJUSTMENT'
                    ? 'Escribe la cantidad contada.'
                    : 'Escribe una cantidad mayor a cero.',
            )
            return
        }
        if (ingredient && parsed > maxQuantity[ingredient.unit]) {
            setQuantityError(`El máximo es ${maxQuantityLabel[ingredient.unit]}.`)
            return
        }
        if (ingredient && (preview ?? parsed) > maxQuantity[ingredient.unit]) {
            setQuantityError(
                `El stock de un ingrediente no puede pasar de ${maxQuantityLabel[ingredient.unit]}.`,
            )
            return
        }
        if (preview !== null && preview < 0) {
            setQuantityError('No puedes restar más de lo que tienes en stock.')
            return
        }
        onSave({ type, quantity: parsed, note: note.trim() || null })
    }

    const apiError = error instanceof ApiError ? error : undefined
    return (
        <Modal
            open={open && Boolean(ingredient)}
            onClose={onClose}
            title={ingredient ? `Movimiento · ${ingredient.name}` : 'Movimiento'}
            description={
                ingredient
                    ? `Stock actual: ${formatQuantity(ingredient.stock, ingredient.unit)}`
                    : ''
            }
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={ghostButtonClass}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="movement-form"
                        disabled={isSaving}
                        className={primaryButtonClass}
                    >
                        {isSaving ? 'Guardando…' : 'Registrar'}
                    </button>
                </div>
            }
        >
            {ingredient && (
                <form id="movement-form" className="space-y-4" onSubmit={submit} noValidate>
                    <FormError
                        message={
                            error
                                ? (apiError?.message ?? 'No pudimos registrar el movimiento.')
                                : undefined
                        }
                    />
                    <div
                        role="radiogroup"
                        aria-label="Tipo de movimiento"
                        className="grid grid-cols-3 gap-2"
                    >
                        {options.map((option) => (
                            <button
                                key={option.type}
                                type="button"
                                role="radio"
                                aria-checked={type === option.type}
                                onClick={() => {
                                    setType(option.type)
                                    setQuantityError('')
                                }}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${type === option.type ? 'border-[#2451C5] bg-[#EAF0FF] text-[#1E40AF]' : 'border-[#D7E1EF] text-[#65738A] hover:bg-[#F5F8FC]'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <Field
                        label={
                            type === 'ADJUSTMENT'
                                ? `Cantidad contada (${unitLabels[ingredient.unit]})`
                                : `Cantidad (${unitLabels[ingredient.unit]})`
                        }
                        hint={options.find((option) => option.type === type)?.hint}
                        error={quantityError}
                    >
                        <input
                            name="quantity"
                            value={quantity}
                            onChange={(event) => {
                                setQuantity(quantityOnly(event.target.value))
                                setQuantityError('')
                            }}
                            inputMode="decimal"
                            placeholder="0"
                            className={inputClass}
                            autoFocus
                        />
                    </Field>
                    {preview !== null && (
                        <p className="text-sm text-[#65738A]" data-testid="movement-preview">
                            Quedará en{' '}
                            <strong className="text-[#12234A]">
                                {formatQuantity(preview, ingredient.unit)}
                            </strong>
                            {preview < 0 && ' (no puede quedar en negativo)'}
                        </p>
                    )}
                    <Field
                        label="Nota"
                        hint={`Opcional. Ej. proveedor o motivo de la merma. (${note.length}/200)`}
                    >
                        <textarea
                            name="note"
                            value={note}
                            maxLength={200}
                            rows={3}
                            onChange={(event) => setNote(event.target.value)}
                            className={`${inputClass} resize-none`}
                        />
                    </Field>
                </form>
            )}
        </Modal>
    )
}
