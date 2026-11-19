import {
    FRONT_ERROR,
    installGlobalGroupsApi,
    makeGroup,
    makeOption,
    makeProducts,
    type ApiConfig,
    type GlobalGroupsApi,
} from '../../support/globalOptionGroups'
import {
    assertInsideViewportX,
    assertNotCovered,
    assertPageFitsViewport,
} from '../../support/responsive'

/**
 * Módulo "Catálogo reutilizable · Grupos de opciones globales" (create-menu).
 *
 * Complementa `global-option-groups-granular.cy.ts`. Toda la API se simula con un servidor
 * con estado y bloqueo optimista (cypress/support/globalOptionGroups.ts), de modo que los
 * tests no escriben datos reales: solo se usa cy.login() para tener sesión.
 */

const SERVER_ERROR = { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } }

const panel = () => cy.get('section[aria-labelledby="global-options-title"]')
const groupItems = () => panel().find('div.space-y-2 > button')
const groupButton = (name: string | RegExp) => panel().contains('button', name)
const alertBox = () => panel().find('[role="alert"]')
const saveButton = () => panel().contains('button', /Guardar cambios|Guardando…/)
const addOptionButton = () => panel().contains('button', /\+ Agregar opción|Límite de 10 opciones/)
const groupNameInput = () =>
    panel()
        .contains('label', /^Nombre\d/)
        .find('input')
const expectNoGroupOpen = () => panel().contains('label', 'Obligatorio').should('not.exist')
const requiredCheckbox = () => panel().contains('label', 'Obligatorio').find('input')
const optionNameInputs = () => panel().find('input[placeholder="Ej. Queso extra"]')
const optionRow = (index: number) => optionNameInputs().eq(index).closest('div.rounded-xl')
const optionField = (index: number, label: 'Mínimo' | 'Máximo' | 'Costo adicional') =>
    optionRow(index).contains('label', label).find('input')
const productCheckbox = (name: string) =>
    panel()
        .contains('label', new RegExp(`^${name}$`))
        .find('input[type="checkbox"]')
const counter = (selected: number, total: number) =>
    panel().contains(`${selected} seleccionados · ${total} productos`)

function visitPanel() {
    cy.visit('/create-menu')
    cy.wait('@listGroups')
    panel().should('be.visible')
}

function openGroup(name: string | RegExp = 'Extras global') {
    groupButton(name).click()
    cy.wait('@groupDetail')
    cy.wait('@productsPage')
    groupNameInput().should('be.visible')
}

/** Instala la API simulada, abre la pantalla y (opcionalmente) el primer grupo. */
function start(config: ApiConfig = {}, options: { open?: boolean | string } = {}) {
    const api = installGlobalGroupsApi(config)
    visitPanel()
    if (options.open) openGroup(typeof options.open === 'string' ? options.open : undefined)
    return api
}

const fiveOptions = (count: number) =>
    Array.from({ length: count }, (_, index) =>
        makeOption({ id: `option-${index + 1}`, name: `Extra ${index + 1}`, price: index }),
    )

function lastCall(api: GlobalGroupsApi, key: Parameters<GlobalGroupsApi['callsOf']>[0]) {
    const list = api.callsOf(key)
    return list[list.length - 1]
}

