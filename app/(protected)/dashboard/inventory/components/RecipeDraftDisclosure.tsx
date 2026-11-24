'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { RecipeLinesEditor, type RecipeLine, type RecipeLineErrors } from './RecipeLinesEditor'

/**
 * Collapsed "Ingredientes" section for something that does not exist yet (a new
 * option). The lines stay in the parent's state and are saved once it is created.
 */
export function RecipeDraftDisclosure({
    lines,
    errors,
    onChange,
    label = 'Ingredientes (opcional)',
}: {
    lines: RecipeLine[]
    errors?: RecipeLineErrors
    onChange: (next: RecipeLine[]) => void
    label?: string
}) {
    const [open, setOpen] = useState(false)
    const visible = open || Object.keys(errors ?? {}).length > 0
    return (
        <div className="mt-3">
            <button
                type="button"
                aria-expanded={visible}
                onClick={() => setOpen((current) => !current)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF]"
            >
                {label}
                {lines.length > 0 && (
                    <span className="font-medium text-[#65738A]">· {lines.length} agregados</span>
                )}
                <ChevronDown
                    className={`size-3.5 transition-transform ${visible ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
            {visible && (
                <div className="mt-3 space-y-2" data-testid="recipe-draft">
                    <p className="text-xs text-[#65738A]">
                        Cantidad que se gasta cada vez que el cliente elige esta opción.
                    </p>
                    <RecipeLinesEditor lines={lines} errors={errors} onChange={onChange} />
                </div>
            )}
        </div>
    )
}
