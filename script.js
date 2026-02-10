async function loadAttendance() {
  const res = await fetch("/api/attendance");
  const data = await res.json();

  const table = document.getElementById("attendance-table");
  table.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.code}</td>
      <td>${new Date(row.timestamp).toLocaleString()}</td>
    `;
    table.appendChild(tr);
  });
}

// refresh every 2 seconds
setInterval(loadAttendance, 2000);
loadAttendance();
