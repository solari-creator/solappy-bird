let score = 0;
const scoreEl = document.getElementById('score');
const btn = document.getElementById('startBtn');

// Test için sabit kullanıcı imzası
const userSignature = "test-signature-" + Date.now();

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
  const listEl = document.getElementById('topScores');
  listEl.innerHTML = '';
  topScores.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${item.signature}: ${item.score}`;
    listEl.appendChild(li);
  });
}

// Sayfa yüklendiğinde skorları çek
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
