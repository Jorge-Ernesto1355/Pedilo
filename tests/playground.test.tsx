import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Playground from '@/app/home/components/Playground'

describe('Pedilo interactive playground', () => {
    it('adds a product and updates quantity and total in the cart', async () => {
        const user = userEvent.setup()
        render(<Playground />)

        await user.click(screen.getByRole('button', { name: 'Agregar Clásica' }))
        expect(screen.getByText('1 producto seleccionado')).toBeInTheDocument()
        expect(screen.getAllByText('$129').length).toBeGreaterThan(0)

        await user.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
        expect(screen.getAllByText('2').length).toBeGreaterThan(0)
        expect(screen.getByText('$258')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Disminuir cantidad' }))
        expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    })

    it('filters menu categories and removes products', async () => {
        const user = userEvent.setup()
        render(<Playground />)

        await user.click(screen.getByRole('tab', { name: 'Wings' }))
        expect(screen.getByRole('heading', { name: '6 Wings' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Clásica' })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Agregar 6 Wings' }))
        await user.click(screen.getByRole('button', { name: 'Eliminar 6 Wings' }))
        expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
    })

    it('completes checkout into the simulated WhatsApp receipt', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        render(<Playground />)

        await user.click(screen.getByRole('button', { name: 'Agregar BBQ Bacon' }))
        await user.click(screen.getByRole('button', { name: 'Continuar pedido' }))
        await screen.findByRole('heading', { name: 'Envía tu pedido por WhatsApp' })
        fireEvent.change(document.getElementById('demo-name')!, { target: { value: 'Jorge' } })
        fireEvent.change(document.getElementById('demo-phone')!, { target: { value: '+52 668 123 4567' } })
        fireEvent.change(document.getElementById('demo-notes')!, { target: { value: 'Sin cebolla' } })
        await user.click(screen.getByRole('button', { name: 'Abrir WhatsApp y enviar pedido' }))

        await waitFor(() => expect(screen.getByText('Pedido enviado correctamente')).toBeInTheDocument(), { timeout: 1500 })
        expect(screen.getByText(/Nombre: Jorge/)).toBeInTheDocument()
        expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/526681234567?text='), '_blank', 'noopener,noreferrer')
        expect(decodeURIComponent(open.mock.calls[0][0] as string)).toContain('1x BBQ Bacon')
        expect(screen.getByText(/Nota: Sin cebolla/)).toBeInTheDocument()
        open.mockRestore()
    })

    it('resets the demo after a completed order', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        render(<Playground />)

        await user.click(screen.getByRole('button', { name: 'Agregar Papas' }))
        await user.click(screen.getByRole('button', { name: 'Continuar pedido' }))
        await screen.findByRole('heading', { name: 'Envía tu pedido por WhatsApp' })
        fireEvent.change(document.getElementById('demo-phone')!, { target: { value: '+52 668 000 0000' } })
        await user.click(screen.getByRole('button', { name: 'Abrir WhatsApp y enviar pedido' }))
        await waitFor(() => expect(screen.getByRole('button', { name: /Probar de nuevo/i })).toBeInTheDocument(), { timeout: 1500 })

        await user.click(screen.getByRole('button', { name: /Probar de nuevo/i }))
        expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Algo rico, sin complicaciones.' })).toBeInTheDocument()
        open.mockRestore()
    })
})
