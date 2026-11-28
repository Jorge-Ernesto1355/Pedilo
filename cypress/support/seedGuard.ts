// Las suites de envíos y lealtad crean cuentas y negocios propios (seed). Por defecto solo
// corren contra un backend local. Para usar el backend de desarrollo hay que pedirlo
// explícitamente con CYPRESS_ALLOW_REMOTE_SEED=true. Producción nunca está permitida.
const LOCAL_HOSTS = ['localhost', '127.0.0.1']
const REMOTE_SEED_HOSTS = ['api-dev.pedilo.mx']

export function assertSeedAllowed(api: string, suite: string): void {
    const host = new URL(api).hostname
    if (LOCAL_HOSTS.includes(host)) return
    cy.env(['allowRemoteSeed']).then(({ allowRemoteSeed }) => {
        expect(
            allowRemoteSeed === true && REMOTE_SEED_HOSTS.includes(host),
            `las pruebas de ${suite} solo corren contra un backend local; para el backend de ` +
                `desarrollo (${REMOTE_SEED_HOSTS.join(', ')}) usa CYPRESS_ALLOW_REMOTE_SEED=true. ` +
                `Backend actual: ${host}`,
        ).to.equal(true)
    })
}
