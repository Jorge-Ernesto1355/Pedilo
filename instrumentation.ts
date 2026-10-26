import * as Sentry from "@sentry/nextjs";
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

function missingPostHogConfiguration(variableName: string) {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
    )
  }
}

export let posthogLoggerProvider: LoggerProvider | undefined

if (!posthogKey) {
  missingPostHogConfiguration('NEXT_PUBLIC_POSTHOG_KEY')
} else if (!posthogHost) {
  missingPostHogConfiguration('NEXT_PUBLIC_POSTHOG_HOST')
} else {
  posthogLoggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ 'service.name': 'pedilo-nextjs' }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: new URL('/i/v1/logs', posthogHost).toString(),
          headers: {
            Authorization: `Bearer ${posthogKey}`,
            'Content-Type': 'application/json',
          },
        }),
      }),
    ],
  })
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
