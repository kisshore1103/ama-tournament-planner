# Deploy your personal planner

These steps require your GitHub, Vercel and Upstash account actions. Local organizer use does not.

## GitHub

1. Sign in at GitHub and choose **New repository**. A private repository is appropriate. If uploading this existing Git repository, do not initialize the remote with another README.
2. Use the existing repository's configured remote, or copy the new repository HTTPS URL and run `git remote add origin YOUR_REPOSITORY_URL` from this repository if it has no origin. Do not replace an existing remote without checking it.
3. Run `git push -u origin main` and complete GitHub's sign-in prompt. Never upload `.env.local`, organizer recovery files or credentials.

## Vercel Hobby and Upstash

1. Sign in to Vercel. Select **Add New → Project**, import the GitHub repository and grant access to that repository.
2. Select the Next.js framework. Keep the repository root as the root directory. The committed `vercel.json` uses `npm ci` and `npm run build`. Choose the Node 24 runtime, matching the locally verified version.
3. In Vercel Marketplace, find **Upstash Redis**, add the integration, create a database, choose a suitable nearby region and connect it to this project. Review the provider's current plan/limits before accepting any billing step. [Vercel's Redis guide](https://vercel.com/docs/redis) describes Marketplace integrations; the old Vercel KV product is not used here.
4. In Vercel **Project → Settings → Environment Variables**, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` using the connected database's REST credentials. If the integration supplies differently prefixed names, copy their values into these exact names. They must remain server-only; never add `NEXT_PUBLIC_` to them.
5. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS project domain, such as `https://your-project.vercel.app`. Set the intended Production/Preview scopes. For a preview deployment, either use its own matching URL or omit this value so the API uses the current request origin. Do not mix production and preview databases unless intentional.
6. Optionally set `NEXT_PUBLIC_DEFAULT_TIMEZONE=America/Toronto`, `NEXT_PUBLIC_DEFAULT_AUTO_REFRESH_SECONDS=45`, `MAX_PUBLISHED_ROWS=500`, and `MAX_PUBLISH_PAYLOAD_BYTES=500000`. Refresh values are clamped to 30–60 seconds. Do not add coach or SportData passwords.
7. Select **Deploy**, or redeploy after changing environment variables. Wait for a successful build, then open the HTTPS URL.
8. Save a small test tournament with one fully resolved row. Publish, open the shared link in another browser, update it, refresh it and unpublish. Confirm the former link becomes unavailable. Install the PWA and test airplane mode after loading the schedule online.

Use only the current normalized schedule in this database. Updating overwrites it; changing tournaments first unpublishes the old schedule. The application has no history or public listing. Provider backups/log retention, if enabled by your account, are managed separately in that provider's settings.

## Local publishing against your database

Create `.env.local` in this repository from `.env.example`, fill the two REST secrets, and leave `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Restart the server after changes. The test suite has a local-only adapter so you can verify API behavior without a cloud account; it is disabled on Vercel and is not a production storage option.

## Deployment problems

- Missing Redis values: organizer functions still work, but publishing reports unavailable. Check both server values and redeploy.
- Same-origin rejection: ensure the app URL matches the URL in the browser; do not use an old preview origin.
- Build failure: run the exact verification commands from README locally and inspect the Vercel build output. Never paste secret values into an issue or chat log.
- Offline behavior absent: use a production build over HTTPS (localhost is allowed for development testing), not `npm run dev`.
