let score = 0;
const scoreEl = document.getElementById('score');
const btn = document.getElementById('startBtn');
const top10El = document.getElementById('top10');

// Kullanıcı imzası (test için sabit)
const userSignature = "player-" + Date.now();

btn.addEventListener('click', async () => {
  score++;
  scoreEl.textContent = score;

  try {
    const response = await fetch('/new-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature: userSignature, score })
    });

    const data = await response.json();
    updateTopScores(data.top10);
  } catch (err) {
    console.error('Error sending score:', err);
  }
});

function updateTopScores(topScores) {
  top10El.innerHTML = '<h3>Top 10 Scores</h3>';
  const ul = document.createElement('ul');
  topScores.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${item.signature}: ${item.score}`;
    ul.appendChild(li);
  });
  top10El.appendChild(ul);
}

// Sayfa yüklenince top10 skorları çek
async function fetchTopScores() {
  try {
    const response = await fetch('/scores');
    const topScores = await response.json();
    updateTopScores(topScores);
  } catch (err) {
    console.error('Error fetching top scores:', err);
  }
}

fetchTopScores();
