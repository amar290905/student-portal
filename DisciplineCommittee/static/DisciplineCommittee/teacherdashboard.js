// Teacher dashboard scripts (activity table loader)
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("activityBody");
  const totalCases = document.getElementById("totalCases");
  const noData = document.getElementById("noData");

  if (!tableBody) return;

  function loadCases() {
    const arr = JSON.parse(localStorage.getItem("cases")) || [];
    return arr;
  }

  function saveCases(arr){
    localStorage.setItem('cases', JSON.stringify(arr));
    // update other tabs
    try{ window.dispatchEvent(new Event('storage')); }catch(e){}
  }

  function render() {
    const cases = loadCases();
    tableBody.innerHTML = '';
    if (totalCases) totalCases.textContent = cases.length;
    if (cases.length === 0) {
      if (noData) noData.style.display = "block";
      return;
    }
    if (noData) noData.style.display = "none";

    cases.forEach((item, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.student}</td>
        <td>${item.category}</td>
        <td>${item.date}</td>
        <td>
          <button class="btn btn-sm" data-idx="${idx}" onclick="editCase(${idx})">Edit</button>
          <button class="btn btn-sm danger" data-idx="${idx}" onclick="deleteCase(${idx})">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // expose global handlers for inline onclick usage
  window.editCase = function(idx){
    const arr = loadCases();
    if(!arr[idx]) return alert('Case not found');
    const current = arr[idx];
    const newStudent = prompt('Edit student name:', current.student || '');
    if(newStudent === null) return; // cancelled
    const newCategory = prompt('Edit category:', current.category || '');
    if(newCategory === null) return;
    const newDate = prompt('Edit date (YYYY-MM-DD):', current.date || '');
    if(newDate === null) return;
    arr[idx] = { ...current, student: newStudent.trim(), category: newCategory.trim(), date: newDate.trim() };
    saveCases(arr);
    render();
  };

  window.deleteCase = function(idx){
    const arr = loadCases();
    if(!arr[idx]) return alert('Case not found');
    const ok = confirm(`Delete case for "${arr[idx].student}" (${arr[idx].category})?`);
    if(!ok) return;
    arr.splice(idx,1);
    saveCases(arr);
    render();
  };

  // initial render
  render();

  // listen for storage changes from other tabs
  window.addEventListener('storage', (e)=>{
    if(e.key === 'cases' || e.type === 'storage') render();
  });
});