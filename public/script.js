async function fetchScores() {
  const res = await fetch('/top')
  const scores = await res.json()
  const list = document.getElementById('score-list')
  list.innerHTML = ''
  scores.forEach(s => {
    const li = document.createElement('li')
    li.textContent = `${s.signature}: ${s.score}`
    list.appendChild(li)
  })
}

setInterval(fetchScores, 1000)
fetchScores()
