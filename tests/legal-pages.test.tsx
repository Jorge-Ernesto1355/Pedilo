import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrivacyPage from '@/app/privacidad/page'
import TermsPage from '@/app/terminos/page'
import RestaurantTermsPage from '@/app/terminos-restaurantes/page'
import ArcoPage from '@/app/arco/page'
import ProductsAndContentPage from '@/app/productos-y-contenido/page'
import IntellectualPropertyPage from '@/app/propiedad-intelectual/page'
import MarketingPage from '@/app/marketing/page'

describe('Páginas legales', () => {
    it('muestra la política de privacidad y sus enlaces legales', () => {
        render(<PrivacyPage />)

        expect(screen.getByRole('heading', { name: 'Aviso de Privacidad' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Términos de clientes' })).toHaveAttribute('href', '/terminos')
        expect(screen.getAllByText(/Jorge Ernesto Torres Serratos/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/Domicilio: \[POR COMPLETAR\]/).length).toBeGreaterThan(0)
    })

    it('muestra términos sin presentar cancelaciones o reembolsos como una política vigente', () => {
        render(<TermsPage />)

        expect(screen.getByRole('heading', { name: 'Términos y Condiciones para Clientes' })).toBeInTheDocument()
        expect(screen.getByText(/El pedido se transmite al restaurante seleccionado/i)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Política de Privacidad' })).toHaveAttribute('href', '/privacidad')
    })

    it.each([
        ['Términos y Condiciones para Restaurantes', RestaurantTermsPage],
        ['Procedimiento ARCO', ArcoPage],
        ['Productos y Contenido', ProductsAndContentPage],
        ['Propiedad Intelectual', IntellectualPropertyPage],
        ['Comunicaciones Comerciales y Marketing', MarketingPage],
    ])('publica el documento %s', (title, Page) => {
        render(<Page />)
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    })

    it('expone de forma visible cuando el documento de restaurantes está vacío', () => {
        render(<RestaurantTermsPage />)
        expect(screen.getByText(/documento fuente todavía no contiene texto publicado/i)).toBeInTheDocument()
    })
})
