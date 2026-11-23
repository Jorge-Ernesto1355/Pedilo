// Programa de lealtad (API del dueño y resumen público). Fases 1–2.
import {
    asOwner,
    cardDetail,
    customerWithStamps,
    defaultDesign,
    finishedOrder,
    type LoyaltySeed,
    owner,
    programBody,
    publicRequest,
    saveProgram,
    seedLoyalty,
    stampOrder,
    uniquePhone,
    walkInStamp,
} from './loyaltySupport'

describe('Lealtad · programa (API)', () => {
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

    it('sin programa devuelve los valores por defecto sin crear nada', () => {
        asOwner(seed.b)
        owner('GET', '/businesses/loyalty/program').then((response) => {
            expect(response.status).to.eq(200)
            expect(response.headers['cache-control']).to.eq('no-store')
            expect(response.body.program).to.include({
                exists: false,
                enabled: true,
                stampsRequired: 8,
                stampMode: 'MANUAL',
                rewardType: 'PERCENT',
                rewardValue: 20,
                rewardExpiresDays: null,
                rewardLabel: '20% de descuento',
            })
            expect(response.body.program.design.text.title).to.eq(seed.b.name)
        })
        // Leerlo no lo crea: el resumen público sigue sin programa.
        publicRequest('GET', `/public/businesses/${seed.b.slug}/loyalty`)
            .its('body.program')
            .should('eq', null)
        owner('GET', '/businesses/loyalty/program').its('body.program.exists').should('eq', false)
    })

    it('guarda la configuración y el diseño', () => {
        const design = defaultDesign('Café de la esquina')
        design.stamp.shape = 'heart'
        design.stamp.filledColor = '#b4471a'
        design.animation.stampEffect = 'pop'
        saveProgram({
            stampsRequired: 10,
            stampMode: 'AUTO',
            minOrderAmount: 80,
            rewardExpiresDays: 30,
            design,
        })
        owner('GET', '/businesses/loyalty/program').then((response) => {
            expect(response.body.program).to.include({
                exists: true,
                stampsRequired: 10,
                stampMode: 'AUTO',
                minOrderAmount: 80,
                rewardExpiresDays: 30,
            })
            expect(response.body.program.design.stamp).to.include({
                shape: 'heart',
                filledColor: '#B4471A',
            })
            expect(response.body.program.design.animation.stampEffect).to.eq('pop')
        })
    })

    it('rechaza valores fuera de la lista cerrada del diseño', () => {
        const design = defaultDesign()
        design.stamp.shape = 'triangle'
        owner('PUT', '/businesses/loyalty/program', programBody({ design })).then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.error.code).to.eq('VALIDATION_ERROR')
        })
    })

    it('rechaza colores que no son hex #RRGGBB y CSS libre', () => {
        const badColor = defaultDesign()
        badColor.text.primaryColor = '#FFF'
        owner('PUT', '/businesses/loyalty/program', programBody({ design: badColor }))
            .its('status')
            .should('eq', 400)
        const freeCss = { ...defaultDesign(), css: 'background:url(https://evil.test)' }
        owner('PUT', '/businesses/loyalty/program', programBody({ design: freeCss }))
            .its('status')
            .should('eq', 400)
    })

    it('sellos requeridos 2 y 21 dan error', () => {
        for (const stampsRequired of [2, 21]) {
            owner('PUT', '/businesses/loyalty/program', programBody({ stampsRequired })).then(
                (response) => {
                    expect(response.status).to.eq(400)
                    expect(response.body.error.details.fieldErrors.stampsRequired[0]).to.contain(
                        'entre 3 y 20',
                    )
                },
            )
        }
    })

    it('producto gratis acepta solo productos del propio menú', () => {
        owner(
            'PUT',
            '/businesses/loyalty/program',
            programBody({
                rewardType: 'FREE_PRODUCT',
                rewardValue: 0,
                rewardProductId: seed.c.giftProductId,
            }),
        ).then((response) => {
            expect(response.status).to.eq(400)
            expect(response.body.error.code).to.eq('LOYALTY_PROGRAM_INVALID')
        })
        saveProgram({
            rewardType: 'FREE_PRODUCT',
            rewardValue: 0,
            rewardProductId: seed.a.giftProductId,
            rewardLabel: null,
        }).then((response) => {
            expect(response.body.program.rewardLabel).to.eq('E2E Lealtad Agua gratis')
            expect(response.body.program.rewardProduct).to.include({
                id: seed.a.giftProductId,
                price: 25,
            })
        })
    })

    it('desactivar conserva tarjetas, sellos y premios', () => {
        customerWithStamps(seed.a, 3).then((customer) => {
            cardDetail(customer.id).its('body.card.cardToken').as('token')
            saveProgram({ enabled: false })
            // Rutas de sellado: error claro, nada se pierde.
            walkInStamp(customer.id).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error).to.include({
                    code: 'LOYALTY_PROGRAM_INACTIVE',
                    message: 'El programa de lealtad no está activo.',
                })
            })
            cy.get<string>('@token').then((token) => {
                publicRequest('GET', `/public/loyalty/${token}`).then((response) => {
                    expect(response.status).to.eq(200)
                    expect(response.body.status).to.eq('PAUSED')
                    expect(response.body).not.to.have.property('card')
                })
                saveProgram({ enabled: true })
                cardDetail(customer.id).its('body.card.stampsCount').should('eq', 3)
                publicRequest('GET', `/public/loyalty/${token}`)
                    .its('body.card.stampsCount')
                    .should('eq', 3)
            })
        })
    })

    it('un restaurante sin programa no puede sellar pedidos', () => {
        asOwner(seed.b)
        finishedOrder(seed.b, { name: 'Cliente B', phone: uniquePhone() }).then((orderId) => {
            stampOrder(orderId).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error.code).to.eq('LOYALTY_PROGRAM_INACTIVE')
            })
        })
    })

    it('el resumen público muestra la promoción sin datos de clientes', () => {
        publicRequest('GET', `/public/businesses/${seed.a.slug}/loyalty`).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.headers['cache-control']).to.contain('public')
            expect(response.body.program).to.include({
                stampsRequired: 8,
                rewardLabel: '20% de descuento',
            })
            expect(Object.keys(response.body.program).sort()).to.deep.eq(
                [
                    'design',
                    'minOrderAmount',
                    'restaurant',
                    'rewardLabel',
                    'rewardType',
                    'rewardValue',
                    'stampsRequired',
                ].sort(),
            )
        })
    })
})
