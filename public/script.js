const questionEl = document.getElementById('question');
const resultEl = document.getElementById('result');
const fileInput = document.getElementById('answerFile');
const fileNameLabel = document.getElementById('fileName');
const generateBtn = document.getElementById('generateBtn');
const evaluateBtn = document.getElementById('evaluateBtn');

function removeDiacritics(str) {
    // Normalize to NFD (separate diacritics) and remove them
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


let allQuestions = [];

fileInput.addEventListener('change', () => {
    fileNameLabel.textContent = fileInput.files.length
        ? fileInput.files[0].name
        : "niciun fișier";
});

generateBtn.onclick = async () => {
    try {
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Generare...';

        const nashCount = parseInt(document.getElementById('nashCount').value) || 0;
        const cspCount = parseInt(document.getElementById('cspCount').value) || 0;

        const requests = [];
        if (nashCount > 0) requests.push({ type: 'nash', count: nashCount });
        if (cspCount > 0) requests.push({ type: 'csp', count: cspCount });

        if (requests.length === 0) {
            questionEl.textContent = "Selectați cel puțin o întrebare de generat.";
            return;
        }

        allQuestions = [];

        for (const reqData of requests) {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqData)
            });
            const data = await res.json();
            if (!data.questions) throw new Error("No questions returned from server");

            allQuestions = allQuestions.concat(data.questions.map((q, idx) => ({
                ...q,
                type: reqData.type,
                number: allQuestions.length + idx + 1
            })));
        }

        questionEl.textContent = allQuestions.map(q => {
            let output = `Întrebarea ${q.number} (${q.type.toUpperCase()}):\n`;

            // Insert line breaks for readability in long sentences
            const questionText = q.question
                .replace(/\. /g, '.\n')   // line break after period + space
                .replace(/, /g, ', ');    // keep commas, could add breaks if needed

            output += questionText + '\n\n';

            if (q.type === 'nash' && q.matrix) {
                const matrixText = q.matrix.map(row =>
                    row.map(([r,c]) => `(${r},${c})`).join('   ')
                ).join('\n');
                output += matrixText + '\n';
            }

            if (q.type === 'csp') {
                output += `Variabile: ${q.variables.join(', ')}\nDomenii:\n`;
                output += Object.entries(q.domains)
                    .map(([v,d]) => `  ${v}: {${d.join(', ')}}`)
                    .join('\n');
                output += `\nConstrângeri: ${q.constraints.join(', ')}`;
            }

            return output;
        }).join('\n\n' + '─'.repeat(60) + '\n\n');


        resultEl.innerHTML = `<div style="color: var(--accent); font-weight: 600;">✓ ${allQuestions.length} întrebări generate cu succes!</div>`;

    } catch(e) {
        console.error('Generate error:', e);
        questionEl.textContent = `Eroare: ${e.message}`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '⚡ Generează întrebări';
    }
};

