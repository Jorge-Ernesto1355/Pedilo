import { describe, expect, it } from 'vitest'
import { groupOrderOptions } from '@/app/(protected)/dashboard/features/orders/orderDisplay'

describe('groupOrderOptions', () => {
    it('combines repeated selected extras into a quantity within the correct group', () => {
        expect(
            groupOrderOptions([
                { name: 'Queso', groupName: 'Extras', price: 8 },
                { name: 'Queso', groupName: 'Extras', price: 8 },
                { name: 'Queso', groupName: 'Extras', price: 8 },
                { name: 'Tocino', groupName: 'Extras', price: 12 },
                { name: 'Queso', groupName: 'Acompañamiento', price: 8 },
            ]),
        ).toEqual([
            {
                name: 'Extras',
                options: [
                    { name: 'Queso', quantity: 3, price: 8 },
                    { name: 'Tocino', quantity: 1, price: 12 },
                ],
            },
            {
                name: 'Acompañamiento',
                options: [{ name: 'Queso', quantity: 1, price: 8 }],
            },
        ])
    })

    it('keeps older order snapshots visible when a group name was not saved', () => {
        expect(groupOrderOptions([{ name: 'Queso' }, { name: 'Queso' }])).toEqual([
            { name: 'Opciones', options: [{ name: 'Queso', quantity: 2 }] },
        ])
    })
})
