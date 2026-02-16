from django.contrib import admin
from .models import StudentProfile, TeacherProfile, Activity,Student,Case


admin.site.register(Case)
admin.site.register(Student)

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('usn', 'full_name', 'phone', 'course', 'created_at')
    search_fields = ('usn', 'full_name', 'phone')


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'full_name', 'department', 'phone', 'created_at')
    search_fields = ('employee_id', 'full_name')


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp')
    search_fields = ('user__username', 'action')
    list_filter = ('timestamp',)    
