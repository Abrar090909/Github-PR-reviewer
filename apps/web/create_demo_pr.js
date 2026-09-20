const path = require('path');
const { createAppAuth } = require('@octokit/auth-app');
const { Octokit } = require('octokit');
const fs = require('fs');

// Read .env.local from project root (two levels up from apps/web)
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
const env = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
}

const privateKey = Buffer.from(env.GITHUB_APP_PRIVATE_KEY, 'base64').toString('utf-8');

const instOctokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: env.GITHUB_APP_ID,
    privateKey,
    installationId: 160432227,
  },
});

async function main() {
  const owner = 'Abrar090909';
  const repo = 'Blynkpage';
  const branchName = 'feature/pr-lens-svg-comment-' + Date.now().toString().slice(-6);

  console.log(`Connecting to ${owner}/${repo}...`);
  const mainRef = await instOctokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
    owner, repo, ref: 'heads/main'
  });
  const baseSha = mainRef.data.object.sha;
  console.log('Base SHA:', baseSha);

  // 1. Create branch
  await instOctokit.request('POST /repos/{owner}/{repo}/git/refs', {
    owner, repo,
    ref: 'refs/heads/' + branchName,
    sha: baseSha,
  });
  console.log('Branch created:', branchName);

  // 2. Create two files to trigger a meaningful diff
  const webhookCode = [
    'import json',
    'import hmac, hashlib, logging',
    'from django.http import JsonResponse, HttpResponseBadRequest',
    'from django.views.decorators.csrf import csrf_exempt',
    'from .events import dispatch_payment_event',
    '',
    'logger = logging.getLogger(__name__)',
    '',
    '@csrf_exempt',
    'def stripe_webhook_endpoint(request):',
    '    """Ingests Stripe webhook notifications and dispatches domain events."""',
    '    if request.method != "POST":',
    '        return HttpResponseBadRequest("Method not allowed")',
    '',
    '    # Verify Stripe signature',
    '    sig = request.headers.get("Stripe-Signature", "")',
    '    secret = settings.STRIPE_WEBHOOK_SECRET',
    '    try:',
    '        payload = json.loads(request.body)',
    '        mac = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()',
    '        if not hmac.compare_digest(mac, sig.split(",")[1].split("=")[1]):',
    '            return HttpResponseBadRequest("Invalid signature")',
    '    except Exception:',
    '        return HttpResponseBadRequest("Malformed payload")',
    '',
    '    event_type = payload.get("type")',
    '    logger.info(f"Received billing webhook: {event_type}")',
    '',
    '    if event_type == "checkout.session.completed":',
    '        data = payload.get("data", {}).get("object", {})',
    '        dispatch_payment_event(data.get("customer"), data.get("amount_total", 0), "paid")',
    '    elif event_type == "customer.subscription.deleted":',
    '        data = payload.get("data", {}).get("object", {})',
    '        dispatch_payment_event(data.get("customer"), 0, "canceled")',
    '    elif event_type == "invoice.payment_failed":',
    '        data = payload.get("data", {}).get("object", {})',
    '        dispatch_payment_event(data.get("customer"), 0, "failed")',
    '',
    '    return JsonResponse({"status": "received"})',
    '',
  ].join('\n');

  const eventsCode = [
    'import logging',
    'from django.conf import settings',
    'from .tasks import send_billing_notification',
    '',
    'logger = logging.getLogger(__name__)',
    '',
    'def dispatch_payment_event(customer_id: str, amount: int, status: str) -> None:',
    '    """Publishes billing events to asynchronous worker queues."""',
    '    logger.info(f"Billing event: customer={customer_id} status={status} amount=${amount/100:.2f}")',
    '    # Enqueue async notification task',
    '    send_billing_notification.delay(customer_id, status, amount)',
    '',
  ].join('\n');

  const tasksCode = [
    'from celery import shared_task',
    'import logging',
    '',
    'logger = logging.getLogger(__name__)',
    '',
    '@shared_task(bind=True, max_retries=3)',
    'def send_billing_notification(self, customer_id: str, status: str, amount: int) -> None:',
    '    """Celery task: sends billing notification emails via SES."""',
    '    try:',
    '        from .email import send_billing_email',
    '        send_billing_email(customer_id, status, amount)',
    '    except Exception as exc:',
    '        raise self.retry(exc=exc, countdown=60)',
    '',
  ].join('\n');

  const baseCommit = await instOctokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
    owner, repo, commit_sha: baseSha,
  });

  const tree = await instOctokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner, repo,
    base_tree: baseCommit.data.tree.sha,
    tree: [
      { path: 'backend/apps/billing/webhook.py',    mode: '100644', type: 'blob', content: webhookCode },
      { path: 'backend/apps/billing/events.py',     mode: '100644', type: 'blob', content: eventsCode },
      { path: 'backend/apps/billing/tasks.py',      mode: '100644', type: 'blob', content: tasksCode },
    ],
  });

  // 3. Commit
  const newCommit = await instOctokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner, repo,
    message: 'feat(billing): add Stripe webhook with HMAC validation, payment events, and Celery async notifications',
    tree: tree.data.sha,
    parents: [baseSha],
  });

  // 4. Update branch pointer
  await instOctokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner, repo,
    ref: 'heads/' + branchName,
    sha: newCommit.data.sha,
  });
  console.log('Committed:', newCommit.data.sha);

  // 5. Open Pull Request
  const pr = await instOctokit.request('POST /repos/{owner}/{repo}/pulls', {
    owner, repo,
    title: 'feat(billing): Stripe webhook — HMAC validation + payment events + async Celery tasks',
    head: branchName,
    base: 'main',
    body: [
      '## What this PR does',
      '',
      'Adds the full billing event pipeline:',
      '',
      '- **`webhook.py`** — Stripe webhook endpoint with HMAC-SHA256 signature validation',
      '- **`events.py`** — Domain event dispatcher (`paid`, `canceled`, `failed`)',
      '- **`tasks.py`** — Celery async task for billing email notifications via SES',
      '',
      '### Architecture impact',
      '- New async path: `Stripe → webhook.py → events.py → tasks.py → SES`',
      '- Adds `invoice.payment_failed` handling (new event type)',
      '- All Stripe webhooks now signature-verified before dispatch',
    ].join('\n'),
  });

  console.log('\n========================================');
  console.log('Pull Request created!');
  console.log(`PR Number: #${pr.data.number}`);
  console.log(`URL: ${pr.data.html_url}`);
  console.log('========================================\n');
  console.log('The Contour GitHub App will now analyze this PR and post');
  console.log('an animated SVG architecture diagram directly as a PR comment.');
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
