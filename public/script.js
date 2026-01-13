const questionEl = document.getElementById('question');
const resultEl = document.getElementById('result');
const fileInput = document.getElementById('answerFile');
const fileNameLabel = document.getElementById('fileName');

fileInput.addEventListener('change', () => {
    fileNameLabel.textContent = fileInput.files.length
        ? fileInput.files[0].name
        : "Niciun fișier selectat";
});

document.getElementById('generateBtn').onclick = async () => {
    const res = await fetch('/api/generate/nash', { method: 'POST' });
    const data = await res.json();

    let text = data.question + "\n\n";
    data.matrix.forEach(row => {
        text += row.map(c => `(${c[0]},${c[1]})`).join('\t') + '\n';
    });

    questionEl.textContent = text;
};

document.getElementById('evaluateBtn').onclick = async () => {
    const fileInput = document.getElementById('answerFile');
    if (!fileInput.files.length) {
        alert("Selectează fișierul cu răspuns!");
        return;
    }

    const formData = new FormData();
    formData.append('answer', fileInput.files[0]);

    const res = await fetch('/api/evaluate/nash', {
        method: 'POST',
        body: formData
    });

    const data = await res.json();

    resultEl.innerHTML = `
        <h3>Rezultat evaluare</h3>
        <div class="score">${data.score}%</div>
        <div class="muted">
            ENP corecte:
            ${data.correctEquilibria.length
                ? data.correctEquilibria.map(e => `(${e[0]},${e[1]})`).join(', ')
                : 'Nu există'}
        </div>
    `;
};
