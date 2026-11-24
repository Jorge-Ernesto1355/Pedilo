'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { RecipeTarget } from '../inventory.types'
import { RecipeEditor } from './RecipeEditor'

/** Collapsed "Ingredientes" section so recipes do not crowd option editors. */
export function RecipeDisclosure({ target, label }: { target: RecipeTarget; label: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="mt-3 border-t border-[#F0F3F8] pt-3">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF]"
            >
                Ingredientes de {label || 'esta opción'}
                <ChevronDown
                    className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
            {open && (
                <div className="mt-3">
                    <RecipeEditor target={target} label={label || 'la opción'} />
                </div>
            )}
        </div>
    )
}
