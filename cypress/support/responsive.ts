export function assertPageFitsViewport() {
    cy.document().should((document) => {
        const viewportWidth = document.defaultView?.innerWidth ?? 0
        expect(document.documentElement.scrollWidth).to.be.at.most(viewportWidth)
        expect(document.body.scrollWidth).to.be.at.most(viewportWidth)
    })
}

export function assertTouchTargets(selector: string, minimumSize = 40) {
    cy.get(selector)
        .filter(':visible')
        .should(($controls) => {
            expect($controls.length).to.be.greaterThan(0)
            Array.from($controls).forEach((control) => {
                const rect = control.getBoundingClientRect()
                const viewportWidth = control.ownerDocument.defaultView?.innerWidth ?? 0
                expect(rect.width, `${selector} width`).to.be.at.least(minimumSize)
                expect(rect.height, `${selector} height`).to.be.at.least(minimumSize)
                expect(rect.left, `${selector} left edge`).to.be.at.least(0)
                expect(rect.right, `${selector} right edge`).to.be.at.most(viewportWidth)
            })
        })
}

export function assertDialogFitsViewport(selector: string) {
    cy.get(selector)
        .should('be.visible')
        .and(($dialog) => {
            const rect = $dialog[0].getBoundingClientRect()
            const viewportWidth = $dialog[0].ownerDocument.defaultView?.innerWidth ?? 0
            const viewportHeight = $dialog[0].ownerDocument.defaultView?.innerHeight ?? 0

            expect(rect.left, `${selector} left edge`).to.be.at.least(0)
            expect(rect.right, `${selector} right edge`).to.be.at.most(viewportWidth)
            expect(rect.top, `${selector} top edge`).to.be.at.least(0)
            expect(rect.bottom, `${selector} bottom edge`).to.be.at.most(viewportHeight)
        })
}

/** Al hacer clic en el centro del control lo recibe él y no algo encima (p. ej. la barra móvil). */
export function assertNotCovered($control: JQuery<HTMLElement>, label: string) {
    const rect = $control[0].getBoundingClientRect()
    const hit = $control[0].ownerDocument.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
    )
    expect($control[0].contains(hit), `${label} es el elemento superior`).to.eq(true)
}

/** Ningún borde de los controles queda fuera del viewport horizontalmente. */
export function assertInsideViewportX($controls: JQuery<HTMLElement>, label: string) {
    const viewportWidth = $controls[0].ownerDocument.defaultView?.innerWidth ?? 0
    Array.from($controls).forEach((control, index) => {
        const rect = control.getBoundingClientRect()
        expect(rect.left, `${label} #${index} borde izquierdo`).to.be.at.least(0)
        expect(rect.right, `${label} #${index} borde derecho`).to.be.at.most(viewportWidth)
    })
}
