import { z } from 'zod'

export const productSchema = z.object({
    name: z.string().trim().min(1, 'Escribe el nombre del producto.').max(80, 'Usa 80 caracteres o menos.'),
    description: z.string().trim().max(180, 'Usa 180 caracteres o menos.'),
    price: z.string().trim().min(1, 'Escribe el precio base.').refine((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, 'Usa un precio mayor que cero con máximo 2 decimales.'),
    imageUrl: z.string().trim().max(500, 'La URL es demasiado larga.').refine((value) => value === '' || /^https?:\/\/.+/.test(value), 'Escribe una URL válida.'),
})

export type ProductFormValues = z.infer<typeof productSchema>
