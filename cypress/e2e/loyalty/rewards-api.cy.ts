// Premios: canje en el checkout, en "Nueva orden" y en el local. Fase 3.
import {
    asOwner,
    availableReward,
    backendApi,
    cardDetail,
    cardToken,
    customerWithStamps,
    GIFT_PRICE,
    type LoyaltySeed,
    owner,
    publicOrder,
    publicRequest,
    saveProgram,
    seedLoyalty,
    setStatus,
    uniquePhone,
} from './loyaltySupport'

type RewardSetup = {
    customer: { id: string; name: string; phone: string }
    token: string
    rewardId: string
}

/** Cliente con tarjeta completa (8 de 8) → un premio disponible, su token y el id del premio. */
function customerWithReward(seed: LoyaltySeed, name = 'Ana López'): Cypress.Chainable<RewardSetup> {
    return customerWithStamps(seed.a, 8, name).then((customer) =>
        cardToken(customer.id).then((token) =>
            availableReward(customer.id).then((reward) => ({
                customer,
                token,
                rewardId: reward.id,
            })),
        ),
    )
}

describe('Lealtad · premios (API)', () => {
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

    it('canje percent: 20% sobre el subtotal, como línea aparte', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            publicOrder(seed.a, {
                customer,
                quantity: 2,
                loyalty: { cardToken: token, rewardId, expectedDiscount: 40 },
            }).then((response) => {
                expect(response.status, JSON.stringify(response.body)).to.eq(201)
                expect(response.body.order).to.include({
                    subtotal: 200,
                    discountAmount: 0,
                    loyaltyDiscountAmount: 40,
                    total: 160,
                })
                expect(response.body.order.loyaltyReward).to.include({ id: rewardId, active: true })
            })
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
        })
    })

    it('canje fixed: el monto sin pasar del subtotal', () => {
        saveProgram({ rewardType: 'FIXED', rewardValue: 150, rewardLabel: '$150 de descuento' })
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            publicOrder(seed.a, {
                customer,
                quantity: 1,
                loyalty: { cardToken: token, rewardId, expectedDiscount: 100 },
            }).then((response) => {
                expect(response.status, JSON.stringify(response.body)).to.eq(201)
                expect(response.body.order).to.include({
                    subtotal: 100,
                    loyaltyDiscountAmount: 100,
                    total: 0,
                })
            })
        })
    })

    it('canje free_product: agrega el producto elegido a $0 neto', () => {
        saveProgram({
            rewardType: 'FREE_PRODUCT',
            rewardValue: 0,
            rewardProductId: seed.a.giftProductId,
            rewardLabel: 'Agua gratis',
        })
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            publicOrder(seed.a, {
                customer,
                quantity: 1,
                loyalty: { cardToken: token, rewardId, expectedDiscount: GIFT_PRICE },
            }).then((response) => {
                expect(response.status, JSON.stringify(response.body)).to.eq(201)
                const order = response.body.order
                expect(order).to.include({ subtotal: 125, loyaltyDiscountAmount: 25, total: 100 })
                const gift = order.items.find(
                    (item: { productId: string }) => item.productId === seed.a.giftProductId,
                )
                expect(gift.options.map((option: { name: string }) => option.name)).to.include(
                    'Premio de lealtad',
                )
            })
        })
    })

    it('free_product con el producto agotado: el premio no aplica y se avisa', () => {
        saveProgram({
            rewardType: 'FREE_PRODUCT',
            rewardValue: 0,
            rewardProductId: seed.a.giftProductId,
        })
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            owner('PATCH', `/businesses/products/${seed.a.giftProductId}/status`, {
                isAvailable: false,
            })
            publicRequest('POST', `/public/businesses/${seed.a.slug}/loyalty/reward-quote`, {
                cardToken: token,
                subtotal: 100,
            }).then((response) => {
                expect(response.body.quote).to.include({
                    discount: 0,
                    unavailableReason: 'PRODUCT_UNAVAILABLE',
                })
            })
            publicOrder(seed.a, {
                customer,
                loyalty: { cardToken: token, rewardId, expectedDiscount: GIFT_PRICE },
            }).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error.details).to.include({
                    reason: 'PRODUCT_UNAVAILABLE',
                    expectedDiscount: GIFT_PRICE,
                    currentDiscount: 0,
                })
            })
            owner('PATCH', `/businesses/products/${seed.a.giftProductId}/status`, {
                isAvailable: true,
            })
        })
    })

    it('dos canjes simultáneos del mismo premio: solo uno gana', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            backendApi(`/businesses/${seed.a.businessId}/orders`).then((url) => {
                const body = JSON.stringify({
                    customer: { name: customer.name, phone: customer.phone },
                    items: [{ productId: seed.a.productId, quantity: 1 }],
                    fulfillmentType: 'PICKUP',
                    loyalty: { cardToken: token, rewardId, expectedDiscount: 20 },
                })
                const send = () =>
                    fetch(url, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body,
                    }).then((response) => response.status)
                cy.then(() => Promise.all([send(), send(), send()])).then((statuses) => {
                    const list = statuses as unknown as number[]
                    expect(list.filter((status) => status === 201)).to.have.length(1)
                    expect(list.filter((status) => status === 409)).to.have.length(2)
                })
            })
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
        })
    })

    it('un premio ya canjeado no se vuelve a aplicar', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            const loyalty = { cardToken: token, rewardId, expectedDiscount: 20 }
            publicOrder(seed.a, { customer, loyalty }).its('status').should('eq', 201)
            publicOrder(seed.a, { customer, loyalty }).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error).to.deep.include({ code: 'LOYALTY_REWARD_UNAVAILABLE' })
                expect(response.body.error.details.reason).to.eq('REDEEMED')
            })
        })
    })

    it('cancelar el pedido devuelve el premio', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            const loyalty = { cardToken: token, rewardId, expectedDiscount: 20 }
            publicOrder(seed.a, { customer, loyalty }).then((response) => {
                setStatus(response.body.order.id, 'CANCELLED').its('status').should('eq', 200)
                owner('GET', `/businesses/orders/${response.body.order.id}`)
                    .its('body.order.loyaltyReward.active')
                    .should('eq', false)
            })
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'AVAILABLE')
            publicOrder(seed.a, { customer, loyalty }).its('status').should('eq', 201)
        })
    })

    it('si el total cambió durante el checkout, el pedido no se crea', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            publicOrder(seed.a, {
                customer,
                quantity: 1,
                loyalty: { cardToken: token, rewardId, expectedDiscount: 35 },
            }).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error).to.deep.eq({
                    code: 'LOYALTY_REWARD_CHANGED',
                    message: 'El descuento de tu premio cambió.',
                    details: { expectedDiscount: 35, currentDiscount: 20 },
                })
            })
            owner('GET', `/businesses/customers/${customer.id}/orders`)
                .its('body.total')
                .should('eq', 0)
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'AVAILABLE')
        })
    })

    it('con transferencia, el monto a transferir ya incluye el descuento', () => {
        customerWithReward(seed).then(({ customer, token, rewardId }) => {
            publicOrder(seed.a, {
                customer,
                quantity: 2,
                paymentMethod: 'TRANSFER',
                loyalty: { cardToken: token, rewardId, expectedDiscount: 40 },
            }).then((response) => {
                expect(response.status, JSON.stringify(response.body)).to.eq(201)
                expect(response.body.order.total).to.eq(160)
                expect(response.body.order.transferCard.clabe).to.eq('012000000000000001')
            })
        })
    })

    it('la cotización del checkout calcula el descuento del premio', () => {
        customerWithReward(seed).then(({ token, rewardId }) => {
            publicRequest('POST', `/public/businesses/${seed.a.slug}/loyalty/reward-quote`, {
                cardToken: token,
                subtotal: 255.55,
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.headers['cache-control']).to.eq('no-store')
                expect(response.body.quote).to.deep.include({
                    programActive: true,
                    discount: 51.11,
                })
                expect(response.body.quote.reward).to.include({
                    id: rewardId,
                    label: '20% de descuento',
                })
            })
        })
    })

    it('sin premio, la cotización indica cuántos sellos lleva', () => {
        customerWithStamps(seed.a, 6).then((customer) => {
            cardToken(customer.id).then((token) => {
                publicRequest('POST', `/public/businesses/${seed.a.slug}/loyalty/reward-quote`, {
                    cardToken: token,
                    subtotal: 100,
                })
                    .its('body.quote')
                    .should('deep.include', {
                        reward: null,
                        discount: 0,
                        card: { stampsCount: 6, stampsRequired: 8 },
                    })
            })
        })
    })

    it('canje manual en el local', () => {
        customerWithReward(seed).then(({ customer, rewardId }) => {
            owner('POST', `/businesses/loyalty/rewards/${rewardId}/redeem`, {}).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.reward.status).to.eq('REDEEMED')
                expect(response.body.order).to.eq(null)
            })
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
        })
    })

    it('canjear a mano en un pedido pendiente del cliente recalcula su total', () => {
        customerWithReward(seed).then(({ customer, rewardId }) => {
            publicOrder(seed.a, { customer, quantity: 2 }).then((created) => {
                const orderId = created.body.order.id as string
                owner('POST', `/businesses/loyalty/rewards/${rewardId}/redeem`, { orderId }).then(
                    (response) => {
                        expect(response.status, JSON.stringify(response.body)).to.eq(200)
                        expect(response.body.order).to.deep.eq({
                            id: orderId,
                            total: 160,
                            loyaltyDiscountAmount: 40,
                        })
                    },
                )
                owner('GET', `/businesses/orders/${orderId}`)
                    .its('body.order.total')
                    .should('eq', 160)
            })
        })
    })

    it('"Aplicar premio" en Nueva orden usa el canje del servidor', () => {
        customerWithReward(seed).then(({ customer, rewardId }) => {
            owner('POST', `/businesses/${seed.a.businessId}/orders/restaurant`, {
                customerName: customer.name,
                customerPhone: customer.phone,
                items: [{ productId: seed.a.productId, quantity: 3 }],
                fulfillmentType: 'DINE_IN',
                loyaltyRewardId: rewardId,
            }).then((response) => {
                expect(response.status, JSON.stringify(response.body)).to.eq(201)
                expect(response.body.order).to.include({
                    subtotal: 300,
                    loyaltyDiscountAmount: 60,
                    total: 240,
                })
            })
        })
    })

    it('"Aplicar premio" rechaza el premio de otro cliente', () => {
        customerWithReward(seed).then(({ rewardId }) => {
            owner('POST', `/businesses/${seed.a.businessId}/orders/restaurant`, {
                customerName: 'Otra persona',
                customerPhone: uniquePhone(),
                items: [{ productId: seed.a.productId, quantity: 1 }],
                loyaltyRewardId: rewardId,
            }).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error.code).to.eq('LOYALTY_REWARD_ORDER_MISMATCH')
            })
        })
    })

    it('un cliente nuevo recibe la llave de su tarjeta; uno existente no', () => {
        const phone = uniquePhone()
        publicOrder(seed.a, { customer: { name: 'Nueva', phone } }).then((response) => {
            expect(response.body.order.loyaltyCardToken).to.match(/^[A-Za-z0-9_-]{43}$/)
        })
        publicOrder(seed.a, { customer: { name: 'Nueva', phone } }).then((response) => {
            expect(response.body.order).not.to.have.property('loyaltyCardToken')
        })
    })
})
