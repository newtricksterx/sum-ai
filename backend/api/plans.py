DEFAULT_CURRENCY = "USD"
SUPPORTED_CURRENCIES = ("USD", "CAD", "EUR")
EURO_CURRENCY_ALIAS = "EURO"


PLANS = {
    "free": {
        "name": "Free",
        "prices": {
            "USD": 0,
            "CAD": 0,
            "EUR": 0,
        },
        "billing_interval": "daily",
        "summary_limit": 3,
        "history_limit": 3,
        "character_limit": 10000,
    },
    "standard": {
        "name": "Standard",
        "prices": {
            "USD": 199,
            "CAD": 299,
            "EUR": 199,
        },
        "billing_interval": "monthly",
        "summary_limit": 300,
        "history_limit": 5,
        "character_limit": 30000,
    },
    "pro": {
        "name": "Pro",
        "prices": {
            "USD": 999,
            "CAD": 1399,
            "EUR": 999,
        },
        "billing_interval": "monthly",
        "summary_limit": None,
        "history_limit": 10,
        "character_limit": None,
    },
}


def normalize_currency(currency: str | None) -> str:
    if currency is None:
        return DEFAULT_CURRENCY

    normalized_currency = currency.strip().upper()
    if not normalized_currency:
        return DEFAULT_CURRENCY

    if normalized_currency == EURO_CURRENCY_ALIAS:
        return "EUR"

    if normalized_currency in SUPPORTED_CURRENCIES:
        return normalized_currency

    return DEFAULT_CURRENCY


# Note: slug is the tier plan "free, standard, pro"
def get_plan(slug: str) -> dict:
    if slug not in PLANS:
        raise ValueError(f"Unknown plan: {slug}")
    return PLANS[slug]


def get_summary_limit(slug: str) -> int | None:
    return get_plan(slug)["summary_limit"]


def get_history_limit(slug: str) -> int | None:
    return get_plan(slug)["history_limit"]


def get_character_limit(slug: str) -> int | None:
    return get_plan(slug)["character_limit"]


def get_billing_interval(slug: str) -> str:
    return get_plan(slug)["billing_interval"]


def get_price_currency(slug: str, currency: str | None = None) -> str:
    normalized_currency = normalize_currency(currency)
    prices = get_plan(slug)["prices"]
    if normalized_currency in prices:
        return normalized_currency
    if DEFAULT_CURRENCY in prices:
        return DEFAULT_CURRENCY
    return next(iter(prices.keys()))


def get_price_minor(slug: str, currency: str | None = None) -> int:
    prices = get_plan(slug)["prices"]
    resolved_currency = get_price_currency(slug, currency)
    return int(prices[resolved_currency])

