// En una carga completa, el resumen y Ventas reciben las cifras de "Hoy" desde el servidor
// (getOverviewInitialData) y el navegador no las pide: los mocks de cy.intercept no
// aplicarían. En una navegación interna (isClientNavigation) el servidor no las consulta y
// el cliente pide todos los periodos, así que los intercepts definen los datos.

/** Espera a que React hidrate el área protegida. */
export function waitForProtectedShellHydration() {
    // El indicador de tiempo real sale de "Conectando" solo después de hidratar: un clic
    // anterior haría una carga completa del documento (con datos del servidor).
    cy.get('[aria-label^="Estado de actualizaciones"]', { timeout: 15_000 }).should(
        'not.have.attr',
        'aria-label',
        'Estado de actualizaciones: Conectando',
    )
}

/** Abre `pathname` desde la navegación del dashboard, sin recargar el documento. */
export function visitViaClientNavigation(pathname: string) {
    cy.visit('/dashboard/account')
    waitForProtectedShellHydration()
    // Escritorio o móvil: se usa el enlace de la navegación visible en el viewport actual.
    cy.get(
        `nav[aria-label="Navegación principal"] a[href="${pathname}"], nav[aria-label="Navegación móvil"] a[href="${pathname}"]`,
    )
        .filter(':visible')
        .first()
        .click()
    cy.location('pathname').should('eq', pathname)
}
