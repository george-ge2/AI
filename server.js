const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Fixed paths - modules are in root directory
const nashModule = require('./nash/gen');
const cspModule = require('./csp/csp');
const minmaxModule = require('./minmax/minimax');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Create directories if they don't exist
if (!fs.existsSync('nash')) fs.mkdirSync('nash');
if (!fs.existsSync('csp')) fs.mkdirSync('csp');
if (!fs.existsSync('minmax')) fs.mkdirSync('minmax');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

function wipeAllGeneratedFiles() {
    ['nash', 'csp', 'minmax'].forEach(folder => {
        if (fs.existsSync(folder)) {
            const files = fs.readdirSync(folder);
            files.forEach(file => {
                // Ștergem doar fișierele generate, NU codul sursă (.js)
                if (file.startsWith('instanta_') || file.startsWith('_SOLUTIE_')) {
                    try { fs.unlinkSync(path.join(folder, file)); } catch(e){}
                }
            });
        }
    });
    console.log('[WIPE] Am șters istoricul vechi (Nash, CSP, MinMax). Începem de la 1.');
}

// ----------------------
// HELPER: Get Global Question Number (Unic peste toate tipurile)
// ----------------------
function getNextGlobalQuestionNumber() {
    let maxNum = 0;
    const dirs = ['nash', 'csp', 'minmax'];

    dirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.startsWith('instanta_') && f.endsWith('.json'));
            files.forEach(f => {
                const match = f.match(/instanta_(\d+)\.json/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });
        }
    });
    
    return maxNum + 1;
}

