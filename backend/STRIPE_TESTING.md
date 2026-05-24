# Stripe Integration Testing Guide

This guide walks through every flow our Stripe integration must handle correctly. Run it once after any change to `backend/api/views/billing.py`, the Subscription model, the frontend PricingPage, or any Stripe env var. It assumes test-mode keys and is destructive to local DB state — don't run against production.

## Prerequisites

1. **Stripe CLI** installed and authenticated against your test account: `stripe login`
2. **Test-mode keys** in `backend/.env.dev` — values starting with `sk_test_…` / `pk_test_…`. The six `STRIPE_PRICE_*` env vars must point at real test-mode prices.
3. **Portal default configuration** activated in [dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal) — without this, the Customer Portal session creation in `session_action` fails.
4. **Two browser profiles** so you can stay logged into `/admin/` as the admin while testing as a normal user in a separate session. Mixing the two cookies breaks identity (see edge case 2.7).
5. **Three terminals**:
   ```bash
   # T1 — backend
   cd backend && python manage.py runserver 0.0.0.0:8000

   # T2 — frontend
   cd frontend && npm run dev

   # T3 — Stripe webhook forwarder (note the signing secret it prints,
   # set STRIPE_WEBHOOK_SECRET in .env.dev to that value, then restart T1)
   stripe listen --forward-to localhost:8000/api/billing/webhook
   ```

## How to read this guide

Each scenario lists:
- **Setup** — what state the DB and the test user need to be in
- **Steps** — what to do
- **Expected** — what the DB, Stripe Dashboard, and webhook log should show
- **Reset** — how to return to a clean state for the next test

DB inspection is via `python backend/manage.py shell`:
```python
from api.models import User, Subscription
u = User.objects.get(email="test@example.com")
s = u.subscription
print(u.stripe_customer_id, s.plan_slug, s.stripe_subscription_id,
      s.stripe_price_id, s.cancel_at_period_end,
      s.current_period_start, s.current_period_end, s.actions_used)
```

---

## Section 1 — Happy paths

### 1.1 New subscription (Standard, USD)

**Setup.** A logged-in frontend user with `plan_slug="free"`, `stripe_customer_id=None`, `stripe_subscription_id=None`.

**Steps.**
1. Go to Profile → Pricing.
2. Click "Get Standard".
3. New tab opens with Stripe Checkout for **Standard $3.99/mo USD**.
4. Pay with `4242 4242 4242 4242` / any future date / any CVC.
5. Stripe redirects to the success URL.

**Expected.**
- T3 (`stripe listen`) shows two events in order: `checkout.session.completed` → `invoice.paid`.
- Backend logs: no warnings.
- DB after both events:
  - `user.stripe_customer_id` = `cus_…`
  - `subscription.stripe_subscription_id` = `sub_…`
  - `subscription.stripe_price_id` = the value of `STRIPE_PRICE_STANDARD_USD`
  - `subscription.plan_slug` = `"standard"`
  - `subscription.cancel_at_period_end` = `False`
  - `subscription.current_period_start` and `current_period_end` populated (~31 days apart)
  - `subscription.actions_used` = `0`
- Stripe Dashboard → Customers shows one customer linked to your email.

**Reset.** See Section 4.

### 1.2 Plan switching via the Customer Portal (Standard → Pro)

**Setup.** Complete 1.1 first (user is on Standard).

**Steps.**
1. Click "Get Pro" from Pricing (or any action that fires `session_action` for an already-subscribed user).
2. `session_action` should route to the Billing Portal, not Checkout (because `stripe_subscription_id` is set).
3. In the portal, click "Update plan" → pick Pro → confirm.

**Expected.**
- T3 shows `customer.subscription.updated` followed (almost always) by `invoice.paid` for the prorated amount.
- DB:
  - `plan_slug` flips to `"pro"`.
  - `stripe_price_id` updates to `STRIPE_PRICE_PRO_USD`.
  - `current_period_start` / `current_period_end` may shift (prorated mid-cycle behavior is Stripe-controlled).
  - `cancel_at_period_end` = `False`.
- **Critically:** the customer in Stripe Dashboard is the *same* `cus_…` as 1.1 — no duplicate customer created. This is what `session_action`'s `if user.stripe_customer_id: params["customer"] = …` branch buys you.

### 1.3 Schedule cancellation at period end

**Setup.** User on Pro from 1.2.

**Steps.**
1. Click anything that opens the portal again.
2. Portal → Cancel subscription → "Cancel at end of billing period".

**Expected.**
- T3 shows `customer.subscription.updated`.
- DB: `cancel_at_period_end = True`, `plan_slug` stays `"pro"`, `current_period_end` unchanged.
- User retains Pro access (your access checks should key off `plan_slug`, not `cancel_at_period_end`).

### 1.4 Reactivate a scheduled cancellation

