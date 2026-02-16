// Copied from root script.js so templates can load via namespaced static path

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
function handleStudentLogin(e) {
  e.preventDefault();
  // access fields if needed: document.getElementById('usn').value
  showStatus('✅ Student login successful!', 'success');
  setTimeout(() => { window.location.href = '/dashboard/'; }, 700);
}

function handleStudentRegister(e) {
  e.preventDefault();
  showStatus('✅ Student registration successful!', 'success');
  // clear registration fields and hide panel
  ['reg-usn','reg-email','reg-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  toggleRegister('student', false);
}

function handleTeacherLogin(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  fetch(form.action || '/teacher/login/', {
    method: 'POST',
    body: formData,
  })
  .then(response => {
    if (response.ok) {
      showStatus('✅ Teacher login successful!', 'success');
      setTimeout(() => { 
        const nextUrl = document.querySelector('input[name="next"]')?.value;
        window.location.href = nextUrl || '/teacher-dashboard/';
      }, 700);
    } else {
      showStatus('❌ Invalid credentials', 'error');
    }
  })
  .catch(error => {
    showStatus('❌ Login failed: ' + error.message, 'error');
  });
}

function handleTeacherRegister(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  
  fetch('/teacher/register/', {
    method: 'POST',
    body: formData,
  })
  .then(response => {
    if (response.ok) {
      showStatus('✅ Teacher registration successful!', 'success');
      setTimeout(() => {
        toggleRegister('teacher', false);
        document.querySelector('#teacher-register form').reset();
      }, 700);
    } else {
      showStatus('❌ Registration failed', 'error');
    }
  })
  .catch(error => {
    showStatus('❌ Registration failed: ' + error.message, 'error');
  });
}

function toggleRegister(kind, show) {
  const id = kind + '-register';
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  if (show) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}