evaluateBtn.onclick = async () => {
    try {
        evaluateBtn.disabled = true;
        evaluateBtn.textContent = '⏳ Evaluare...';
        
        const questionNumbers = document.getElementById('questionNumbers').value
            .split(',')
            .map(x => parseInt(x.trim()))
            .filter(x => !isNaN(x));

        if (!fileInput.files.length) {
            alert("Selectează fișierul cu răspuns!");
            evaluateBtn.disabled = false;
            evaluateBtn.textContent = '📊 Evaluează';
            return;
        }
        if (!questionNumbers.length) {
            alert("Indică cel puțin un număr de întrebare!");
            evaluateBtn.disabled = false;
            evaluateBtn.textContent = '📊 Evaluează';
            return;
        }

        const formData = new FormData();
        formData.append('answer', fileInput.files[0]);
        formData.append('questions', JSON.stringify(questionNumbers));

        const res = await fetch('/api/evaluate-multi', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Network error');
        }

        const data = await res.json();

        let html = `<h3>Rezultat evaluare</h3>`;
        
        data.results.forEach(r => {
            html += `<div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 3px solid var(--accent);">`;
            html += `<div style="font-weight: 600; margin-bottom: 8px; color: var(--accent);">
                        Întrebarea ${r.number} 
                        <span style="color: var(--muted); font-size: 0.9em;">(${r.type ? r.type.toUpperCase() : 'NECUNOSCUT'})</span>
                     </div>`;
            
            if (r.error) {
                html += `<div class="muted" style="color: #ff6b6b;">❌ ${r.error}</div>`;
            } else if (r.type === 'nash') {
                const scoreColor = r.score >= 75 ? '#51cf66' : r.score >= 50 ? '#ffd43b' : '#ff6b6b';
                html += `<div style="font-size: 1.8rem; font-weight: 600; color: ${scoreColor}; margin: 10px 0;">
                            ${r.score}%
                         </div>`;
                html += `<div class="muted" style="margin-top: 8px;">
                            <strong>ENP corecte:</strong> ${
                    r.correctEquilibria && r.correctEquilibria.length
                        ? r.correctEquilibria.map(e => `(Rând ${e[0]}, Coloană ${e[1]})`).join(', ')
                        : 'Nu există echilibru Nash pur'
                }</div>`;
            } else if (r.type === 'csp') {
                const scoreColor = r.score >= 75 ? '#51cf66' : r.score >= 50 ? '#ffd43b' : '#ff6b6b';
                html += `<div style="font-size: 1.8rem; font-weight: 600; color: ${scoreColor}; margin: 10px 0;">
                            ${r.score}%
                         </div>`;
                html += `<div class="muted" style="margin-top: 8px;">
                            <strong>Variabile corecte:</strong> ${r.correct || 0}/${r.total || 0}
                         </div>`;
                if (r.correctAnswer) {
                    html += `<div class="muted" style="margin-top: 8px; font-family: 'JetBrains Mono', monospace;">
                                <strong>Soluție corectă:</strong> ${
                        Object.entries(r.correctAnswer).map(([k,v]) => `${k} = ${v}`).join(', ')
                    }</div>`;
                }
            }
            
            html += `</div>`;
        });

        resultEl.innerHTML = html;
    } catch (error) {
        console.error('Evaluate error:', error);
        resultEl.innerHTML = `<h3 style="color: #ff6b6b;">⚠️ Eroare</h3><div class="muted">${error.message}</div>`;
    } finally {
        evaluateBtn.disabled = false;
        evaluateBtn.textContent = '📊 Evaluează';
    }
};

document.getElementById('downloadPdfBtn').onclick = async () => {
    if (!allQuestions.length) {
        alert("Nu există întrebări de descărcat!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setFont("times");  // safe built-in font


    // PDF margins & line height
    const margin = 40;
    const maxWidth = 520; // width to wrap text inside page margins
    const lineHeight = 14;
    let y = 40;

    allQuestions.forEach((q, i) => {
        // Question title
        if (y > 770) { doc.addPage(); y = margin; }
        doc.setFontSize(14);
        doc.text(`Intrebarea ${i + 1} (${q.type.toUpperCase()}):`, margin, y);
        y += 20;

        doc.setFontSize(12);

        // Clean the question text
        let cleanQuestion = q.question
            .replace(/\r?\n/g, ' ')   // remove raw line breaks
            .replace(/\t/g, ' ')      // remove tabs
            .replace(/[^\S ]+/g, '')  // remove invisible characters
            .trim();

        // Remove diacritics
        cleanQuestion = removeDiacritics(cleanQuestion);

        // Split and render
        const questionLines = doc.splitTextToSize(cleanQuestion, maxWidth);
        questionLines.forEach(line => {
            if (y > 770) {
                doc.addPage();
                y = margin;
            }
            doc.text(String(line), margin, y);
            y += lineHeight;
        });
        y += 8;

        // Matrix (for Nash)
        if (q.matrix) {
            const matrixText = q.matrix.map(row => row.map(([r,c]) => `(${r},${c})`).join('   ')).join('\n');
            const matrixLines = doc.splitTextToSize(`${matrixText}`, maxWidth);
            matrixLines.forEach(line => {
                if (y > 770) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += lineHeight;
            });
            y += 8;
        }

        // CSP variables/domains/constraints
        if (q.type === 'csp') {
            const varsText = `Variabile: ${q.variables.join(', ')}`;
            const varsLines = doc.splitTextToSize(varsText, maxWidth);
            varsLines.forEach(line => {
                if (y > 770) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += lineHeight;
            });

            const domainsText = 'Domenii:\n' + Object.entries(q.domains).map(([v,d]) => `  ${v}: {${d.join(', ')}}`).join('\n');
            const domainLines = doc.splitTextToSize(domainsText, maxWidth);
            domainLines.forEach(line => {
                if (y > 770) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += lineHeight;
            });

            const constraintsText = 'Constrangeri: ' + q.constraints.join(', ');
            const constraintLines = doc.splitTextToSize(constraintsText, maxWidth);
            constraintLines.forEach(line => {
                if (y > 770) { doc.addPage(); y = margin; }
                doc.text(line, margin, y);
                y += lineHeight;
            });

            y += 8;
        }

        y += 20;
    });

    doc.save("SmarTest_Intrebari.pdf");

};
