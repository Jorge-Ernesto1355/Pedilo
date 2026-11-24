// Seguridad de la tarjeta de lealtad (API). Fase 8.
import {
    asOwner,
    availableReward,
    cardDetail,
    cardToken,
    customerWithStamps,
    finishedOrder,
    type LoyaltySeed,
    owner,
    publicOrder,
    publicRequest,
    saveProgram,
    seedLoyalty,
    stampOrder,
    walkInStamp,
} from './loyaltySupport'

/** Recursos del restaurante A para intentar tocarlos desde C. */
type Victim = {
    customerId: string
    orderId: string
    stampId: string
    rewardId: string
    token: string
}

describe('Lealtad · seguridad (API)', () => {
    let seed: LoyaltySeed

    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
    })

    function victim(): Cypress.Chainable<Victim> {
        return customerWithStamps(seed.a, 7, 'Víctima A').then((customer) =>
            finishedOrder(seed.a, customer).then((orderId) =>
                stampOrder(orderId).then((stamped) =>
                    cardToken(customer.id).then((token) => ({
                        customerId: customer.id,
                        orderId,
                        stampId: stamped.body.stamp.id as string,
                        rewardId: stamped.body.reward.id as string,
                        token,
                    })),
                ),
            ),
        )
    }

    it('el restaurante C no puede ver la tarjeta ni el historial de un cliente de A', () => {
        victim().then((target) => {
            asOwner(seed.c)
            owner('GET', `/businesses/loyalty/cards/${target.customerId}`).then((response) => {
                expect(response.status).to.eq(404)
                expect(JSON.stringify(response.body)).not.to.contain(target.token)
            })
            owner('GET', `/businesses/loyalty/cards?customerIds=${target.customerId}`).then(
                (response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.cards).to.have.length(0)
                },
            )
        })
    })

    it('el restaurante C no puede sellar pedidos ni dar sellos a clientes de A', () => {
        victim().then((target) => {
            asOwner(seed.c)
            walkInStamp(target.customerId).its('status').should('eq', 404)
            stampOrder(target.orderId).its('status').should('eq', 404)
        })
    })

    it('el restaurante C no puede anular sellos de A', () => {
        victim().then((target) => {
            asOwner(seed.c)
            owner('DELETE', `/businesses/orders/${target.orderId}/stamp`, {
                reason: 'intento ajeno',
            })
                .its('status')
                .should('eq', 404)
            owner('POST', `/businesses/loyalty/stamps/${target.stampId}/void`, {
                reason: 'intento ajeno',
            })
                .its('status')
                .should('eq', 404)
            asOwner(seed.a)
            cardDetail(target.customerId).then((response) => {
                expect(response.body.card.cyclesCompleted).to.eq(1)
                expect(
                    response.body.stamps.every(
                        (stamp: { voidedAt: string | null }) => stamp.voidedAt === null,
                    ),
                ).to.eq(true)
            })
        })
    })

    it('el restaurante C no puede canjear premios ni regenerar links de A', () => {
        victim().then((target) => {
            asOwner(seed.c)
            owner('POST', `/businesses/loyalty/rewards/${target.rewardId}/redeem`, {}).then(
                (response) => {
                    expect(response.status).to.eq(404)
                    expect(response.body.error.code).to.eq('LOYALTY_REWARD_NOT_FOUND')
                },
            )
            owner('POST', `/businesses/loyalty/cards/${target.customerId}/rotate-token`)
                .its('status')
                .should('eq', 404)
            asOwner(seed.a)
            availableReward(target.customerId)
            cardToken(target.customerId).should('eq', target.token)
        })
    })

    it('un id de restaurante en el cuerpo se rechaza: el restaurante sale de la sesión', () => {
        owner('PUT', '/businesses/loyalty/program', { businessId: seed.c.businessId })
            .its('status')
            .should('eq', 400)
    })

    it('token inválido y token de otro restaurante dan la misma respuesta', () => {
        asOwner(seed.c)
        customerWithStamps(seed.c, 1, 'Cliente C').then((customer) => {
            cardToken(customer.id).then((foreignToken) => {
                const quote = (token: string) =>
                    publicRequest(
                        'POST',
                        `/public/businesses/${seed.a.slug}/loyalty/reward-quote`,
                        {
                            cardToken: token,
                            subtotal: 100,
                        },
                    )
                quote(foreignToken).then((foreign) => {
                    quote('x'.repeat(43)).then((invalid) => {
                        expect(foreign.status).to.eq(404)
                        expect(invalid.status).to.eq(404)
                        expect(foreign.body).to.deep.eq(invalid.body)
                        expect(foreign.body.error).to.deep.eq({
                            code: 'LOYALTY_CARD_NOT_FOUND',
                            message: 'No encontramos esta tarjeta.',
                        })
                    })
                })
            })
        })
        for (const token of ['x'.repeat(43), 'corto', 'a'.repeat(64)]) {
            publicRequest('GET', `/public/loyalty/${token}`).then((response) => {
                expect(response.status).to.eq(404)
                expect(response.body.error.code).to.eq('LOYALTY_CARD_NOT_FOUND')
            })
        }
    })

    it('un premio no se canjea con el token de otra tarjeta', () => {
        customerWithStamps(seed.a, 8, 'Dueña premio').then((target) => {
            availableReward(target.id).then((reward) => {
                customerWithStamps(seed.a, 1, 'Otra clienta').then((other) => {
                    cardToken(other.id).then((otherToken) => {
                        publicOrder(seed.a, {
                            customer: other,
                            loyalty: {
                                cardToken: otherToken,
                                rewardId: reward.id,
                                expectedDiscount: 20,
                            },
                        }).then((response) => {
                            expect(response.status).to.eq(409)
                            expect(response.body.error.details.reason).to.eq('NOT_FOUND')
                        })
                    })
                })
            })
        })
    })

    it('regenerar el token invalida el anterior', () => {
        customerWithStamps(seed.a, 2).then((customer) => {
            cardToken(customer.id).then((oldToken) => {
                owner('POST', `/businesses/loyalty/cards/${customer.id}/rotate-token`).then(
                    (response) => {
                        expect(response.status).to.eq(200)
                        expect(response.body.cardToken).to.match(/^[A-Za-z0-9_-]{43}$/)
                        expect(response.body.cardToken).not.to.eq(oldToken)
                        publicRequest('GET', `/public/loyalty/${oldToken}`)
                            .its('status')
                            .should('eq', 404)
                        publicRequest('GET', `/public/loyalty/${response.body.cardToken}`)
                            .its('body.card.stampsCount')
                            .should('eq', 2)
                    },
                )
            })
        })
    })

    it('las rutas del dueño no aceptan el token de la tarjeta como identificador', () => {
        customerWithStamps(seed.a, 1).then((customer) => {
            cardToken(customer.id).then((token) => {
                owner('GET', `/businesses/loyalty/cards/${token}`).its('status').should('eq', 404)
            })
        })
    })

    it('la tarjeta pública no incluye teléfono, apellido ni historial de pedidos', () => {
        customerWithStamps(seed.a, 3, 'Ana López Pérez').then((customer) => {
            cardToken(customer.id).then((token) => {
                publicRequest('GET', `/public/loyalty/${token}`).then((response) => {
                    expect(response.status).to.eq(200)
                    const text = JSON.stringify(response.body)
                    expect(response.body.card.customerFirstName).to.eq('Ana')
                    expect(text).not.to.contain(customer.phone)
                    expect(text).not.to.contain('López')
                    expect(text).not.to.contain('orderNumber')
                    expect(text).not.to.contain('orderId')
                    expect(text).not.to.contain(token)
                    expect(Object.keys(response.body.card.recentStamps[0])).to.deep.eq([
                        'createdAt',
                    ])
                })
            })
        })
    })

    it('las respuestas públicas de la tarjeta llevan noindex, no-store y no-referrer', () => {
        customerWithStamps(seed.a, 1).then((customer) => {
            cardToken(customer.id).then((token) => {
                publicRequest('GET', `/public/loyalty/${token}`).then((response) => {
                    expect(response.headers['cache-control']).to.eq('no-store')
                    expect(response.headers['x-robots-tag']).to.contain('noindex')
                    expect(response.headers['referrer-policy']).to.eq('no-referrer')
                })
            })
        })
    })

    it('límite de peticiones en la tarjeta pública (por token)', () => {
        customerWithStamps(seed.a, 1).then((customer) => {
            cardToken(customer.id).then((token) => {
                for (let index = 0; index < 30; index += 1) {
                    publicRequest('GET', `/public/loyalty/${token}`).its('status').should('eq', 200)
                }
                publicRequest('GET', `/public/loyalty/${token}`).then((response) => {
                    expect(response.status).to.eq(429)
                    expect(response.headers['retry-after']).to.be.a('string')
                    expect(response.body.error.code).to.eq('RATE_LIMITED')
                })
            })
        })
    })
})
