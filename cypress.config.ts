import { defineConfig } from 'cypress'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const testUserEmail = process.env.CYPRESS_TEST_USER_EMAIL ?? process.env.E2E_TEST_EMAIL
const testUserPassword = process.env.CYPRESS_TEST_USER_PASSWORD ?? process.env.E2E_TEST_PASSWORD
const testAccountAEmail = process.env.CYPRESS_TEST_ACCOUNT_A_EMAIL
const testAccountAPassword = process.env.CYPRESS_TEST_ACCOUNT_A_PASSWORD
const testAccountBEmail = process.env.CYPRESS_TEST_ACCOUNT_B_EMAIL
const testAccountBPassword = process.env.CYPRESS_TEST_ACCOUNT_B_PASSWORD
const testAccountAMarker = process.env.CYPRESS_TEST_ACCOUNT_A_MARKER
const testAccountBMarker = process.env.CYPRESS_TEST_ACCOUNT_B_MARKER
const testRegisterEmail = process.env.CYPRESS_TEST_REGISTER_EMAIL ?? process.env.E2E_REGISTER_EMAIL
const testRegisterPassword =
    process.env.CYPRESS_TEST_REGISTER_PASSWORD ?? process.env.E2E_REGISTER_PASSWORD
const diagnosticEmail = process.env.CYPRESS_TEST_EMAIL ?? process.env.CYPRESS_PROD_TEST_EMAIL
const diagnosticPassword =
    process.env.CYPRESS_TEST_PASSWORD ?? process.env.CYPRESS_PROD_TEST_PASSWORD
const cypressBaseUrl = process.env.CYPRESS_BASE_URL ?? 'https://pedilo.mx'
const e2eSeedEmail = process.env.E2E_SEED_EMAIL ?? 'cypress-dashboard-seed@pedilo.test'
const e2eSeedPassword = process.env.E2E_SEED_PASSWORD ?? 'Strong-pass-123'
const e2eSeedSlug = process.env.E2E_SEED_SLUG ?? 'e2e-dashboard-restaurante'

export default defineConfig({
    e2e: {
        baseUrl: cypressBaseUrl,
        specPattern: 'cypress/e2e/**/*.cy.ts',
        supportFile: 'cypress/support/e2e.ts',
        retries: {
            runMode: 2,
            openMode: 0,
        },
        setupNodeEvents(on, config) {
            void on
            return config
        },
    },
    env: {
        backendUrl:
            process.env.BACKEND_URL ??
            (cypressBaseUrl.includes('pedilo.mx')
                ? 'https://api.pedilo.mx'
                : 'http://localhost:3001'),
        testUserEmail,
        testUserPassword,
        testAccountAEmail,
        testAccountAPassword,
        testAccountBEmail,
        testAccountBPassword,
        testAccountAMarker,
        testAccountBMarker,
        testRegisterEmail,
        testRegisterPassword,
        diagnosticEmail,
        diagnosticPassword,
        e2eSeedEmail,
        e2eSeedPassword,
        e2eSeedSlug,
        uiDelay: Number(process.env.CYPRESS_UI_DELAY ?? 0),
        pauseForInspection: process.env.CYPRESS_PAUSE_FOR_INSPECTION === 'true',
    },
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 8_000,
    requestTimeout: 10_000,
    responseTimeout: 15_000,
    pageLoadTimeout: 30_000,
    screenshotOnRunFailure: true,
    video: true,
})
