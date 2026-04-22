Place your TLS certificate files here for production compose:
- fullchain.pem
- privkey.pem

Notes:
- Production uses `nginx/nginx.conf` (HTTPS, requires these files).
- Development uses `nginx/nginx.dev.conf` (HTTP, no cert files required).

Example (LetsEncrypt):
cp /etc/letsencrypt/live/<your-domain>/fullchain.pem ./nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/<your-domain>/privkey.pem ./nginx/certs/privkey.pem
