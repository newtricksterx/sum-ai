# Security Best Practices Report (Backend)

## Executive summary

The backend already follows several strong Django defaults (strict `ALLOWED_HOSTS` validation in production mode, `SecurityMiddleware`, password validators, secure cookie flags, open-redirect validation for social auth).  
The primary gap is CSRF coverage for cookie-based JWT authentication on unsafe API endpoints. I also found two medium-risk hardening issues around file upload handling and proxy trust configuration.

---

## Critical findings

### SEC-001: Cookie-authenticated unsafe API endpoints are missing CSRF enforcement
- Rule ID: `DJANGO-CSRF-001`
- Severity: Critical
- Location:
  - `backend/backend/settings.py:224` (`DEFAULT_AUTHENTICATION_CLASSES` uses `CookieJWTAuthentication`)
  - `backend/api/authentication.py:22` (auth accepts JWT from cookie without CSRF validation)
  - `backend/api/views/actionitem.py:106` (`POST` state-changing endpoint, no CSRF check)
  - `backend/api/views/auth.py:243` (`CreateUserView` admin `POST`, no CSRF check)
  - `backend/api/views/core.py:54` (`AdminUserSubscriptionView.patch`, no CSRF check)
- Evidence:
  - Cookie JWT is enabled globally as default DRF auth.
  - The custom auth class reads `request.COOKIES` and authenticates immediately.
  - CSRF validation is implemented manually only for logout/refresh (`backend/api/views/auth.py:107`, `backend/api/views/auth.py:145`), not for other unsafe endpoints.
  - Auth cookie is explicitly cross-site: `AUTH_COOKIE_SAMESITE = 'None'` (`backend/backend/settings.py:240`).
- Impact: A malicious site can trigger authenticated cross-site requests from a logged-in user’s browser, including privileged/admin operations.
- Fix:
  - Enforce CSRF on all unsafe requests that authenticate via cookie JWT (e.g., enforce in `CookieJWTAuthentication` when cookie path is used, or add a shared unsafe-method CSRF guard used by all relevant views).
  - Keep `AUTH_COOKIE_SAMESITE='None'` only if truly required for product flows; otherwise prefer `Lax`.
  - Add tests that `POST/PATCH/DELETE` endpoints reject requests without valid CSRF when JWT cookie auth is used.
- Mitigation (short-term):
  - Restrict risky endpoints while implementing CSRF enforcement.
  - Reduce cookie exposure window (short TTLs already help, but are not a CSRF control).
- False-positive notes:
  - If some clients use Authorization headers only, CSRF risk is reduced for those clients, but cookie-authenticated flows remain exposed.

---

## Medium findings

### SEC-002: PDF upload extraction reads full file into memory without explicit size guard
- Rule ID: `DJANGO-UPLOAD-001`
- Severity: Medium
- Location: `backend/scripts/sources/pdf.py:21`
- Evidence:
  - `data = pdf_file.read()` loads the entire uploaded PDF in one call.
- Impact: Large or crafted uploads can increase memory pressure and lead to DoS conditions.
- Fix:
  - Enforce explicit max file size before reading.
  - Prefer chunked handling / streaming where possible.
  - Backstop with web-server upload limits and Django upload-size settings.
- Mitigation:
  - Keep strict rate limits on this endpoint while size validation is added.
- False-positive notes:
  - Infra-level limits may already exist, but they are not visible in app code.

### SEC-003: `SECURE_PROXY_SSL_HEADER` is trusted unconditionally in app settings
- Rule ID: `DJANGO-PROXY-001`
- Severity: Medium
- Location: `backend/backend/settings.py:142`
- Evidence:
  - `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` is always set.
- Impact: If the app is ever reachable without a trusted proxy that strips/sets forwarded headers correctly, request security context can be spoofed.
- Fix:
  - Gate this setting by environment where proxy behavior is guaranteed, and document proxy stripping requirements.
  - Validate deployment so only trusted edge/proxy can reach Django directly.
- Mitigation:
  - Network restrict direct app access to proxy/internal sources.
- False-positive notes:
  - If your ingress strictly strips client-provided forwarded headers and injects its own, this may be acceptable.

---

## Low findings

### SEC-004: No CSP configuration observed in application settings
- Rule ID: `DJANGO-CSP-001`
- Severity: Low
- Location: `backend/backend/settings.py` (no `SECURE_CSP*` settings found)
- Evidence:
  - No CSP-related Django settings detected in repo scan.
- Impact: Lower defense-in-depth against XSS/content injection compared with a hardened CSP posture.
- Fix:
  - Add a CSP policy (start report-only, then enforce).
  - At minimum, define a strict `script-src`.
- Mitigation:
  - If CSP is set at CDN/reverse proxy, document and test it.
- False-positive notes:
  - CSP may be configured at the edge and therefore not visible in application code.

---

## What already aligns well

- Production guardrails for `SECRET_KEY` and `ALLOWED_HOSTS` are present (`backend/backend/settings.py:44`, `backend/backend/settings.py:55`).
- `SecurityMiddleware` and `CsrfViewMiddleware` are enabled (`backend/backend/settings.py:91`, `backend/backend/settings.py:94`).
- Open redirect prevention exists in social auth bridge (`backend/api/views/auth.py:200`).
- Production Docker entrypoint uses Gunicorn, not `runserver` (`backend/Dockerfile.prod`).

---

## Notes

- I attempted `python manage.py check --deploy`, but it could not run in this environment because dependencies are missing (`ModuleNotFoundError: allauth`).
