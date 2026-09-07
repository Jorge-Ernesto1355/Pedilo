export type PublicMenuOption = {
    id: string
    name: string
    price?: number
}

export type PublicMenuExtra = {
    id: string
    name: string
    price: number
}

export type PublicMenuProduct = {
    id: string
    categoryId: string
    name: string
    description: string
    price: number
    image: string | null
    options: PublicMenuOption[]
    extras: PublicMenuExtra[]
}

export type PublicMenuCategory = {
    id: string
    name: string
    products: PublicMenuProduct[]
}

export type PublicMenuBusiness = {
    name: string
    location: string
    description: string
    coverImage: string | null
    profileImage: string | null
    whatsappNumber: string
    isOpen: boolean
    coordinates: { latitude: number; longitude: number } | null
    hours: {
        days: string
        openTime: string
        closeTime: string
    }
}

export type PublicMenuData = {
    slug: string
    business: PublicMenuBusiness
    categories: PublicMenuCategory[]
}

export type CartSelection = {
    id: string
    name: string
    price: number
}

export type CartLine = {
    key: string
    product: PublicMenuProduct
    quantity: number
    option: CartSelection | null
    extras: CartSelection[]
    unitPrice: number
}
