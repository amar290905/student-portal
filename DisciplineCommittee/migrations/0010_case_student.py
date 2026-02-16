# Generated migration for Case.student field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('DisciplineCommittee', '0009_student_password'),
    ]

    operations = [
        migrations.AlterField(
            model_name='case',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_cases', to='auth.user'),
        ),
        migrations.AddField(
            model_name='case',
            name='student',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cases', to='DisciplineCommittee.student'),
        ),
    ]
