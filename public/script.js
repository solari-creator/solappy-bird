document.getElementById('playBtn').addEventListener('click', async () => {
    const response = await fetch('/scores');
    const data = await response.json();
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = '';
    data.forEach((item, index) => {
        const p = document.createElement('p');
        p.textContent = `${index + 1}. ${item.signature} - ${item.score}`;
        scoresDiv.appendChild(p);
    });
});
