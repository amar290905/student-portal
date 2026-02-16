from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='home'),
    
    # Student URLs
    path("student-login/", views.student_login, name="student_login"),
    path('student/logout/', views.student_logout, name='student_logout'),
    path('student/register/', views.student_register, name='student_register'),
    path('student/forgot-password/', views.student_forgot_password, name='student_forgot_password'),
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),

    # Teacher URLs
    path("teacher/login/", views.teacher_login, name="teacher_login"),
    path("teacher/register/", views.teacher_register, name="teacher_register"),
    path("teacher/forgot-password/", views.teacher_forgot_password, name="teacher_forgot_password"),
    path('teacher-dashboard/', views.teacher_dashboard, name='teacher_dashboard'),
    
    # Case URLs
    path("cases/late/", views.case_late, name="case_late"),
    path("cases/add/", views.add_case, name="add_case"),
    path('add-cases/', views.add_case, name='add_case'),
    path('cases/academic-misconduct/', views.academic_misconduct, name='case_academic'),
    path("cases/uniform-violations/", views.uniform_violations, name="uniform_violations"),
    path('cases/others/', views.other_cases, name='case_others'),
    
    # Committee URLs
    path('committee/', views.discipline_page, name='committee'),

    # API endpoints for student auth/profile
    path("api/get-student/", views.get_student, name="get_student"),
    path('api/student/register/', views.api_student_register, name='api_student_register'),
    path('api/student/login/', views.api_student_login, name='api_student_login'),
    path('api/student/profile/', views.api_get_profile, name='api_get_profile'),
    path('api/student/profile/update/', views.api_update_profile, name='api_update_profile'),
    path('api/logout/', views.api_logout, name='api_logout'),
]
