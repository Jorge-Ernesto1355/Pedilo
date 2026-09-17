import { z } from 'zod'

export const categorySchema = z.object({
    category: z.string().trim().min(1, 'Escribe un nombre para la categoría.').max(40, 'Usa 40 caracteres o menos.'),
})

export type CategoryValues = z.infer<typeof categorySchema>