// ----------------------
// HELPER: Parse Nash Answer (Local Robust Parser)
// ----------------------
function parseNashAnswerText(text) {
    console.log('[DEBUG] Parsing Nash answer:', text);
    
    const noEquilibrium = /nu\s+exist[ăa]/i.test(text);
    const hasEquilibrium = /da|exist[ăa]/i.test(text) && !noEquilibrium;
    
    if (noEquilibrium) {
        return { studentSaysExists: false, pairs: [] };
    }
    
    const pairs = [];
    
    // Pattern 1: (1,2)
    const regex1 = /\((\d+)\s*,\s*(\d+)\)/g;
    let match;
    while ((match = regex1.exec(text)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
    }
    
    // Pattern 2: (Rând 1, Coloană 2)
    const regex2 = /\(r[aă]nd\s+(\d+)\s*,\s*coloan[ăa]\s+(\d+)\)/gi;
    while ((match = regex2.exec(text)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
    }
    
    // Pattern 3: [1,2]
    const regex3 = /\[(\d+)\s*,\s*(\d+)\]/g;
    while ((match = regex3.exec(text)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
    }
    
    // Pattern 4: R1C2
    const regex4 = /r(\d+)c(\d+)/gi;
    while ((match = regex4.exec(text)) !== null) {
        pairs.push([parseInt(match[1]), parseInt(match[2])]);
    }
    
    // Elimină duplicate
    const uniquePairs = [];
    const seen = new Set();
    for (const [r, c] of pairs) {
        const key = `${r},${c}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniquePairs.push([r, c]);
        }
    }
    
    return {
        studentSaysExists: hasEquilibrium || uniquePairs.length > 0,
        pairs: uniquePairs
    };
}

// ----------------------
// HELPER: Compare Nash Equilibria (Fallback)
// ----------------------
function compareNashEquilibria(userEquilibria, correctEquilibria) {
    const correctSet = correctEquilibria.map(([r, c]) => `${r},${c}`);
    const userSet = userEquilibria.map(([r, c]) => `${r},${c}`);
    const correctCount = correctSet.filter(pair => userSet.includes(pair)).length;
    if (correctSet.length === correctCount && userSet.length === correctSet.length) return 100;
    return 0;
}

// ----------------------
// GENERATE QUESTIONS (FĂRĂ ȘTERGERE, CU ID GLOBAL)
// ----------------------
app.post('/api/generate', (req, res) => {
    const { type, count } = req.body;
    if (!type || !count || count < 1) {
        return res.status(400).json({ error: "Specify 'type' and 'count' > 0" });
    }

    // AM SCOS clearFolder() de aici!
    // Vrem ca întrebările să se păstreze și să crească indexul (1, 2, 3...)

    wipeAllGeneratedFiles();

    const questions = [];

    for (let i = 0; i < count; i++) {
        // Folosim ID global ca să nu avem duplicate între tipuri
        const globalIndex = getNextGlobalQuestionNumber();

        if (type === 'nash') {
            const matrix = nashModule.generatePayoffMatrix();
            const solution = nashModule.findPureNashEquilibria(matrix);

            const instanceFile = `nash/instanta_${globalIndex}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify(matrix, null, 2));

            const solutionFile = `nash/_SOLUTIE_nash_${globalIndex}.txt`;
            const solutionText = Array.isArray(solution) && solution.length > 0
                ? `Da, există echilibru Nash pur.\nEchilibrul Nash pur: ` +
                  solution.map(([r,c]) => `(${r},${c})`).join(', ')
                : 'Nu există echilibru Nash pur.';
            fs.writeFileSync(solutionFile, solutionText, 'utf8');
            console.log(`[Gen] Nash Q${globalIndex} salvat.`);

            questions.push({
                number: globalIndex,
                type: 'nash',
                question: `Pentru jocul dat în forma normală, există echilibru Nash pur? Care este acesta?`,
                matrix,
                solution: solutionText
            });
        }
        else if (type === 'csp') {
            const instance = cspModule.generateCSPForWeb();

            const instanceFile = `csp/instanta_${globalIndex}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify({
                variables: instance.variables,
                domains: instance.domains,
                constraints: instance.constraints
            }, null, 2));

            const solutionFile = `csp/_SOLUTIE_csp_${globalIndex}.txt`;
            const solutionText = instance.correctAnswer
                ? JSON.stringify(instance.correctAnswer, null, 2)
                : 'Nu există soluție definită';
            fs.writeFileSync(solutionFile, solutionText, 'utf8');
            console.log(`[Gen] CSP Q${globalIndex} salvat.`);

            questions.push({
                number: globalIndex,
                type: 'csp',
                question: instance.enunt,
                variables: instance.variables,
                domains: instance.domains,
                constraints: instance.constraints,
                solution: solutionText
            });
        }
        else if (type === 'minmax') {
            const depth = Math.floor(Math.random() * 3) + 2;
            const branching = Math.floor(Math.random() * 3) + 2;
            const tree = minmaxModule.generateGameTree(depth, branching, 1, 10);
            const result = minmaxModule.minimaxAlphaBeta(tree.root);

            const instanceFile = `minmax/instanta_${globalIndex}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify(tree, null, 2));

            const solutionFile = `minmax/_SOLUTIE_minmax_${globalIndex}.json`;
            fs.writeFileSync(solutionFile, JSON.stringify({
                rootValue: result.rootValue,
                leavesVisited: result.leavesVisited
            }, null, 2), 'utf8');

            const questionStr = `Pentru arborele de joc dat, aplicați MinMax cu Alpha-Beta pruning.\n\n` +
                                `${minmaxModule.renderTree(tree.root)}`;

            questions.push({
                number: globalIndex,
                type: 'minmax',
                question: questionStr,
                solution: `Valoare rădăcină: ${result.rootValue}, Frunze vizitate: ${result.leavesVisited}`
            });
        }
    }

    res.json({ questions });
});

// Rută opțională pentru resetare manuală
app.get('/api/reset', (req, res) => {
    clearFolder('nash');
    clearFolder('csp');
    clearFolder('minmax');
    res.send('Toate întrebările au fost șterse! Următoarea va fi Q1.');
});

