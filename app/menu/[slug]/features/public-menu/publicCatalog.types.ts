export type PublicScheduleDay = { key?: string; label?: string; enabled?: boolean }
export type PublicCoordinates = { latitude: number; longitude: number }
export type PublicOption = {
    id: string
    optionGroupId: string
    name: string
    price: number
    sortOrder: number
    isAvailable: boolean
}
export type PublicOptionGroup = {
    id: string
    productId: string
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    minSelect?: number
    maxSelect?: number
    sortOrder: number
    isActive: boolean
    options: PublicOption[]
}
export type PublicProduct = {
    id: string
    businessId: string
    categoryId: string
    name: string
    description: string | null
    price: number
    imageUrl: string | null
    sortOrder: number
    isAvailable: boolean
    optionGroups: PublicOptionGroup[]
}
export type PublicCategory = {
    id: string
    businessId: string
    menuId: string
    name: string
    description: string | null
    sortOrder: number
    isActive: boolean
    products: PublicProduct[]
}
export type PublicMenu = {
    id: string
    businessId: string
    name: string
    description: string | null
    isActive: boolean
    categories: PublicCategory[]
}
export type PublicBusiness = {
    id: string
    name: string
    slug: string
    description: string | null
    logoUrl: string | null
    logoBlurUrl: string | null
    coverUrl: string | null
    coverBlurUrl: string | null
    ubication: string | null
    ubicationMaps: PublicCoordinates | null
    businessSchedule: {
        days: PublicScheduleDay[]
        openTime: string
        closeTime: string
        isClosed: boolean
    } | null
    whatsappNumber?: string | null
}
export type PublicCatalog = { business: PublicBusiness; menus: PublicMenu[] }
