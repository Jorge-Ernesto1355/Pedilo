'use client'

import type { LucideIcon } from 'lucide-react'

type EmptyAction = {
    label: string
    onClick: () => void
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
}: {
    icon?: LucideIcon
    title: string
    description: string
    action?: EmptyAction
    secondaryAction?: EmptyAction
}) {
    return (
        <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-[#FBFCFE] px-6 py-12 text-center">
            {Icon && (
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#EAF0FF] text-[#2451C5]">
                    <Icon className="size-6" />
                </span>
            )}
            <h2 className="mt-4 font-display text-xl tracking-[-.035em] text-[#12234A]">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#65738A]">{description}</p>
            {(action || secondaryAction) && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {action && (
                        <button
                            type="button"
                            onClick={action.onClick}
                            className="rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#183991]"
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            type="button"
                            onClick={secondaryAction.onClick}
                            className="rounded-xl border border-[#C9D7EA] bg-white px-4 py-2.5 text-sm font-bold text-[#2451C5] hover:bg-[#F4F7FF]"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
