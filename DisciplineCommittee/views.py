from urllib import request
from django.shortcuts import render,redirect
from django.http import HttpResponseRedirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User,auth
from django.contrib.auth.decorators import login_required
from django.utils import timezone
import json
from django.contrib import messages
from .models import Student
from django.contrib.auth.hashers import make_password, check_password
from .models import Teacher
from .models import StudentProfile, TeacherProfile, Activity
from .models import Case
from django.http import HttpResponse
from .models import UniformViolation
from django.contrib.auth import logout

# Simple views to render static templates

def index(request):
    return render(request, 'index.html')


def case_late(request):
    if request.method == "POST":
        print(request.POST)  # 👈 DEBUG
        usn = request.POST.get("usn")
        # Try to get the student object for proper linking
        student_obj = None
        try:
            student_obj = Student.objects.get(usn=usn)
        except Student.DoesNotExist:
            pass
        
        Case.objects.create(
            case_type="Late Arrival",
            usn=usn,
            student_name=request.POST.get("name"),
            year=request.POST.get("year"),
            department=request.POST.get("department"),
            description=request.POST.get("reason", "").strip(),
            date=request.POST.get("date"),
            created_by=request.user
        )
        return redirect("teacher_dashboard")

    return render(request, "Late Arrival.html")

def add_case(request):
    if request.method == "POST":
        usn = request.POST.get("usn")
        # Try to get the student object for proper linking
        student_obj = None
        try:
            student_obj = Student.objects.get(usn=usn)
        except Student.DoesNotExist:
            pass
        
        Case.objects.create(
            usn=usn,
            student_name=request.POST.get("student_name"),
            year=request.POST.get("year"),
            department=request.POST.get("department"),
            case_type=request.POST.get("case_type"),
            date=request.POST.get("date"),
            description=request.POST.get("description", ""),
            created_by=request.user  # 🔐 critical
        )
        return redirect("teacher_dashboard")
    return render(request, "add_case.html")

def get_student(request):
    usn = request.GET.get('usn')

    try:
        student = Student.objects.get(usn=usn)
        return JsonResponse({
            'name': student.name,
            'email': student.email,
            'department': student.department,
            'year': student.year,
        })
    except Student.DoesNotExist:
        return JsonResponse({'error': 'Student not found'}, status=404)
    

def student_dashboard(request):
    student_id = request.session.get('student_id')

    if not student_id:
        return redirect('student_login')

    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        request.session.flush()
        return redirect('student_login')

    profile_data = {
        'fullName': student.name,
        'studentId': student.usn,
        'email': student.email,
    }

    # Filter cases ONLY for the logged-in student using usn
    cases = Case.objects.filter(
        usn=student.usn
    ).order_by("-created_at")

    # Calculate stats for THIS student only
    total_complaints = cases.count()
    
    # Get recent complaints (last 3)
    recent_complaints = cases[:3]
    
    recent_complaints_data = [
        {
            'id': c.id,
            'title': c.case_type,
            'date': c.date.isoformat() if c.date else '',
            'status': 'pending',  # Default status
            'description': c.description or ''
        }
        for c in recent_complaints
    ]

    # JSON-serializable representation for client-side code
    cases_json = [
        {
            'case_type': c.case_type,
            'date': c.date.strftime('%Y-%m-%d') if getattr(c, 'date', None) else '',
            'description': c.description or ''
        }
        for c in cases
    ]

    return render(
        request,
        'studentdashboard.html',
        {
            'profile': profile_data,
            'cases': cases,
            'cases_json': cases_json,
            'total_complaints': total_complaints,
            'recent_complaints': recent_complaints_data,
        }
    )




def student_login(request):
    if request.method == "POST":
        usn = request.POST.get("usn")
        password = request.POST.get("password")

        print("Entered USN:", usn)
        print("Entered Password:", password)

        student = Student.objects.filter(usn=usn).first()

        if student and student.password == password:
            print("Login success")
            request.session['student_id'] = student.id
            print("Session saved:", request.session.get('student_id'))
            return redirect('student_dashboard')
        else:
            print("Login Failed")
            return render(request, "student_login.html", {
                "error": "Invalid credentials"
            })

    return render(request, "student_login.html")



def student_logout(request):
    request.session.flush()
    return redirect('student_login')


def student_register(request):
    if request.method == "POST":
        usn = request.POST.get('usn')
        email = request.POST.get('email')
        password = request.POST.get('password')

        # check existing user
        if StudentProfile.objects.filter(usn=usn).exists():
            messages.error(request, "USN already exists")
            return redirect('student_register')

        # ✅ create Django user (password saved securely)
        user = User.objects.create_user(
            username=usn,
            email=email,
            password=password
        )

        # ✅ create student profile
        StudentProfile.objects.create(
            user=user,
            usn=usn
        )

        messages.success(request, "Registration successful")
        return redirect('student_login')

    return render(request, 'student_register.html')


