Place your TLS certificate files here for production compose:
- fullchain.pem
- privkey.pem

Notes:
- Production uses `nginx/nginx.conf` (HTTPS, requires these files).
- Development uses `nginx/nginx.dev.conf` (HTTP, no cert files required).

Example (LetsEncrypt):
cp /etc/letsencrypt/live/<your-domain>/fullchain.pem ./nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/<your-domain>/privkey.pem ./nginx/certs/privkey.pem

Local smoke test (no real domain, Git Bash on Windows):

  MSYS_NO_PATHCONV=1 openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:super-summarizer.ddns.net,IP:127.0.0.1" \
    -keyout nginx/certs/privkey.pem \
    -out  nginx/certs/fullchain.pem

The MSYS_NO_PATHCONV=1 prefix is required on Git Bash so MSYS does not rewrite
the /CN=... subject as a Windows path. Browsers will warn (untrusted CA);
curl needs -k. Replace with the LetsEncrypt files above for the real deploy.

Trap: if these two paths do not exist as files when `docker compose up` runs,
Docker silently creates them as empty directories on the host and nginx then
fails with "PEM_read_bio_X509_AUX() failed ... no start line". Always check
`file nginx/certs/*.pem` reports PEM, not directory, before bringing up.
