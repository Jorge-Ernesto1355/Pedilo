import {
    acceptedOrder,
    claimOffer,
    confirmTransfer,
    courierAction,
    courierDetail,
    createDeliveryOrder,
    createOffer,
    CUSTOMER,
    DELIVERY_FEE,
    deliveryOrderBody,
    getOrder,
    loginOwner,
    newCourier,
    offeredOrder,
    ownerPost,
    pickedUpOrder,
    productId,
    setOrderStatus,
    viewOffer,
} from './deliveryApi'
import { backendApi, type DeliverySeed, seedDelivery } from './deliverySupport'

// API de entregas contra el backend local real. Escenario del seed: 2 × $100 de comida,
// envío $50 (3.4 km). Efectivo: adelanta $200 y cobra $250. Transferencia: adelanta $0 y cobra $50.

let seed: DeliverySeed

describe('Entregas · API', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        cy.clearCookies()
    })

    describe('oferta pública', () => {
        it('muestra solo restaurante, zona, ganancia, adelanto y artículos', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                viewOffer(offerToken).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.offer).to.deep.equal({
                        state: 'AVAILABLE',
                        restaurantName: 'E2E Restaurante Envíos',
                        zone: 'Col. Centro · 3.4 km al norte del restaurante',
                        courierEarnings: 50,
                        amountToAdvance: 200,
                        itemCount: 2,
                    })
                })
            })
        })

        it('PRIVACIDAD: no filtra dirección, coordenadas, nombre ni teléfono del cliente', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                cy.clearCookies()
                viewOffer(offerToken).then((response) => {
                    const raw = JSON.stringify(response.body)
                    for (const secret of [
                        CUSTOMER.address,
                        CUSTOMER.reference,
                        CUSTOMER.name,
                        CUSTOMER.phone,
                    ]) {
                        expect(raw).not.to.contain(secret)
                    }
                    expect(raw).not.to.match(/23\.2\d{3,}|-106\.\d{3,}/)
                    for (const key of [
                        'address',
                        'reference',
                        'latitude',
                        'longitude',
                        'phone',
                        'customer',
                    ]) {
                        expect(raw).not.to.contain(`"${key}"`)
                    }
                })
            })
        })

        it('la zona muestra la colonia pero nunca la calle ni el número', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                cy.clearCookies()
                viewOffer(offerToken).then((response) => {
                    expect(response.body.offer.zone).to.contain('Col. Centro')
                    expect(response.body.offer.zone).not.to.contain('Av. del Mar')
                    expect(response.body.offer.zone).not.to.contain('100')
                })
            })
        })

        it('las respuestas con token no se guardan en caché', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                viewOffer(offerToken).its('headers.cache-control').should('eq', 'no-store')
            })
        })

        it('un link desconocido responde 404', () => {
            viewOffer('x'.repeat(43)).then((response) => {
                expect(response.status).to.eq(404)
                expect(response.body.error.code).to.eq('DELIVERY_LINK_NOT_FOUND')
            })
            courierDetail('y'.repeat(43)).its('status').should('eq', 404)
        })
    })

    describe('tomar', () => {
        it('la primera persona se la queda y recibe su link personal', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                const courier = newCourier()
                cy.clearCookies()
                claimOffer(offerToken, courier).then((response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.courierToken).to.match(/^[A-Za-z0-9_-]{43}$/)
                })
                loginOwner(seed)
                getOrder(order.id)
                    .its('dispatch')
                    .should('deep.include', { status: 'ACCEPTED', courier })
            })
        })

        it('la segunda persona recibe "ya fue tomado" y la oferta lo muestra', () => {
            acceptedOrder(seed).then(({ offerToken }) => {
                claimOffer(offerToken, newCourier()).then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.code).to.eq('DELIVERY_ALREADY_TAKEN')
                })
                viewOffer(offerToken).its('body.offer').should('deep.equal', {
                    state: 'TAKEN',
                    restaurantName: 'E2E Restaurante Envíos',
                })
            })
        })

        it('valida nombre y teléfono del repartidor', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                claimOffer(offerToken, { name: 'Ana', phone: '12345' })
                    .its('status')
                    .should('eq', 400)
                viewOffer(offerToken).its('body.offer.state').should('eq', 'AVAILABLE')
            })
        })
    })

    describe('colonia del pedido', () => {
        it('un pedido a domicilio sin colonia se rechaza y no se crea', () => {
            productId(seed).then((id) =>
                backendApi(`/businesses/${seed.businessId}/orders`).then((url) => {
                    const body = deliveryOrderBody(id, seed)
                    const { address, reference, latitude, longitude } = body.delivery
                    cy.request({
                        method: 'POST',
                        url,
                        body: {
                            ...body,
                            delivery: { address, reference, latitude, longitude },
                        },
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).to.eq(400)
                    })
                }),
            )
        })

        it('el pedido guarda la colonia en su snapshot de entrega', () => {
            createDeliveryOrder(seed).then((order) => {
                expect(order.delivery).to.include({
                    address: CUSTOMER.address,
                    neighborhood: CUSTOMER.neighborhood,
                })
            })
        })
    })

    describe('edición del pedido', () => {
        it('un pedido a domicilio no puede cambiar de modalidad al editarse', () => {
            loginOwner(seed)
            createDeliveryOrder(seed).then((created) =>
                getOrder(created.id).then((order) =>
                    backendApi(`/businesses/orders/${order.id}`).then((url) => {
                        cy.request({
                            method: 'PATCH',
                            url,
                            failOnStatusCode: false,
                            body: {
                                expectedVersion: order.version ?? 1,
                                fulfillmentType: 'PICKUP',
                                items: order.items.map(
                                    (item: {
                                        id: string
                                        productId: string
                                        quantity: number
                                    }) => ({
                                        id: item.id,
                                        productId: item.productId,
                                        quantity: item.quantity,
                                    }),
                                ),
                            },
                        }).then((response) => {
                            expect(response.status).to.eq(409)
                            expect(response.body.error.code).to.eq(
                                'ORDER_DELIVERY_FULFILLMENT_LOCKED',
                            )
                        })
                        getOrder(order.id).its('fulfillmentType').should('eq', 'DELIVERY')
                    }),
                ),
            )
        })
    })

    describe('detalle del repartidor', () => {
        it('incluye dirección, mapa, teléfono del cliente, pedido y montos', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                cy.clearCookies()
                courierDetail(courierToken).then((response) => {
                    expect(response.status).to.eq(200)
                    const delivery = response.body.delivery
                    expect(delivery).to.deep.include({
                        status: 'ACCEPTED',
                        isActive: true,
                        address: CUSTOMER.address,
                        neighborhood: CUSTOMER.neighborhood,
                        reference: CUSTOMER.reference,
                    })
                    expect(delivery.customer).to.deep.equal({
                        name: CUSTOMER.name,
                        phone: CUSTOMER.phone,
                    })
                    expect(delivery.destination).to.have.keys('latitude', 'longitude')
                    expect(delivery.items).to.deep.equal([
                        { quantity: 2, name: 'E2E Envío Tacos', options: [] },
                    ])
                    expect(delivery.money).to.deep.equal({
                        paymentMethod: 'CASH',
                        foodTotal: 200,
                        amountCourierAdvances: 200,
                        amountCourierCollects: 250,
                        courierEarnings: 50,
                    })
                })
            })
        })
    })

    describe('reglas para buscar repartidor', () => {
        it('no se puede si el pedido todavía no está aceptado', () => {
            loginOwner(seed)
            createDeliveryOrder(seed).then((order) => {
                createOffer(order.id).then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.code).to.eq('DELIVERY_ORDER_NOT_READY')
                })
            })
        })

        it('por transferencia exige marcarla como recibida y luego adelanta $0', () => {
            loginOwner(seed)
            createDeliveryOrder(seed, 'TRANSFER').then((order) => {
                setOrderStatus(order.id, 'PREPARING')
                createOffer(order.id).then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.code).to.eq('DELIVERY_TRANSFER_NOT_CONFIRMED')
                })
                confirmTransfer(order.id).its('body.transferConfirmedAt').should('be.a', 'string')
                createOffer(order.id).then((response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.delivery).to.deep.include({
                        paymentMethod: 'TRANSFER',
                        amountCourierAdvances: 0,
                        amountCourierCollects: DELIVERY_FEE,
                    })
                })
            })
        })

        it('"compartir de nuevo" invalida el link anterior', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                createOffer(order.id).then((response) => {
                    expect(response.status).to.eq(201)
                    expect(response.body.offerToken).not.to.eq(offerToken)
                    viewOffer(response.body.offerToken)
                        .its('body.offer.state')
                        .should('eq', 'AVAILABLE')
                })
                viewOffer(offerToken).its('status').should('eq', 404)
            })
        })
    })

    describe('flujo de la entrega', () => {
        it('"Entregado al repartidor" pone el pedido "En camino"', () => {
            acceptedOrder(seed).then(({ order }) => {
                ownerPost(`/businesses/orders/${order.id}/delivery/handoff`).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.order.status).to.eq('OUT_FOR_DELIVERY')
                })
                getOrder(order.id).then((current) => {
                    expect(current.status).to.eq('OUT_FOR_DELIVERY')
                    expect(current.dispatch.status).to.eq('PICKED_UP')
                })
            })
        })

        it('"Entregado" del repartidor cierra el pedido como entregado', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                courierAction(courierToken, 'delivered').its('status').should('eq', 204)
                getOrder(order.id).then((current) => {
                    expect(current.status).to.eq('DELIVERED')
                    expect(current.dispatch.status).to.eq('DELIVERED')
                })
                courierDetail(courierToken).then((response) => {
                    expect(response.body.delivery.isActive).to.eq(false)
                    expect(response.body.delivery.customer.phone).to.eq(null)
                })
            })
        })

        it('"No se pudo entregar" guarda el motivo y deja el pedido en camino', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                courierAction(courierToken, 'failed', { reason: 'LLUVIA' })
                    .its('status')
                    .should('eq', 400)
                courierAction(courierToken, 'failed', { reason: 'CUSTOMER_UNREACHABLE' })
                    .its('status')
                    .should('eq', 204)
                getOrder(order.id).then((current) => {
                    expect(current.status).to.eq('OUT_FOR_DELIVERY')
                    expect(current.dispatch).to.deep.include({
                        status: 'FAILED',
                        failureReason: 'CUSTOMER_UNREACHABLE',
                    })
                })
            })
        })

        it('liberar invalida el link del repartidor y otra persona puede retomarla', () => {
            acceptedOrder(seed).then(({ order, courierToken }) => {
                ownerPost(`/businesses/orders/${order.id}/delivery/release`).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.delivery).to.deep.include({
                        status: 'PENDING',
                        courier: null,
                    })
                    courierDetail(courierToken).its('status').should('eq', 404)
                    const second = newCourier()
                    claimOffer(response.body.offerToken, second).its('status').should('eq', 201)
                    getOrder(order.id).its('dispatch.courier').should('deep.equal', second)
                })
            })
        })

        it('rechaza transiciones inválidas con un error claro', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                courierAction(courierToken, 'delivered').then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.code).to.eq('DELIVERY_INVALID_TRANSITION')
                    expect(response.body.error.details).to.deep.equal({
                        from: 'ACCEPTED',
                        to: 'DELIVERED',
                    })
                })
            })
        })
    })

    describe('cancelación', () => {
        it('cancelar el pedido antes de que la tomen cancela la oferta', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                setOrderStatus(order.id, 'CANCELLED').its('status').should('eq', 200)
                viewOffer(offerToken).its('body.offer.state').should('eq', 'EXPIRED')
                claimOffer(offerToken, newCourier()).then((response) => {
                    expect(response.status).to.eq(410)
                    expect(response.body.error.code).to.eq('DELIVERY_LINK_EXPIRED')
                })
                getOrder(order.id).its('dispatch.status').should('eq', 'CANCELLED')
            })
        })

        it('un pedido en camino no se puede cancelar', () => {
            pickedUpOrder(seed).then(({ order }) => {
                setOrderStatus(order.id, 'CANCELLED').then((response) => {
                    expect(response.status).to.eq(409)
                    expect(response.body.error.code).to.eq('ORDER_INVALID_STATUS_TRANSITION')
                })
                getOrder(order.id).its('status').should('eq', 'OUT_FOR_DELIVERY')
            })
        })
    })
})