def teacher_login(request):
    if request.method == "POST":
        username = request.POST.get("email")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            # respect next param so protected pages (eg. add_case) return correctly
            next_url = request.GET.get('next') or request.POST.get('next')
            if next_url:
                return redirect(next_url)
            return redirect("teacher_dashboard")
        else:
            messages.error(request, "Invalid credentials")

    return render(request, "teacher-login.html")

def teacher_register(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        if User.objects.filter(username=email).exists():
            messages.error(request, "Teacher already exists")
        else:
            User.objects.create_user(
                username=email,
                email=email,
                password=password
            )
            messages.success(request, "Registration successful")
            return redirect("teacher_login")

    return render(request, "teacher-register.html")

def teacher_dashboard(request):
    # Filter cases created by the current teacher only
    cases = Case.objects.filter(created_by=request.user).order_by("-created_at")[:10]
    total_cases = Case.objects.filter(created_by=request.user).count()

    profile = None
    try:
        t = TeacherProfile.objects.get(user=request.user)
        profile = {
            'fullName': t.full_name,
            'teacherId': t.employee_id,
            'email': request.user.email,
            'phone': t.phone,
            'department': t.department,
            'address': t.address,
        }
    except TeacherProfile.DoesNotExist:
        profile = None

    return render(request, 'teacherdashboard.html', {
        'profile': profile,
        'cases': cases,
        'total_cases': total_cases,
    })



def teacher_logout(request):
    request.session.flush()
    return redirect("teacher_login")


@login_required(login_url='teacher_login')
def uniform_violations(request):
    if request.method == "POST":
        print(request.POST)
        violations_list = request.POST.getlist("violation")

        Case.objects.create(
            case_type="Uniform Violation",
            usn=request.POST.get("usn"),
            student_name=request.POST.get("name"),
            year=request.POST.get("year"),
            department=request.POST.get("department"),
            description=(
                "Violations: " + ", ".join(violations_list) +
                "\nOther: " + request.POST.get("decription", "").strip()
            ),
            date=request.POST.get("date"),
            created_by=request.user,
        )

        return redirect("teacher_dashboard")

    return render(request, "Uniform Violations.html")

def academic_misconduct(request):
    if request.method == "POST":
        print(request.POST)  # DEBUG (optional)

        Case.objects.create(
            case_type="Academic Misconduct",
            usn=request.POST.get("usn"),
            student_name=request.POST.get("name"),
            year=request.POST.get("year"),
            department=request.POST.get("department"),
            description=request.POST.get("description", "").strip(),
            date=request.POST.get("date"),
            created_by=request.user
        )

        return redirect("teacher_dashboard")

    return render(request, "Academic Misconduct.html")


def other_cases(request):
    if request.method == "POST":
        print(request.POST)  # optional debug

        Case.objects.create(
            case_type="Other",
            usn=request.POST.get("usn"),
            student_name=request.POST.get("name"),
            year=request.POST.get("year"),
            department=request.POST.get("department"),
            description=request.POST.get("description", "").strip(),
            date=request.POST.get("date"),
            created_by=request.user
        )

        return redirect("teacher_dashboard")

    return render(request, "Others.html")




def discipline_page(request):
    return HttpResponse("Discipline committee main page")

# ------------------ Simple JSON API endpoints (AJAX) ------------------
@csrf_exempt
def api_student_register(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    try:
        data = json.loads(request.body)
        usn = data.get('usn')
        email = data.get('email')
        password = data.get('password')
        if not (usn and email and password):
            return JsonResponse({'error': 'usn, email and password are required'}, status=400)
        if StudentProfile.objects.filter(usn=usn).exists():
            return JsonResponse({'error': 'USN already registered'}, status=400)
        user = User.objects.create_user(username=usn, email=email, password=password)
        StudentProfile.objects.create(user=user, usn=usn)
        Activity.objects.create(user=user, action='registered', details='Student registered')
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_student_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    try:
        data = json.loads(request.body)
        usn = data.get('usn')
        password = data.get('password')
        if not (usn and password):
            return JsonResponse({'error': 'usn and password required'}, status=400)
        try:
            profile = StudentProfile.objects.get(usn=usn)
            username = profile.user.username
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'invalid credentials'}, status=400)
        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({'error': 'invalid credentials'}, status=400)
        login(request, user)
        Activity.objects.create(user=user, action='logged in', details='Student logged in')
        activities = list(Activity.objects.filter(user=user).values('action', 'details', 'timestamp')[:10])
        profile_data = {
            'fullName': profile.full_name,
            'studentId': profile.usn,
            'email': user.email,
            'phone': profile.phone,
            'course': profile.course,
            'address': profile.address,
        }
        return JsonResponse({'success': True, 'profile': profile_data, 'activities': activities})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def api_get_profile(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'error': 'not authenticated'}, status=403)
    try:
        profile = StudentProfile.objects.get(user=user)
        profile_data = {
            'fullName': profile.full_name,
            'studentId': profile.usn,
            'email': user.email,
            'phone': profile.phone,
            'course': profile.course,
            'address': profile.address,
        }
        activities = list(Activity.objects.filter(user=user).values('action', 'details', 'timestamp')[:10])
        return JsonResponse({'profile': profile_data, 'activities': activities})
    except StudentProfile.DoesNotExist:
        return JsonResponse({'error': 'profile not found'}, status=404)


