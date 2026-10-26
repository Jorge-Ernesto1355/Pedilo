import { z } from 'zod'
import { PRODUCT_DESCRIPTION_MAX_LENGTH } from '../../description-limits'

export const productSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Escribe el nombre del producto.')
        .max(80, 'Usa 80 caracteres o menos.'),
    description: z
        .string()
        .trim()
        .max(
            PRODUCT_DESCRIPTION_MAX_LENGTH,
            `Usa ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres o menos.`,
        ),
    price: z
        .string()
        .trim()
        .min(1, 'Escribe el precio base.')
        .refine(
            (value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0,
            'Usa un precio mayor que cero con máximo 2 decimales.',
        ),
    image: z
        .custom<File | null>(
            (value) => value === null || (typeof File !== 'undefined' && value instanceof File),
            'Selecciona una imagen válida.',
        )
        .optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
