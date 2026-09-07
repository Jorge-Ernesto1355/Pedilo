import { z } from 'zod'
import { locationCoordinatesSchema } from '../business-location/location.schema'

const businessDaySchema = z.object({
    key: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    label: z.string(),
    enabled: z.boolean(),
})

const businessHoursSchema = z.object({
    days: z.array(businessDaySchema).min(1, 'Selecciona al menos un día.'),
    openTime: z.string().min(1, 'Selecciona la hora de apertura.'),
    closeTime: z.string().min(1, 'Selecciona la hora de cierre.'),
}).superRefine((hours, context) => {
    if (hours.openTime >= hours.closeTime) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closeTime'], message: 'La hora de cierre debe ser posterior.' })
})

export const businessProfileSchema = z.object({
    businessName: z.string().trim().min(1, 'Escribe el nombre de tu negocio.').max(80, 'Usa 80 caracteres o menos.'),
    location: z.string().trim().max(100, 'Usa 100 caracteres o menos.'),
    description: z.string().trim().max(180, 'Usa 180 caracteres o menos.'),
    businessHours: businessHoursSchema,
    coordinates: locationCoordinatesSchema.nullable(),
})

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>
