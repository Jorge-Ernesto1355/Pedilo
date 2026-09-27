import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import BusinessSetupScreen from '@/app/(protected)/create-menu/BusinessSetupScreen'

function renderSetup() {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    return render(<QueryClientProvider client={queryClient}><BusinessSetupScreen /></QueryClientProvider>)
}

describe('Business Setup product editor', () => {
    it('keeps option and extra inputs editable while preserving their values', async () => {
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole('button', { name: /agregar producto/i }))
        await screen.findByRole('dialog', { name: 'Agregar producto' })

        await user.click(screen.getByRole('button', { name: 'Agregar opción' }))
        const option = screen.getByRole('textbox', { name: 'Ej. Papas gajo 1' })
        await user.type(option, 'Papas gajo')
        expect(option).toHaveValue('Papas gajo')

        await user.click(screen.getByRole('button', { name: 'Agregar extra' }))
        const extra = screen.getByRole('textbox', { name: 'Ej. Queso extra 1' })
        await user.type(extra, 'Queso extra')
        expect(extra).toHaveValue('Queso extra')

        expect(screen.getByRole('textbox', { name: 'Ej. Papas gajo 1' })).toHaveValue('Papas gajo')
    })

    it('requires a positive base price before saving a product', async () => {
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole('button', { name: /agregar producto/i }))
        await screen.findByRole('dialog', { name: 'Agregar producto' })
        await user.type(screen.getByLabelText('Nombre del plato'), 'Clásica')
        await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

        expect(screen.getByRole('alert')).toHaveTextContent('Escribe el precio base.')
    })
})
