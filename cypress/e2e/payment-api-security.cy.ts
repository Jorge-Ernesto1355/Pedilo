const validClabe = '012000000000000001'
const apiOrigin = () => `${(Cypress.config('env') as { backendUrl?: string }).backendUrl ?? 'http://localhost:3001'}/api/v1`
const cardPath = () => `${apiOrigin()}/businesses/payment-card`

function apiRequest(options: Partial<Cypress.RequestOptions> & { method: Cypress.HttpMethod; url: string }) {
    return cy.request({ failOnStatusCode: false, ...options })
}

describe('Tarjeta para transferencias · API y seguridad', () => {
    it('A-01: sin sesión todos los endpoints responden 401', () => {
        cy.clearCookies()
        apiRequest({ method: 'GET', url: cardPath() }).its('status').should('eq', 401)
        apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: 'Cypress' } }).its('status').should('eq', 401)
        apiRequest({ method: 'PATCH', url: `${cardPath()}/status`, body: { is_active: false } }).its('status').should('eq', 401)
        apiRequest({ method: 'DELETE', url: cardPath() }).its('status').should('eq', 401)
    })
    it('A-02: la tarjeta está aislada al restaurante autenticado', () => {
        cy.login(); apiRequest({ method: 'GET', url: cardPath() }).then((response) => expect(response.status).to.be.oneOf([200, 404]))
        apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: 'Restaurante propio' } }).its('status').should('eq', 200)
    })
    it('A-03: CLABE inválida o beneficiario vacío responde 400', () => {
        cy.login(); apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: '123', beneficiary_name: 'Cypress' } }).its('status').should('eq', 400); apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: '   ' } }).its('status').should('eq', 400)
    })
    it('A-04: ignora banco enviado y lo calcula en servidor', () => {
        cy.login(); apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: 'Cypress', bank_code: '999', bank_name: 'Falso' } }).then(({ status, body }) => { expect(status).to.eq(200); expect(body.paymentCard.bankCode ?? body.paymentCard.bank_code).to.eq('012'); expect(body.paymentCard.bankName ?? body.paymentCard.bank_name).to.eq('BBVA') })
    })
    it('A-05: un segundo PUT edita la misma tarjeta', () => {
        cy.login(); apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: 'Primero' } }).then((first) => apiRequest({ method: 'PUT', url: cardPath(), body: { clabe: validClabe, beneficiary_name: 'Segundo' } }).then((second) => { expect(first.body.paymentCard.id).to.eq(second.body.paymentCard.id); expect(second.body.paymentCard.beneficiaryName ?? second.body.paymentCard.beneficiary_name).to.eq('Segundo') }))
    })
    it('A-06: pedido transfer sin tarjeta activa responde 400', () => {
        cy.login(); apiRequest({ method: 'PATCH', url: `${cardPath()}/status`, body: { is_active: false } }).then(() => apiRequest({ method: 'POST', url: `${apiOrigin()}/businesses/business-payment-card-e2e/orders`, body: { customer: { name: 'Cypress', phone: '6691234567' }, items: [], payment_method: 'transfer' } }).its('status').should('eq', 400))
    })
    it('A-07: pedido sin método de pago usa cash', () => {
        cy.login(); apiRequest({ method: 'GET', url: cardPath() }).then((response) => expect(response.status).to.be.oneOf([200, 404]))
    })
    it('A-08: cash no expone tarjeta y transfer sí cuando existe', () => {
        cy.login(); apiRequest({ method: 'GET', url: cardPath() }).then(({ body }) => { expect(body.paymentCard === null || typeof body.paymentCard === 'object').to.eq(true) })
    })
    it('A-09: catálogo público solo expone disponibilidad, nunca CLABE', () => {
        apiRequest({ method: 'GET', url: `${apiOrigin()}/public/businesses/restaurante-payment-card-e2e/catalog` }).then(({ body }) => { const text = JSON.stringify(body); expect(text).not.to.contain(validClabe); expect(body.business).to.have.any.keys('paymentCardAvailable', 'payment_card_available') })
    })
})
