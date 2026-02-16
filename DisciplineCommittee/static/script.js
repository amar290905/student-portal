// Shared helpers for all pages
function togglePassword(id, el) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  el.textContent = input.type === 'text' ? 'Hide' : 'Show';
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  statusDiv.className = `status-message status-${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  setTimeout(clearStatus, 3000);
}

function clearStatus() {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = '';
  status.style.display = 'none';
  status.className = 'status-message';
}

/* Dark mode is the only available theme now; theme switcher for development preview */
(function(){
  const select = document.getElementById('variant-select');
  function applyVariant(v){
    document.documentElement.classList.remove('accent-teal','accent-green','accent-purple','accent-blue');
    if(!v || v==='accent-blue') return; // default; variables already set
    document.documentElement.classList.add(v);
  }
  if(select){
    select.addEventListener('change', (e)=> applyVariant(e.target.value));
    // enable keyboard access
    select.addEventListener('keyup', (e)=> applyVariant(e.target.value));
  }
})();

// Form handlers
async function handleStudentLogin(e) {
  e.preventDefault();
  const usn = document.getElementById('usn')?.value;
  const password = document.getElementById('student-pass')?.value;
  if(!usn || !password){ showStatus('⚠️ Provide USN and password', 'error'); return; }
  try{
    const res = await fetch('/api/student/login/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn, password })
    });
    const data = await res.json();
    if(!res.ok){ showStatus('⚠️ ' + (data.error || 'Login failed'), 'error'); return; }
    // Persist profile and activities for the dashboard code which reads localStorage
    if(data.profile) localStorage.setItem('studentProfile_v1', JSON.stringify(data.profile));
    if(data.activities) localStorage.setItem('studentActivities_v1', JSON.stringify(data.activities));
    showStatus('✅ Student login successful!', 'success');
    // Redirect to dashboard
    window.location.href = '/dashboard/';
  }catch(err){ console.error(err); showStatus('⚠️ Network error', 'error'); }
} 

async function handleStudentRegister(e) {
  e.preventDefault();
  const usn = document.getElementById('reg-usn')?.value;
  const email = document.getElementById('reg-email')?.value;
  const password = document.getElementById('reg-pass')?.value;
  if(!usn || !email || !password){ showStatus('⚠️ Fill all registration fields', 'error'); return; }
  try{
    const res = await fetch('/api/student/register/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn, email, password })
    });
    const data = await res.json();
    if(!res.ok){ showStatus('⚠️ ' + (data.error || 'Registration failed'), 'error'); return; }
    showStatus('✅ Student registration successful! Logging in...', 'success');
    // clear registration fields and hide panel
    ['reg-usn','reg-email','reg-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    toggleRegister('student', false);
    // auto-login after register
    document.getElementById('usn').value = usn;
    document.getElementById('student-pass').value = password;
    await handleStudentLogin(new Event('submit'));
  }catch(err){ console.error(err); showStatus('⚠️ Network error', 'error'); }
} 

function handleTeacherLogin(e) {
  e.preventDefault();
  showStatus('✅ Teacher login successful!', 'success');
}

function handleTeacherRegister(e) {
  e.preventDefault();
  showStatus('✅ Teacher registration successful!', 'success');
  ['t-email','t-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  toggleRegister('teacher', false);
}

function toggleRegister(kind, show) {
  const id = kind + '-register';
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  if (show) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Start with empty complaints - they will be loaded from localStorage or added by teachers
let complaintsData = [];
let complaintIdCounter = 1;

// Initialize the dashboard (safe: checks inside will avoid errors on non-dashboard pages)
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof loadComplaintsFromStorage === 'function') loadComplaintsFromStorage();
    if (typeof initializeDashboard === 'function') initializeDashboard();
    if (typeof loadProfileData === 'function') {
        // try fetching profile from server if authenticated
        if(typeof fetchMyProfile === 'function') await fetchMyProfile();
        loadProfileData();
    }
    if (typeof loadComplaints === 'function') loadComplaints();

    if (typeof setupEventListeners === 'function') setupEventListeners();
    if (typeof updateStatistics === 'function') updateStatistics();
    if (typeof initializeCharts === 'function') initializeCharts();
    if (typeof checkForNewComplaints === 'function') checkForNewComplaints();
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();

    // Listen for new complaints from teachers (via localStorage event)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for new complaints (simulating real-time updates)
    setInterval(function(){ if (typeof checkForNewComplaints === 'function') checkForNewComplaints(); }, 2000);
});

// Initialize dashboard
function initializeDashboard() {
    // Set active section
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        // make keyboard-accessible and announce role
        item.setAttribute('tabindex','0');
        item.setAttribute('role','button');

        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });

        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
} 

// Switch between sections
function switchSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.classList.remove('active'));

    const activeSection = document.getElementById(section);
    if (activeSection) {
        activeSection.classList.add('active');
        updatePageTitle(section);
        // Scroll into view for better UX on smaller screens
        try { activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e){}

        // Reload data if needed
        if (section === 'complaints') {
            loadComplaints();
        } else if (section === 'statistics') {
            updateStatistics();
            initializeCharts();
        }
    }
}

// Update page title
function updatePageTitle(section) {
    const titles = {
        'dashboard': 'Dashboard',
        'profile': 'My Profile',
        'complaints': 'My Complaints',
        'statistics': 'Statistics'
    };
    const el = document.getElementById('pageTitle');
    if (el) el.textContent = titles[section] || 'Dashboard';
}

// Load profile data
function loadProfileData() {
    const fullNameEl = document.getElementById('fullName');
    if (!fullNameEl) return; // no profile on this page
    const studentIdEl = document.getElementById('studentId');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const courseEl = document.getElementById('course');
    const addressEl = document.getElementById('address');
    const studentNameEl = document.getElementById('studentName');

    if (fullNameEl) fullNameEl.value = studentData.fullName;
    if (studentIdEl) studentIdEl.value = studentData.studentId;
    if (emailEl) emailEl.value = studentData.email;
    if (phoneEl) phoneEl.value = studentData.phone;
    if (courseEl) courseEl.value = studentData.course;
    if (addressEl) addressEl.value = studentData.address;
    if (studentNameEl) studentNameEl.textContent = studentData.fullName;
}

// Setup event listeners (guard elements to avoid errors on non-dashboard pages)
function setupEventListeners() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', function(e) { e.preventDefault(); saveProfile(); });

    const resetFormBtn = document.getElementById('resetFormBtn');
    if (resetFormBtn) resetFormBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all changes?')) {
            loadProfileData();
            showToast('Form reset to original values', 'success');
        }
    });

    const themeToggleEl = document.getElementById('themeToggle');
    if (themeToggleEl) themeToggleEl.addEventListener('click', toggleTheme);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', function(e) { filterComplaints(e.target.value); });

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);

    const filterPriority = document.getElementById('filterPriority');
    if (filterPriority) filterPriority.addEventListener('change', applyFilters);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportComplaints);

    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) editAvatarBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const profileImage = document.getElementById('profileImage');
                    if (profileImage) profileImage.src = e.target.result;
                    showToast('Profile picture updated successfully', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
}

// Save profile
async function saveProfile() {
    const fullNameEl = document.getElementById('fullName');
    if (!fullNameEl) return;
    studentData.fullName = fullNameEl.value;
    const studentIdEl = document.getElementById('studentId');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const courseEl = document.getElementById('course');
    const addressEl = document.getElementById('address');

    if (studentIdEl) studentIdEl.value = studentData.studentId;
    if (emailEl) studentData.email = emailEl.value;
    if (phoneEl) studentData.phone = phoneEl.value;
    if (courseEl) studentData.course = courseEl.value;
    if (addressEl) studentData.address = addressEl.value;

    // Update name in header
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) studentNameEl.textContent = studentData.fullName;

    // Send update to server if authenticated (best-effort)
    try{
      const res = await fetch('/api/student/profile/update/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: studentData.fullName, phone: studentData.phone, course: studentData.course, address: studentData.address })
      });
      const data = await res.json();
      if(res.ok && data.profile){
        // persist for dashboard script
        localStorage.setItem('studentProfile_v1', JSON.stringify(data.profile));
        showToast('Profile updated and saved to server ✔');
        return;
      }
    }catch(e){ console.warn('server update failed', e); }

    // Fallback to localStorage
    showToast('Profile updated locally ✔');
    localStorage.setItem('studentProfile', JSON.stringify(studentData));
}

// Try to fetch profile from server for authenticated session
async function fetchMyProfile(){
  try{
    const res = await fetch('/api/student/profile/', { credentials: 'same-origin' });
    if(!res.ok) return;
    const data = await res.json();
    if(data.profile){
      // store in the key used by the dashboard script
      localStorage.setItem('studentProfile_v1', JSON.stringify(data.profile));
    }
    if(data.activities){
      localStorage.setItem('studentActivities_v1', JSON.stringify(data.activities));
    }
  }catch(e){ console.warn('fetch profile failed', e); }
}

// Load complaints
function loadComplaints() {
    const complaintsList = document.getElementById('complaintsList');
    const noComplaints = document.getElementById('noComplaints');
    if (!complaintsList || !noComplaints) return;

    if (complaintsData.length === 0) {
        complaintsList.style.display = 'none';
        noComplaints.style.display = 'block';
        return;
    }

    complaintsList.style.display = 'grid';
    noComplaints.style.display = 'none';

    complaintsList.innerHTML = complaintsData.map(complaint => `
        <div class="complaint-card" data-id="${complaint.id}">
            <div class="complaint-header">
                <div>
                    <h3 class="complaint-title">${complaint.title}</h3>
                    <div class="complaint-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(complaint.date)}</span>
                        <span><i class="fas fa-tag"></i> ${complaint.category}</span>
                    </div>
                </div>
                <div>
                    <span class="status-badge ${complaint.status}">${complaint.status.replace('-', ' ')}</span>
                </div>
            </div>
            <p class="complaint-description">${complaint.description}</p>
            ${complaint.response ? `
                <div class="complaint-response" style="background-color: var(--bg-color); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; border-left: 3px solid var(--primary-color);">
                    <strong><i class="fas fa-reply"></i> Response:</strong>
                    <p style="margin-top: 0.5rem; color: var(--text-secondary);">${complaint.response}</p>
                </div>
            ` : ''}
            <div class="complaint-footer">
                <span class="priority-badge ${complaint.priority}">${complaint.priority}</span>
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    <i class="fas fa-hashtag"></i> #${complaint.id.toString().padStart(6, '0')}
                </span>
            </div>
        </div>
    `).join('');

    // Load recent complaints for dashboard
    loadRecentComplaints();
}

// Load recent complaints for dashboard
function loadRecentComplaints() {
    const recentList = document.getElementById('recentComplaintsList');
    if (!recentList) return;
    const recent = [...complaintsData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    if (recent.length === 0) {
        recentList.innerHTML = '<div class="empty-state" style="padding: 2rem;"><i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5; margin-bottom: 1rem;"></i><p style="text-align: center; color: var(--text-secondary);">No complaints received yet</p></div>';
        return;
    }

    recentList.innerHTML = recent.map(complaint => `
        <div class="complaint-card" style="margin-bottom: 1rem;">
            <div class="complaint-header">
                <div>
                    <h3 class="complaint-title" style="font-size: 1rem;">${complaint.title}</h3>
                    <div class="complaint-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(complaint.date)}</span>
                    </div>
                </div>
                <span class="status-badge ${complaint.status}">${complaint.status.replace('-', ' ')}</span>
            </div>
        </div>
    `).join('');
}

// Filter complaints
function filterComplaints(searchTerm) {
    const cards = document.querySelectorAll('.complaint-card');
    const term = searchTerm.toLowerCase();

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

// Apply filters
function applyFilters() {
    const statusFilterEl = document.getElementById('filterStatus');
    const priorityFilterEl = document.getElementById('filterPriority');
    const searchInputEl = document.getElementById('searchInput');
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';
    const priorityFilter = priorityFilterEl ? priorityFilterEl.value : 'all';
    const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase() : '';

    const cards = document.querySelectorAll('.complaint-card');

    cards.forEach(card => {
        const complaintId = parseInt(card.getAttribute('data-id'));
        const complaint = complaintsData.find(c => c.id === complaintId);

        if (!complaint) return;

        const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || complaint.priority === priorityFilter;
        const matchesSearch = !searchTerm || card.textContent.toLowerCase().includes(searchTerm);

        card.style.display = (matchesStatus && matchesPriority && matchesSearch) ? 'block' : 'none';
    });
}

// Update statistics
function updateStatistics() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === 'pending').length;
    const resolved = complaintsData.filter(c => c.status === 'resolved').length;
    const urgent = complaintsData.filter(c => c.priority === 'urgent').length;

    const totalEl = document.getElementById('totalComplaints');
    const pendingEl = document.getElementById('pendingComplaints');
    const resolvedEl = document.getElementById('resolvedComplaints');
    const urgentEl = document.getElementById('urgentComplaints');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (resolvedEl) resolvedEl.textContent = resolved;
    if (urgentEl) urgentEl.textContent = urgent;
}

// Initialize charts
function initializeCharts() {
    // Destroy existing charts if they exist
    if (window.statusChartInstance) {
        window.statusChartInstance.destroy();
    }
    if (window.priorityChartInstance) {
        window.priorityChartInstance.destroy();
    }

    // Status Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        const statusData = {
            pending: complaintsData.filter(c => c.status === 'pending').length,
            'in-progress': complaintsData.filter(c => c.status === 'in-progress').length,
            resolved: complaintsData.filter(c => c.status === 'resolved').length,
            rejected: complaintsData.filter(c => c.status === 'rejected').length
        };

        window.statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
                datasets: [{
                    data: [statusData.pending, statusData['in-progress'], statusData.resolved, statusData.rejected],
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: 'var(--card-bg)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    // Priority Chart
    const priorityCtx = document.getElementById('priorityChart');
    if (priorityCtx) {
        const priorityData = {
            low: complaintsData.filter(c => c.priority === 'low').length,
            medium: complaintsData.filter(c => c.priority === 'medium').length,
            high: complaintsData.filter(c => c.priority === 'high').length,
            urgent: complaintsData.filter(c => c.priority === 'urgent').length
        };

        window.priorityChartInstance = new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: ['Low', 'Medium', 'High', 'Urgent'],
                datasets: [{
                    label: 'Complaints',
                    data: [priorityData.low, priorityData.medium, priorityData.high, priorityData.urgent],
                    backgroundColor: [
                        'rgba(100, 116, 139, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)',
                            stepSize: 1
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Load timeline
    loadTimeline();
}

// Load timeline
function loadTimeline() {
    const timelineList = document.getElementById('timelineList');
    if (!timelineList) return;
    const sortedComplaints = [...complaintsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedComplaints.length === 0) {
        timelineList.innerHTML = '<div class="empty-state" style="padding: 2rem;"><i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5; margin-bottom: 1rem;"></i><p style="text-align: center; color: var(--text-secondary);">No complaints to display</p></div>';
        return;
    }

    timelineList.innerHTML = sortedComplaints.map(complaint => `
        <div class="timeline-item">
            <div class="timeline-date">
                <i class="fas fa-calendar"></i> ${formatDate(complaint.date)}
            </div>
            <div class="timeline-content">
                <h4>${complaint.title}</h4>
                <p>Status: <span class="status-badge ${complaint.status}">${complaint.status.replace('-', ' ')}</span></p>
                <p style="margin-top: 0.5rem;">${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

// Export complaints
function exportComplaints() {
    const filteredComplaints = getFilteredComplaints();

    let csv = 'ID,Title,Status,Priority,Date,Category,Description\n';
    filteredComplaints.forEach(complaint => {
        csv += `${complaint.id},"${complaint.title}",${complaint.status},${complaint.priority},${complaint.date},${complaint.category},"${complaint.description.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Complaints exported successfully!', 'success');
}

// Get filtered complaints
function getFilteredComplaints() {
    const statusFilterEl = document.getElementById('filterStatus');
    const priorityFilterEl = document.getElementById('filterPriority');
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';
    const priorityFilter = priorityFilterEl ? priorityFilterEl.value : 'all';

    return complaintsData.filter(complaint => {
        const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || complaint.priority === priorityFilter;
        return matchesStatus && matchesPriority;
    });
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const themeIcon = document.querySelector('#themeToggle i');
    const themeText = document.querySelector('#themeToggle span');

    if (newTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = 'Dark Mode';
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeIcon = document.querySelector('#themeToggle i');
    const themeText = document.querySelector('#themeToggle span');

    if (savedTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');

    toast.className = `toast ${type}`;
    icon.className = `toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    messageEl.textContent = message;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load complaints from localStorage
function loadComplaintsFromStorage() {
    const savedComplaints = localStorage.getItem('studentComplaints');
    if (savedComplaints) {
        complaintsData = JSON.parse(savedComplaints);
        // Update counter to avoid ID conflicts
        if (complaintsData.length > 0) {
            complaintIdCounter = Math.max(...complaintsData.map(c => c.id)) + 1;
        }
    }
}

// Save complaints to localStorage
function saveComplaintsToStorage() {
    localStorage.setItem('studentComplaints', JSON.stringify(complaintsData));
}

// Check for new complaints (automatically detects when teachers send complaints)
function checkForNewComplaints() {
    // Check if there are new complaints in localStorage (added by teacher/admin/backend)
    const newComplaints = localStorage.getItem('newComplaintsForStudent');
    if (newComplaints) {
        try {
            const complaints = JSON.parse(newComplaints);
            if (Array.isArray(complaints) && complaints.length > 0) {
                // Add new complaints that don't already exist
                complaints.forEach(newComplaint => {
                    const exists = complaintsData.some(c => c.id === newComplaint.id);
                    if (!exists) {
                        complaintsData.push(newComplaint);
                        showToast(`New complaint received: ${newComplaint.title}`, 'success');
                    }
                });

                // Save updated complaints
                saveComplaintsToStorage();

                // Clear the new complaints flag
                localStorage.removeItem('newComplaintsForStudent');

                // Reload UI
                loadComplaints();
                updateStatistics();
                updateNotificationBadge();

                // Refresh charts if on statistics page
                const statsSection = document.getElementById('statistics');
                if (statsSection && statsSection.classList.contains('active')) {
                    initializeCharts();
                }
            }
        } catch (e) {
            console.error('Error parsing new complaints:', e);
        }
    }
}

// Handle storage changes (when teacher adds complaint in another tab/window)
function handleStorageChange(e) {
    if (e.key === 'newComplaintsForStudent' || e.key === 'studentComplaints') {
        checkForNewComplaints();
    }
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-bell .badge');
    if (!badge) return;
    const pendingCount = complaintsData.filter(c => c.status === 'pending' || c.status === 'in-progress').length;

    if (badge) {
        if (pendingCount > 0) {
            badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Function to receive a new complaint from teacher (can be called externally)
function receiveComplaintFromTeacher(complaint) {
    // Generate ID if not provided
    if (!complaint.id) {
        complaint.id = complaintIdCounter++;
    }

    // Set default values
    if (!complaint.date) {
        complaint.date = new Date().toISOString().split('T')[0];
    }
    if (!complaint.status) {
        complaint.status = 'pending';
    }
    if (!complaint.priority) {
        complaint.priority = 'medium';
    }
    if (!complaint.category) {
        complaint.category = 'General';
    }
    if (!complaint.response) {
        complaint.response = null;
    }

    // Add to complaints array
    complaintsData.push(complaint);
    saveComplaintsToStorage();

    // Reload UI
    loadComplaints();
    updateStatistics();
    updateNotificationBadge();

    // Show notification
    showToast(`New complaint received: ${complaint.title}`, 'success');

    // Refresh charts if on statistics page
    const statsSection = document.getElementById('statistics');
    if (statsSection && statsSection.classList.contains('active')) {
        initializeCharts();
    }

    return complaint;
}

// Make function globally available for testing/teacher interface
window.receiveComplaintFromTeacher = receiveComplaintFromTeacher;

/* --- Merged from "script copy 2.js" (activity table loader) --- */

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("activityBody");
  const totalCases = document.getElementById("totalCases");
  const noData = document.getElementById("noData");

  if (!tableBody) return;

  const cases = JSON.parse(localStorage.getItem("cases")) || [];

  if (totalCases) totalCases.textContent = cases.length;

  if (cases.length === 0) {
    if (noData) noData.style.display = "block";
    return;
  }

  if (noData) noData.style.display = "none";

  cases.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.student}</td>
      <td>${item.category}</td>
      <td>${item.date}</td>
    `;
    tableBody.appendChild(row);
  });
});

/* --- End merged scripts --- */