'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type { Ingredient, IngredientInput, IngredientUnit, LowStockMode } from '../inventory.types'
import {
    formatQuantity,
    maxQuantity,
    maxQuantityLabel,
    unitLabels,
    unitNames,
} from '../inventoryFormat'
import {
    digitsOnly,
    Field,
    Select,
    FormError,
    ghostButtonClass,
    inputClass,
    parseDecimal,
    primaryButtonClass,
    quantityOnly,
    validPercent,
} from './fields'

type Props = {
    open: boolean
    ingredient: Ingredient | null
    defaultLowStockPercent: number
    isSaving: boolean
    isArchiving: boolean
    error?: unknown
    onClose: () => void
    onSave: (input: IngredientInput) => void
    onArchive: () => void
}

type Values = {
    name: string
    unit: IngredientUnit
    initialStock: string
    parLevel: string
    lowStockMode: LowStockMode
    lowStockValue: string
    consumptionAlertPercent: string
}

const initialValues = (ingredient: Ingredient | null): Values => ({
    name: ingredient?.name ?? '',
    unit: ingredient?.unit ?? 'G',
    initialStock: '',
    parLevel: ingredient ? String(ingredient.parLevel) : '',
    lowStockMode: ingredient?.lowStockMode ?? 'PERCENT',
    lowStockValue:
        ingredient?.lowStockValue !== null && ingredient?.lowStockValue !== undefined
            ? String(ingredient.lowStockValue)
            : '',
    consumptionAlertPercent:
        ingredient?.consumptionAlertPercent !== null &&
        ingredient?.consumptionAlertPercent !== undefined
            ? String(ingredient.consumptionAlertPercent)
            : '',
})

export function IngredientFormModal(props: Props) {
    // Each time the modal opens it gets a fresh form, so a previous draft (or the
    // ingredient just created) never leaks into the next one. The counter only
    // changes on open, so the draft stays put while the closing animation plays.
    const [session, setSession] = useState(0)
    const [wasOpen, setWasOpen] = useState(props.open)
    if (props.open !== wasOpen) {
        setWasOpen(props.open)
        if (props.open) setSession((current) => current + 1)
    }
    return <IngredientForm key={`${props.ingredient?.id ?? 'new'}-${session}`} {...props} />
}

