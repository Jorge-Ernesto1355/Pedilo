// Spec temporal de diagnóstico (se borra después).
describe('diag google reviews', { retries: 0 }, () => {
    it('errores y peticiones al abrir Ver código QR', () => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            cy.clearAllCookies()
            cy.request('POST', '/api/auth/login', { email: e2eSeedEmail, password: e2eSeedPassword, remember: true })
        })
        const log: string[] = []
        cy.on('window:before:load', (win) => {
            const original = win.console.error
            win.console.error = (...args: unknown[]) => { log.push('console.error: ' + args.map(String).join(' ').slice(0, 400)); original.apply(win.console, args as []) }
            win.addEventListener('error', (e) => log.push('window.error: ' + e.message))
        })
        cy.on('uncaught:exception', (err) => { log.push('uncaught: ' + err.message.slice(0, 300)); return false })
        cy.intercept({ url: 'http://localhost:3001/api/**' }, (req) => { if (req.method !== 'OPTIONS') log.push(`${req.method} ${new URL(req.url).pathname}`) })
        cy.visit('/create-menu')
        cy.contains('h3', 'Google Reviews').should('be.visible')
        cy.wait(1500)
        cy.then(() => log.push('--- clic Ver código QR'))
        cy.contains('button', 'Ver código QR').click()
        cy.wait(3000)
        cy.get('body').then(($b) => log.push(`dialog presente: ${$b.find('[role="dialog"]').length}`))
        cy.then(() => cy.writeFile('test-results/diag-gr.txt', log.join('\n')))
    })
})
