PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "currency": "usd",
        "billing_interval": "daily",
        "summary_limit": 3,
        "history_limit": 3,
        "character_limit": 10000,

    },
    "standard": {
        "name": "Standard",
        "price": 199,  # cents
        "currency": "usd",
        "billing_interval": "monthly",
        "summary_limit": 300,
        "history_limit": 5,
        "character_limit": 30000,

    },
    "pro": {
        "name": "Pro",
        "price": 999,
        "currency": "usd",
        "billing_interval": "monthly",
        "summary_limit": None,
        "history_limit": 10,
        "character_limit": None

    },
}

# Note: slug is the tier plan "free, standard, pro"

def get_plan(slug: str) -> dict:
    if slug not in PLANS:
        raise ValueError(f"Unknown plan: {slug}1")
    return PLANS[slug]

def get_summary_limit(slug: str) -> int | None:
    return get_plan(slug)["summary_limit"]

def get_history_limit(slug: str) -> int | None:
    return get_plan(slug)["history_limit"]

def get_character_limit(slug: str) -> int | None:
    return get_plan(slug)["character_limit"]

def get_billing_interval(slug: str) -> str:
    return get_plan(slug)["billing_interval"]

