from django.http import HttpResponse
from django.template import loader

from api.plans import PLANS, SUPPORTED_CURRENCIES


def index(request):
    template = loader.get_template('../templates/landing-page/index.html')
    return HttpResponse(template.render({}, request))


_CURRENCY_SYMBOLS = {"USD": "$", "CAD": "CA$", "EUR": "€"}


def _format_price(minor_units: int, currency: str) -> str:
    if minor_units == 0:
        return "Free"
    symbol = _CURRENCY_SYMBOLS.get(currency, currency)
    return f"{symbol}{minor_units / 100:.2f}"


def payments(request):
    template = loader.get_template('../templates/landing-page/payments.html')
    plans_view = [
        {
            "slug": slug,
            "name": plan["name"],
            "prices": plan["prices"],
            "default_price": _format_price(plan["prices"]["USD"], "USD"),
            "action_limit": plan["action_limit"],
            "history_limit": plan["history_limit"],
            "character_limit": plan["character_limit"],
            "payment_url": plan["payment_url"],
        }
        for slug, plan in PLANS.items()
    ]
    context = {
        "plans": plans_view,
        "currencies": SUPPORTED_CURRENCIES,
        "default_currency": "USD",
    }
    return HttpResponse(template.render(context, request))
