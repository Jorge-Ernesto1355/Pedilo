import { z } from 'zod'

const listItemSchema = z.object({
    name: z.string().trim().min(1, 'Escribe un nombre.').max(50, 'Usa 50 caracteres o menos.'),
})

const extraSchema = listItemSchema.extend({
    price: z.string().refine((value) => value.trim() === '' || Number.isFinite(Number(value)), 'Usa un precio válido.'),
})

export const productSchema = z.object({
    name: z.string().trim().min(1, 'Escribe el nombre del producto.').max(80, 'Usa 80 caracteres o menos.'),
    price: z.string().trim().min(1, 'Escribe el precio base.').refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, 'El precio debe ser mayor que cero.'),
    description: z.string().trim().max(180, 'Usa 180 caracteres o menos.'),
    category: z.string().trim().min(1, 'Selecciona una categoría.'),
    options: z.array(listItemSchema).max(12, 'Agrega hasta 12 opciones.'),
    extras: z.array(extraSchema).max(12, 'Agrega hasta 12 extras.'),
})

export type ProductFormValues = z.infer<typeof productSchema>

export type SavedProduct = ProductFormValues & {
    id: string
    image: string | null
}
