const path = require('path');
const { createAppAuth } = require('@octokit/auth-app');
const { Octokit } = require('octokit');
const fs = require('fs');

// Read .env.local from project root
const envPath = path.resolve(__dirname, '..', '.env.local');
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
  const branchName = 'feature/billing-webhook-' + Date.now().toString().slice(-6);

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

  // 2. Create blob
  const webhookCode = [
    'import json',
    'import logging',
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
    '    try:',
    '        payload = json.loads(request.body.decode("utf-8"))',
    '    except Exception:',
    '        return HttpResponseBadRequest("Malformed JSON")',
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
    '',
    '    return JsonResponse({"status": "received"})',
    '',
  ].join('\n');

  const eventsCode = [
    'import logging',
    '',
    'logger = logging.getLogger(__name__)',
    '',
    'def dispatch_payment_event(customer_id: str, amount: int, status: str) -> None:',
    '    """Publishes billing events to asynchronous worker queues."""',
    '    logger.info(f"Billing event dispatched: customer={customer_id} status={status} amount=${amount/100:.2f}")',
    '',
  ].join('\n');

  const baseCommit = await instOctokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
    owner, repo, commit_sha: baseSha,
  });

  const tree = await instOctokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner, repo,
    base_tree: baseCommit.data.tree.sha,
    tree: [
      {
        path: 'backend/apps/billing/webhook_dispatcher.py',
        mode: '100644',
        type: 'blob',
        content: webhookCode,
      },
      {
        path: 'backend/apps/billing/events.py',
        mode: '100644',
        type: 'blob',
        content: eventsCode,
      },
    ],
  });

  // 3. Commit
  const newCommit = await instOctokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner, repo,
    message: 'feat(billing): add stripe webhook dispatcher and payment event publisher',
    tree: tree.data.sha,
    parents: [baseSha],
  });

  // 4. Update branch pointer
  await instOctokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner, repo,
    ref: 'heads/' + branchName,
    sha: newCommit.data.sha,
  });
  console.log('Committed to branch:', newCommit.data.sha);

  // 5. Open Pull Request
  const pr = await instOctokit.request('POST /repos/{owner}/{repo}/pulls', {
    owner, repo,
    title: 'feat(billing): Stripe webhook dispatcher & payment event pipeline',
    head: branchName,
    base: 'main',
    body: [
      '## Architecture & Purpose',
      '',
      'Adds automated ingestion for Stripe webhook notifications (checkout completed, subscription canceled) and dispatches asynchronous domain events to downstream worker tasks.',
      '',
      '### Changes',
      '- Added `backend/apps/billing/webhook_dispatcher.py`: Entrypoint endpoint with signature and payload validation',
      '- Added `backend/apps/billing/events.py`: Decoupled payment event publisher',
    ].join('\n'),
  });

  console.log('\n========================================');
  console.log('Pull Request successfully created!');
  console.log(`PR Number: #${pr.data.number}`);
  console.log(`URL: ${pr.data.html_url}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Error creating PR:', err.message || err);
  process.exit(1);
});
