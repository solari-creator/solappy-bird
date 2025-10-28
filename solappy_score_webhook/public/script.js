async function fetchScores() {
  const res = await fetch('/scores');
  const data = await res.json();
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = '';
  data.forEach((item, index) => {
    const row = `<tr>
      <td>${index + 1}</td>
      <td>${item.score}</td>
      <td>${item.signature}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

fetchScores();
