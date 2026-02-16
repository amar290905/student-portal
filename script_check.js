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
  showStatus('â Student login successful!', 'success');
  setTimeout(() => { window.location.href = '/dashboard/'; }, 700);
}

function handleStudentRegister(e) {
  e.preventDefault();
  showStatus('â Student registration successful!', 'success');
  // clear registration fields and hide panel
  ['reg-usn','reg-email','reg-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  toggleRegister('student', false);
}

function handleTeacherLogin(e) {
  e.preventDefault();
  showStatus('â Teacher login successful!', 'success');
  setTimeout(() => { window.location.href = '/teacher-dashboard/'; }, 700);
}

function handleTeacherRegister(e) {
  e.preventDefault();
  showStatus('â Teacher registration successful!', 'success');
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