function IngredientForm({
    open,
    ingredient,
    defaultLowStockPercent,
    isSaving,
    isArchiving,
    error,
    onClose,
    onSave,
    onArchive,
}: Props) {
    const [values, setValues] = useState(() => initialValues(ingredient))
    const [errors, setErrors] = useState<Record<string, string>>({})
    const unit = unitLabels[values.unit]
    const percentMode = values.lowStockMode === 'PERCENT'

    // Plain-language preview of when the alert will fire, from the current inputs.
    const parLevelValue = parseDecimal(values.parLevel)
    const lowValue = parseDecimal(values.lowStockValue)
    const alertSummary = (() => {
        if (percentMode) {
            const percent = lowValue ?? defaultLowStockPercent
            if (percent < 0 || percent > 100) return null
            if (parLevelValue !== null && parLevelValue > 0)
                return `Te avisaremos cuando queden ${formatQuantity((parLevelValue * percent) / 100, values.unit)} o menos (${percent}% de ${formatQuantity(parLevelValue, values.unit)}).`
            return `Te avisaremos cuando quede el ${percent}% del stock completo o menos.`
        }
        if (lowValue === null || lowValue < 0) return null
        return `Te avisaremos cuando queden ${formatQuantity(lowValue, values.unit)} o menos.`
    })()

    function update<K extends keyof Values>(key: K, value: Values[K]) {
        setValues((current) => ({ ...current, [key]: value }))
        setErrors((current) => ({ ...current, [key]: '' }))
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next: Record<string, string> = {}
        const name = values.name.trim()
        if (!name) next.name = 'Escribe el nombre del ingrediente.'
        const optionalNumber = (key: keyof Values, max?: number, maxCopy?: string) => {
            const raw = values[key]
            if (!raw.trim()) return null
            const parsed = parseDecimal(raw)
            if (parsed === null || parsed < 0) next[key] = 'Usa un número válido.'
            else if (max !== undefined && parsed > max)
                next[key] = maxCopy ? `El máximo es ${maxCopy}.` : `Usa un número entre 0 y ${max}.`
            return parsed
        }
        const limit = maxQuantity[values.unit]
        const limitCopy = maxQuantityLabel[values.unit]
        const initialStock = optionalNumber('initialStock', limit, limitCopy)
        const parLevel = optionalNumber('parLevel', limit, limitCopy)
        if (parLevel !== null && parLevel <= 0 && !next.parLevel)
            next.parLevel = 'Usa un número mayor a cero o déjalo vacío.'
        if (
            parLevel !== null &&
            initialStock !== null &&
            initialStock > parLevel &&
            !next.initialStock &&
            !next.parLevel
        )
            next.parLevel = 'El stock completo no puede ser menor al stock inicial.'
        // Percent fields are optional, but when filled they must be whole numbers 1–100.
        const optionalPercent = (key: 'lowStockValue' | 'consumptionAlertPercent') => {
            const raw = values[key].trim()
            if (!raw) return null
            if (!validPercent(raw)) {
                next[key] = 'Usa un número entero entre 1 y 100.'
                return null
            }
            return Number(raw)
        }
        const lowStockValue = percentMode
            ? optionalPercent('lowStockValue')
            : optionalNumber('lowStockValue', limit, limitCopy)
        const consumption = optionalPercent('consumptionAlertPercent')
        setErrors(next)
        if (Object.keys(next).length > 0) return

        onSave({
            name,
            unit: values.unit,
            ...(ingredient ? {} : { initialStock: initialStock ?? 0 }),
            parLevel: parLevel ?? 0,
            lowStockMode: values.lowStockMode,
            lowStockValue,
            consumptionAlertPercent: consumption,
        })
    }

    const apiError = error instanceof ApiError ? error : undefined
    const message =
        apiError?.code === 'INGREDIENT_ALREADY_EXISTS'
            ? undefined
            : error
              ? (apiError?.message ?? 'No pudimos guardar el ingrediente. Inténtalo nuevamente.')
              : undefined
    const nameError =
        errors.name ||
        (apiError?.code === 'INGREDIENT_ALREADY_EXISTS'
            ? 'Ya tienes un ingrediente con este nombre.'
            : undefined)

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={ingredient ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            description="Define cuánto tienes y cuándo quieres que te avisemos."
            size="lg"
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {ingredient ? (
                        <button
                            type="button"
                            disabled={isSaving || isArchiving}
                            onClick={() => {
                                if (
                                    window.confirm(
                                        `¿Archivar “${ingredient.name}”? Saldrá de todas las recetas y alertas.`,
                                    )
                                )
                                    onArchive()
                            }}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#B42318] hover:bg-[#FFF4F2] disabled:opacity-60"
                        >
                            {isArchiving ? 'Archivando…' : 'Archivar ingrediente'}
                        </button>
                    ) : (
                        <span />
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <button type="button" onClick={onClose} className={ghostButtonClass}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="ingredient-form"
                            disabled={isSaving}
                            className={primaryButtonClass}
                        >
                            {isSaving
                                ? 'Guardando…'
                                : ingredient
                                  ? 'Guardar cambios'
                                  : 'Crear ingrediente'}
                        </button>
                    </div>
                </div>
            }
        >
            <form id="ingredient-form" className="space-y-4" onSubmit={submit} noValidate>
                <FormError message={message} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre" required error={nameError}>
                        <input
                            name="name"
                            value={values.name}
                            onChange={(event) => update('name', event.target.value)}
                            placeholder="Ej. Queso mozzarella"
                            className={inputClass}
                            autoFocus
                        />
                    </Field>
                    <Field
                        label="Unidad"
                        hint={ingredient ? 'No se puede cambiar después de crearlo.' : undefined}
                    >
                        <Select
                            name="unit"
                            value={values.unit}
                            disabled={Boolean(ingredient)}
                            onChange={(event) =>
                                update('unit', event.target.value as IngredientUnit)
                            }
                        >
                            {(Object.keys(unitNames) as IngredientUnit[]).map((key) => (
                                <option key={key} value={key}>
                                    {unitNames[key]}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {!ingredient && (
                        <Field
                            label={`Stock inicial (${unit})`}
                            hint="Lo que tienes hoy. Puedes dejarlo vacío."
                            error={errors.initialStock}
                        >
                            <input
                                name="initialStock"
                                value={values.initialStock}
                                onChange={(event) =>
                                    update('initialStock', quantityOnly(event.target.value))
                                }
                                inputMode="decimal"
                                placeholder="0"
                                className={inputClass}
                            />
                        </Field>
                    )}
                    <Field
                        label={`Stock completo (${unit})`}
                        hint="Cuánto es “lleno” para ti. Los porcentajes se miden contra este valor."
                        error={errors.parLevel}
                    >
                        <input
                            name="parLevel"
                            value={values.parLevel}
                            onChange={(event) =>
                                update('parLevel', quantityOnly(event.target.value))
                            }
                            inputMode="decimal"
                            placeholder="Se ajusta con tus compras"
                            className={inputClass}
                        />
                    </Field>
                </div>
                <section
                    aria-labelledby="low-stock-title"
                    className="space-y-4 border-t border-[#E8EEF6] pt-5"
                >
                    <div>
                        <h3
                            id="low-stock-title"
                            className="font-display text-base tracking-[-.02em] text-[#12234A]"
                        >
                            Avisar cuando el stock esté bajo
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-[#65738A]">
                            Elige cuándo consideramos que este ingrediente se está acabando.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Medir en">
                            <Select
                                name="lowStockMode"
                                value={values.lowStockMode}
                                onChange={(event) =>
                                    update('lowStockMode', event.target.value as LowStockMode)
                                }
                            >
                                <option value="PERCENT">Porcentaje del stock completo</option>
                                <option value="ABSOLUTE">Cantidad fija</option>
                            </Select>
                        </Field>
                        <Field
                            label={percentMode ? 'Porcentaje' : `Cantidad (${unit})`}
                            hint={
                                percentMode
                                    ? `Vacío usa el ${defaultLowStockPercent}% de tu negocio.`
                                    : 'Te avisamos cuando quede esta cantidad o menos.'
                            }
                            error={errors.lowStockValue}
                        >
                            <input
                                name="lowStockValue"
                                value={values.lowStockValue}
                                onChange={(event) =>
                                    update(
                                        'lowStockValue',
                                        percentMode
                                            ? digitsOnly(event.target.value)
                                            : event.target.value,
                                    )
                                }
                                inputMode={percentMode ? 'numeric' : 'decimal'}
                                maxLength={percentMode ? 3 : undefined}
                                placeholder={percentMode ? String(defaultLowStockPercent) : '0'}
                                className={inputClass}
                            />
                        </Field>
                    </div>
                    {alertSummary && (
                        <p
                            className="rounded-lg bg-[#F4F7FF] px-3 py-2.5 text-sm leading-5 text-[#1E3A8A]"
                            data-testid="low-stock-summary"
                        >
                            {alertSummary}
                        </p>
                    )}
                    <Field
                        label="Avisar si se gasta muy rápido (%)"
                        hint="Ej. con 50%, te avisamos si en un día se usa la mitad de tu stock completo. Vacío usa el valor de tu negocio."
                        error={errors.consumptionAlertPercent}
                    >
                        <input
                            name="consumptionAlertPercent"
                            value={values.consumptionAlertPercent}
                            onChange={(event) =>
                                update('consumptionAlertPercent', digitsOnly(event.target.value))
                            }
                            inputMode="numeric"
                            maxLength={3}
                            placeholder="Usar el del negocio"
                            className={inputClass}
                        />
                    </Field>
                </section>
            </form>
        </Modal>
    )
}
