class NoIndexPrivatePagesMiddleware:
    """Add crawler noindex headers to auth and checkout status pages."""

    NOINDEX_PATH_PREFIXES = (
        "/accounts/",
        "/billing/",
        "/api/auth/social/complete",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = getattr(request, "path_info", request.path)
        if any(path.startswith(prefix) for prefix in self.NOINDEX_PATH_PREFIXES):
            response["X-Robots-Tag"] = "noindex, nofollow"
        return response
