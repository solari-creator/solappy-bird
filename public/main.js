async function fetchLeaderboard() {
  const res = await fetch('/scores')
  const data = await res.json()

  const leaderboard = document.getElementById('leaderboard')
  leaderboard.innerHTML = ''

  data.forEach((p,i)=>{
    const div = document.createElement('div')
    div.classList.add('player')
    if(i<3) div.classList.add('top3')
    div.innerHTML = `#${i+1} — Wallet: <span class="wallet">${p.wallet}</span> — 
Score: ${p.score}`
    leaderboard.appendChild(div)
  })
}

async function fetchRewards() {
  const res = await fetch('/rewards')
  const rewards = await res.json()

  const rewardsDiv = document.getElementById('rewards')
  rewardsDiv.innerHTML = ''

  if(!rewards.length){
    rewardsDiv.textContent = 'No rewards distributed yet.'
    return
  }

  rewards[0].payouts.forEach(r=>{
    const p = document.createElement('p')
    p.classList.add('reward')
    p.textContent = `Wallet: ${r.wallet} — Reward: 
${(r.lamports/1_000_000).toFixed(3)} SOL`
    rewardsDiv.appendChild(p)
  })
}

fetchLeaderboard()
fetchRewards()
setInterval(fetchLeaderboard,10000)
setInterval(fetchRewards,15000)
