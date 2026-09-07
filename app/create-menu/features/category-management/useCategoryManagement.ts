'use client'

import { useState } from 'react'

const initialCategories = ['Hamburguesas', 'Wings', 'Extras']

export function useCategoryManagement() {
    const [categories, setCategories] = useState<string[]>(initialCategories)
    const [isOpen, setIsOpen] = useState(false)

    function addCategory(category: string) {
        const normalized = category.trim()
        if (!normalized) return
        setCategories((current) => current.some((item) => item.toLowerCase() === normalized.toLowerCase()) ? current : [...current, normalized])
        setIsOpen(false)
    }

    return { categories, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), addCategory }
}
