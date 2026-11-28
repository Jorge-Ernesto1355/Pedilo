'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type { InventorySettings, StockBlockMode } from '../inventory.types'
import {
    digitsOnly,
    Field,
    Select,
    FormError,
    ghostButtonClass,
    inputClass,
    primaryButtonClass,
    validPercent,
} from './fields'

const blockOptions: { value: StockBlockMode; label: string; hint: string }[] = [
    { value: 'NONE', label: 'Solo avisar', hint: 'Tus clientes siempre pueden pedir.' },
    {
        value: 'OUT_OF_STOCK',
        label: 'Bloquear si no alcanza',
        hint: 'El menú público rechaza el pedido si falta algún ingrediente.',
    },
    {
        value: 'LOW_STOCK',
        label: 'Bloquear si el stock está bajo',
        hint: 'Además rechaza pedidos que usen un ingrediente en nivel bajo o peor.',
    },
]

const WINDOW_OPTIONS: { value: number; label: string }[] = [
    { value: 6, label: '6 horas' },
    { value: 12, label: '12 horas' },
    { value: 24, label: '24 horas (1 día)' },
    { value: 48, label: '48 horas (2 días)' },
    { value: 72, label: '72 horas (3 días)' },
    { value: 168, label: '168 horas (1 semana)' },
    { value: 336, label: '336 horas (2 semanas)' },
    { value: 720, label: '720 horas (30 días)' },
]

type Props = {
    open: boolean
    settings: InventorySettings | undefined
    isSaving: boolean
    error?: unknown
    onClose: () => void
    onSave: (input: InventorySettings) => void
}

export function InventorySettingsModal(props: Props) {
    // A new draft each time the dialog opens, seeded from the saved settings.
    return props.open && props.settings ? (
        <SettingsForm {...props} settings={props.settings} />
    ) : null
}

function SettingsForm({
    open,
    settings,
    isSaving,
    error,
    onClose,
    onSave,
}: Props & { settings: InventorySettings }) {
    const [alertsEnabled, setAlertsEnabled] = useState(settings.alertsEnabled)
    const [lowPercent, setLowPercent] = useState(String(settings.defaultLowStockPercent))
    const [consumptionPercent, setConsumptionPercent] = useState(
        String(settings.consumptionAlertPercent),
    )
    const [windowHours, setWindowHours] = useState(String(settings.consumptionWindowHours))
    const [blockMode, setBlockMode] = useState<StockBlockMode>(settings.blockMode)
    // Keep a previously saved non-standard value selectable so it isn't lost silently.
    const windowOptions = WINDOW_OPTIONS.some((o) => o.value === settings.consumptionWindowHours)
        ? WINDOW_OPTIONS
        : [
              ...WINDOW_OPTIONS,
              {
                  value: settings.consumptionWindowHours,
                  label: `${settings.consumptionWindowHours} horas`,
              },
          ].sort((a, b) => a.value - b.value)
    const [errors, setErrors] = useState<Record<string, string>>({})

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next: Record<string, string> = {}
        const low = Number(lowPercent)
        const consumption = Number(consumptionPercent)
        const hours = Number(windowHours)
        if (!validPercent(lowPercent)) next.lowPercent = 'Usa un número entero entre 1 y 100.'
        if (!validPercent(consumptionPercent))
            next.consumptionPercent = 'Usa un número entero entre 1 y 100.'
        if (!windowOptions.some((option) => option.value === hours))
            next.windowHours = 'Elige una de las opciones.'
        setErrors(next)
        if (Object.keys(next).length > 0) return
        onSave({
            alertsEnabled,
            defaultLowStockPercent: low,
            consumptionAlertPercent: consumption,
            consumptionWindowHours: hours,
            blockMode,
        })
    }

    const apiError = error instanceof ApiError ? error : undefined
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Configuración de inventario"
            description="Cuándo avisar y qué hacer cuando falta stock."
            size="lg"
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={ghostButtonClass}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="inventory-settings-form"
                        disabled={isSaving}
                        className={primaryButtonClass}
                    >
                        {isSaving ? 'Guardando…' : 'Guardar configuración'}
                    </button>
                </div>
            }
        >
            <form id="inventory-settings-form" className="space-y-5" onSubmit={submit} noValidate>
                <FormError
                    message={
                        error
                            ? (apiError?.message ?? 'No pudimos guardar la configuración.')
                            : undefined
                    }
                />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#DCE5F3] px-3 py-3 text-sm text-[#243556]">
                    <input
                        type="checkbox"
                        name="alertsEnabled"
                        checked={alertsEnabled}
                        onChange={(event) => setAlertsEnabled(event.target.checked)}
                        className="size-4 accent-[#2451C5]"
                    />
                    <span>
                        <strong className="block">Avisos de inventario</strong>
                        <span className="text-xs text-[#65738A]">
                            Verás un aviso en todas las pantallas cuando algo se esté acabando.
                        </span>
                    </span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Stock bajo por defecto (%)"
                        hint="Porcentaje del stock completo. Cada ingrediente puede tener el suyo."
                        error={errors.lowPercent}
                    >
                        <input
                            name="defaultLowStockPercent"
                            value={lowPercent}
                            onChange={(event) => setLowPercent(digitsOnly(event.target.value))}
                            inputMode="numeric"
                            maxLength={3}
                            className={inputClass}
                        />
                    </Field>
                    <Field
                        label="Consumo alto (%)"
                        hint="Avisa cuando se usa más de este porcentaje en la ventana."
                        error={errors.consumptionPercent}
                    >
                        <input
                            name="consumptionAlertPercent"
                            value={consumptionPercent}
                            onChange={(event) =>
                                setConsumptionPercent(digitsOnly(event.target.value))
                            }
                            inputMode="numeric"
                            maxLength={3}
                            className={inputClass}
                        />
                    </Field>
                </div>
                <Field
                    label="Ventana de consumo (horas)"
                    hint="24 mide el consumo del último día."
                    error={errors.windowHours}
                >
                    <Select
                        name="consumptionWindowHours"
                        value={windowHours}
                        onChange={(event) => setWindowHours(event.target.value)}
                    >
                        {windowOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-[#243556]">
                        Cuando falta stock en el menú público
                    </legend>
                    {blockOptions.map((option) => (
                        <label
                            key={option.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${blockMode === option.value ? 'border-[#2451C5] bg-[#F4F7FF]' : 'border-[#DCE5F3] hover:bg-[#FAFCFF]'}`}
                        >
                            <input
                                type="radio"
                                name="blockMode"
                                value={option.value}
                                checked={blockMode === option.value}
                                onChange={() => setBlockMode(option.value)}
                                className="mt-0.5 size-4 accent-[#2451C5]"
                            />
                            <span>
                                <strong className="block text-[#243556]">{option.label}</strong>
                                <span className="text-xs text-[#65738A]">{option.hint}</span>
                            </span>
                        </label>
                    ))}
                    <p className="text-xs leading-5 text-[#8996A9]">
                        Los pedidos que tú registras nunca se bloquean. El stock se descuenta cuando
                        marcas el pedido como listo.
                    </p>
                </fieldset>
            </form>
        </Modal>
    )
}