@csrf_exempt
def api_update_profile(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'error': 'not authenticated'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    try:
        profile = StudentProfile.objects.get(user=user)
        data = json.loads(request.body)
        changed_fields = []
        for field in ('full_name', 'phone', 'course', 'address'):
            if field in data:
                setattr(profile, field, data[field])
                changed_fields.append(field)
        profile.save()
        Activity.objects.create(user=user, action='updated profile', details=f'updated fields: {changed_fields}')
        profile_data = {
            'fullName': profile.full_name,
            'studentId': profile.usn,
            'email': user.email,
            'phone': profile.phone,
            'course': profile.course,
            'address': profile.address,
        }
        return JsonResponse({'success': True, 'profile': profile_data})
    except StudentProfile.DoesNotExist:
        return JsonResponse({'error': 'profile not found'}, status=404)


@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({'success': True})


def student_forgot_password(request):
    """Handle student password reset"""
    if request.method == "POST":
        step = request.POST.get('step', '1')
        
        if step == '1':
            # Step 1: Verify USN exists
            usn = request.POST.get('usn')
            try:
                student = Student.objects.get(usn=usn)
                return render(request, 'student_forgot_password.html', {
                    'step': '2',
                    'usn': usn,
                    'student_name': student.name,
                    'student_email': student.email
                })
            except Student.DoesNotExist:
                return render(request, 'student_forgot_password.html', {
                    'step': '1',
                    'error': 'USN not found. Please check and try again.'
                })
        
        elif step == '2':
            # Step 2: Verify email and reset password
            usn = request.POST.get('usn')
            email = request.POST.get('email')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            try:
                student = Student.objects.get(usn=usn)
                
                # Verify email matches
                if student.email != email:
                    return render(request, 'student_forgot_password.html', {
                        'step': '2',
                        'usn': usn,
                        'student_name': student.name,
                        'student_email': student.email,
                        'error': 'Email does not match our records.'
                    })
                
                # Verify passwords match
                if new_password != confirm_password:
                    return render(request, 'student_forgot_password.html', {
                        'step': '2',
                        'usn': usn,
                        'student_name': student.name,
                        'student_email': student.email,
                        'error': 'Passwords do not match.'
                    })
                
                # Validate password strength
                if len(new_password) < 6:
                    return render(request, 'student_forgot_password.html', {
                        'step': '2',
                        'usn': usn,
                        'student_name': student.name,
                        'student_email': student.email,
                        'error': 'Password must be at least 6 characters long.'
                    })
                
                # Update password
                student.password = make_password(new_password)
                student.save()
                
                return render(request, 'student_forgot_password.html', {
                    'step': '3',
                    'success': 'Password has been reset successfully! You can now login with your new password.'
                })
            
            except Student.DoesNotExist:
                return render(request, 'student_forgot_password.html', {
                    'step': '1',
                    'error': 'Student not found.'
                })
    
    return render(request, 'student_forgot_password.html', {'step': '1'})


from django.contrib.auth.models import User

def teacher_forgot_password(request):
    """Handle teacher password reset"""

    if request.method == "POST":
        step = request.POST.get('step', '1')

        # ---------------- STEP 1 ----------------
        if step == '1':
            email = request.POST.get('email')

            teacher_user = User.objects.filter(email=email).first()

            if teacher_user:
                return render(request, 'teacher_forgot_password.html', {
                    'step': '2',
                    'email': email,
                    'teacher_name': teacher_user.get_full_name() or teacher_user.username
                })
            else:
                return render(request, 'teacher_forgot_password.html', {
                    'step': '1',
                    'error': 'Email not found. Please check and try again.'
                })

        # ---------------- STEP 2 ----------------
        elif step == '2':
            email = request.POST.get('email')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')

            teacher_user = User.objects.filter(email=email).first()

            if not teacher_user:
                return render(request, 'teacher_forgot_password.html', {
                    'step': '1',
                    'error': 'Teacher not found.'
                })

            # Password match check
            if new_password != confirm_password:
                return render(request, 'teacher_forgot_password.html', {
                    'step': '2',
                    'email': email,
                    'teacher_name': teacher_user.get_full_name() or teacher_user.username,
                    'error': 'Passwords do not match.'
                })

            # Password length check
            if len(new_password) < 6:
                return render(request, 'teacher_forgot_password.html', {
                    'step': '2',
                    'email': email,
                    'teacher_name': teacher_user.get_full_name() or teacher_user.username,
                    'error': 'Password must be at least 6 characters long.'
                })

            # Update password
            teacher_user.set_password(new_password)
            teacher_user.save()

            return render(request, 'teacher_forgot_password.html', {
                'step': '3',
                'success': 'Password has been reset successfully! You can now login with your new password.'
            })

    return render(request, 'teacher_forgot_password.html', {'step': '1'})

