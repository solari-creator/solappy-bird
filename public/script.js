document.getElementById('playButton').addEventListener('click', async () => {
  const score = Math.floor(Math.random() * 1000); 
  const signature = "testsig"; 

  const res = await fetch('/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signature, score })
  });
  const data = await res.json();
  console.log(data);

  loadScores();
});

async function loadScores() {
  const res = await fetch('/top10');
  const top10 = await res.json();
  const tbody = document.querySelector('#scoreTable tbody');
  tbody.innerHTML = '';
  top10.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = 
`<td>${idx+1}</td><td>${row.score}</td><td>${row.signature}</td><td>${row.slot}</td>`;
    tbody.appendChild(tr);
  });
}

loadScores();
