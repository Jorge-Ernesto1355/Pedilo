'use client'

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { EditableList } from './EditableList'
import type { ProductFormValues } from './product.schema'

export function ProductOptionsList() {
    const { control, setValue } = useFormContext<ProductFormValues>()
    const { fields, append, remove } = useFieldArray({ control, name: 'options' })
    const values = useWatch({ control, name: 'options' })

    return <EditableList items={fields.map((field, index) => ({ id: field.id, name: values?.[index]?.name ?? '' }))} placeholder="Ej. Papas gajo" addLabel="Agregar opción" onAdd={() => append({ name: '' })} onRemove={remove} onChange={(index, key, value) => { if (key === 'name') setValue(`options.${index}.name`, value, { shouldValidate: true, shouldDirty: true }) }} />
}
