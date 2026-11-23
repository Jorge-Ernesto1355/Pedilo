import {
    backendApi,
    type Coordinates,
    type DeliverySeed,
    loginAsDeliveryOwner,
    pointAtRoadKm,
    seedDelivery,
} from './deliverySupport'

// Cotización pública de envío contra el backend local real.
// Tarifa de prueba del seed: hasta 2 km → $30, hasta 5 km → $50; radio máximo 5 km.

let seed: DeliverySeed

function quote(businessId: string, body: Cypress.RequestBody) {
    return backendApi(`/public/businesses/${businessId}/delivery/quote`).then((url) =>
        cy.request({ method: 'POST', url, body, failOnStatusCode: false }),
    )
}

function quoteAt(roadKm: number) {
    const destination: Coordinates = pointAtRoadKm(seed.origin, roadKm)
    return quote(seed.businessId, destination)
}

describe('Envío a domicilio · cotización en el servidor', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    it('calcula en el servidor la distancia y el envío de un pin', () => {
        quoteAt(3.4).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body.quote).to.deep.equal({
                distanceKm: 3.4,
                fee: 50,
                maxDeliveryKm: 5,
            })
        })
    })

    it('un pin exactamente en el límite de un tramo paga ese tramo', () => {
        quoteAt(2).its('body.quote').should('deep.include', { distanceKm: 2, fee: 30 })
    })

    it('un pin 0.1 km después del límite paga el siguiente tramo', () => {
        quoteAt(2.1).its('body.quote').should('deep.include', { distanceKm: 2.1, fee: 50 })
    })

    it('acepta un pin exactamente en el radio máximo', () => {
        quoteAt(5).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body.quote).to.deep.include({ distanceKm: 5, fee: 50 })
        })
    })

    it('rechaza un pin fuera del radio e informa distancia y radio', () => {
        quoteAt(5.1).then((response) => {
            expect(response.status).to.eq(422)
            expect(response.body.error.code).to.eq('DELIVERY_OUT_OF_RANGE')
            expect(response.body.error.details).to.deep.equal({ distanceKm: 5.1, maxDeliveryKm: 5 })
        })
    })

    it('sin pin responde DELIVERY_DESTINATION_INVALID', () => {
        quote(seed.businessId, {}).then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.error.code).to.eq('DELIVERY_DESTINATION_INVALID')
        })
    })

    it('no acepta distancia ni envío enviados por el cliente', () => {
        quote(seed.businessId, { ...seed.origin, distanceKm: 0.1, fee: 1 }).then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body).not.to.have.property('quote')
        })
    })

    it('un negocio inexistente responde 404', () => {
        quote('negocio-inexistente-e2e', seed.origin).then((response) => {
            expect(response.status).to.eq(404)
            expect(response.body.error.code).to.eq('BUSINESS_NOT_FOUND')
        })
    })

    describe('con el envío desactivado', () => {
        after(() => {
            seedDelivery()
        })

        it('responde DELIVERY_UNAVAILABLE', () => {
            loginAsDeliveryOwner(seed)
            backendApi('/businesses/delivery-settings').then((url) =>
                cy
                    .request({ method: 'PUT', url, body: { ...seed.settings, enabled: false } })
                    .its('status')
                    .should('eq', 200),
            )
            quote(seed.businessId, seed.origin).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error.code).to.eq('DELIVERY_UNAVAILABLE')
            })
        })
    })
})
