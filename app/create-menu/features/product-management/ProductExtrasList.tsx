'use client'

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { EditableList } from './EditableList'
import type { ProductFormValues } from './product.schema'

export function ProductExtrasList() {
    const { control, setValue } = useFormContext<ProductFormValues>()
    const { fields, append, remove } = useFieldArray({ control, name: 'extras' })
    const values = useWatch({ control, name: 'extras' })

    return <EditableList items={fields.map((field, index) => ({ id: field.id, name: values?.[index]?.name ?? '', price: values?.[index]?.price ?? '' }))} placeholder="Ej. Queso extra" addLabel="Agregar extra" showPrice onAdd={() => append({ name: '', price: '' })} onRemove={remove} onChange={(index, key, value) => { setValue(`extras.${index}.${key}`, value, { shouldValidate: true, shouldDirty: true }) }} />
}
