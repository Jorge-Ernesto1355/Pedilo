// Reglas de sellado (API del dueño). Fase 3.
import {
    asOwner,
    cardDetail,
    createCustomer,
    customerWithStamps,
    finishedOrder,
    type LoyaltySeed,
    owner,
    publicOrder,
    saveProgram,
    seedLoyalty,
    setStatus,
    stampOrder,
    uniquePhone,
    voidOrderStamp,
    walkInStamp,
} from './loyaltySupport'

describe('Lealtad · sellado (API)', () => {
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

    it('sella un pedido finalizado', () => {
        createCustomer(seed.a, 'Ana Sello').then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).then((response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.alreadyStamped).to.eq(false)
                    expect(response.body.stamp).to.include({ source: 'ORDER_MANUAL', position: 1 })
                    expect(response.body.card).to.include({ stampsCount: 1, stampsRequired: 8 })
                    expect(response.body.customerFirstName).to.eq('Ana')
                })
            })
        })
    })

    it('repetir la misma petición no duplica el sello', () => {
        createCustomer(seed.a).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).its('body.stamp.id').as('firstStamp')
                stampOrder(orderId).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.alreadyStamped).to.eq(true)
                    cy.get('@firstStamp').should('eq', response.body.stamp.id)
                    expect(response.body.card.stampsCount).to.eq(1)
                })
                cardDetail(customer.id).its('body.stamps').should('have.length', 1)
            })
        })
    })

    it('un pedido cancelado no se sella', () => {
        publicOrder(seed.a, { customer: { name: 'Cancela', phone: uniquePhone() } }).then(
            (created) => {
                const orderId = created.body.order.id as string
                setStatus(orderId, 'CANCELLED').its('status').should('eq', 200)
                stampOrder(orderId).then((response) => {
                    expect(response.status).to.eq(422)
                    expect(response.body.error.code).to.eq('LOYALTY_ORDER_NOT_STAMPABLE')
                    expect(response.body.error.details.reason).to.eq('ORDER_CANCELLED')
                    expect(response.body.error.message).to.eq('Un pedido cancelado no se sella.')
                })
            },
        )
    })

    it('un pedido que no está finalizado no se sella', () => {
        publicOrder(seed.a, { customer: { name: 'Prepara', phone: uniquePhone() } }).then(
            (created) => {
                const orderId = created.body.order.id as string
                setStatus(orderId, 'PREPARING')
                stampOrder(orderId)
                    .its('body.error.details.reason')
                    .should('eq', 'ORDER_NOT_FINISHED')
            },
        )
    })

    it('un pedido bajo el monto mínimo no se sella', () => {
        saveProgram({ minOrderAmount: 150 })
        createCustomer(seed.a).then((customer) => {
            finishedOrder(seed.a, customer, 1).then((orderId) => {
                stampOrder(orderId).then((response) => {
                    expect(response.status).to.eq(422)
                    expect(response.body.error.details).to.deep.eq({
                        reason: 'ORDER_BELOW_MINIMUM',
                        minOrderAmount: 150,
                    })
                })
            })
            // 2 × $100 sí alcanza el mínimo.
            finishedOrder(seed.a, customer, 2).then((orderId) => {
                stampOrder(orderId).its('status').should('eq', 201)
            })
        })
    })

    it('un pedido sin cliente ofrece vincular uno y luego se sella', () => {
        finishedOrder(seed.a, null).then((orderId) => {
            stampOrder(orderId).then((response) => {
                expect(response.status).to.eq(422)
                expect(response.body.error.details.reason).to.eq('ORDER_WITHOUT_CUSTOMER')
                expect(response.body.error.message).to.eq(
                    'Vincula un cliente al pedido para darle su sello.',
                )
            })
            const phone = uniquePhone()
            stampOrder(orderId, { customer: { name: 'Luis Mostrador', phone } }).then(
                (response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.customerFirstName).to.eq('Luis')
                },
            )
            owner('GET', `/businesses/orders/${orderId}`).then((response) => {
                expect(response.body.order.customerPhone).to.eq(phone)
                expect(response.body.order.loyaltyStamp.position).to.eq(1)
            })
            // Un pedido que ya tiene cliente no se vuelve a vincular.
            stampOrder(orderId, { customer: { name: 'Otro', phone: uniquePhone() } })
                .its('body.error.code')
                .should('eq', 'LOYALTY_ORDER_HAS_CUSTOMER')
        })
    })

    it('el modo automático sella al finalizar el pedido', () => {
        saveProgram({ stampMode: 'AUTO' })
        createCustomer(seed.a, 'Beto Auto').then((customer) => {
            publicOrder(seed.a, { customer }).then((created) => {
                const orderId = created.body.order.id as string
                setStatus(orderId, 'PREPARING')
                setStatus(orderId, 'READY').then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.order.loyalty).to.deep.eq({
                        mode: 'AUTO',
                        eligible: false,
                        stamped: {
                            customerFirstName: 'Beto',
                            stampsCount: 1,
                            stampsRequired: 8,
                            completed: false,
                            rewardLabel: null,
                        },
                    })
                })
                cardDetail(customer.id).its('body.stamps.0.source').should('eq', 'ORDER_AUTO')
                stampOrder(orderId).its('body.alreadyStamped').should('eq', true)
            })
        })
    })

    it('en modo manual, finalizar informa que se puede dar el sello', () => {
        createCustomer(seed.a).then((customer) => {
            publicOrder(seed.a, { customer }).then((created) => {
                const orderId = created.body.order.id as string
                setStatus(orderId, 'PREPARING')
                setStatus(orderId, 'READY')
                    .its('body.order.loyalty')
                    .should('deep.eq', { mode: 'MANUAL', stamped: null, eligible: true })
                cardDetail(customer.id).its('body.stamps').should('have.length', 0)
            })
        })
    })

    it('completar la tarjeta crea el premio y reinicia el conteo', () => {
        customerWithStamps(seed.a, 7, 'Carla Siete').then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).then((response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.stamp.position).to.eq(8)
                    expect(response.body.card).to.include({ stampsCount: 0, cyclesCompleted: 1 })
                    expect(response.body.reward).to.include({
                        status: 'AVAILABLE',
                        type: 'PERCENT',
                        value: 20,
                        label: '20% de descuento',
                    })
                })
            })
        })
    })

    it('anular el sello que completó la tarjeta anula el premio', () => {
        customerWithStamps(seed.a, 7).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).its('body.reward.id').as('rewardId')
                voidOrderStamp(orderId, 'sello por error').then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.card).to.include({ stampsCount: 7, cyclesCompleted: 0 })
                    cy.get('@rewardId').should('eq', response.body.voidedRewardId)
                })
                cardDetail(customer.id).then((response) => {
                    expect(response.body.card.stampsCount).to.eq(7)
                    expect(response.body.rewards[0].status).to.eq('VOID')
                    const voided = response.body.stamps.find(
                        (stamp: { orderId: string }) => stamp.orderId === orderId,
                    )
                    expect(voided.voidedReason).to.eq('sello por error')
                    expect(voided.voidedBy).to.eq('E2E Lealtad Café')
                })
            })
        })
    })

    it('anular un sello del ciclo en curso baja el conteo', () => {
        customerWithStamps(seed.a, 2).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).its('body.card.stampsCount').should('eq', 3)
                voidOrderStamp(orderId).its('body.card.stampsCount').should('eq', 2)
                // Anulado, el pedido se puede volver a sellar.
                stampOrder(orderId).its('status').should('eq', 201)
            })
        })
    })

    it('no se puede anular el sello si su premio ya se canjeó, y se explica por qué', () => {
        customerWithStamps(seed.a, 7).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).then((response) => {
                    owner(
                        'POST',
                        `/businesses/loyalty/rewards/${response.body.reward.id}/redeem`,
                        {},
                    )
                        .its('status')
                        .should('eq', 200)
                })
                voidOrderStamp(orderId).then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.details.reason).to.eq('REWARD_REDEEMED')
                    expect(response.body.error.message).to.contain('ya se canjeó')
                })
            })
        })
    })

    it('anular un sello pide un motivo', () => {
        createCustomer(seed.a).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId)
                owner('DELETE', `/businesses/orders/${orderId}/stamp`, {})
                    .its('status')
                    .should('eq', 400)
            })
        })
    })

    it('un pedido sellado ya no se puede cancelar y conserva su sello', () => {
        // Con las reglas actuales, "Listo" es final: la anulación automática por cancelación
        // queda como defensa (cubierta en las pruebas de integración del backend).
        createCustomer(seed.a).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId)
                setStatus(orderId, 'CANCELLED').its('status').should('eq', 409)
                owner('GET', `/businesses/orders/${orderId}`)
                    .its('body.order.loyaltyStamp')
                    .should('not.eq', null)
            })
        })
    })

    it('tope diario de sellos en el local', () => {
        saveProgram({ walkInDailyLimit: 5 })
        createCustomer(seed.a).then((customer) => {
            for (let index = 0; index < 5; index += 1) {
                walkInStamp(customer.id, `compra ${index + 1}`)
                    .its('status')
                    .should('eq', 201)
            }
            walkInStamp(customer.id).then((response) => {
                expect(response.status).to.eq(429)
                expect(response.body.error.code).to.eq('LOYALTY_WALK_IN_LIMIT')
                expect(response.body.error.message).to.eq(
                    'Este cliente ya recibió 5 sellos en el local hoy.',
                )
            })
            cardDetail(customer.id).then((response) => {
                expect(response.body.walkInStampsToday).to.eq(5)
                expect(response.body.stamps[0]).to.include({
                    source: 'WALK_IN',
                    createdBy: 'E2E Lealtad Café',
                })
                expect(
                    response.body.stamps.map((stamp: { note: string }) => stamp.note),
                ).to.include('compra 1')
            })
        })
    })
})
