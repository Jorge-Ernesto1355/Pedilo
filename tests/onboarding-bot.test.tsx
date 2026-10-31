import { createRef, type ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingBot } from '@/app/(protected)/create-menu/features/business-settings/OnboardingBot'

vi.mock('next/dynamic', () => ({
    default: () => (props: { type?: string; state?: string; size?: number; paused?: boolean }) => (
        <span
            data-testid="bot-avatar"
            data-type={props.type}
            data-state={props.state}
            data-size={props.size}
            data-paused={String(Boolean(props.paused))}
        />
    ),
}))

const props = {
    hasBusiness: true,
    hasWhatsapp: false,
    isNewBusiness: true,
    businessId: 'business-onboarding-test',
    whatsappCardId: 'whatsapp-card',
    whatsappInputRef: createRef<HTMLInputElement>(),
    didSaveWhatsapp: false,
}

function renderAssistant(children?: ReactNode) {
    return render(
        <>
            <article id="whatsapp-card" />
            <input ref={props.whatsappInputRef} id="business-whatsapp" />
            {children}
            <OnboardingBot {...props} />
        </>,
    )
}

async function advanceTime(milliseconds: number) {
    await act(async () => {
        vi.advanceTimersByTime(milliseconds)
        await Promise.resolve()
    })
}

describe('OnboardingBot', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }),
        )
        HTMLElement.prototype.scrollIntoView = vi.fn()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('aparece tras 800 ms con el saludo y avatar clover animado', async () => {
        renderAssistant()

        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        await advanceTime(800)

        expect(screen.getByRole('status')).toHaveTextContent(
            '¡Hola! 👋 Antes de recibir pedidos, necesitas registrar tu número de WhatsApp para que podamos enviártelos.',
        )
        expect(screen.getByRole('button', { name: 'Registrar mi número' })).toBeInTheDocument()
        expect(screen.getByTestId('bot-avatar')).toHaveAttribute('data-type', 'clover')
        expect(screen.getByTestId('bot-avatar')).toHaveAttribute('data-state', 'default')
        expect(screen.getByTestId('bot-avatar')).toHaveAttribute('data-size', '72')
        expect(screen.getByTestId('bot-avatar')).toHaveAttribute('data-paused', 'false')
    })

    it('usa el avatar reducido en pantallas móviles', async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockImplementation((query: string) => ({
                matches: query === '(max-width: 639px)',
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        )
        renderAssistant()
        await advanceTime(800)

        expect(screen.getByTestId('bot-avatar')).toHaveAttribute('data-size', '56')
    })

    it('enfoca y resalta WhatsApp al usar Registrar mi número', async () => {
        renderAssistant()
        const card = document.getElementById('whatsapp-card')
        await advanceTime(800)

        fireEvent.click(screen.getByRole('button', { name: 'Registrar mi número' }))

        expect(props.whatsappInputRef.current).toHaveFocus()
        expect(card).toHaveClass('ring-4', 'ring-indigo-200')
        expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
        })
        await advanceTime(2000)
        expect(card).not.toHaveClass('ring-4', 'ring-indigo-200')
    })

    it('cierra el globo guardando el descarte por negocio y deja reabrirlo desde el avatar', async () => {
        renderAssistant()
        await advanceTime(800)

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar mensaje' }))
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        expect(
            window.sessionStorage.getItem(
                'pedilo:onboarding-whatsapp-dismissed:business-onboarding-test',
            ),
        ).toBe('true')

        fireEvent.click(screen.getByRole('button', { name: 'Abrir ayuda del asistente' }))
        expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('muestra el mensaje de éxito 4 segundos y después desaparece', async () => {
        const { rerender } = renderAssistant()
        await advanceTime(800)
        rerender(
            <>
                <article id="whatsapp-card" />
                <input ref={props.whatsappInputRef} id="business-whatsapp" />
                <OnboardingBot {...props} hasWhatsapp didSaveWhatsapp />
            </>,
        )

        expect(screen.getByRole('status')).toHaveTextContent(
            '¡Listo! Ya puedes recibir pedidos por WhatsApp. 🎉',
        )
        await advanceTime(4000)
        expect(
            screen.getByRole('button', { name: 'Abrir ayuda del asistente' }),
        ).toBeInTheDocument()
        await advanceTime(260)
        expect(screen.queryByLabelText('Asistente de configuración')).not.toBeInTheDocument()
    })

    it('reduce el tiempo de salida a cero cuando el usuario prefiere movimiento reducido', async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        )
        const { rerender } = renderAssistant()
        await advanceTime(800)
        rerender(
            <>
                <article id="whatsapp-card" />
                <input ref={props.whatsappInputRef} id="business-whatsapp" />
                <OnboardingBot {...props} hasWhatsapp didSaveWhatsapp />
            </>,
        )
        await advanceTime(4000)
        await advanceTime(1)

        expect(screen.queryByLabelText('Asistente de configuración')).not.toBeInTheDocument()
    })

    it('no aparece antes de crear un negocio ni si ya hay WhatsApp guardado', async () => {
        const { rerender } = render(<OnboardingBot {...props} hasBusiness={false} />)
        await advanceTime(1000)
        expect(screen.queryByLabelText('Asistente de configuración')).not.toBeInTheDocument()

        rerender(<OnboardingBot {...props} hasWhatsapp />)
        await advanceTime(1000)
        expect(screen.queryByLabelText('Asistente de configuración')).not.toBeInTheDocument()
    })
})
