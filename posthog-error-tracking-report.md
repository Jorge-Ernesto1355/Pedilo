# PostHog error tracking

> ⚠️ **Needs your attention**
> - Add `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` to the Vercel Production build environment; `POSTHOG_API_KEY` must be a personal API key with the Source map upload preset.
> - Ensure `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are configured in Vercel for the deployed app.
> - Redeploy from the connected Git repository so production builds can upload source maps and associate releases. The local verification build passed, but no credentialed upload was verified.

## What you still need to do

1. Create a personal API key with the **Source map upload** preset at https://us.posthog.com/settings/user-api-keys. The preset provides the error-tracking write scope required for source-map uploads and release association.
2. In the linked Vercel project, add these Production build environment variables before the next deploy:
   - `POSTHOG_API_KEY` — store as a Sensitive/secret value.
   - `POSTHOG_PROJECT_ID` — set to `686590`.
   - `POSTHOG_HOST` — set to the PostHog API host used by the uploader.
   Also ensure the application variables `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` exist under those exact names. Redeploy from the connected Git repository.
3. If production is built somewhere other than the documented Vercel path, expose the same five variables there and provide both release identity halves (repository/release name and commit/version). No repository-managed CI pipeline was found to edit.

## What is active now

- **Browser errors:** `instrumentation-client.ts` initializes `posthog-js` with exception autocapture enabled, and `app/global-error.tsx` centrally captures errors handled by Next.js's global client error boundary.
- **Server errors:** `src/lib/posthog-server.ts` provides the `posthog-node` singleton with built-in exception autocapture. `instrumentation.ts` preserves the existing Sentry request-error handling and additionally captures Node-runtime framework request errors with PostHog, flushing before the request finishes.
- The project started this setup with the PostHog SDK integration in place: `posthog-node` is initialized server-side and the existing browser initialization remains active. Capture remains pointed at PostHog.

## Source maps and build verification

Source-map upload is wired in these files:

- `next.config.ts`
- `package.json`
- `package-lock.json`

The exact production build command is `npm run build`. It passed successfully, including compilation, TypeScript, `runAfterProductionCompile`, and generation of all 28 static pages. The build is set up to upload source maps on every production build once `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` are present where the build runs. The verification build did not upload because the project environment scan reported those three uploader variables as missing, so there is no release name or uploaded-file count to report yet. The credentials handoff reported them as written to `.env`, but the verification scan found them missing; confirm the variables in the actual Vercel build environment.

No repository-managed release-linking files were added. The documented Vercel deployment path is expected to provide Git repository and commit metadata to the production build. Each production deploy must therefore run the configured build with those credentials and release metadata so uploaded symbol sets can be associated with the deployed commit. Local runs, tests, and pull-request builds are unchanged and send no release ID from this setup.

## How to verify

Trigger an error and inspect https://us.posthog.com/project/686590/error_tracking. Uploaded symbol sets appear at https://us.posthog.com/project/686590/error_tracking/configuration. After the next credentialed production deploy, confirm that the stack trace is symbolicated and associated with that deploy's release/commit. The first production build with valid upload variables should provide the first symbol set in PostHog.
