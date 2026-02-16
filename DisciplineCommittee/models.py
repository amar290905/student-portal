from django.db import models
from django.conf import settings
from django.utils import timezone


class Teacher(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.email

class UniformViolation(models.Model):
    usn = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    year = models.CharField(max_length=10)
    department = models.CharField(max_length=50)
    date = models.DateField()
    prior_count = models.IntegerField()
    violations = models.TextField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usn} - Uniform Violation"


class Case(models.Model):
    CASE_TYPES = [
        ("Late Arrival", "Late Arrival"),
        ("Academic Misconduct", "Academic Misconduct"),
        ("Uniform Violation", "Uniform Violation"),
        ("Other", "Other"),
    ]

    # Student details
    usn = models.CharField(max_length=20)
    student_name = models.CharField(max_length=100)
    year = models.CharField(max_length=20)
    department = models.CharField(max_length=50)

    # Case details
    case_type = models.CharField(max_length=50, choices=CASE_TYPES)
    date = models.DateField()
    description = models.TextField(blank=True)

    # 🔑 Teacher who created the case
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cases"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_name} - {self.case_type}"


class Student(models.Model):
    usn = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    department = models.CharField(max_length=50)
    year = models.CharField(max_length=10)
    password = models.CharField(max_length=100)  

    def __str__(self):
        return self.usn



class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    usn = models.CharField(max_length=64, unique=True)
    full_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    course = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Student {self.usn} ({self.full_name})"


class TeacherProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    employee_id = models.CharField(max_length=64, unique=True)
    full_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Teacher {self.employee_id} ({self.full_name})"


class Activity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} — {self.action} @ {self.timestamp.isoformat()}"
