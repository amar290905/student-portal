// forms.js - unified form handling and small UI helpers
(function(){
  function showToast(message, type='success'){
    let t = document.getElementById('page-toast');
    if(!t){ t = document.createElement('div'); t.id='page-toast'; document.body.appendChild(t); }
    t.textContent = message;
    t.style.background = type==='success' ? 'linear-gradient(90deg,#16a34a,#059669)' : 'linear-gradient(90deg,#ef4444,#b91c1c)';
    t.classList.add('show');
    clearTimeout(t._hide);
    t._hide = setTimeout(()=> t.classList.remove('show'), 2200);
  }

  function handleFormSubmit(e){
    e.preventDefault();
    const form = e.currentTarget;
    const studentName = (form.querySelector('input[placeholder="Enter student name"]') || {}).value || 'Unknown';
    const date = (form.querySelector('#dateField') && form.querySelector('#dateField').value) || new Date().toISOString().slice(0,10);
    const cases = JSON.parse(localStorage.getItem('cases')) || [];
    const newCase = { student: studentName, category: document.title || 'Case', date };
    cases.unshift(newCase);
    localStorage.setItem('cases', JSON.stringify(cases));
    showToast('Report submitted', 'success');
    setTimeout(()=> window.location.href='/', 450);
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('form').forEach(form => {
      // Only attach to case report forms (heuristic: has input placeholder 'Enter student name')
      if (form.querySelector('input[placeholder="Enter student name"]')){
        // Remove any existing handler to avoid double-binding
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
      }
    });

    // Small accessibility: focus first input on load
    const firstInput = document.querySelector('form input, form select, form textarea');
    if (firstInput) firstInput.focus();

    // Initialize custom dark selects on academic / others pages for consistent dark dropdowns
    function initCustomSelects(){
      const selects = document.querySelectorAll('body.academic select, body.others select');
      if(!selects.length) return;
      selects.forEach(select => {
        if(select.dataset.customized) return;
        select.dataset.customized = '1';
        const wrapper = document.createElement('div'); wrapper.className = 'custom-select';
        const selected = document.createElement('div'); selected.className = 'custom-select__selected'; selected.tabIndex = 0;
        const list = document.createElement('div'); list.className = 'custom-select__list';

        Array.from(select.options).forEach(opt => {
          const o = document.createElement('div'); o.className = 'custom-select__option'; o.textContent = opt.textContent; o.dataset.value = opt.value;
          if(opt.disabled) o.setAttribute('aria-disabled','true');
          if(opt.selected) o.setAttribute('aria-selected','true');
          o.addEventListener('click', ()=>{
            select.value = o.dataset.value;
            list.querySelectorAll('.custom-select__option').forEach(x => x.removeAttribute('aria-selected'));
            o.setAttribute('aria-selected','true');
            selected.textContent = o.textContent;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            wrapper.classList.remove('open');
          });
          list.appendChild(o);
          if(opt.selected) selected.textContent = opt.textContent;
        });
        if(!selected.textContent) selected.textContent = (select.options[0] && select.options[0].textContent) || '';
        // hide original select visually but keep it in DOM
        select.style.position = 'absolute'; select.style.left = '-9999px';
        wrapper.appendChild(selected); wrapper.appendChild(list);
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // toggle list
        selected.addEventListener('click', ()=> wrapper.classList.toggle('open'));
        selected.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wrapper.classList.toggle('open'); }
          if(e.key === 'ArrowDown'){ e.preventDefault(); wrapper.classList.add('open'); const first = list.querySelector('.custom-select__option'); if(first) first.focus(); }
        });

        // close on outside click
        document.addEventListener('click', (e)=>{ if(!wrapper.contains(e.target)) wrapper.classList.remove('open'); });

        // sync if original select changes programmatically
        select.addEventListener('change', ()=>{
          const opt = select.options[select.selectedIndex];
          if(opt){ selected.textContent = opt.textContent; list.querySelectorAll('.custom-select__option').forEach(x => { if(x.dataset.value == opt.value) x.setAttribute('aria-selected','true'); else x.removeAttribute('aria-selected'); }); }
        });
      });
    }
    initCustomSelects();
  });

  // Expose helper in case other scripts want it
  window.formsUI = { showToast };
})();