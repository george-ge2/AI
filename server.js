const express = require('express');
const fs = require('fs');
const multer = require('multer');

// Fixed paths - modules are in root directory
const nashModule = require('./nash/gen');
const cspModule = require('./csp/csp');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Create directories if they don't exist
if (!fs.existsSync('nash')) fs.mkdirSync('nash');
if (!fs.existsSync('csp')) fs.mkdirSync('csp');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Helper to get next available question number for a type
function getNextQuestionNumber(type) {
    const dir = type === 'nash' ? 'nash' : 'csp';
    if (!fs.existsSync(dir)) return 1;
    
    const files = fs.readdirSync(dir).filter(f => f.startsWith('instanta_') && f.endsWith('.json'));
    if (files.length === 0) return 1;
    
    const numbers = files.map(f => {
        const match = f.match(/instanta_(\d+)\.json/);
        return match ? parseInt(match[1]) : 0;
    });
    
    return Math.max(...numbers) + 1;
}

// ----------------------
// GENERATE QUESTIONS
// ----------------------
app.post('/api/generate', (req, res) => {
    const { type, count } = req.body;
    if (!type || !count || count < 1) {
        return res.status(400).json({ error: "Specify 'type' and 'count' > 0" });
    }

    const questions = [];

    for (let i = 0; i < count; i++) {
        if (type === 'nash') {
            const index = getNextQuestionNumber('nash');

            // --- Generate matrix and solution ---
            const matrix = nashModule.generatePayoffMatrix();
            const solution = nashModule.findPureNashEquilibria(matrix);

            // --- Save instance ---
            const instanceFile = `nash/instanta_${index}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify(matrix, null, 2));

            // --- Save solution as text ---
            const solutionFile = `nash/_SOLUTIE_nash_${index}.txt`;
            const solutionText = Array.isArray(solution) && solution.length > 0
                ? `Da, există echilibru Nash pur.\nEchilibrul Nash pur: ` +
                  solution.map(([r,c]) => `(${r},${c})`).join(', ')
                : 'Nu există echilibru Nash pur.';
            fs.writeFileSync(solutionFile, solutionText, 'utf8');
            console.log(`[Persistență] Soluția Nash salvată în ${solutionFile}`);

            // --- Push question object ---
            questions.push({
                number: index,
                type: 'nash',
                question: `Pentru jocul dat în forma normală, există echilibru Nash pur? Care este acesta?`,
                matrix,
                solution: solutionText
            });
        }
        else if (type === 'csp') {
            const cspNumber = getNextQuestionNumber('csp');
            const instance = cspModule.generateCSPForWeb();

            // --- Save instance ---
            const instanceFile = `csp/instanta_${cspNumber}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify({
                variables: instance.variables,
                domains: instance.domains,
                constraints: instance.constraints
            }, null, 2));

            // --- Save solution as text ---
            const solutionFile = `csp/_SOLUTIE_csp_${cspNumber}.txt`;
            const solutionText = instance.correctAnswer
                ? JSON.stringify(instance.correctAnswer, null, 2)
                : 'Nu există soluție definită';
            fs.writeFileSync(solutionFile, solutionText, 'utf8');
            console.log(`[Persistență] Soluția CSP salvată în ${solutionFile}`);

            // --- Push question object ---
            questions.push({
                number: cspNumber,
                type: 'csp',
                question: instance.enunt,
                variables: instance.variables,
                domains: instance.domains,
                constraints: instance.constraints,
                solution: solutionText
            });
        }
    }

    res.json({ questions });
});



// ----------------------
// EVALUATE MULTI
// ----------------------
app.post('/api/evaluate-multi', upload.single('answer'), (req, res) => {
    try {
        const questionNumbers = JSON.parse(req.body.questions || '[]');
        if (!questionNumbers.length) {
            return res.status(400).json({ error: "No questions specified" });
        }

        const content = fs.readFileSync(req.file.path, 'utf-8');
        fs.unlinkSync(req.file.path);

        const lines = content.split(/\r?\n/);

        // Build a map: questionNumber -> answerText
        const questionMap = {};
        let currentQ = null;
        let buffer = [];

        lines.forEach(line => {
            const match = line.match(/^\s*(\d+)[\.\)\]]\s*(.*)$/);
            if (match) {
                // Save previous buffer
                if (currentQ !== null) {
                    questionMap[currentQ] = buffer.join('\n').trim();
                }
                currentQ = parseInt(match[1]);
                buffer = [match[2] || ''];
            } else if (currentQ !== null) {
                buffer.push(line);
            }
        });
        // save last question
        if (currentQ !== null) {
            questionMap[currentQ] = buffer.join('\n').trim();
        }

        // Evaluate each requested question
        const results = [];

        questionNumbers.forEach(qNum => {
            const userAnswerText = questionMap[qNum] || "";

            const nashInstance = `nash/instanta_${qNum}.json`;
            const nashSolution = `nash/_SOLUTIE_nash_${qNum}.txt`;
            const cspInstance = `csp/instanta_${qNum}.json`;
            const cspSolution = `csp/_SOLUTIE_csp_${qNum}.json`;

            // -------- Check NASH first --------
            if (fs.existsSync(nashInstance)) {
                const matrix = nashModule.readInstance(nashInstance);
                const correctENP = nashModule.findPureNashEquilibria(matrix);

                const userData = nashModule.parseAnswerText(userAnswerText);
                const score = nashModule.evaluateNashAnswer(userData, correctENP);

                results.push({
                    number: qNum,
                    type: 'nash',
                    score,
                    correctEquilibria: correctENP.map(([r, c]) => [r, c])
                });
                return;
            }

            // -------- Check CSP --------
            if (fs.existsSync(cspInstance) && fs.existsSync(cspSolution)) {
                const correctAnswer = JSON.parse(
                    fs.readFileSync(cspSolution, 'utf-8')
                );

                const evaluation = cspModule.evaluateCSPTextAnswer(
                    userAnswerText,
                    correctAnswer
                );

                results.push({
                    number: qNum,
                    type: 'csp',
                    score: evaluation.score,
                    percentage: evaluation.percentage,
                    correct: evaluation.correct,
                    total: evaluation.total,
                    correctAnswer
                });
                return;
            }

            // -------- UNKNOWN --------
            results.push({
                number: qNum,
                type: 'unknown',
                score: 0,
                error: `Instanța pentru întrebarea ${qNum} nu există. Verificați dacă ați generat această întrebare.`
            });
        });

        res.json({ results });

    } catch (err) {
        console.error('Evaluate error:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});