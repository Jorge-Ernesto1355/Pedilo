import type { PublicProduct } from './publicCatalog.types'

export type { PublicProduct as PublicMenuProduct } from './publicCatalog.types'

export type CartSelection = { id: string; name: string; price: number; quantity: number }
export type CartLine = {
    key: string
    product: PublicProduct
    quantity: number
    selections: CartSelection[]
    unitPrice: number
}
