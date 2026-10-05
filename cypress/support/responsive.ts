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