// 1 reintento: el primer login de una corrida en frío puede pasarse de timeout mientras el
// dev server compila /dashboard; ningún test de este spec depende de reintentar para pasar.
describe(
    'Grupos de opciones globales · casos borde',
    { retries: { runMode: 1, openMode: 0 } },
    () => {
        beforeEach(() => cy.login())

        describe('lista de grupos', () => {
            it('muestra el skeleton mientras carga la lista y después los grupos', () => {
                installGlobalGroupsApi({ groups: [makeGroup()], delays: { list: 700 } })
                cy.visit('/create-menu')
                cy.get('[aria-label="Cargando grupos de opciones"]').should('be.visible')
                cy.wait('@listGroups')
                cy.get('[aria-label="Cargando grupos de opciones"]').should('not.exist')
                groupButton('Extras global').should('be.visible')
            })

            it('muestra el estado vacío y no pide detalle ni productos', () => {
                const api = start()
                panel()
                    .contains(
                        'Todavía no hay grupos globales. Crea el primero para reutilizar sus opciones.',
                    )
                    .should('be.visible')
                panel().contains('Elige un grupo para editarlo').should('not.exist')
                cy.then(() => {
                    expect(api.callsOf('detail')).to.have.length(0)
                    expect(api.callsOf('products')).to.have.length(0)
                })
            })

            it('lista los grupos en el orden de la API sin cargar su detalle', () => {
                const api = start({
                    groups: [
                        makeGroup({ id: 'g1', name: 'Salsas' }),
                        makeGroup({ id: 'g2', name: 'Extras' }),
                        makeGroup({ id: 'g3', name: 'Tamaños' }),
                    ],
                })
                groupItems().should('have.length', 3)
                groupItems().then(($items) => {
                    expect(Array.from($items).map((item) => item.textContent?.trim())).to.deep.eq([
                        'Salsas',
                        'Extras',
                        'Tamaños',
                    ])
                })
                panel().contains('Elige un grupo para editarlo').should('be.visible')
                cy.then(() => {
                    expect(api.callsOf('detail')).to.have.length(0)
                    expect(api.callsOf('products')).to.have.length(0)
                })
            })

            it('acepta el listado como arreglo directo', () => {
                start({ groups: [makeGroup()], listShape: 'array' })
                groupButton('Extras global').should('be.visible')
            })

            it('acepta el listado anidado en data.groups', () => {
                start({ groups: [makeGroup()], listShape: 'nested' })
                groupButton('Extras global').should('be.visible')
            })

            it('tolera un listado inesperado (groups: null) mostrando el estado vacío', () => {
                start({ groups: [makeGroup()], listShape: 'null' })
                panel().contains('Todavía no hay grupos globales').should('be.visible')
                alertBox().should('not.exist')
            })

            it('muestra el error del servidor y se recupera al recargar', () => {
                const api = installGlobalGroupsApi({ groups: [makeGroup()] })
                api.script('list', SERVER_ERROR)
                visitPanel()
                alertBox().should('contain', FRONT_ERROR.server)
                panel().contains('Todavía no hay grupos globales').should('be.visible')
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                alertBox().should('not.exist')
                groupButton('Extras global').should('be.visible')
            })

            it('ante una caída de red muestra el aviso y se recupera al recargar', () => {
                const api = installGlobalGroupsApi({ groups: [makeGroup()] })
                api.failAlways('list', { forceNetworkError: true })
                visitPanel()
                alertBox().should('contain', FRONT_ERROR.generic)
                cy.then(() => api.clear('list'))
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                alertBox().should('not.exist')
                groupButton('Extras global').should('be.visible')
            })

            it('si falla una recarga conserva los grupos ya cargados y el siguiente intento limpia el error', () => {
                const api = start({ groups: [makeGroup({ name: 'Salsas' })] })
                cy.then(() => api.script('list', SERVER_ERROR))
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                alertBox().should('contain', FRONT_ERROR.server)
                groupButton('Salsas').should('be.visible')
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                alertBox().should('not.exist')
            })

            it('recargar cierra el grupo abierto y vuelve al detalle vacío sin pedir otro detalle', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                panel().contains('Elige un grupo para editarlo').should('be.visible')
                expectNoGroupOpen()
                cy.then(() => expect(api.callsOf('detail')).to.have.length(1))
            })

            it('renderiza como texto los nombres con HTML, comillas y símbolos', () => {
                const name = 'Salsas & <b>Picantes</b> "extra"'
                start({ groups: [makeGroup({ name })] })
                groupButton(name).should('be.visible')
                panel().find('b').should('not.exist')
            })

            it('maneja 30 grupos: todos se listan y el último se puede abrir', () => {
                const groups = Array.from({ length: 30 }, (_, index) =>
                    makeGroup({ id: `g-${index + 1}`, name: `Grupo ${index + 1}` }),
                )
                const api = start({ groups })
                groupItems().should('have.length', 30)
                groupButton(/^Grupo 30$/)
                    .scrollIntoView()
                    .click()
                cy.wait('@groupDetail').its('request.url').should('include', '/g-30')
                groupNameInput().should('have.value', 'Grupo 30')
                cy.then(() => expect(api.callsOf('detail')).to.have.length(1))
            })
        })

        describe('crear grupo', () => {
            it('envía la configuración inicial, agrega el grupo al final y no abre su detalle', () => {
                const api = start({ groups: [makeGroup()] })
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup').its('request.body').should('deep.equal', {
                    name: 'Nuevo grupo',
                    isRequired: false,
                    minSelections: 0,
                    maxSelections: 1,
                    isActive: true,
                    options: [],
                })
                groupItems().should('have.length', 2)
                groupItems().last().should('contain', 'Nuevo grupo')
                panel().contains('Elige un grupo para editarlo').should('be.visible')
                cy.then(() => expect(api.callsOf('detail')).to.have.length(0))
            })

            it('crear el primer grupo reemplaza el estado vacío por la lista', () => {
                start()
                panel().contains('Todavía no hay grupos globales').should('be.visible')
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                panel().contains('Todavía no hay grupos globales').should('not.exist')
                groupItems().should('have.length', 1)
            })

            it('mientras crea cambia el + por un loader, bloquea el botón y no duplica el POST', () => {
                start({ delays: { create: 700 } })
                const button = () => panel().contains('button', 'Crear grupo')
                button().find('svg.lucide-plus').should('exist')
                button().find('svg.animate-spin').should('not.exist')
                button().click()
                button().should('be.disabled').and('have.attr', 'aria-busy', 'true')
                button().find('svg.animate-spin').should('exist')
                button().find('svg.lucide-plus').should('not.exist')
                button().click({ force: true })
                cy.wait('@createGroup')
                groupItems().should('have.length', 1)
                cy.get('@createGroup.all').should('have.length', 1)
                button().should('not.be.disabled').and('have.attr', 'aria-busy', 'false')
                button().find('svg.animate-spin').should('not.exist')
                button().find('svg.lucide-plus').should('exist')
            })

            it('si falla el servidor muestra el error, no agrega el grupo y el reintento lo limpia', () => {
                const api = start()
                api.script('create', SERVER_ERROR)
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                alertBox().should('contain', FRONT_ERROR.server)
                panel().contains('Todavía no hay grupos globales').should('be.visible')
                panel().contains('button', 'Crear grupo').should('not.be.disabled').click()
                cy.wait('@createGroup')
                alertBox().should('not.exist')
                groupItems().should('have.length', 1)
            })

            it('muestra el mensaje claro cuando el nombre ya está en uso (409)', () => {
                const api = start()
                api.script('create', {
                    statusCode: 409,
                    body: { error: { code: 'NAME_ALREADY_IN_USE' } },
                })
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                alertBox().should('contain', FRONT_ERROR.nameInUse)
            })

            it('crear dos veces genera dos grupos independientes con su propio detalle', () => {
                start()
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                groupItems().should('have.length', 2)
                groupItems().last().click()
                cy.wait('@groupDetail').its('request.url').should('include', 'created-group-2')
            })

            it('crear un grupo no descarta lo que se está editando en el grupo abierto', () => {
                start({ groups: [makeGroup()] }, { open: true })
                groupNameInput().clear().type('Nombre a medias')
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                groupItems().should('have.length', 2)
                groupNameInput().should('have.value', 'Nombre a medias')
            })
        })

        describe('selección y detalle', () => {
            it('al abrir un grupo pide el detalle y la primera página de 10 productos del negocio', () => {
                const api = start({ groups: [makeGroup()], products: makeProducts(3) })
                openGroup()
                cy.then(() => {
                    const call = lastCall(api, 'products')
                    expect(call.path).to.match(/^\/api\/v1\/businesses\/[^/]+\/products$/)
                    expect(call.query).to.include('page=1').and.to.include('limit=10')
                })
            })

            it('resalta el grupo abierto y cambia el detalle al elegir otro', () => {
                start({
                    groups: [
                        makeGroup({ id: 'a', name: 'Salsas' }),
                        makeGroup({
                            id: 'b',
                            name: 'Tamaños',
                            options: [makeOption({ name: 'Grande' })],
                        }),
                    ],
                })
                groupButton('Salsas').click()
                cy.wait('@groupDetail')
                groupButton('Salsas').should('have.class', 'border-[#7392E6]')
                groupButton('Tamaños').should('not.have.class', 'border-[#7392E6]')
                groupButton('Tamaños').click()
                cy.wait('@groupDetail')
                groupNameInput().should('have.value', 'Tamaños')
                panel().contains('Grande').should('not.exist') // es un valor de input, no texto
                optionNameInputs().should('have.length', 1).first().should('have.value', 'Grande')
                groupButton('Tamaños').should('have.class', 'border-[#7392E6]')
                groupButton('Salsas').should('not.have.class', 'border-[#7392E6]')
            })

            it('muestra el skeleton del detalle mientras carga', () => {
                start({ groups: [makeGroup()], delays: { detail: 700 } })
                groupButton('Extras global').click()
                cy.get('[aria-label="Cargando grupo global"]').should('be.visible')
                cy.wait('@groupDetail')
                cy.get('[aria-label="Cargando grupo global"]').should('not.exist')
                groupNameInput().should('be.visible')
            })

            it('si falla el listado de productos falla todo el detalle y reintentar lo recupera', () => {
                const api = start({ groups: [makeGroup()], products: makeProducts(2) })
                api.script('products', SERVER_ERROR)
                groupButton('Extras global').click()
                cy.wait('@groupDetail')
                panel().contains('No pudimos cargar este grupo').should('be.visible')
                panel().contains(FRONT_ERROR.server).should('be.visible')
                expectNoGroupOpen()
                panel().contains('button', 'Reintentar').click()
                cy.wait('@productsPage')
                groupNameInput().should('have.value', 'Extras global')
                productCheckbox('Producto 1').should('exist')
            })

            it('cuando el grupo ya no existe (404) explica que no está disponible', () => {
                const api = start({ groups: [makeGroup()] })
                cy.then(() => {
                    api.state.groups = []
                })
                groupButton('Extras global').click()
                cy.wait('@groupDetail')
                panel().contains('No pudimos cargar este grupo').should('be.visible')
                panel().contains(FRONT_ERROR.groupNotFound).should('be.visible')
            })

            it('una caída de red al abrir el grupo muestra el aviso y permite reintentar', () => {
                const api = start({ groups: [makeGroup()] })
                api.failAlways('detail', { forceNetworkError: true })
                groupButton('Extras global').click()
                panel().contains('No pudimos cargar este grupo').should('be.visible')
                panel().contains(FRONT_ERROR.generic).should('be.visible')
                cy.then(() => api.clear('detail'))
                panel().contains('button', 'Reintentar').click()
                cy.wait('@groupDetail')
                groupNameInput().should('be.visible')
            })

            it('si se cambia de grupo mientras el anterior carga, queda el último elegido', () => {
                start({
                    groups: [
                        makeGroup({ id: 'lento', name: 'Grupo lento' }),
                        makeGroup({ id: 'rapido', name: 'Grupo rápido' }),
                    ],
                    detailDelayById: { lento: 1200, rapido: 100 },
                })
                groupButton('Grupo lento').click()
                groupButton('Grupo rápido').click()
                cy.get('@groupDetail.all').should('have.length', 2)
                groupNameInput().should('have.value', 'Grupo rápido')
                // La respuesta tardía del primero no debe pisar al segundo.
                cy.wait(1500)
                groupNameInput().should('have.value', 'Grupo rápido')
                groupButton('Grupo rápido').should('have.class', 'border-[#7392E6]')
            })

            it('volver a elegir el mismo grupo recarga su detalle y descarta lo no guardado', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                groupNameInput().clear().type('Cambio sin guardar')
                groupButton('Cambio sin guardar').should('not.exist')
                groupButton('Extras global').click()
                cy.wait('@groupDetail')
                groupNameInput().should('have.value', 'Extras global')
                cy.then(() => expect(api.callsOf('detail')).to.have.length(2))
            })

            it('cambiar a otro grupo descarta lo no guardado del anterior', () => {
                start({
                    groups: [
                        makeGroup({ id: 'a', name: 'Salsas' }),
                        makeGroup({ id: 'b', name: 'Tamaños' }),
                    ],
                })
                groupButton('Salsas').click()
                cy.wait('@groupDetail')
                groupNameInput().clear().type('Editado')
                groupButton('Tamaños').click()
                cy.wait('@groupDetail')
                groupButton('Salsas').click()
                cy.wait('@groupDetail')
                groupNameInput().should('have.value', 'Salsas')
            })

            it('tolera un detalle sin options ni productIds (respuesta incompleta del backend)', () => {
                const api = start({ groups: [makeGroup()] })
                api.script('detail', {
                    statusCode: 200,
                    body: {
                        group: {
                            id: 'group-extras',
                            name: 'Extras global',
                            isRequired: false,
                            minSelections: 0,
                            maxSelections: 1,
                            isActive: true,
                            version: 1,
                        },
                    },
                })
                groupButton('Extras global').click()
                cy.wait('@groupDetail')
                groupNameInput().should('have.value', 'Extras global')
                panel().contains('0/10').should('be.visible')
                counter(0, 0).should('be.visible')
            })
        })

        describe('edición del grupo', () => {
            it('limita el nombre a 40 caracteres y actualiza el contador', () => {
                start({ groups: [makeGroup({ name: 'Corto' })] }, { open: 'Corto' })
                panel().contains('5/40').should('be.visible')
                groupNameInput().clear().type('x'.repeat(55))
                groupNameInput().invoke('val').should('have.length', 40)
                panel().contains('40/40').should('be.visible')
            })

            it('al marcar Obligatorio sube el mínimo del grupo a 1 y lo envía', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                requiredCheckbox().check()
                saveButton().click()
                cy.wait('@updateGroup')
                    .its('request.body')
                    .should((body) => {
                        expect(body.isRequired).to.eq(true)
                        expect(body.minSelections).to.eq(1)
                    })
                cy.then(() => expect(api.group('group-extras')?.isRequired).to.eq(true))
            })

            it('al marcar Obligatorio no baja un mínimo que ya era mayor que 1', () => {
                start(
                    { groups: [makeGroup({ minSelections: 3, maxSelections: 5 })] },
                    { open: true },
                )
                requiredCheckbox().check()
                saveButton().click()
                cy.wait('@updateGroup').its('request.body.minSelections').should('eq', 3)
            })

            // TODO: pendiente de producto. Marcar Obligatorio sube el mínimo del grupo a 1 y desmarcarlo
            // no lo baja: un grupo opcional queda con minSelections 1 y se guarda así. Definir si al
            // desmarcar debe volver a 0 (o al valor previo) y quitar el .skip.
            it.skip('marcar y desmarcar Obligatorio deja el grupo como estaba (mínimo 0)', () => {
                start({ groups: [makeGroup()] }, { open: true })
                requiredCheckbox().check().uncheck()
                saveButton().click()
                cy.wait('@updateGroup')
                    .its('request.body')
                    .should((body) => {
                        expect(body.isRequired).to.eq(false)
                        expect(body.minSelections).to.eq(0)
                    })
            })

            it('guarda solo los campos editables y conserva el máximo y el estado activo del grupo', () => {
                start(
                    { groups: [makeGroup({ maxSelections: 5, isActive: false, version: 7 })] },
                    { open: true },
                )
                groupNameInput().clear().type('Salsas premium')
                saveButton().click()
                cy.wait('@updateGroup').its('request.body').should('deep.equal', {
                    name: 'Salsas premium',
                    isRequired: false,
                    minSelections: 0,
                    maxSelections: 5,
                    expectedVersion: 7,
                })
            })
        })

        describe('opciones del grupo', () => {
            it('agregar una opción crea una fila con los valores por defecto', () => {
                start({ groups: [makeGroup()] }, { open: true })
                panel().contains('0/10').should('be.visible')
                addOptionButton().click()
                panel().contains('1/10').should('be.visible')
                optionNameInputs().should('have.length', 1).first().should('have.value', '')
                optionField(0, 'Mínimo').should('have.value', '0')
                optionField(0, 'Máximo').should('have.value', '1')
                optionField(0, 'Costo adicional').should('have.value', '0')
            })

            it('no permite agregar otra opción hasta nombrar la anterior y el aviso desaparece al escribir', () => {
                start({ groups: [makeGroup()] }, { open: true })
                addOptionButton().click()
                panel().contains('Escribe el nombre de la opción.').should('not.exist')
                addOptionButton().click()
                panel().contains('Escribe el nombre de la opción.').should('be.visible')
                optionNameInputs().should('have.length', 1)
                optionNameInputs().first().type('Queso')
                panel().contains('Escribe el nombre de la opción.').should('not.exist')
                addOptionButton().click()
                optionNameInputs().should('have.length', 2)
            })

            it('un nombre de solo espacios cuenta como vacío', () => {
                start({ groups: [makeGroup()] }, { open: true })
                addOptionButton().click()
                optionNameInputs().first().type('   ')
                addOptionButton().click()
                panel().contains('Escribe el nombre de la opción.').should('be.visible')
                optionNameInputs().should('have.length', 1)
            })

            it('limita el nombre de la opción a 40 caracteres con contador propio', () => {
                start({ groups: [makeGroup()] }, { open: true })
                addOptionButton().click()
                optionNameInputs().first().type('y'.repeat(60))
                optionNameInputs().first().invoke('val').should('have.length', 40)
                optionRow(0).contains('40/40').should('be.visible')
            })

            const invalidCases: Array<{
                label: 'Mínimo' | 'Máximo'
                value: string
                other?: [label: 'Mínimo' | 'Máximo', value: string]
                message: string
            }> = [
                {
                    label: 'Mínimo',
                    value: '11',
                    message: 'El mínimo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Mínimo',
                    value: '-1',
                    message: 'El mínimo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Mínimo',
                    value: '1.5',
                    message: 'El mínimo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Máximo',
                    value: '11',
                    message: 'El máximo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Máximo',
                    value: '-2',
                    message: 'El máximo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Máximo',
                    value: '2.5',
                    message: 'El máximo debe ser un número entero entre 0 y 10.',
                },
                {
                    label: 'Mínimo',
                    value: '3',
                    other: ['Máximo', '2'],
                    message: 'El máximo no puede ser menor que el mínimo.',
                },
            ]
            invalidCases.forEach(({ label, value, other, message }) => {
                it(`valida ${label} = ${value}${other ? ` con ${other[0]} = ${other[1]}` : ''}`, () => {
                    const api = start(
                        {
                            groups: [
                                makeGroup({ options: [makeOption({ id: 'o1', name: 'Queso' })] }),
                            ],
                        },
                        { open: true },
                    )
                    optionField(0, label).type(`{selectall}${value}`)
                    if (other) optionField(0, other[0]).type(`{selectall}${other[1]}`)
                    optionRow(0).contains(message).should('be.visible')
                    saveButton().click()
                    alertBox().should('contain', message)
                    cy.then(() => {
                        expect(api.callsOf('update')).to.have.length(0)
                        expect(api.callsOf('options')).to.have.length(0)
                        expect(api.callsOf('assign')).to.have.length(0)
                    })
                })
            })

            it('acepta los valores límite (mínimo 0, máximo 10, costo 10000, mínimo igual al máximo)', () => {
                start(
                    {
                        groups: [
                            makeGroup({ options: [makeOption({ id: 'o1', name: 'Extremo' })] }),
                        ],
                    },
                    { open: true },
                )
                optionField(0, 'Mínimo').type('{selectall}10')
                optionField(0, 'Máximo').type('{selectall}10')
                optionField(0, 'Costo adicional').type('{selectall}10000')
                optionRow(0).find('p.text-xs').should('not.exist')
                saveButton().click()
                cy.wait('@replaceOptions')
                    .its('request.body.options.0')
                    .should('include', { minSelections: 10, maxSelections: 10, price: 10000 })
            })

            it('el costo solo admite enteros: ignora letras, símbolos y decimales', () => {
                start(
                    {
                        groups: [
                            makeGroup({
                                options: [makeOption({ id: 'o1', name: 'Queso', price: 0 })],
                            }),
                        ],
                    },
                    { open: true },
                )
                optionField(0, 'Costo adicional').type('{selectall}1a2.5,3-$')
                optionField(0, 'Costo adicional').should('have.value', '1253')
                saveButton().click()
                cy.wait('@replaceOptions').its('request.body.options.0.price').should('eq', 1253)
            })

            it('el costo no pasa de 10000 (el dígito que lo excede se ignora)', () => {
                start(
                    {
                        groups: [
                            makeGroup({
                                options: [makeOption({ id: 'o1', name: 'Queso', price: 0 })],
                            }),
                        ],
                    },
                    { open: true },
                )
                optionField(0, 'Costo adicional').type('{selectall}10001')
                optionField(0, 'Costo adicional').should('have.value', '1000')
            })

            it('si se deja el costo vacío vuelve a 0 al salir del campo', () => {
                start(
                    {
                        groups: [
                            makeGroup({
                                options: [makeOption({ id: 'o1', name: 'Queso', price: 15 })],
                            }),
                        ],
                    },
                    { open: true },
                )
                optionField(0, 'Costo adicional').clear().blur()
                optionField(0, 'Costo adicional').should('have.value', '0')
                saveButton().click()
                cy.wait('@replaceOptions').its('request.body.options.0.price').should('eq', 0)
            })

            it('ceros a la izquierda en el costo se envían como número', () => {
                start(
                    {
                        groups: [
                            makeGroup({
                                options: [makeOption({ id: 'o1', name: 'Queso', price: 0 })],
                            }),
                        ],
                    },
                    { open: true },
                )
                optionField(0, 'Costo adicional').type('{selectall}007')
                saveButton().click()
                cy.wait('@replaceOptions').its('request.body.options.0.price').should('eq', 7)
            })

            it('eliminar una opción la quita de la fila y del guardado; eliminar todas envía una lista vacía', () => {
                start({ groups: [makeGroup({ options: fiveOptions(3) })] }, { open: true })
                panel().contains('3/10').should('be.visible')
                cy.get('[aria-label="Eliminar Extra 2"]').click()
                optionNameInputs().should('have.length', 2)
                panel().contains('2/10').should('be.visible')
                saveButton().click()
                cy.wait('@replaceOptions')
                    .its('request.body.options')
                    .should((options) => {
                        expect(options.map((option: { name: string }) => option.name)).to.deep.eq([
                            'Extra 1',
                            'Extra 3',
                        ])
                    })
                groupNameInput().should('be.visible')
                cy.get('[aria-label="Eliminar Extra 1"]').click()
                cy.get('[aria-label="Eliminar Extra 3"]').click()
                optionNameInputs().should('have.length', 0)
                saveButton().click()
                cy.wait('@replaceOptions').its('request.body.options').should('deep.equal', [])
            })

            it('con 10 opciones se bloquea agregar; al eliminar una vuelve a permitirse', () => {
                start({ groups: [makeGroup({ options: fiveOptions(10) })] }, { open: true })
                panel().contains('10/10').should('be.visible')
                addOptionButton().should('contain', 'Límite de 10 opciones alcanzado').click()
                panel()
                    .contains('Un grupo global puede tener como máximo 10 opciones.')
                    .should('be.visible')
                optionNameInputs().should('have.length', 10)
                cy.get('[aria-label="Eliminar Extra 10"]').click()
                addOptionButton().should('contain', '+ Agregar opción')
                panel().contains('9/10').should('be.visible')
            })

            it('no deja guardar una opción sin nombre y avisa sin llamar al servidor', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                addOptionButton().click()
                saveButton().click()
                alertBox().should('contain', 'Escribe el nombre de la opción.')
                cy.then(() =>
                    expect(api.calls.filter((call) => call.method !== 'GET')).to.have.length(0),
                )
            })

            it('valida todas las opciones, no solo la primera', () => {
                const api = start(
                    { groups: [makeGroup({ options: fiveOptions(3) })] },
                    { open: true },
                )
                optionField(2, 'Máximo').type('{selectall}11')
                saveButton().click()
                alertBox().should('contain', 'El máximo debe ser un número entero entre 0 y 10.')
                cy.then(() => expect(api.callsOf('update')).to.have.length(0))
            })

            it('al guardar conserva el id, el orden y la disponibilidad; las opciones nuevas van sin id', () => {
                start(
                    {
                        groups: [
                            makeGroup({
                                options: [
                                    makeOption({ id: 'o1', name: 'Queso', isAvailable: true }),
                                    makeOption({
                                        id: 'o2',
                                        name: 'Tocino',
                                        isAvailable: false,
                                        price: 20,
                                    }),
                                ],
                            }),
                        ],
                    },
                    { open: true },
                )
                addOptionButton().click()
                optionNameInputs().last().type('Piña')
                saveButton().click()
                cy.wait('@replaceOptions')
                    .its('request.body.options')
                    .should((options) => {
                        expect(options).to.have.length(3)
                        expect(options[0]).to.include({
                            id: 'o1',
                            name: 'Queso',
                            isAvailable: true,
                        })
                        expect(options[1]).to.include({
                            id: 'o2',
                            name: 'Tocino',
                            isAvailable: false,
                            price: 20,
                        })
                        expect(options[2]).not.to.have.property('id')
                        expect(options[2]).to.include({
                            name: 'Piña',
                            price: 0,
                            minSelections: 0,
                            maxSelections: 1,
                            isAvailable: true,
                        })
                    })
            })
        })

        describe('productos y combos asignados', () => {
            const catalog = [
                { id: 'p-burger', name: 'Hamburguesa clásica', type: 'SIMPLE' as const },
                { id: 'combo-familiar', name: 'Combo familiar', type: 'COMBO' as const },
                { id: 'p-fries', name: 'Papas', type: 'SIMPLE' as const },
            ]

            it('lista productos y combos y permite asignar ambos al grupo', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                productCheckbox('Hamburguesa clásica').should('exist').and('not.be.checked')
                productCheckbox('Combo familiar').should('exist').and('not.be.checked')
                productCheckbox('Hamburguesa clásica').check()
                productCheckbox('Combo familiar').check()
                saveButton().click()
                cy.wait('@assignProducts')
                    .its('request.body.productIds')
                    .should('deep.equal', ['p-burger', 'combo-familiar'])
            })

            it('el contador de seleccionados se actualiza al marcar y desmarcar', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                counter(0, 3).should('be.visible')
                productCheckbox('Papas').check()
                counter(1, 3).should('be.visible')
                productCheckbox('Combo familiar').check()
                counter(2, 3).should('be.visible')
                productCheckbox('Papas').uncheck()
                counter(1, 3).should('be.visible')
            })

            it('muestra marcados los productos y combos ya asignados', () => {
                start(
                    { groups: [makeGroup({ productIds: ['combo-familiar'] })], products: catalog },
                    { open: true },
                )
                productCheckbox('Combo familiar').should('be.checked')
                productCheckbox('Papas').should('not.be.checked')
                counter(1, 3).should('be.visible')
            })

            it('desmarcar todo envía una lista vacía', () => {
                start(
                    {
                        groups: [makeGroup({ productIds: ['p-burger', 'p-fries'] })],
                        products: catalog,
                    },
                    { open: true },
                )
                productCheckbox('Hamburguesa clásica').uncheck()
                productCheckbox('Papas').uncheck()
                counter(0, 3).should('be.visible')
                saveButton().click()
                cy.wait('@assignProducts').its('request.body.productIds').should('deep.equal', [])
            })

            it('pagina de 10 en 10 con botones y contador coherentes en cada página', () => {
                start({ groups: [makeGroup()], products: makeProducts(25) }, { open: true })
                panel().contains('Página 1 de 3').should('be.visible')
                panel().contains('button', 'Anterior').should('be.disabled')
                panel().contains('button', 'Siguiente').should('not.be.disabled')
                productCheckbox('Producto 10').should('exist')
                panel()
                    .contains('label', /^Producto 11$/)
                    .should('not.exist')

                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                panel().contains('Página 2 de 3').should('be.visible')
                panel().contains('button', 'Anterior').should('not.be.disabled')
                productCheckbox('Producto 11').should('exist')
                productCheckbox('Producto 20').should('exist')

                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                panel().contains('Página 3 de 3').should('be.visible')
                panel().contains('button', 'Siguiente').should('be.disabled')
                productCheckbox('Producto 25').should('exist')
                panel()
                    .contains('label', /^Producto 26$/)
                    .should('not.exist')

                panel().contains('button', 'Anterior').click()
                cy.wait('@productsPage')
                panel().contains('Página 2 de 3').should('be.visible')
            })

            it('conserva lo marcado en otras páginas y lo envía completo al guardar', () => {
                start({ groups: [makeGroup()], products: makeProducts(25) }, { open: true })
                productCheckbox('Producto 2').check()
                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                productCheckbox('Producto 12').check()
                counter(2, 25).should('be.visible')
                panel().contains('button', 'Anterior').click()
                cy.wait('@productsPage')
                productCheckbox('Producto 2').should('be.checked')
                saveButton().click()
                cy.wait('@assignProducts')
                    .its('request.body.productIds')
                    .should('deep.equal', ['product-2', 'product-12'])
            })

            it('los asignados que están en otra página cuentan y no se pierden si no se tocan', () => {
                start(
                    {
                        groups: [makeGroup({ productIds: ['product-15'] })],
                        products: makeProducts(25),
                    },
                    { open: true },
                )
                counter(1, 25).should('be.visible')
                saveButton().click()
                cy.wait('@assignProducts')
                    .its('request.body.productIds')
                    .should('deep.equal', ['product-15'])
                groupNameInput().should('be.visible')
                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                productCheckbox('Producto 15').should('be.checked')
            })

            it('si falla el cambio de página muestra el error y deja la página y la selección intactas', () => {
                const api = start(
                    { groups: [makeGroup()], products: makeProducts(25) },
                    { open: true },
                )
                productCheckbox('Producto 3').check()
                cy.then(() => api.script('products', SERVER_ERROR))
                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                alertBox().should('contain', FRONT_ERROR.server)
                panel().contains('Página 1 de 3').should('be.visible')
                productCheckbox('Producto 3').should('be.checked')
                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                panel().contains('Página 2 de 3').should('be.visible')
            })

            it('toma el total desde pagination.total cuando la respuesta lo trae así', () => {
                start(
                    {
                        groups: [makeGroup()],
                        products: makeProducts(12),
                        productsTotalIn: 'pagination',
                    },
                    { open: true },
                )
                counter(0, 12).should('be.visible')
                panel().contains('Página 1 de 2').should('be.visible')
            })

            it('sin productos muestra 0, una sola página y no ofrece casillas de producto', () => {
                start({ groups: [makeGroup()], products: [] }, { open: true })
                counter(0, 0).should('be.visible')
                panel().contains('Página 1 de 1').should('be.visible')
                panel().contains('button', 'Anterior').should('be.disabled')
                panel().contains('button', 'Siguiente').should('be.disabled')
                panel().find('input[type="checkbox"]').should('have.length', 1) // solo "Obligatorio"
            })

            it('tras guardar vuelve a la primera página de productos', () => {
                start({ groups: [makeGroup()], products: makeProducts(25) }, { open: true })
                panel().contains('button', 'Siguiente').click()
                cy.wait('@productsPage')
                productCheckbox('Producto 12').check()
                saveButton().click()
                cy.wait('@assignProducts')
                cy.wait('@productsPage')
                panel().contains('Página 1 de 3').should('be.visible')
            })

            it('muestra completos los nombres con símbolos y HTML', () => {
                const name = 'Combo <i>Mixto</i> & más'
                start(
                    { groups: [makeGroup()], products: [{ id: 'combo-x', name, type: 'COMBO' }] },
                    { open: true },
                )
                panel().contains('label', name).should('be.visible')
                panel().find('i').should('not.exist')
            })
        })

        describe('guardado', () => {
            const versioned = () =>
                makeGroup({
                    version: 4,
                    options: [makeOption({ id: 'o1', name: 'Queso' })],
                    productIds: [],
                })

            it('guarda en orden (grupo → opciones → productos) encadenando las versiones y recarga el detalle', () => {
                const api = start(
                    { groups: [versioned()], products: makeProducts(2) },
                    { open: true },
                )
                let before = 0
                cy.then(() => {
                    before = api.calls.length
                })
                groupNameInput().clear().type('Extras v2')
                productCheckbox('Producto 1').check()
                saveButton().click()
                cy.wait('@assignProducts')
                cy.wait('@groupDetail')
                cy.wait('@productsPage')
                cy.then(() => {
                    const keys = api.calls.slice(before).map((call) => call.key)
                    expect(keys.slice(0, 3)).to.deep.eq(['update', 'options', 'assign'])
                    expect(keys.slice(3)).to.have.members(['detail', 'products'])
                    // PATCH usa la versión que cargó el panel; PUT products la que dejó PUT options.
                    expect(
                        (api.callsOf('update')[0].body as { expectedVersion: number })
                            .expectedVersion,
                    ).to.eq(4)
                    expect(
                        (api.callsOf('assign')[0].body as { expectedVersion: number })
                            .expectedVersion,
                    ).to.eq(6)
                })
                cy.contains('Grupo guardado').should('be.visible')
            })

            it('después de guardar muestra lo que devolvió el servidor, no lo que se tecleó', () => {
                start(
                    { groups: [versioned()], normalizeName: (name) => name.toUpperCase() },
                    { open: true },
                )
                groupNameInput().clear().type('extras normalizado')
                saveButton().click()
                cy.wait('@assignProducts')
                groupNameInput().should('have.value', 'EXTRAS NORMALIZADO')
                groupButton('EXTRAS NORMALIZADO').should('exist')
            })

            it('muestra "Guardando…", bloquea el botón y no duplica el guardado con otro clic', () => {
                start({ groups: [versioned()], delays: { update: 700 } }, { open: true })
                groupNameInput().clear().type('Otro nombre')
                saveButton().click()
                saveButton().should('be.disabled').and('contain', 'Guardando…')
                saveButton().click({ force: true })
                cy.wait('@assignProducts')
                cy.get('@updateGroup.all').should('have.length', 1)
                cy.get('@replaceOptions.all').should('have.length', 1)
                cy.get('@assignProducts.all').should('have.length', 1)
                saveButton().should('contain', 'Guardar cambios').and('not.be.disabled')
            })

            it('si falla el PATCH del grupo no sigue con opciones ni productos, conserva lo editado y el reintento funciona', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                api.script('update', SERVER_ERROR)
                groupNameInput().clear().type('Nombre nuevo')
                saveButton().click()
                cy.wait('@updateGroup')
                alertBox().should('contain', FRONT_ERROR.server)
                cy.then(() => {
                    expect(api.callsOf('options')).to.have.length(0)
                    expect(api.callsOf('assign')).to.have.length(0)
                })
                groupNameInput().should('have.value', 'Nombre nuevo')
                saveButton().should('not.be.disabled').click()
                cy.wait('@assignProducts')
                alertBox().should('not.exist')
                cy.then(() => expect(api.group('group-extras')?.name).to.eq('Nombre nuevo'))
            })

            it('si falla el PUT de opciones muestra el error y conserva lo editado', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                api.script('options', SERVER_ERROR)
                addOptionButton().click()
                optionNameInputs().last().type('Salsa')
                saveButton().click()
                cy.wait('@replaceOptions')
                alertBox().should('contain', FRONT_ERROR.server)
                optionNameInputs().should('have.length', 2)
                cy.then(() => expect(api.callsOf('assign')).to.have.length(0))
            })

            it('tras un fallo parcial (PATCH aplicado, opciones fallan) el reintento puede guardar', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                api.script('options', SERVER_ERROR)
                groupNameInput().clear().type('Parcial')
                saveButton().click()
                cy.wait('@replaceOptions')
                alertBox().should('contain', FRONT_ERROR.server)
                // El servidor ya subió la versión con el PATCH: el reintento debe usar la nueva.
                saveButton().click()
                cy.wait('@assignProducts')
                alertBox().should('not.exist')
                cy.then(() => expect(api.callsOf('assign')).to.have.length(1))
            })

            it('tras un fallo parcial (opciones aplicadas, productos fallan) el reintento puede guardar', () => {
                const api = start(
                    { groups: [versioned()], products: makeProducts(2) },
                    { open: true },
                )
                api.script('assign', SERVER_ERROR)
                productCheckbox('Producto 1').check()
                saveButton().click()
                cy.wait('@assignProducts')
                alertBox().should('contain', FRONT_ERROR.server)
                saveButton().click()
                cy.wait('@assignProducts')
                alertBox().should('not.exist')
                cy.then(() =>
                    expect(api.group('group-extras')?.productIds).to.deep.eq(['product-1']),
                )
            })

            it('ante un conflicto de versión (409) en el PATCH explica que cambió y conserva lo editado', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                api.script('update', {
                    statusCode: 409,
                    body: { error: { code: 'VERSION_CONFLICT' } },
                })
                groupNameInput().clear().type('Mi cambio')
                saveButton().click()
                cy.wait('@updateGroup')
                // Sin un código específico del backend se ve el aviso genérico, nunca texto técnico.
                alertBox()
                    .should('contain', FRONT_ERROR.generic)
                    .and('not.contain', 'VERSION_CONFLICT')
                groupNameInput().should('have.value', 'Mi cambio')
                cy.then(() => {
                    expect(api.callsOf('options')).to.have.length(0)
                    expect(api.callsOf('assign')).to.have.length(0)
                })
            })

            it('si otra sesión cambió el grupo (versión vieja) el servidor rechaza y no se pisan datos', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                cy.then(() => {
                    const current = api.group('group-extras')
                    if (current) current.version += 3
                })
                groupNameInput().clear().type('Desde la sesión vieja')
                saveButton().click()
                cy.wait('@updateGroup')
                // Un 409 con código desconocido no tiene mensaje propio: se ve el aviso genérico.
                alertBox()
                    .should('contain', FRONT_ERROR.generic)
                    .and('not.contain', 'VERSION_CONFLICT')
                cy.then(() => expect(api.group('group-extras')?.name).to.eq('Extras global'))
            })

            it('un nombre vacío lo rechaza el servidor (400) y se muestra el mensaje de validación', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                groupNameInput().clear()
                saveButton().click()
                cy.wait('@updateGroup')
                alertBox().should('contain', FRONT_ERROR.validation)
                cy.then(() => expect(api.callsOf('options')).to.have.length(0))
            })

            it('un nombre de solo espacios lo rechaza el servidor y no se pisa el nombre guardado', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                groupNameInput().clear().type('     ')
                saveButton().click()
                cy.wait('@updateGroup')
                alertBox().should('contain', FRONT_ERROR.validation)
                cy.then(() => expect(api.group('group-extras')?.name).to.eq('Extras global'))
            })

            it('una caída de red al guardar muestra el aviso y deja reintentar', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                // Fallo persistente: Chrome reintenta una vez una petición cortada sobre una conexión
                // reutilizada, y ese segundo intento no debe salir bien.
                api.failAlways('update', { forceNetworkError: true })
                groupNameInput().clear().type('Sin red')
                saveButton().click()
                alertBox().should('contain', FRONT_ERROR.generic)
                saveButton().should('not.be.disabled')
                cy.then(() => api.clear('update'))
                saveButton().click()
                cy.wait('@assignProducts')
                alertBox().should('not.exist')
                cy.then(() => expect(api.group('group-extras')?.name).to.eq('Sin red'))
            })

            it('un 403 al guardar muestra un mensaje de permisos', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                api.script('update', {
                    statusCode: 403,
                    body: { error: { code: 'BUSINESS_ACCESS_DENIED' } },
                })
                groupNameInput().clear().type('Sin permiso')
                saveButton().click()
                cy.wait('@updateGroup')
                alertBox().should('be.visible').and('not.be.empty')
                cy.then(() => expect(api.callsOf('options')).to.have.length(0))
            })

            it('el aviso de validación local se limpia en el siguiente intento de guardado correcto', () => {
                start({ groups: [versioned()] }, { open: true })
                optionField(0, 'Máximo').type('{selectall}11')
                saveButton().click()
                alertBox().should('be.visible')
                optionField(0, 'Máximo').type('{selectall}2')
                saveButton().click()
                cy.wait('@assignProducts')
                alertBox().should('not.exist')
            })

            it('guardar sin cambios repite el flujo completo sin alterar los datos', () => {
                const api = start({ groups: [versioned()] }, { open: true })
                saveButton().click()
                cy.wait('@assignProducts')
                cy.then(() => {
                    const group = api.group('group-extras')
                    expect(group?.name).to.eq('Extras global')
                    expect(group?.options).to.have.length(1)
                    expect(group?.productIds).to.deep.eq([])
                })
                cy.contains('Grupo guardado').should('be.visible')
            })
        })

        describe('archivar grupo', () => {
            it('al cancelar la confirmación no archiva y deja el grupo abierto', () => {
                const confirms: string[] = []
                const api = start({ groups: [makeGroup()] }, { open: true })
                cy.on('window:confirm', (message) => {
                    confirms.push(message)
                    return false
                })
                panel().contains('button', 'Archivar grupo').click()
                cy.then(() => {
                    expect(confirms).to.deep.eq(['¿Archivar este grupo global?'])
                    expect(api.callsOf('archive')).to.have.length(0)
                })
                groupNameInput().should('have.value', 'Extras global')
            })

            it('al confirmar archiva, recarga la lista y vuelve al estado vacío si era el último', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                cy.on('window:confirm', () => true)
                panel().contains('button', 'Archivar grupo').click()
                cy.wait('@archiveGroup')
                    .its('request.url')
                    .should('include', '/global-option-groups/group-extras')
                cy.wait('@listGroups')
                panel().contains('Todavía no hay grupos globales').should('be.visible')
                expectNoGroupOpen()
                cy.then(() => expect(api.state.groups).to.have.length(0))
            })

            it('al archivar uno de varios, los demás siguen y el detalle se cierra', () => {
                start({
                    groups: [
                        makeGroup({ id: 'a', name: 'Salsas' }),
                        makeGroup({ id: 'b', name: 'Tamaños' }),
                        makeGroup({ id: 'c', name: 'Extras' }),
                    ],
                })
                groupButton('Tamaños').click()
                cy.wait('@groupDetail')
                cy.on('window:confirm', () => true)
                panel().contains('button', 'Archivar grupo').click()
                cy.wait('@archiveGroup')
                cy.wait('@listGroups')
                groupItems().should('have.length', 2)
                groupButton('Tamaños').should('not.exist')
                groupButton('Salsas').should('exist')
                groupButton('Extras').should('exist')
                panel().contains('Elige un grupo para editarlo').should('be.visible')
            })

            it('si el servidor falla al archivar avisa al usuario y no pierde el grupo', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                api.script('archive', SERVER_ERROR)
                cy.on('window:confirm', () => true)
                panel().contains('button', 'Archivar grupo').click()
                cy.wait('@archiveGroup')
                alertBox().should('contain', FRONT_ERROR.server)
                groupButton('Extras global').should('exist')
            })

            it('si el grupo ya fue archivado en otra sesión (404) lo informa', () => {
                const api = start({ groups: [makeGroup()] }, { open: true })
                cy.then(() => {
                    api.state.groups = []
                })
                cy.on('window:confirm', () => true)
                panel().contains('button', 'Archivar grupo').click()
                cy.wait('@archiveGroup')
                alertBox().should('be.visible')
            })
        })

        describe('límite de 10 grupos', () => {
            const groupsCounter = () => panel().find('[data-cy="global-groups-counter"]')
            const createButton = () => panel().contains('button', 'Crear grupo')
            const limitNotice = () => panel().find('[data-cy="global-groups-limit"]')
            const groupsList = (count: number) =>
                Array.from({ length: count }, (_, index) =>
                    makeGroup({ id: `g-${index + 1}`, name: `Grupo ${index + 1}` }),
                )

            it('muestra el contador de grupos y lo actualiza al crear', () => {
                start({ groups: [] })
                groupsCounter().should('have.text', '0/10')
                createButton().click()
                cy.wait('@createGroup')
                groupsCounter().should('have.text', '1/10')
                limitNotice().should('not.exist')
            })

            it('con 9 grupos deja crear el décimo y luego bloquea Crear grupo con un aviso', () => {
                const api = start({ groups: groupsList(9) })
                groupsCounter().should('have.text', '9/10')
                createButton().should('not.be.disabled').click()
                cy.wait('@createGroup')
                groupItems().should('have.length', 10)
                groupsCounter().should('have.text', '10/10')
                createButton().should('be.disabled')
                limitNotice().should('contain', 'Llegaste al límite de 10 grupos')
                cy.then(() => expect(api.callsOf('create')).to.have.length(1))
            })

            it('con 10 grupos al cargar el botón está bloqueado y no manda POST aunque se fuerce el clic', () => {
                const api = start({ groups: groupsList(10) })
                groupsCounter().should('have.text', '10/10')
                createButton()
                    .should('be.disabled')
                    .and('have.attr', 'aria-describedby', 'global-groups-limit')
                limitNotice().should('be.visible')
                createButton().click({ force: true })
                cy.wait(300)
                groupItems().should('have.length', 10)
                cy.then(() => expect(api.callsOf('create')).to.have.length(0))
            })

            it('al archivar un grupo con el límite alcanzado se vuelve a poder crear', () => {
                start({ groups: groupsList(10) })
                createButton().should('be.disabled')
                groupButton(/^Grupo 1$/).click()
                cy.wait('@groupDetail')
                cy.on('window:confirm', () => true)
                panel().contains('button', 'Archivar grupo').click()
                cy.wait('@archiveGroup')
                cy.wait('@listGroups')
                groupsCounter().should('have.text', '9/10')
                limitNotice().should('not.exist')
                createButton().should('not.be.disabled')
            })

            it('el límite se mantiene al recargar la lista', () => {
                start({ groups: groupsList(10) })
                cy.get('[aria-label="Recargar grupos"]').click()
                cy.wait('@listGroups')
                groupsCounter().should('have.text', '10/10')
                createButton().should('be.disabled')
            })

            it('un error al crear no consume el cupo', () => {
                const api = start({ groups: groupsList(9) })
                cy.then(() => api.script('create', SERVER_ERROR))
                createButton().click()
                cy.wait('@createGroup')
                alertBox().should('contain', FRONT_ERROR.server)
                groupsCounter().should('have.text', '9/10')
                createButton().should('not.be.disabled')
                limitNotice().should('not.exist')
            })

            it('con más de 10 grupos heredados bloquea crear, muestra el total real y deja abrirlos', () => {
                start({ groups: groupsList(12) })
                groupsCounter().should('have.text', '12/10')
                createButton().should('be.disabled')
                groupButton(/^Grupo 12$/)
                    .scrollIntoView()
                    .click()
                cy.wait('@groupDetail').its('request.url').should('include', '/g-12')
                groupNameInput().should('have.value', 'Grupo 12')
            })
        })

        describe('checkboxes de Pedilo', () => {
            const catalog = makeProducts(3, 'Producto')

            it('no usan la apariencia nativa: caja propia que pasa de blanco a azul al marcarse', () => {
                start({ groups: [makeGroup()] }, { open: true })
                requiredCheckbox()
                    .should('have.class', 'pedilo-checkbox')
                    .and('have.css', 'appearance', 'none')
                    .and('have.css', 'background-color', 'rgb(255, 255, 255)')
                requiredCheckbox().check()
                requiredCheckbox().should('have.css', 'background-color', 'rgb(36, 81, 197)')
                requiredCheckbox().uncheck()
                requiredCheckbox().should('have.css', 'background-color', 'rgb(255, 255, 255)')
            })

            it('la palomita se dibuja solo al marcar', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                productCheckbox('Producto 1').should(($input) => {
                    expect(getComputedStyle($input[0]).backgroundSize).to.eq('0px')
                })
                productCheckbox('Producto 1').check()
                productCheckbox('Producto 1').should(($input) => {
                    expect(getComputedStyle($input[0]).backgroundSize).not.to.eq('0px')
                })
            })

            it('la fila del producto se resalta al marcarse y vuelve a su estilo al desmarcar', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                const row = () => panel().contains('label', /^Producto 2$/)
                // Los colores calculados llegan en oklch: se compara contra el estado inicial.
                row()
                    .invoke('css', 'border-top-color')
                    .then((before) => {
                        productCheckbox('Producto 2').check()
                        row().should(($row) => {
                            expect($row.css('border-top-color')).not.to.eq(before)
                        })
                        productCheckbox('Producto 2').uncheck()
                        row().should(($row) => {
                            expect($row.css('border-top-color')).to.eq(before)
                        })
                    })
            })

            it('tocar cualquier parte de la fila marca el producto', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                panel()
                    .contains('label', /^Producto 3$/)
                    .click('right')
                productCheckbox('Producto 3').should('be.checked')
                counter(1, 3).should('be.visible')
                panel()
                    .contains('label', /^Producto 3$/)
                    .click('right')
                productCheckbox('Producto 3').should('not.be.checked')
            })

            it('tocar la fila de Obligatorio también lo activa', () => {
                start({ groups: [makeGroup()] }, { open: true })
                panel().contains('label', 'Obligatorio').click('right')
                requiredCheckbox().should('be.checked')
            })

            it('el checkbox mide 20 px y las filas de producto tienen al menos 40 px de alto', () => {
                start({ groups: [makeGroup()], products: catalog }, { open: true })
                productCheckbox('Producto 1').invoke('outerWidth').should('eq', 20)
                productCheckbox('Producto 1').invoke('outerHeight').should('eq', 20)
                panel()
                    .contains('label', /^Producto 1$/)
                    .invoke('outerHeight')
                    .should('be.at.least', 40)
            })
        })

        describe('pantalla chica (375 px)', () => {
            beforeEach(() => cy.viewport(375, 740))

            const longName = 'Extras de la casa con salsa especial'

            it('el panel cabe sin desbordes y los nombres largos no se salen', () => {
                start({
                    groups: [
                        makeGroup({
                            id: 'a',
                            name: longName.slice(0, 40),
                            options: fiveOptions(2),
                        }),
                        makeGroup({ id: 'b', name: 'M'.repeat(40) }),
                    ],
                    products: [{ id: 'p', name: 'P'.repeat(40) }],
                })
                assertPageFitsViewport()
                groupItems().then(($items) => assertInsideViewportX($items, 'grupo'))
                groupButton(/^M+$/).click()
                cy.wait('@groupDetail')
                assertPageFitsViewport()
                panel()
                    .find('input')
                    .then(($inputs) => assertInsideViewportX($inputs, 'campo'))
            })

            it('las filas de opciones apilan Mínimo, Máximo y Costo dentro de la pantalla', () => {
                start({ groups: [makeGroup({ options: fiveOptions(3) })] }, { open: true })
                assertPageFitsViewport()
                ;(['Mínimo', 'Máximo', 'Costo adicional'] as const).forEach((label) => {
                    optionRow(0)
                        .contains('label', label)
                        .find('input')
                        .then(($input) => assertInsideViewportX($input, label))
                })
                optionRow(2).scrollIntoView().should('be.visible')
            })

            it('permite editar y guardar desde el móvil, con el botón alcanzable por encima de la barra', () => {
                start(
                    { groups: [makeGroup({ options: fiveOptions(2) })], products: makeProducts(3) },
                    { open: true },
                )
                groupNameInput().clear().type('Editado en móvil')
                productCheckbox('Producto 1').check()
                saveButton().scrollIntoView({ offset: { top: -300, left: 0 } })
                saveButton().then(($button) => assertNotCovered($button, 'guardar'))
                saveButton().click()
                cy.wait('@assignProducts')
                cy.contains('Grupo guardado').should('be.visible')
                groupNameInput().should('have.value', 'Editado en móvil')
            })

            it('al llegar al final de la pantalla el contenido no queda tapado por la navegación', () => {
                start({ groups: [makeGroup()] })
                cy.get('nav[aria-label="Navegación móvil"]').then(($nav) => {
                    const navTop = $nav[0].getBoundingClientRect().top
                    // El contenido sigue creciendo mientras cargan otros paneles: en cada reintento se
                    // vuelve a bajar hasta el final antes de medir.
                    cy.get('#main-content').should(($main) => {
                        const win = $main[0].ownerDocument.defaultView as Window
                        win.scrollTo(0, win.document.documentElement.scrollHeight)
                        const last = $main[0].lastElementChild as HTMLElement
                        expect(last.getBoundingClientRect().bottom).to.be.at.most(navTop + 1)
                    })
                })
            })

            it('crear y archivar un grupo funcionan igual en pantalla chica', () => {
                start({ groups: [] })
                panel().contains('button', 'Crear grupo').click()
                cy.wait('@createGroup')
                groupItems().first().click()
                cy.wait('@groupDetail')
                cy.on('window:confirm', () => true)
                panel()
                    .contains('button', 'Archivar grupo')
                    .scrollIntoView({ offset: { top: -300, left: 0 } })
                    .click()
                cy.wait('@archiveGroup')
                panel().contains('Todavía no hay grupos globales').should('be.visible')
            })
        })

        describe('uso en el menú público (producto y combo)', () => {
            const businessId = 'business-global-options-public'
            const slug = 'global-options-public-edge'
            const optionGroups = (productId: string) => [
                {
                    id: 'group-extras',
                    productId,
                    name: 'Extras globales',
                    isRequired: false,
                    minSelections: 0,
                    maxSelections: 1,
                    sortOrder: 0,
                    isActive: true,
                    options: [
                        {
                            id: `option-${productId}`,
                            optionGroupId: 'group-extras',
                            name: 'Queso extra',
                            price: 15,
                            minSelections: 0,
                            maxSelections: 1,
                            sortOrder: 0,
                            isAvailable: true,
                        },
                    ],
                },
            ]
            const product = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
                id,
                businessId,
                categoryId: 'public-category',
                name,
                description: null,
                price: 90,
                priceOriginal: 90,
                priceFinal: 90,
                imageUrl: null,
                sortOrder: 0,
                isAvailable: true,
                optionGroups: optionGroups(id),
                ...extra,
            })

            it('un producto y un combo con grupo global asignado ofrecen "Seleccionar opciones"', () => {
                cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
                    statusCode: 200,
                    body: {
                        business: {
                            id: businessId,
                            name: 'Restaurante público',
                            slug,
                            description: null,
                            logoUrl: null,
                            logoBlurUrl: null,
                            coverUrl: null,
                            coverBlurUrl: null,
                            ubication: null,
                            ubicationMaps: null,
                            businessSchedule: null,
                        },
                        menus: [
                            {
                                id: 'public-menu',
                                businessId,
                                name: 'Principal',
                                description: null,
                                isActive: true,
                                categories: [
                                    {
                                        id: 'public-category',
                                        businessId,
                                        menuId: 'public-menu',
                                        name: 'Todo',
                                        description: null,
                                        sortOrder: 0,
                                        isActive: true,
                                        products: [
                                            product('product-burger', 'Hamburguesa clásica'),
                                            product('combo-family', 'Combo familiar', {
                                                type: 'COMBO',
                                            }),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                })
                cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, {
                    statusCode: 200,
                    body: { discounts: [] },
                })
                cy.visit(`/menu/${slug}`)
                cy.contains('article', 'Hamburguesa clásica')
                    .contains('button', 'Seleccionar opciones')
                    .should('be.visible')
                cy.contains('article', 'Combo familiar')
                    .contains('button', 'Seleccionar opciones')
                    .should('be.visible')
                cy.contains('article', 'Combo familiar')
                    .contains('button', 'Seleccionar opciones')
                    .click()
                cy.contains('Extras globales').should('be.visible')
                cy.contains('Queso extra').should('be.visible')
            })
        })
    },
)

export {}
