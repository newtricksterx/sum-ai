from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import PendingCheckoutSession, ProcessedStripeEvent


class Command(BaseCommand):
    help = (
        "Deletes stale database rows: ProcessedStripeEvent older than "
        "--days (default 90) and PendingCheckoutSession past expires_at."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Delete ProcessedStripeEvent rows older than this many days (default: 90).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show counts without deleting anything.",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]
        now = timezone.now()

        cutoff = now - timedelta(days=days)
        events_qs = ProcessedStripeEvent.objects.filter(processed_at__lt=cutoff)
        events_count = events_qs.count()

        if dry_run:
            self.stdout.write(
                f"[dry-run] Would delete {events_count} ProcessedStripeEvent "
                f"rows older than {days} days."
            )
        else:
            deleted, _ = events_qs.delete()
            self.stdout.write(f"Deleted {deleted} ProcessedStripeEvent rows older than {days} days.")

        expired_qs = PendingCheckoutSession.objects.filter(expires_at__lt=now)
        expired_count = expired_qs.count()

        if dry_run:
            self.stdout.write(
                f"[dry-run] Would delete {expired_count} expired "
                f"PendingCheckoutSession rows."
            )
        else:
            deleted, _ = expired_qs.delete()
            self.stdout.write(f"Deleted {deleted} expired PendingCheckoutSession rows.")
