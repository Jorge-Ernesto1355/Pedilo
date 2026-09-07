'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { SavedProduct } from './product.schema'

export function useProductManagement() {
    const [products, setProducts] = useState<SavedProduct[]>([])
    const saveProduct = useMutation({
        // Persistence can be connected here once the external catalog API is ready.
        mutationFn: async (product: SavedProduct) => product,
        onSuccess: (product) => setProducts((current) => [...current, product]),
    })

    return { products, saveProduct }
}
