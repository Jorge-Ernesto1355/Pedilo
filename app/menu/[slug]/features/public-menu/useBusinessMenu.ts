'use client'

import type { PublicMenuData } from './types'

const mockMenu: PublicMenuData = {
    slug: 'la-esquina',
    business: {
        name: 'La Esquina',
        location: 'Culiacán, Sinaloa',
        description: 'Hamburguesas, wings y papas hechas para compartir.',
        coverImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=85',
        profileImage: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=85',
        whatsappNumber: '526981119319',
        isOpen: true,
        coordinates: { latitude: 24.8091, longitude: -107.394 },
        hours: { days: 'Lun–Sáb', openTime: '09:00', closeTime: '19:00' },
    },
    categories: [
        {
            id: 'burgers',
            name: 'Hamburguesas',
            products: [
                { id: 'classic', categoryId: 'burgers', name: 'Clásica', description: 'Carne, queso, lechuga, tomate y aderezo de la casa.', price: 129, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82', options: [{ id: 'single', name: 'Carne sencilla' }, { id: 'double', name: 'Doble carne', price: 35 }], extras: [{ id: 'bacon', name: 'Tocino', price: 25 }, { id: 'avocado', name: 'Aguacate', price: 30 }] },
                { id: 'bbq-bacon', categoryId: 'burgers', name: 'BBQ Bacon', description: 'Carne, queso, tocino y salsa BBQ de la casa.', price: 159, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=700&q=82', options: [], extras: [{ id: 'jalapeno', name: 'Jalapeños', price: 10 }, { id: 'fries', name: 'Papas extra', price: 35 }] },
            ],
        },
        {
            id: 'to-share',
            name: 'Para compartir',
            products: [
                { id: 'wings', categoryId: 'to-share', name: '6 Wings', description: 'Alitas crujientes con la salsa que prefieras.', price: 119, image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=700&q=82', options: [{ id: 'buffalo', name: 'Buffalo' }, { id: 'bbq', name: 'BBQ' }, { id: 'lemon', name: 'Limón pimienta' }], extras: [], },
                { id: 'fries', categoryId: 'to-share', name: 'Papas de la casa', description: 'Papas crujientes con sal de la casa y dip.', price: 49, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=82', options: [], extras: [{ id: 'cheese', name: 'Queso fundido', price: 20 }] },
            ],
        },
        {
            id: 'drinks',
            name: 'Bebidas',
            products: [
                { id: 'shake', categoryId: 'drinks', name: 'Malteada de vainilla', description: 'Cremosa, fría y hecha al momento.', price: 69, image: 'https://images.unsplash.com/photo-1572490122747-3968b1c0d690?auto=format&fit=crop&w=700&q=82', options: [], extras: [{ id: 'whipped-cream', name: 'Crema batida', price: 10 }] },
            ],
        },
    ],
}

export function useBusinessMenu(slug: string) {
    const data = { ...mockMenu, slug }
    return { data, isLoading: false }
}
