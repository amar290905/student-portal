(function(){
  // Keys
  const PROFILE_KEY = 'studentProfile_v1';
  const COMPLAINTS_KEY = 'studentComplaints_v1';

  // Cached elements
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  const pageTitle = document.getElementById('pageTitle');
  const studentNameSpan = document.getElementById('studentName');
  const profileForm = document.getElementById('profileForm');
  const toast = document.getElementById('toast');
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const complaintsList = document.getElementById('complaintsList');
  const recentComplaintsList = document.getElementById('recentComplaintsList');
  const noComplaints = document.getElementById('noComplaints');
  const exportBtn = document.getElementById('exportBtn');

  // Stats elements
  const totalComplaintsEl = document.getElementById('totalComplaints');
  const pendingComplaintsEl = document.getElementById('pendingComplaints');
  const resolvedComplaintsEl = document.getElementById('resolvedComplaints');
  const urgentComplaintsEl = document.getElementById('urgentComplaints');

  // sidebar toggle for narrow screens (use themeToggle button)
  const themeToggleBtn = document.getElementById('themeToggle');
  const sidebar = document.querySelector('.sidebar');

  // helpers
  function readProfile(){
    try{
      const raw = localStorage.getItem(PROFILE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){return null}
  }
  function saveProfileObj(obj){
    localStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
  }
  function readComplaints(){
    try{
      // 🔒 SECURITY: Read ONLY from server-provided data in script tag
      // This ensures each student sees only their own data
      const serverDataEl = document.getElementById('student-cases');
      if(serverDataEl){
        const serverComplaints = JSON.parse(serverDataEl.textContent || '[]');
        return serverComplaints.map((c, i) => ({
          id: `server-${i}`,
          title: c.category || c.case_type || '',
          date: c.date || new Date().toISOString(),
          desc: c.description || '',
          status: c.status || 'pending',
          priority: c.priority || 'medium',
          course: c.course || '',
          source: 'server'
        }));
      }
      // Fallback: Try localStorage only as backup (empty by default)
      const raw = localStorage.getItem(COMPLAINTS_KEY);
      const studentArr = raw ? JSON.parse(raw) : [];
      const normalizedStudent = (studentArr||[]).map((s,i)=>({ ...s, source: s.source || 'student' }));
      return normalizedStudent;
    }catch(e){return []}
  }
  function saveComplaints(arr){
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(arr));
  }

  function showSection(id){
    if(!id) return;
    sections.forEach(s=> s.id === id ? s.classList.add('active') : s.classList.remove('active'));
    navItems.forEach(a => a.dataset.section === id ? a.classList.add('active') : a.classList.remove('active'));
    // update page title
    const title = id === 'dashboard' ? 'Dashboard' : (id === 'profile' ? 'My Profile' : (id === 'complaints' ? 'My Complaints' : 'Statistics'));
    if(pageTitle) pageTitle.textContent = title;
    // update hash (do not add duplicate history entries)
    try{ if(history && history.replaceState) history.replaceState(null, '', '#'+id); else location.hash = id; }catch(e){}
    // scroll and focus
    const sec = document.getElementById(id);
    if(sec){ sec.scrollIntoView({behavior:'smooth', block:'start'}); const first = sec.querySelector('input,textarea,select,button'); if(first) first.focus(); }
    // close sidebar on small screens
    if(window.innerWidth < 720 && sidebar) sidebar.classList.remove('open');
  }

  // Nav events
  navItems.forEach(a => {
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const id = a.dataset.section;
      showSection(id);
    });
  });

  if(themeToggleBtn){
    themeToggleBtn.addEventListener('click', ()=>{
      if(window.innerWidth < 720 && sidebar){ sidebar.classList.toggle('open'); return; }
      // noop for now: keep it for future theme toggles
    });
  }

  // Toast
  let toastTimer = null;
  function showToast(msg, time=2000){
    if(!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>{ toast.style.display = 'none'; }, time);
  }

  // Profile load & save
  function loadProfileToForm(){
    const p = readProfile() || { fullName: '', studentId: '', email:'', phone:'', course:'', address:'', class:'', year:'', image: '' };
    // populate
    ['fullName','studentId','email','phone','course','address','class','year'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.value = p[id] || '';
    });
    const img = document.getElementById('profileImage');
    if(img) img.src = p.image || 'https://via.placeholder.com/150';
    if(studentNameSpan) studentNameSpan.textContent = p.fullName || 'Student User';
  }

  if(profileForm){
    profileForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(profileForm);
      const obj = {};
      for(const [k,v] of formData.entries()) obj[k] = v;
      const img = document.getElementById('profileImage');
      if(img && img.src) obj.image = img.src;
      saveProfileObj(obj);
      if(studentNameSpan) studentNameSpan.textContent = obj.fullName || 'Student User';
      showToast('Profile saved ✔');
    });
    const resetBtn = document.getElementById('resetFormBtn');
    if(resetBtn){
      resetBtn.addEventListener('click', ()=>{
        const ok = confirm('Reset profile to defaults? This will remove saved profile data.');
        if(!ok) return;
        // remove saved profile and update UI
        localStorage.removeItem(PROFILE_KEY);
        loadProfileToForm();
        const img = document.getElementById('profileImage');
        if(img) img.src = 'https://via.placeholder.com/150';
        if(studentNameSpan) studentNameSpan.textContent = 'Student User';
        showToast('Profile reset to defaults');
      });
    }
    // avatar upload behavior
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    if(editAvatarBtn && avatarInput){
      editAvatarBtn.addEventListener('click', ()=> avatarInput.click());
      avatarInput.addEventListener('change', (e)=>{
        const f = e.target.files && e.target.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.getElementById('profileImage');
          if(img) img.src = reader.result;
          const p = readProfile() || {};
          p.image = reader.result;
          saveProfileObj(p);
          showToast('Profile image updated');
        };
        reader.readAsDataURL(f);
      });
    }
  }

  // Complaints rendering
  function makeComplaintCard(c){
    const wrapper = document.createElement('div'); wrapper.className = 'complaint-card clickable' + (c.source==='teacher' ? ' teacher-item' : '');
    const studentInfo = c.source === 'teacher' && c.desc ? `<div style="font-size:13px;color:var(--muted, #64748b)">Student: ${c.desc}</div>` : '';
    const badge = c.source === 'teacher' ? `<span class="teacher-badge" title="Submitted by teacher">Teacher</span>` : '';
    wrapper.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="width:46px;height:46px;border-radius:8px;background:#eef2ff;display:flex;align-items:center;justify-content:center;color:#1f2937;font-weight:700">${(c.priority||'N').charAt(0)}</div>
        <div style="min-width:0;flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>${badge}</div>
          <div style="font-size:13px;color:var(--muted, #64748b)">${new Date(c.date).toLocaleDateString()} • ${c.status}</div>
          ${studentInfo}
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <div style="font-size:13px;color:var(--muted, #64748b)">${c.course || ''}</div>
        <div style="font-size:13px;color:${c.status==='resolved'?'#10b981':(c.status==='pending'?'#f59e0b':'#ef4444')};font-weight:700;text-transform:capitalize">${c.status || ''}</div>
      </div>
    `;
    wrapper.style.cursor = 'pointer';
    wrapper.tabIndex = 0;
    wrapper.addEventListener('click', ()=> showComplaintModal(c));
    wrapper.addEventListener('keydown', (e)=> { if(e.key === 'Enter') showComplaintModal(c); });
    return wrapper;
  }

  function renderComplaints(){
    const all = readComplaints();
    const q = (searchInput && searchInput.value || '').toLowerCase().trim();
    const statusFil = filterStatus ? filterStatus.value : 'all';
    const prioFil = filterPriority ? filterPriority.value : 'all';
    let filtered = all.filter(c => {
      if(q && !( (c.title||'').toLowerCase().includes(q) || (c.desc||'').toLowerCase().includes(q))) return false;
      if(statusFil !== 'all' && c.status !== statusFil) return false;
      if(prioFil !== 'all' && c.priority !== prioFil) return false;
      return true;
    });
    // main list
    complaintsList.innerHTML = '';
    if(filtered.length === 0){
      complaintsList.style.display = 'none';
      if(noComplaints) noComplaints.style.display = 'flex';
    } else {
      complaintsList.style.display = 'block';
      if(noComplaints) noComplaints.style.display = 'none';
      filtered.forEach(c => complaintsList.appendChild(makeComplaintCard(c)));
    }
    // stats - update based on current data (server provides the authoritative total)
    const pending = all.filter(x=>x.status==='pending').length;
    const resolved = all.filter(x=>x.status==='resolved').length;
    const urgent = all.filter(x=>x.priority==='urgent').length;
    // totalComplaintsEl is already set by server, don't override
    if(pendingComplaintsEl) pendingComplaintsEl.textContent = pending;
    if(resolvedComplaintsEl) resolvedComplaintsEl.textContent = resolved;
    if(urgentComplaintsEl) urgentComplaintsEl.textContent = urgent;

    // Render recent activities stored by server or client
    function renderRecentActivities(){
      const container = document.getElementById('recentActivityList');
      if(!container) return;
      let acts = [];
      try{ acts = JSON.parse(localStorage.getItem('studentActivities_v1') || '[]'); }catch(e){ acts = []; }
      if(!acts || acts.length === 0){ container.innerHTML = '<p style="color:var(--muted, #64748b)">No recent activity</p>'; return; }
      container.innerHTML = '';
      acts.slice(0,5).forEach(a=>{
        const el = document.createElement('div');
        el.style.padding = '8px 6px';
        el.style.borderBottom = '1px solid rgba(0,0,0,0.04)';
        const when = a.timestamp ? new Date(a.timestamp).toLocaleString() : '';
        el.innerHTML = `<div style="font-weight:700;font-size:13px">${a.action}</div><div style="font-size:12px;color:var(--muted, #64748b)">${a.details || ''} ${when ? ' • ' + when : ''}</div>`;
        container.appendChild(el);
      });
    }
    // call renderer now (it will show server-sent activities if present)
    renderRecentActivities();
    // update charts to reflect combined data
    try{ updateCharts(); }catch(e){}
  }

  // Filters & search
  if(searchInput) searchInput.addEventListener('input', ()=> renderComplaints());
  if(filterStatus) filterStatus.addEventListener('change', ()=> renderComplaints());
  if(filterPriority) filterPriority.addEventListener('change', ()=> renderComplaints());

  // Charts and modal handling
  let statusChart = null, priorityChart = null;
  function updateCharts(){
    const all = readComplaints();
    const statusCounts = {
      pending: all.filter(x=>x.status==='pending').length,
      'in-progress': all.filter(x=>x.status==='in-progress').length,
      resolved: all.filter(x=>x.status==='resolved').length,
      rejected: all.filter(x=>x.status==='rejected').length
    };
    const prioCounts = {
      low: all.filter(x=>x.priority==='low').length,
      medium: all.filter(x=>x.priority==='medium').length,
      high: all.filter(x=>x.priority==='high').length,
      urgent: all.filter(x=>x.priority==='urgent').length
    };
    if(statusChart){
      statusChart.data.datasets[0].data = [statusCounts.pending, statusCounts['in-progress'], statusCounts.resolved, statusCounts.rejected];
      statusChart.update();
    }
    if(priorityChart){
      priorityChart.data.datasets[0].data = [prioCounts.low, prioCounts.medium, prioCounts.high, prioCounts.urgent];
      priorityChart.update();
    }
  }

  // Complaint modal
  const complaintModal = document.getElementById('complaintModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalMeta = document.getElementById('modalMeta');
  const modalResolveBtn = document.getElementById('modalResolveBtn');
  const modalDeleteBtn = document.getElementById('modalDeleteBtn');
  let currentModalId = null;

  function showComplaintModal(c){
    if(!complaintModal) return;
    currentModalId = c.id;
    modalTitle.textContent = c.title;
    // show student name for teacher cases as main desc
    if(c.source === 'teacher'){
      modalDesc.textContent = c.desc ? `Student: ${c.desc}` : '';
    } else {
      modalDesc.textContent = c.desc || '';
    }
    modalMeta.innerHTML = `${new Date(c.date).toLocaleDateString()} • ${c.status} • ${c.priority || 'N/A'}`;
    // If this is a teacher-submitted case, make actions read-only and show lock note
    if(c.source === 'teacher'){
      if(modalResolveBtn) modalResolveBtn.disabled = true, modalResolveBtn.textContent = 'View Only', modalResolveBtn.title = 'Teacher-submitted — read only';
      if(modalDeleteBtn) modalDeleteBtn.disabled = true, modalDeleteBtn.textContent = 'View Only', modalDeleteBtn.title = 'Teacher-submitted — read only';
      modalMeta.innerHTML += ` <span class="modal-lock">🔒 Teacher report — view only</span>`;
    } else {
      if(modalResolveBtn) modalResolveBtn.disabled = false, modalResolveBtn.textContent = 'Mark Resolved', modalResolveBtn.title = '';
      if(modalDeleteBtn) modalDeleteBtn.disabled = false, modalDeleteBtn.textContent = 'Delete', modalDeleteBtn.title = '';
    }
    complaintModal.classList.remove('hidden');
  }
  function closeComplaintModal(){
    if(!complaintModal) return;
    complaintModal.classList.add('hidden');
    currentModalId = null;
  }
  if(modalClose) modalClose.addEventListener('click', closeComplaintModal);
  if(modalOverlay) modalOverlay.addEventListener('click', closeComplaintModal);
  if(modalResolveBtn) modalResolveBtn.addEventListener('click', ()=>{
    // Only change student complaints (stored under COMPLAINTS_KEY)
    const raw = localStorage.getItem(COMPLAINTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const idx = arr.findIndex(x=>x.id === currentModalId);
    if(idx>-1){ arr[idx].status = 'resolved'; localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(arr)); renderComplaints(); closeComplaintModal(); showToast('Marked resolved'); }
  });
  if(modalDeleteBtn) modalDeleteBtn.addEventListener('click', ()=>{
    const raw = localStorage.getItem(COMPLAINTS_KEY);
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter(x=>x.id !== currentModalId);
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(arr)); renderComplaints(); closeComplaintModal(); showToast('Complaint deleted');
  });

  // Export
  if(exportBtn) exportBtn.addEventListener('click', ()=>{
    const all = readComplaints();
    const data = JSON.stringify(all, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'complaints.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // seed sample complaints if none exist (for demo)
  function seedIfEmpty(){
    const all = readComplaints();
    if(all.length === 0){
      const sample = [
        { id:1, title: 'Late to class', desc:'Arrived 30 mins late', date: new Date().toISOString(), status:'pending', priority:'low', course:'ENG101' },
        { id:2, title: 'Uniform violation', desc:'Wore non-uniform', date: new Date(Date.now()-86400000).toISOString(), status:'resolved', priority:'medium', course:'CSE101' }
      ];
      saveComplaints(sample);
    }
  }

  // init
  function init(){
    // 🔒 SECURITY: Clear all complaint-related localStorage to prevent data leakage between students
    localStorage.removeItem(COMPLAINTS_KEY);
    localStorage.removeItem('studentComplaints');
    localStorage.removeItem('cases');
    localStorage.removeItem('studentActivities_v1');
    
    loadProfileToForm();
    renderComplaints();
    // initialize charts
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    const priorityCtx = document.getElementById('priorityChart')?.getContext('2d');
    if(statusCtx){
      statusChart = new Chart(statusCtx, { type: 'doughnut', data: { labels: ['Pending','In Progress','Resolved','Rejected'], datasets:[{ data:[0,0,0,0], backgroundColor:['#f59e0b','#60a5fa','#10b981','#ef4444'] }] }, options: { responsive:true, maintainAspectRatio:false } });
    }
    if(priorityCtx){
      priorityChart = new Chart(priorityCtx, { type: 'doughnut', data: { labels: ['Low','Medium','High','Urgent'], datasets:[{ data:[0,0,0,0], backgroundColor:['#60a5fa','#f6c23e','#fb7185','#ef4444'] }] }, options: { responsive:true, maintainAspectRatio:false } });
    }
    updateCharts();
    // initial section from hash if present
    const initial = (location.hash && location.hash.slice(1)) || 'dashboard';
    showSection(initial);
    // handle hash changes
    window.addEventListener('hashchange', ()=>{ const id = location.hash.slice(1); if(id) showSection(id); });
    // small UX: close sidebar when clicking outside
    document.addEventListener('click', (e)=>{
      if(window.innerWidth >= 720) return;
      if(!sidebar) return;
      const within = e.composedPath().includes(sidebar);
      const toggleBtn = e.target.closest('#themeToggle');
      if(!within && !toggleBtn && sidebar.classList.contains('open')) sidebar.classList.remove('open');
    });

    // listen for storage changes (so teacher tab updates student dashboard in other tab)
    window.addEventListener('storage', (e)=>{
      if(e.key === 'cases' || e.key === COMPLAINTS_KEY){
        renderComplaints();
      }
      if(e.key === 'studentActivities_v1'){
        renderRecentActivities();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
