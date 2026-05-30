# Security Best Practices Report (Backend)

Generated: 2026-05-30

## Executive Summary

The backend has improved since the previous report: cookie-based JWT requests now enforce CSRF on unsafe methods, PDF uploads have an application size guard, Stripe webhooks verify signatures, and production settings fail closed for missing `SECRET_KEY`, `ALLOWED_HOSTS`, CORS origins, and CSRF trusted origins.

The main concerns I found are security-sensitive artifacts and patch posture: SQLite database files are tracked in Git, Django is pinned to an unsupported/outdated release series, and two pinned dependencies have published security fixes above the current versions. I also found rate-limit and deployment hardening gaps that are worth addressing before relying on this in production.

## High Findings

### SEC-001: SQLite database and backup files are tracked in Git

- Rule ID: `GENERAL-SECRETS-001`, `DJANGO-LOG-001`
- Severity: High, Critical if the database contains real users, OAuth/social account rows, sessions, API tokens, or billing identifiers
- Location:
  - `backend/db.sqlite3` (binary database file; tracked by Git)
  - `backend/db.sqlite3.bak-20260423-171910` (binary database backup; tracked by Git)
  - `backend/db.sqlite3.bak-20260524-013843` (binary database backup; tracked by Git)
  - `.gitignore:1` through `.gitignore:3`
  - `backend/.dockerignore:6`
- Evidence:
  - `git ls-files -- backend/db.sqlite3 backend/db.sqlite3.bak-20260423-171910 backend/db.sqlite3.bak-20260524-013843` lists all three files.
  - `.gitignore` ignores `.env` files but does not ignore SQLite database artifacts.
  - `backend/.dockerignore:6` ignores `*.sqlite3` for Docker builds, but this does not protect Git history.
- Impact: Anyone with repository access can inspect the database contents from the current tree and potentially from Git history. If these files ever held real user data, session/auth tables, social login metadata, Stripe identifiers, or admin accounts, that data should be treated as exposed.
- Fix:
  - Add SQLite database patterns to `.gitignore`, for example `*.sqlite3` and `*.sqlite3.bak-*`.
  - Remove the files from Git tracking with `git rm --cached` and replace them with a documented local-dev setup path.
  - If this repository has been pushed or shared, purge the files from history and rotate any credentials, sessions, tokens, or test accounts represented in those databases.
- Mitigation: Until history is cleaned, restrict repository access and avoid copying the repo into environments where the database files can be served or archived.
- False-positive notes: If these databases are fully synthetic and the repo has never left your machine, the immediate impact is lower, but keeping them tracked is still a sharp edge.

### SEC-002: Django is pinned to an unsupported and outdated release

- Rule ID: `DJANGO-SUPPLY-001`
- Severity: High
- Location: `backend/requirements.txt:21`
- Evidence:
  - `backend/requirements.txt:21` pins `Django==5.1.7`.
  - Django's official download page currently lists supported releases as `5.2 LTS 5.2.14` and `6.0 6.0.5`, while `5.1` is listed under unsupported previous releases with latest `5.1.15`.
- Impact: The application is behind multiple Django patch releases and is on a release series that no longer receives security updates. Future Django security fixes will not be released for 5.1, and known post-5.1.7 fixes are absent.
- Fix:
  - Upgrade to Django `5.2.x LTS` as the conservative path, or `6.0.x` if dependencies support it.
  - Run the Django test suite and `manage.py check --deploy` under the production settings after upgrading.
- Mitigation: If an immediate framework upgrade is blocked, at minimum move to the latest 5.1 patch while planning the supported-series upgrade, but treat that as temporary because 5.1 is unsupported.
- False-positive notes: This is not tied to one directly exploitable code path in this repo; it is patch posture risk.

## Medium Findings

### SEC-003: Pinned dependencies include versions with published security fixes

- Rule ID: `DJANGO-SUPPLY-001`
- Severity: Medium
- Location:
  - `backend/requirements.txt:74`
  - `backend/requirements.txt:76`
