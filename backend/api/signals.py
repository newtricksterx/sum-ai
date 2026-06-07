from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models.subscription import Subscription
from api.models.user import User


@receiver(post_save, sender=User)
def set_subscription_on_user_create(
    sender,
    instance: User,
    created: bool,
    raw: bool,
    **kwargs,
) -> None:
    # this will do nothing if data is not serialized or isn't a created user.
    if raw or not created:
        return

    Subscription.ensure_for_user(instance)
