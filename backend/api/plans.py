PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "currency": "usd",
        "billing_interval": "monthly",
        "summary_limit": 2,
        "history_limit": 1

    },
    "standard": {
        "name": "Standard",
        "price": 199,  # cents
        "currency": "usd",
        "billing_interval": "monthly",
        "summary_limit": 300,
        "history_limit": 5

    },
    "pro": {
        "name": "Pro",
        "price": 999,
        "currency": "usd",
        "billing_interval": "monthly",
        "summary_limit": None,
        "history_limit": 10

    },
}

def get_plan(slug: str) -> dict:
    if slug not in PLANS:
        raise ValueError(f"Unknown plan: {slug}")
    return PLANS[slug]

def get_summary_limit(slug: str) -> int | None:
    return get_plan(slug)["summary_limit"]

def get_history_limit(slug: str) -> int | None:
    return get_plan(slug)["history_limit"]

