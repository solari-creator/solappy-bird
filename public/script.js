// public/script.js
// Frontend -> backend endpoints updated to Render URL
let score = 0;
const scoreEl = document.getElementById('score');
const btn = document.getElementById('startBtn');

// create a simple unique signature for testing (replace with wallet 
signature later)
const userSignature = "test-signature-" + Date.now();

async function sendScoreToServer(signature, score) {
  try {
    const resp = await 
fetch('https://solappy-bird.onrender.com/new-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature, score })
    });
    return await resp.json();
  } catch (err) {
    console.error('Network error sending score:', err);
    throw err;
  }
}

btn.addEventListener('click', async () => {
  score++;
  scoreEl.textContent = score;

  try {
    const data = await sendScoreToServer(userSignature, score);
    console.log('Server response:', data);
    if (data && data.top10) {
      updateTopScores(data.top10);
    }
  } catch (err) {
    console.error('Error sending score:', err);
  }
});

function updateTopScores(topScores) {
  let listEl = document.getElementById('topScores');
  if (!listEl) {
    // create container if missing
    listEl = document.createElement('ul');
    listEl.id = 'topScores';
    const container = document.getElementById('top10') || document.body;
    container.appendChild(listEl);
  }
  listEl.innerHTML = '';
  topScores.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${item.signature || 
item.signatureShort || 'sig'} : ${item.score}`;
    listEl.appendChild(li);
  });
}

// fetch initial top scores on load
async function fetchTopScores() {
  try {
    const resp = await fetch('https://solappy-bird.onrender.com/scores');
    const top = await resp.json();
    // server returns array of scores -> ensure format
    updateTopScores(top);
  } catch (err) {
    console.error('Error fetching top scores:', err);
  }
}

document.addEventListener('DOMContentLoaded', fetchTopScores);
