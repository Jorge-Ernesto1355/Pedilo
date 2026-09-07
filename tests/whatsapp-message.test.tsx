import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Playground from '@/app/home/components/Playground'

describe('frontend WhatsApp order message', () => {
    it('opens a dynamic wa.me message with the current order details', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        render(<Playground />)

        await user.click(screen.getByRole('button', { name: 'Agregar Clásica' }))
        await user.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
        await user.click(screen.getByRole('button', { name: 'Continuar pedido' }))
        await screen.findByRole('heading', { name: 'Envía tu pedido por WhatsApp' })
        fireEvent.change(document.getElementById('demo-name')!, { target: { value: 'Jorge' } })
        fireEvent.change(document.getElementById('demo-phone')!, { target: { value: '+52 668 123 4567' } })
        fireEvent.change(document.getElementById('demo-notes')!, { target: { value: 'Sin cebolla' } })

        await user.click(screen.getByRole('button', { name: 'Abrir WhatsApp y enviar pedido' }))

        expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/526681234567?text='), '_blank', 'noopener,noreferrer')
        const url = open.mock.calls[0][0] as string
        const message = decodeURIComponent(url.slice(url.indexOf('?text=') + 6))
        expect(message).toContain('2x Clásica — $258')
        expect(message).toContain('Total: $258')
        expect(message).toContain('Nombre: Jorge')
        expect(message).toContain('Nota: Sin cebolla')
        open.mockRestore()
    })

    it('does not open WhatsApp when the destination number is invalid', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        render(<Playground />)

        await user.click(screen.getByRole('button', { name: 'Agregar Clásica' }))
        await user.click(screen.getByRole('button', { name: 'Continuar pedido' }))
        await screen.findByRole('heading', { name: 'Envía tu pedido por WhatsApp' })
        fireEvent.change(document.getElementById('demo-phone')!, { target: { value: '123' } })
        await user.click(screen.getByRole('button', { name: 'Abrir WhatsApp y enviar pedido' }))

        expect(open).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(/número de WhatsApp válido/i)
        open.mockRestore()
    })
})