- Evidence:
  - `backend/requirements.txt:74` pins `requests==2.32.3`; the Requests advisory for CVE-2024-47081 lists affected versions `<2.32.4` and patched version `2.32.4`.
  - `backend/requirements.txt:76` pins `setuptools==78.0.1`; the setuptools advisory for CVE-2025-47273 lists affected versions `<78.1.1` and patched versions `>=78.1.1`.
- Impact: The direct runtime impact depends on how these packages are used. `requests` can leak `.netrc` credentials for maliciously crafted URLs in affected versions. `setuptools` is mostly a build/install surface here, but the advisory impact includes arbitrary file write in vulnerable flows.
- Fix:
  - Upgrade `requests` to at least `2.32.4`, preferably the current compatible patch.
  - Upgrade `setuptools` to at least `78.1.1`, preferably the current compatible patch.
  - Add dependency scanning such as `pip-audit` or Dependabot/Safety in CI.
- Mitigation: Avoid `.netrc` credential use in runtime containers and avoid invoking legacy setuptools/easy_install flows against untrusted package indexes.
- False-positive notes: I did not run a full dependency vulnerability scan because Python is not installed in this local shell environment.

### SEC-004: Authenticated AI and billing endpoints lack clear burst throttling

- Rule ID: `GENERAL-DOS-001`
- Severity: Medium
- Location:
  - `backend/api/views/actionitem.py:109` through `backend/api/views/actionitem.py:112`
  - `backend/api/views/billing.py:110` through `backend/api/views/billing.py:112`
  - `backend/backend/settings.py:229` through `backend/backend/settings.py:238`
- Evidence:
  - `ActionItem` sets `throttle_classes = [AnonRateThrottle]`, which throttles anonymous users but not authenticated users.
  - The billing checkout view is authenticated but does not declare a throttle scope.
  - Settings define DRF `ScopedRateThrottle` rates, including `auth: 1/sec`, but scoped throttling only applies to views with a matching `throttle_scope`.
- Impact: A valid or stolen authenticated account can burst expensive LLM requests or repeatedly hit billing/session logic faster than intended. Quotas cap monthly usage, but they do not smooth concurrency, cost spikes, or availability pressure.
- Fix:
  - Add an authenticated-user throttle to `ActionItem`, for example DRF `UserRateThrottle` or `ScopedRateThrottle` with an explicit scope.
  - Add a throttle scope to `billing/checkout-session`, tuned for low-frequency account actions.
  - Consider a queue/concurrency guard around LLM calls if bursts can overwhelm Gemini, Gunicorn workers, or the database.
- Mitigation: Monitor per-user request bursts and temporarily lower Gunicorn concurrency or plan quotas if abuse appears.
- False-positive notes: Monthly quotas and Stripe idempotency reduce financial risk, but they do not replace per-second rate limiting.

### SEC-005: Production TLS/proxy assumptions need explicit verification

- Rule ID: `DJANGO-PROXY-001`, `DJANGO-HTTPS-001`
- Severity: Medium
- Location:
  - `backend/backend/settings.py:148` through `backend/backend/settings.py:154`
  - `nginx/nginx.conf:4` through `nginx/nginx.conf:7`
  - `nginx/nginx.conf:22` through `nginx/nginx.conf:27`
  - `nginx/nginx.conf:33` through `nginx/nginx.conf:39`
  - `docker-compose.prod.yml:88` through `docker-compose.prod.yml:94`
- Evidence:
  - Django conditionally trusts `X-Forwarded-Proto` when `TRUST_X_FORWARDED_PROTO=True`.
  - The production nginx config listens on port `80` and unconditionally sends `X-Forwarded-Proto https` to Django.
  - The production compose file publishes only `80:80`; TLS termination and HTTP-to-HTTPS redirects are not visible in this repo.
