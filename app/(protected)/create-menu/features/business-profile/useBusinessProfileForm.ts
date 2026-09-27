'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { businessProfileSchema, type BusinessProfileValues } from './businessProfile.schema'

export const defaultBusinessProfileValues: BusinessProfileValues = {
    businessName: 'La Esquina',
    slug: "la-esquina",
    location: 'Culiacán, Sinaloa',
    description: 'Hamburguesas, wings y papas hechas para compartir.',
    businessHours: {
        days: [
            { key: 'mon', label: 'Lun', enabled: true },
            { key: 'tue', label: 'Mar', enabled: true },
            { key: 'wed', label: 'Mié', enabled: true },
            { key: 'thu', label: 'Jue', enabled: true },
            { key: 'fri', label: 'Vie', enabled: true },
            { key: 'sat', label: 'Sáb', enabled: true },
            { key: 'sun', label: 'Dom', enabled: false },
        ],
        openTime: '09:00',
        closeTime: '19:00',
    },
    coordinates: null,
}

export function useBusinessProfileForm() {
    return useForm<BusinessProfileValues>({
        resolver: zodResolver(businessProfileSchema),
        mode: 'onChange',
        defaultValues: defaultBusinessProfileValues,
    })
}