// ----------------------
// EVALUATE MULTI (FINAL & ROBUST)
// ----------------------
app.post('/api/evaluate-multi', upload.single('answer'), async (req, res) => {
    try {
        const questionNumbers = JSON.parse(req.body.questions || '[]');
        if (!req.file) return res.status(400).json({ error: "No file" });

        console.log(`[EVALUARE] Se cer întrebările: ${questionNumbers}`);

        // A. Citire conținut (PDF sau TXT)
        let content = "";
        if (req.file.mimetype === 'application/pdf') {
            try {
                const pdfParse = require('pdf-parse');
                const dataBuffer = fs.readFileSync(req.file.path);
                // Detectăm dacă e funcție sau obiect (pt compatibilitate)
                const pdfFunc = (typeof pdfParse === 'function') ? pdfParse : pdfParse.default;
                const pdfData = await pdfFunc(dataBuffer);
                content = pdfData.text;
            } catch (e) {
                console.error("Eroare PDF:", e);
                return res.status(500).json({ error: "Eroare PDF: " + e.message });
            }
        } else {
            content = fs.readFileSync(req.file.path, 'utf-8');
        }
        fs.unlinkSync(req.file.path);

        // B. Spargere pe întrebări (1. Răspuns...)
        const lines = content.split(/\r?\n/);
        const questionMap = {};
        let currentQ = null;
        let buffer = [];

        lines.forEach(line => {
            const match = line.match(/^\s*(?:întrebarea\s+|q\s*)?(\d+)[\.\)\]:]\s*(.*)$/i);
            if (match) {
                if (currentQ !== null) questionMap[currentQ] = buffer.join('\n').trim();
                currentQ = parseInt(match[1]);
                buffer = [match[2] || ''];
            } else if (currentQ !== null) {
                buffer.push(line);
            } else {
                buffer.push(line); 
            }
        });
        if (currentQ !== null) questionMap[currentQ] = buffer.join('\n').trim();

        // Fallback: Dacă nu există "1.", tot textul e pentru prima întrebare
        if (Object.keys(questionMap).length === 0 && content.trim().length > 0 && questionNumbers.length > 0) {
            questionMap[questionNumbers[0]] = content;
        }

        const results = [];

        // C. Evaluare efectivă
        for (const qNum of questionNumbers) {
            const userAnswerText = questionMap[qNum] || "";
            
            const nashPath = `nash/instanta_${qNum}.json`;
            const cspPath = `csp/instanta_${qNum}.json`;
            const cspSolPath = `csp/_SOLUTIE_csp_${qNum}.txt`;
            const minmaxPath = `minmax/instanta_${qNum}.json`;
            const minmaxSolPath = `minmax/_SOLUTIE_minmax_${qNum}.json`;

            // --- NASH ---
            if (fs.existsSync(nashPath)) {
                const matrix = JSON.parse(fs.readFileSync(nashPath));
                const correctENP = nashModule.findPureNashEquilibria(matrix);
                const userData = parseNashAnswerText(userAnswerText);
                
                let score = 0;
                if (nashModule.evaluateNashAnswer) {
                    score = nashModule.evaluateNashAnswer(userData, correctENP);
                } else {
                    score = compareNashEquilibria(userData.pairs, correctENP);
                }
                results.push({ number: qNum, type: 'nash', score, correctEquilibria: correctENP });
            }
            
            // --- CSP ---
            else if (fs.existsSync(cspPath)) {
                if (!fs.existsSync(cspSolPath)) {
                    results.push({ number: qNum, type: 'csp', score: 0, error: "Soluție lipsă pe server" });
                    continue;
                }
                const correctAnswer = JSON.parse(fs.readFileSync(cspSolPath, 'utf-8'));
                
                // FIX CSP: Extragem JSON-ul din text (ignorăm "2." sau alte cuvinte)
                let cleanJsonText = userAnswerText;
                const jsonMatch = userAnswerText.match(/\{[\s\S]*\}/); // Găsește tot ce e între { }
                if (jsonMatch) cleanJsonText = jsonMatch[0];

                let evaluation = { score: 0 };
                try {
                    evaluation = cspModule.evaluateCSPTextAnswer(cleanJsonText, correctAnswer);
                } catch(e) { console.error("CSP Eval Error:", e); }
                
                results.push({ number: qNum, type: 'csp', ...evaluation });
            }

            // --- MINMAX ---
            else if (fs.existsSync(minmaxPath)) {
                console.log(`\n[DEBUG MINMAX] Începem evaluarea întrebării ${qNum}...`);
                
                // 1. Verificăm dacă există soluția pe server
                if (!fs.existsSync(minmaxSolPath)) {
                    console.log(`[ERROR MINMAX] Nu am găsit fișierul soluție: ${minmaxSolPath}`);
                    results.push({ number: qNum, type: 'minmax', score: 0, error: "Soluție lipsă pe server" });
                    continue;
                }
                const correctResult = JSON.parse(fs.readFileSync(minmaxSolPath, 'utf-8'));
                console.log(`[DEBUG MINMAX] Valori Corecte -> Root: ${correctResult.rootValue}, Frunze: ${correctResult.leavesVisited}`);

                // 2. Verificăm ce text a trimis studentul
                console.log(`[DEBUG MINMAX] Text Student Brut: "${userAnswerText}"`);
                
                // 3. Extragere Valori (Metoda Deșteaptă)
                // Căutăm numere, dar încercăm să evităm numărul întrebării (ex: "3.")
                
                let userRoot = null;
                let userLeaves = null;

                // Încercare 1: Căutare după cuvinte cheie (mai sigur)
                // Caută "radacina ... : 4" sau "root ... 4"
                const rootRegex = /(?:radacina|rădăcină|root|valoare)[^0-9-]*(-?\d+)/i;
                const leavesRegex = /(?:frunze|noduri|vizitate|leaves|visited)[^0-9]*(\d+)/i;

                const rootMatch = userAnswerText.match(rootRegex);
                const leavesMatch = userAnswerText.match(leavesRegex);

                if (rootMatch) userRoot = parseInt(rootMatch[1]);
                if (leavesMatch) userLeaves = parseInt(leavesMatch[1]);

                // Încercare 2: Fallback la "orice număr găsim", dar ignorăm primele caractere dacă seamănă cu "3."
                if (userRoot === null || userLeaves === null) {
                    console.log(`[DEBUG MINMAX] Nu am găsit cuvinte cheie, trec pe metoda "brută"...`);
                    
                    // Curățăm începutul liniei dacă pare a fi un ID (ex: "3." sau "3)")
                    // Regex: La început (^), spații, cifre, punct/paranteză
                    const cleanText = userAnswerText.replace(/^\s*\d+[\.\):]\s*/, ''); 
                    
                    const allNumbers = (cleanText.match(/-?\d+/g) || []).map(Number);
                    console.log(`[DEBUG MINMAX] Numere găsite în textul curățat: ${allNumbers}`);

                    if (allNumbers.length >= 2) {
                        userRoot = allNumbers[0];
                        userLeaves = allNumbers[1];
                    } else if (allNumbers.length === 1) {
                        userRoot = allNumbers[0];
                    }
                }

                console.log(`[DEBUG MINMAX] Am extras -> Root: ${userRoot}, Frunze: ${userLeaves}`);

                // 4. Calcul Scor
                let score = 0;
                const rootCorrect = (userRoot !== null && userRoot === correctResult.rootValue);
                const leavesCorrect = (userLeaves !== null && userLeaves === correctResult.leavesVisited);

                if (rootCorrect && leavesCorrect) score = 100;
                else if (rootCorrect || leavesCorrect) score = 50;
                
                console.log(`[DEBUG MINMAX] Scor final: ${score}`);

                results.push({ 
                    number: qNum, type: 'minmax', score, 
                    correctRoot: correctResult.rootValue, correctLeaves: correctResult.leavesVisited,
                    extractedRoot: userRoot, extractedLeaves: userLeaves
                });
            }
            
            // --- UNKNOWN ---
            else {
                results.push({ number: qNum, type: 'unknown', score: 0, error: "Întrebarea nu a fost găsită pe server (ID greșit?)" });
            }
        }

        res.json({ results });

    } catch (err) {
        console.error("Critical Error:", err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});