import type { OrderItem } from '@/src/lib/api/order-types'

export type GroupedOrderOption = {
    name: string
    quantity: number
    price?: number
}

export type OrderOptionGroup = {
    name: string
    options: GroupedOrderOption[]
}

export function groupOrderOptions(options: OrderItem['options'] = []): OrderOptionGroup[] {
    const groups = new Map<string, Map<string, GroupedOrderOption>>()

    for (const option of options ?? []) {
        const name = option.name?.trim()
        if (!name) continue

        const groupName = option.groupName?.trim() || 'Opciones'
        let choices = groups.get(groupName)
        if (!choices) {
            choices = new Map<string, GroupedOrderOption>()
            groups.set(groupName, choices)
        }

        const priceKey = option.price === undefined ? '' : String(option.price)
        const key = `${name}\u0000${priceKey}`
        const existing = choices.get(key)
        if (existing) {
            existing.quantity += 1
        } else {
            choices.set(key, {
                name,
                quantity: 1,
                ...(option.price === undefined ? {} : { price: option.price }),
            })
        }
    }

    return Array.from(groups, ([name, choices]) => ({
        name,
        options: Array.from(choices.values()),
    }))
}