- Impact: If an AWS load balancer, CloudFront distribution, or other edge proxy is not enforcing HTTPS and preventing direct HTTP access, Django can treat plain HTTP requests as secure and skip its own HTTPS redirect logic. That undermines the assumptions behind secure cookies, CSRF referer checks, and URL generation.
- Fix:
  - Document the production edge: where TLS terminates, where HTTP redirects to HTTPS, and which component strips and sets forwarded headers.
  - Ensure direct public traffic cannot reach nginx/backend except through the trusted TLS-terminating edge.
  - If nginx itself receives both HTTP and HTTPS, use the real scheme or split server blocks instead of hardcoding `X-Forwarded-Proto https`.
- Mitigation: Add a deployment smoke test that verifies `http://readtorecall.com` redirects to HTTPS and that the app is not reachable directly over plain HTTP from the internet.
- False-positive notes: This may already be handled by AWS or another edge layer; it is not visible in the repository.

## Low Findings

### SEC-006: No Content Security Policy is visible in app or nginx config

- Rule ID: `DJANGO-CSP-001`
- Severity: Low
- Location:
  - `backend/backend/settings.py` (no CSP settings found)
  - `nginx/nginx.conf:9` through `nginx/nginx.conf:10`
- Evidence:
  - The app sets `X-Content-Type-Options` and `Referrer-Policy`, but no `Content-Security-Policy` header was found in Django settings or nginx.
- Impact: CSP is defense-in-depth for landing pages, OAuth completion pages, and any future user-controlled rendering. Without it, an XSS bug has fewer browser-side constraints.
- Fix:
  - Add a CSP at nginx or via Django middleware/package. Start report-only if needed.
  - Prioritize a realistic `script-src` and avoid broad `unsafe-inline` where possible.
- Mitigation: Keep Django template autoescaping on and avoid `|safe`, `mark_safe`, and untrusted HTML rendering.
- False-positive notes: CSP may be configured at an external CDN or load balancer; verify there if applicable.

## Positive Findings

- CSRF middleware is enabled in `backend/backend/settings.py:91` through `backend/backend/settings.py:100`.
- Cookie JWT auth enforces CSRF on unsafe methods when the JWT comes from a cookie in `backend/api/authentication.py:20` through `backend/api/authentication.py:40`.
- Logout and refresh manually validate CSRF despite `authentication_classes = []` in `backend/api/views/auth.py:94` through `backend/api/views/auth.py:180`.
- Social auth redirect validation uses `url_has_allowed_host_and_scheme` in `backend/api/views/auth.py:192` through `backend/api/views/auth.py:205`.
- Stripe webhooks are CSRF-exempt only after replacing CSRF with Stripe signature verification in `backend/api/views/billing.py:51` through `backend/api/views/billing.py:74`.
- PDF upload size is checked before reading the file in `backend/scripts/sources/pdf.py:21` through `backend/scripts/sources/pdf.py:31`, and nginx also sets `client_max_body_size 10m` in `nginx/nginx.conf:7`.
- Production compose uses Gunicorn rather than Django `runserver` in `docker-compose.prod.yml:14` through `docker-compose.prod.yml:28`.

## Verification Notes

- I could not run `manage.py check --deploy` because neither `python` nor `py` is available in this local shell environment.
- I did not run a live dependency scanner for the same reason; dependency findings above are from static requirements plus official advisory/version references.
- I intentionally did not print or include secret values from `.env.dev` or `.env.prod`. Those files are ignored by Git according to `.gitignore:1` through `.gitignore:3`, but they still contain production-sensitive values locally, so keep them out of backups and shared archives.

## External References

- Django download/supported versions page, accessed 2026-05-30: https://www.djangoproject.com/download/
- Requests advisory CVE-2024-47081: https://github.com/psf/requests/security/advisories/GHSA-9hjg-9r4m-mvj7
- setuptools advisory CVE-2025-47273: https://github.com/pypa/setuptools/security/advisories/GHSA-5rjg-fvgr-3xxf