**Setup.** Continue from 1.3.

**Steps.**
1. Portal → "Renew subscription" / "Don't cancel".

**Expected.**
- T3 shows `customer.subscription.updated`.
- DB: `cancel_at_period_end = False`, all other fields unchanged.

### 1.5 Cancellation actually takes effect (period end reached)

**Setup.** User on Pro with `cancel_at_period_end = True` (re-schedule cancellation per 1.3 if needed).

**Steps.** Use a Stripe **test clock** to advance time past `current_period_end` — that's the only way to deterministically trigger this without waiting a month.

PowerShell:
```powershell
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
stripe test_helpers test_clocks create --frozen-time $now
# Note the test-clock ID. Create a NEW customer attached to it via the dashboard
# or `stripe customers create --test-clock <id>` and do a fresh checkout against
# that customer in step 1. Then advance:
$future = [DateTimeOffset]::UtcNow.AddDays(35).ToUnixTimeSeconds()
stripe test_helpers test_clocks advance <id> --frozen-time $future
```

Bash (Linux/macOS):
```bash
stripe test_helpers test_clocks create --frozen-time $(date +%s)
stripe test_helpers test_clocks advance <id> --frozen-time $(date -d "+35 days" +%s)
```

**Expected.**
- T3 shows `customer.subscription.deleted`.
- DB after the event:
  - `subscription.plan_slug` = `"free"`
  - `subscription.stripe_subscription_id` = `None`
  - `subscription.stripe_price_id` = `None`
  - `subscription.cancel_at_period_end` = `False`
  - `user.stripe_customer_id` is still set — by design, so re-subscription reuses the same customer.

### 1.6 Renewal (test clock forward one cycle)

**Setup.** Active subscription on Pro, `actions_used > 0` (use the app a bit to bump it).

**Steps.**

PowerShell:
```powershell
$future = [DateTimeOffset]::UtcNow.AddDays(31).ToUnixTimeSeconds()
stripe test_helpers test_clocks advance <id> --frozen-time $future
```

Bash:
```bash
stripe test_helpers test_clocks advance <id> --frozen-time $(date -d "+31 days" +%s)
```

**Expected.**
- T3 shows `invoice.paid` (and possibly `invoice.payment_succeeded` — handler treats both the same).
- DB:
  - `actions_used` reset to `0`
  - `current_period_start` advanced
  - `current_period_end` advanced
  - `plan_slug` unchanged
  - `cancel_at_period_end` = `False`

### 1.7 Re-subscribe after cancellation

**Setup.** User from 1.5 (free, no stripe_subscription_id, but `stripe_customer_id` still set).

**Steps.** Click "Get Standard" again.

**Expected.**
- `session_action` routes to **Checkout** (not Portal — `stripe_subscription_id` is `None`).
- The session uses `customer = <existing cus_…>`, not `customer_email` — verify by inspecting the new Checkout Session in the Stripe Dashboard.
- After payment, normal 1.1 outcomes apply.

---

## Section 2 — Edge cases

### 2.1 Payment fails on initial subscription (insufficient funds)

**Setup.** Free user, no Stripe customer.

**Steps.** Checkout with card `4000 0000 0000 9995`.

**Expected.**
- `checkout.session.completed` may or may not fire (depending on auth flow). For declined cards, typically Stripe shows an error in Checkout and the user retries.
- If the session completes but payment fails: `invoice.payment_failed` fires (currently `pass`-only — no DB change).
- DB: `plan_slug` should remain `"free"` (no grant). Verify nothing got granted prematurely.
- Stripe Smart Retries kicks off automatically — see 2.2.

### 2.2 Payment fails on renewal (full dunning cycle)

**Setup.** User on Pro from 1.1.

**Steps.**
1. In Stripe Dashboard, edit the customer's payment method to card `4000 0000 0000 0341` (attaches OK, fails on charge).
2. Use test clock to trigger renewal (per 1.6).
3. Advance the clock past Stripe's retry schedule (default ~3 weeks).

