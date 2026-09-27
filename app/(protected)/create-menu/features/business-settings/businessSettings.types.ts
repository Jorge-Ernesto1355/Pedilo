export type BusinessSettings = {
    id: string
    businessId: string
    currency: string
    phone: string | null
    whatsapp: string | null
    address: string | null
    timezone: string
    createdAt: string
    updatedAt: string
}

export type BusinessSettingsInput = {
    currency?: string
    phone?: string | null
    whatsapp?: string | null
    address?: string | null
    timezone?: string
}
