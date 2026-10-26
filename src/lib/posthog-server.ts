import { PostHog } from 'posthog-node'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

function missingPostHogConfiguration(variableName: string) {
    if (process.env.NODE_ENV !== 'production') {
        throw new Error(
            `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
        )
    }
}

let posthogClient: PostHog | undefined

if (!posthogKey) {
    missingPostHogConfiguration('NEXT_PUBLIC_POSTHOG_KEY')
} else if (!posthogHost) {
    missingPostHogConfiguration('NEXT_PUBLIC_POSTHOG_HOST')
} else {
    posthogClient = new PostHog(posthogKey, {
        host: posthogHost,
        flushAt: 1,
        flushInterval: 0,
        enableExceptionAutocapture: true,
    })
}

export function getPostHogClient() {
    return posthogClient
}
