import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Modal } from '@/app/components/ui/Modal'

describe('Modal focus behavior', () => {
    it('does not steal focus from an input when the parent rerenders', async () => {
        const user = userEvent.setup()

        function TestModal() {
            return (
                <Modal open title="Editar menú" onClose={() => undefined}>
                    <input aria-label="Nombre del menú" />
                </Modal>
            )
        }

        render(<TestModal />)
        const input = screen.getByRole('textbox', { name: 'Nombre del menú' })

        await user.type(input, 'Menú del día')

        expect(input).toHaveValue('Menú del día')
        expect(document.activeElement).toBe(input)
    })
})
