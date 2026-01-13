const express = require('express');
const fs = require('fs');
const multer = require('multer');

const nashModule = require('./nash/gen');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// ----------------------
// GENERATE NASH QUESTION
// ----------------------
app.post('/api/generate/nash', (req, res) => {
    const matrix = nashModule.generatePayoffMatrix();
    const solution = nashModule.findPureNashEquilibria(matrix);

    nashModule.saveInstance(matrix, 'nash/instanta_nash.json');

    // 🔹 WRITE SOLUTION FILE (hidden from user)
    let answerText = "--- RĂSPUNS CORECT NASH ---\n";
    if (solution.length === 0) {
        answerText += "Răspuns: Nu există Echilibru Nash Pur.\n";
    } else {
        answerText += `Răspuns: Da, există ${solution.length} ENP:\n`;
        solution.forEach(([r, c, payoffs]) => {
            answerText += `- S${r}, S${c} (Câștiguri: ${payoffs[0]}, ${payoffs[1]})\n`;
        });
    }

    fs.writeFileSync('nash/_SOLUTIE_nash.txt', answerText);

    res.json({
        question: "Pentru jocul dat în forma normală, există echilibru Nash pur? Care este acesta?",
        matrix
    });
});

// ----------------------
// EVALUATE NASH ANSWER
// ----------------------
app.post('/api/evaluate/nash', upload.single('answer'), (req, res) => {
    const matrix = nashModule.readInstance('nash/instanta_nash.json');
    const correct = nashModule.findPureNashEquilibria(matrix);

    const userData = nashModule.readUserAnswerFile(req.file.path);
    const score = nashModule.evaluateNashAnswer(userData, correct);

    fs.unlinkSync(req.file.path);

    res.json({
        score,
        correctEquilibria: correct
    });
});

app.listen(3000, () => {
    console.log('✅ Server running on http://localhost:3000');
});
