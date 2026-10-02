# Contour Hosted GitHub App

The hosted App is Contour's default installation path. Repository owners select repositories once; they do not install the CLI, commit a workflow, or provide a model key.

## Production services

Create these resources before deploying `apps/web`:

1. A public GitHub App.
2. A Supabase project.
3. An Upstash Redis database.
4. An Upstash QStash account.
5. A Google Gemini API key owned by the Contour service.
6. A Vercel project for `apps/web`, or another Node.js host that can run the worker for up to five minutes.

## GitHub App settings

Use `infra/github-app-manifest.yml` as the source of truth.

- Homepage URL: `https://<your-domain>`
- Setup URL: `https://<your-domain>/setup`
- Webhook URL: `https://<your-domain>/api/webhooks/github`
- Public installation: enabled
- Repository permissions:
  - Contents: read
  - Metadata: read
  - Pull requests: read and write
- Events:
  - Pull request
  - Installation
  - Installation repositories

Generate a private key after creating the App. Base64-encode the complete PEM before putting it in the deployment environment.

## Database

Apply the migrations in `supabase/migrations`, including `20260926_hosted_github_app.sql`.

The service-role key must only be available to the server deployment. It must never use a `NEXT_PUBLIC_` variable.

## Deployment environment

Copy `.env.example` and configure:

```text
NEXT_PUBLIC_APP_URL=https://<your-domain>
NEXT_PUBLIC_GITHUB_APP_SLUG=<github-app-slug>

GITHUB_APP_ID=<numeric-app-id>
GITHUB_APP_PRIVATE_KEY=<base64-pem>
GITHUB_WEBHOOK_SECRET=<random-webhook-secret>

SUPABASE_URL=<project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

UPSTASH_REDIS_URL=<redis-rest-url>
UPSTASH_REDIS_TOKEN=<redis-rest-token>
QSTASH_TOKEN=<qstash-token>
QSTASH_CURRENT_SIGNING_KEY=<current-signing-key>
QSTASH_NEXT_SIGNING_KEY=<next-signing-key>

GEMINI_API_KEY=<service-owned-key>
GEMINI_MODEL=gemini-2.5-flash
```

`NEXT_PUBLIC_APP_URL` must exactly match the public origin used in the QStash destination. QStash validates this URL as the signature subject.

## Installation flow

The public install button resolves to:

```text
https://github.com/apps/<github-app-slug>/installations/new
```

After a user selects repositories, GitHub redirects them to `/setup`. Pull request `opened`, `reopened`, and `synchronize` events are queued automatically. The worker reads the diff with a short-lived installation token, calls the service-owned model, renders both themes, and creates or updates one pull request comment.

## Production check

Use a separate test repository and:

1. Install the App on that repository only.
2. Open a pull request with a small source change.
3. Confirm QStash delivers `/api/jobs/analyze` successfully.
4. Confirm the PR receives a Contour comment with working light and dark images.
5. Push another commit and confirm the same comment is updated.
6. Remove repository access and confirm its installation and analysis rows are deleted.
