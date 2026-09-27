import './commands'

Cypress.on('uncaught:exception', (error) => {
    if (/ResizeObserver loop|hydration/i.test(error.message)) return false
})