**Expected.**
- First renewal attempt: `invoice.payment_failed` fires. DB: `plan_slug` stays `"pro"` (this is the implicit grace period — by design, we don't track `status`). User has full access.
- Subsequent retries: more `invoice.payment_failed` events. Same no-op behavior.
- After Smart Retries gives up: `customer.subscription.deleted`. DB: downgraded to `"free"`, as in 1.5.
- **Verify the grace period behavior matches your product policy.** If you ever need to deny access during dunning, that's when you add the `status` field (we deferred it).

### 2.3 3D Secure / SCA challenge

**Steps.** Checkout with `4000 0027 6000 3184` (always requires authentication). Complete the 3DS prompt in the Checkout UI.

**Expected.** Identical to 1.1 once auth completes. Confirms our flow handles `incomplete` → `active` transitions.

### 2.4 Webhook delivery out of order — `invoice.paid` before `checkout.session.completed`

This is the race the `invoice.paid` email-fallback was built for. Reproduce it manually with `stripe events resend`:

**Setup.** Free user.

**Steps.**
1. Stop the `stripe listen` forwarder (T3).
2. Complete a checkout (1.1 setup) — events queue at Stripe, nothing reaches us yet.
3. Restart `stripe listen`.
4. Identify both event IDs in the dashboard. Use `stripe events resend <invoice.paid_event_id>` *first*, then `stripe events resend <checkout.session.completed_event_id>`.

**Expected.**
- `invoice.paid` arrives first → user lookup by `stripe_customer_id` returns `None` → falls back to `email` lookup (logs: "no user for stripe_customer_id=…, falling back to email") → finds user → back-fills `stripe_customer_id` → grants plan.
- `checkout.session.completed` arrives second → user found (now indexable by either email or customer_id) → re-saves the same IDs (idempotent, no-op).
- Final DB state identical to 1.1.

### 2.5 Webhook retries — idempotency

**Setup.** User on Pro mid-cycle with `actions_used = 7`.

**Steps.** Identify the most recent `invoice.paid` event in the Dashboard. Resend it twice:
```bash
stripe events resend <event_id>
stripe events resend <event_id>
```

**Expected.**
- Both replays return 200.
- DB after both replays: `actions_used` still `7`. The handler's `if subscription.current_period_start != new_period_start:` guard suppresses the reset because the period didn't actually advance.
- `plan_slug`, `stripe_price_id`, period dates unchanged.

### 2.6 Unrecognized price_id (env misconfiguration simulation)

**Setup.** Active subscription on Pro.

**Steps.**
1. Temporarily clear `STRIPE_PRICE_PRO_USD` in `.env.dev`, restart backend.
2. Resend the most recent `invoice.paid` event.

**Expected.**
- `get_plan_type` returns `"free"` (unknown price).
- Backend logs warning: `"invoice.paid: unrecognized price_id=… for customer=…; leaving plan_slug=… unchanged"`.
- DB: `plan_slug` **unchanged** — no accidental downgrade. `stripe_price_id` still updates (it's the source of truth from Stripe regardless).
- Restore the env var and resend the event — DB heals.

### 2.7 Email mismatch (customer email ≠ local user email)

**Setup.** Frontend user with email `alice@example.com`. In Stripe Dashboard, edit the customer to use email `alice+spam@gmail.com`.

**Steps.** Trigger a `checkout.session.completed` for that customer (real checkout or `stripe events resend`).

**Expected.**
- Backend logs warning: `"checkout.session.completed: no user for email=alice+spam@gmail.com (customer=cus_…)"`.
- Response is 200 (no Stripe retry).
- DB: `stripe_customer_id` **not** set locally.
- Manual fix: paste the `cus_…` into `/admin/api/user/<id>/change/` → Stripe section → Save.

### 2.8 Stripe customer deleted out-of-band

**Setup.** Active subscription.

**Steps.**
1. In Stripe Dashboard, delete the customer.
2. Click any "Upgrade" button in your app.

**Expected.**
- `session_action` reads `user.stripe_customer_id` (still set locally), routes to Portal, Stripe returns "No such customer".
- The view raises an unhandled `stripe.error.InvalidRequestError`. Frontend shows the generic error via `parseApiErrorMessage`.
- **Cleanup:** clear both `user.stripe_customer_id` and `subscription.stripe_subscription_id` / `stripe_price_id` / `cancel_at_period_end` via shell or admin. Then the user can re-checkout cleanly. (Stripe doesn't fire `customer.deleted` for our webhook to auto-handle this.)

### 2.9 Two checkout sessions opened simultaneously (double-click race)

**Setup.** Free user.

**Steps.** In the React PricingPage, click "Get Standard" twice in quick succession (or call `session_action` twice from `curl`).

**Expected.**
- Two separate Checkout Sessions are created in Stripe.
- Frontend's per-card `loadingSlug` should disable the second click — verify this guard works in browser dev tools.
- Worst case: user completes only one session; the other expires harmlessly after ~24h.

### 2.10 Webhook signature mismatch

**Setup.** Backend running with `STRIPE_WEBHOOK_SECRET` set.

**Steps.** From a separate terminal:
```bash
curl -X POST http://localhost:8000/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=0,v1=baadf00d" \
  -d '{"id":"evt_test","type":"invoice.paid","data":{"object":{}}}'
```

**Expected.**
- Response 200 with `{"success": false}` body (per current handler when signature verification fails).
- Backend logs: `"⚠️  Webhook signature verification failed."`.
- No DB change.

### 2.11 Cleared CSRF token on `session_action`

**Setup.** Logged-in user.

**Steps.** From browser dev tools, delete the CSRF cookie, then click "Upgrade".

**Expected.**
- Response 403 from `CookieJWTAuthentication._enforce_csrf`.
- Frontend shows the parsed error message.
- No Stripe call made.

### 2.12 Invalid `session_action` body

| Body | Expected response |
|---|---|
| `{}` (no plan_slug) | 400 `{"error":"invalid_plan_slug"}` |
| `{"plan_slug":"free"}` | 400 `{"error":"invalid_plan_slug"}` |
| `{"plan_slug":"enterprise"}` | 400 `{"error":"invalid_plan_slug"}` |
| `{"plan_slug":"standard","currency":"JPY"}` | 200 — `normalize_currency` falls back to USD |
| `{"plan_slug":"standard"}` (no currency) | 200 — defaults to USD |
| Not authenticated | 401 from DRF's `IsAuthenticated` |

### 2.13 Database/Stripe state drift

After any of 2.7, 2.8, or a failed migration, the local DB can drift from Stripe's view. Periodic sanity check via shell:
```python
import stripe
from api.models import User
stripe.api_key = "sk_test_…"  # or read from env
for u in User.objects.exclude(stripe_customer_id=None):
    try:
        c = stripe.Customer.retrieve(u.stripe_customer_id)
        if c.get("deleted"):
            print(f"DRIFT: {u.email} points to a deleted Stripe customer")
    except stripe.error.InvalidRequestError:
        print(f"DRIFT: {u.email} stripe_customer_id={u.stripe_customer_id} not found in Stripe")
```

---

## Section 3 — Where to focus regression testing

When changing any of these files, re-run the listed sections:

| File changed | Re-run sections |
|---|---|
| `backend/api/views/billing.py` — any webhook handler | 1.1, 1.2, 1.5, 1.6, 2.4, 2.5, 2.6 |
| `backend/api/views/billing.py` — `session_action` | 1.1, 1.2, 1.7, 2.8, 2.11, 2.12 |
| `backend/api/models/subscription.py` — fields/migrations | 1.1, 1.2, 1.5, 1.6 (after `manage.py migrate`) |
| `backend/api/plans.py` — `get_plan_type` / prices | 1.1 in each currency, 2.6 |
| `frontend/src/pages/.../PricingPage.tsx` | 1.1, 1.7, 2.9, 2.11 |
| Stripe Dashboard portal config | 1.2, 1.3, 1.4 |
| `.env.dev` Stripe vars | 1.1, 2.6 |

---

## Section 4 — Cleanup / reset between tests

```python
# In manage.py shell
from api.models import User, Subscription
u = User.objects.get(email="test@example.com")
u.stripe_customer_id = None
u.save(update_fields=["stripe_customer_id", "updated_at"])

s = u.subscription
s.plan_slug = "free"
s.stripe_subscription_id = None
s.stripe_price_id = None
s.cancel_at_period_end = False
s.actions_used = 0
s.save()
```

Then in the Stripe Dashboard, delete the test customer if you want a fully clean Stripe-side state.

---

## Appendix A — Stripe test cards (memorize these)

| Card | Behavior |
|---|---|
| `4242 4242 4242 4242` | Succeeds — your default happy-path card |
| `4000 0000 0000 9995` | Declines: insufficient funds |
| `4000 0000 0000 0002` | Declines: generic |
| `4000 0000 0000 0341` | Attaches successfully, fails on charge (use to simulate dunning) |
| `4000 0027 6000 3184` | Always requires 3D Secure authentication |
| `4000 0025 0000 3155` | 3D Secure required on first transaction only |

Any future expiration date, any 3-digit CVC, any postal code.

## Appendix B — Useful Stripe CLI commands

```bash
# Forward webhooks to local backend
stripe listen --forward-to localhost:8000/api/billing/webhook

# Trigger a specific event (with synthetic test data)
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Replay a real event (uses the stored payload from a past event)
stripe events resend <event_id>

# Test clocks for time-travel testing of renewals / cancellations
# PowerShell:
#   $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
#   stripe test_helpers test_clocks create --frozen-time $now
#   $future = [DateTimeOffset]::UtcNow.AddDays(31).ToUnixTimeSeconds()
#   stripe test_helpers test_clocks advance <id> --frozen-time $future
# Bash:
stripe test_helpers test_clocks create --frozen-time $(date +%s)
stripe test_helpers test_clocks advance <id> --frozen-time $(date -d "+31 days" +%s)
```

## Appendix C — When to write unit tests vs. run this guide

This guide is for **end-to-end integration testing** — it requires Stripe to be involved. For **handler-level edge cases** (idempotency, unknown price_id, email-mismatch logging), unit tests with synthetic Stripe payloads are faster and CI-runnable. The natural test file is `backend/api/tests/test_billing_webhooks.py` — none exists yet; that's the next big test-coverage win.
