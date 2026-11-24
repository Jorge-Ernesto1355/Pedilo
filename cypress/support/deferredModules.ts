/**
 * Los módulos con carga bajo demanda (IntersectionObserver) no se montan hasta
 * que entran al viewport. Este helper hace el scroll para dispararlos.
 */
export function revealDeferred(selector: string) {
    cy.get(selector).first().scrollIntoView({ duration: 0 })
}

/** Tarjeta para transferencias en /create-menu (DeferredPaymentCard). */
export function revealPaymentCard() {
    revealDeferred('[data-cy="payment-card-settings"]')
}

const DASHBOARD_MODULE_FALLBACK = '[aria-label="Cargando módulo del dashboard"]'

/**
 * Los módulos de /dashboard (tendencia, más vendido, pedidos recientes...) se montan
 * al entrar al viewport. Se recorre cada fallback pendiente hasta que no quede ninguno,
 * porque un salto directo al final se salta los intermedios.
 */
export function revealDashboardModules(attemptsLeft = 8): void {
    cy.get('body').then(($body) => {
        const pending = $body.find(DASHBOARD_MODULE_FALLBACK)
        if (pending.length === 0 || attemptsLeft === 0) return
        cy.wrap(pending.first()).scrollIntoView({ duration: 0 })
        cy.wait(300)
        revealDashboardModules(attemptsLeft - 1)
    })
}
