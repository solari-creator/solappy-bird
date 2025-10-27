const tbody = document.querySelector('#scoreTable tbody');
let previousSignatures = new Set();

async function fetchScores() {
  try {
    const res = await fetch('/scores');
    const scores = await res.json();
    
    tbody.innerHTML = '';
    scores.slice(0, 10).forEach((s, index) => {
      const row = document.createElement('tr');
      if (!previousSignatures.has(s.signature)) {
        row.classList.add('highlight');
        previousSignatures.add(s.signature);
      }
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${s.score}</td>
        <td>${s.wallet || 'Unknown'}</td>
        <td>${s.slot}</td>
        <td><span class="share-btn" 
onclick="shareScore('${s.score}')">Share</span></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error fetching scores:', err);
  }
}

function shareScore(score) {
  const url = `https://yourproject.com/?score=${score}`;
  navigator.clipboard.writeText(url)
    .then(() => alert('Score link copied!'));
}

// Initial fetch
fetchScores();
// Poll every 30s
setInterval(fetchScores, 30000);
