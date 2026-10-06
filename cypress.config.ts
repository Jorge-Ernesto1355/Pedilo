import { defineConfig } from 'cypress'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const testUserEmail = process.env.CYPRESS_TEST_USER_EMAIL ?? process.env.E2E_TEST_EMAIL
const testUserPassword = process.env.CYPRESS_TEST_USER_PASSWORD ?? process.env.E2E_TEST_PASSWORD
const testRegisterEmail = process.env.CYPRESS_TEST_REGISTER_EMAIL ?? process.env.E2E_REGISTER_EMAIL
const testRegisterPassword =
    process.env.CYPRESS_TEST_REGISTER_PASSWORD ?? process.env.E2E_REGISTER_PASSWORD
const e2eSeedEmail = process.env.E2E_SEED_EMAIL ?? 'cypress-dashboard-seed@pedilo.test'
const e2eSeedPassword = process.env.E2E_SEED_PASSWORD ?? 'Strong-pass-123'
const e2eSeedSlug = process.env.E2E_SEED_SLUG ?? 'e2e-dashboard-restaurante'

export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
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
        backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3001',
        testUserEmail,
        testUserPassword,
        testRegisterEmail,
        testRegisterPassword,
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
