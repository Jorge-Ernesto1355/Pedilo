import './commands'

Cypress.on('uncaught:exception', (error) => {
    if (/ResizeObserver loop|hydration/i.test(error.message)) return false
    // Next's development RSC performance probe can receive a negative mark
    // timestamp after Cypress changes the browser clock during navigation.
    // It is emitted by react-server-dom-webpack, does not affect rendering,
    // and is not present in the production bundle.
    if (/cannot have a negative time stamp/i.test(error.message)) return false
})
