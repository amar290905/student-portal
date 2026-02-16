from django.core.management.base import BaseCommand
from DisciplineCommittee.models import Case

class Command(BaseCommand):
    help = 'Remove all complaints/cases from the database'

    def handle(self, *args, **options):
        count, _ = Case.objects.all().delete()
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {count} complaint(s)')
        )
