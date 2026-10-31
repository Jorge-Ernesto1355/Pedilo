import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WhatsAppPhoneField } from '@/app/(protected)/create-menu/features/business-settings/WhatsAppPhoneField'

function renderPhoneField({
    savedNumber = null,
    onSave = vi.fn().mockResolvedValue(undefined),
    onSaved = vi.fn(),
}: {
    savedNumber?: string | null
    onSave?: (number: string) => Promise<void>
    onSaved?: () => void
} = {}) {
    const inputRef = createRef<HTMLInputElement>()
    render(
        <WhatsAppPhoneField
            savedNumber={savedNumber}
            onSave={onSave}
            onSaved={onSaved}
            inputRef={inputRef}
        />,
    )
    return { input: screen.getByLabelText('Número de WhatsApp'), inputRef, onSave, onSaved }
}

describe('WhatsAppPhoneField', () => {
    it('muestra el error de campo vacío y enfoca el input al guardar', async () => {
        const user = userEvent.setup()
        const { input } = renderPhoneField()

        await user.click(screen.getByRole('button', { name: 'Guardar número' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa tu número de WhatsApp.')
        expect(input).toHaveFocus()
        expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('descarta letras y muestra el mensaje de caracteres no permitidos', () => {
        const { input } = renderPhoneField()

        fireEvent.change(input, { target: { value: 'abc' } })

        expect(input).toHaveValue('')
        expect(screen.getByRole('alert')).toHaveTextContent('Solo se permiten números.')
    })

    it('valida al salir del campo y limpia el error cuando el número se corrige', () => {
        const { input } = renderPhoneField()

        fireEvent.change(input, { target: { value: '55123' } })
        fireEvent.blur(input)
        expect(screen.getByRole('alert')).toHaveTextContent(
            'El número está incompleto. Debe tener 10 dígitos.',
        )

        fireEvent.change(input, { target: { value: '5512345678' } })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(input).toHaveValue('+52 55 1234 5678')
    })

    it.each([
        ['55123', 'El número está incompleto. Debe tener 10 dígitos.'],
        ['55123456789', 'El número tiene más de 10 dígitos. Revísalo.'],
        ['0000000000', 'Este número no parece válido.'],
        ['1234567890', 'Ingresa un número de teléfono válido de México.'],
    ])('rechaza %s y no intenta guardarlo', async (number, message) => {
        const user = userEvent.setup()
        const onSave = vi.fn().mockResolvedValue(undefined)
        const { input } = renderPhoneField({ onSave })

        fireEvent.change(input, { target: { value: number } })
        await user.click(screen.getByRole('button', { name: 'Guardar número' }))

        expect(screen.getByRole('alert')).toHaveTextContent(message)
        expect(input).toHaveFocus()
        expect(onSave).not.toHaveBeenCalled()
    })

    it('formatea el número mexicano y comunica el éxito al guardar en E.164', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn().mockResolvedValue(undefined)
        const onSaved = vi.fn()
        const { input } = renderPhoneField({ onSave, onSaved })

        fireEvent.change(input, { target: { value: '6981119319' } })
        expect(input).toHaveValue('+52 698 111 9319')
        await user.click(screen.getByRole('button', { name: 'Guardar número' }))

        await waitFor(() => expect(onSave).toHaveBeenCalledWith('+526981119319'))
        expect(onSaved).toHaveBeenCalledOnce()
        expect(await screen.findByRole('status')).toHaveTextContent(
            'Número guardado correctamente.',
        )
    })

    it('oculta el mensaje de éxito después de tres segundos', async () => {
        vi.useFakeTimers()
        const onSave = vi.fn().mockResolvedValue(undefined)
        const { input } = renderPhoneField({ onSave })
        fireEvent.change(input, { target: { value: '5512345678' } })

        await act(async () => {
            fireEvent.submit(input.closest('form')!)
            await Promise.resolve()
            await Promise.resolve()
        })
        expect(screen.getByRole('status')).toBeInTheDocument()
        await act(async () => {
            vi.advanceTimersByTime(3000)
            await Promise.resolve()
        })

        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        vi.useRealTimers()
    })

    it('muestra el número persistido y permite actualizarlo', async () => {
        const { input } = renderPhoneField({ savedNumber: '+526981119319' })

        await waitFor(() => expect(input).toHaveValue('+52 698 111 9319'))
        expect(screen.getByRole('button', { name: 'Actualizar número' })).toBeDisabled()
    })

    it('muestra el error de red y conserva el foco para corregir o reintentar', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn().mockRejectedValue(new Error('network'))
        const { input } = renderPhoneField({ onSave })

        fireEvent.change(input, { target: { value: '5512345678' } })
        await user.click(screen.getByRole('button', { name: 'Guardar número' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No pudimos guardar el número. Intenta de nuevo.',
        )
        expect(input).toHaveFocus()
        expect(screen.getByRole('button', { name: 'Guardar número' })).toBeEnabled()
    })
})
