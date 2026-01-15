const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Fixed paths - modules are in root directory
const nashModule = require('./nash/gen');
const cspModule = require('./csp/csp');
const minmaxModule = require('./minmax/minimax');
const strategyModule = require('./strategy/index.js');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Create directories if they don't exist
if (!fs.existsSync('nash')) fs.mkdirSync('nash');
if (!fs.existsSync('csp')) fs.mkdirSync('csp');
if (!fs.existsSync('minmax')) fs.mkdirSync('minmax');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('strategy')) fs.mkdirSync('strategy');

function wipeAllGeneratedFiles() {
    ['nash', 'csp', 'minmax', 'strategy'].forEach(folder => {
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
    console.log('[WIPE] Am șters istoricul vechi (Nash, CSP, MinMax, Strategy). Începem de la 1.');
}

// ----------------------
// HELPER: Get Global Question Number (Unic peste toate tipurile)
// ----------------------
function getNextGlobalQuestionNumber() {
    let maxNum = 0;
    const dirs = ['nash', 'csp', 'minmax', 'strategy'];

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
        else if (type === 'strategy') {
            const question = strategyModule.generateQuestion();
            
            const instanceFile = `strategy/instanta_${globalIndex}.json`;
            fs.writeFileSync(instanceFile, JSON.stringify({
                problemType: question.problemType,
                instance: question.instance,
                optimalStrategies: question.optimalStrategies,  // Fixed: was allOptimal
                goodStrategies: question.goodStrategies,
                workingStrategies: question.workingStrategies,
                unsuitableStrategies: question.unsuitableStrategies
            }, null, 2));

            const solutionFile = `strategy/_SOLUTIE_strategy_${globalIndex}.txt`;
            const solutionText = `Strategie optimă: ${question.optimalStrategies[0]}\n` +
                                `Strategii optime: ${question.optimalStrategies.join(', ')}`;
            fs.writeFileSync(solutionFile, solutionText, 'utf8');
            
            console.log(`[Gen] Strategy Q${globalIndex} salvat.`);

            questions.push({
                number: globalIndex,
                type: 'strategy',
                question: question.enunt,
                problemType: question.problemType,
                instance: question.instance,
                solution: solutionText
            });
        }
    }

    res.json({ questions });
});

// Rută opțională pentru resetare manuală
app.get('/api/reset', (req, res) => {
    wipeAllGeneratedFiles();
    res.send('Reset efectuat.');
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
            else if (fs.existsSync(`strategy/instanta_${qNum}.json`)) {
                const strategyPath = `strategy/instanta_${qNum}.json`;
                const strategyData = JSON.parse(fs.readFileSync(strategyPath, 'utf-8'));
                
                // Create a question object compatible with evaluateAnswer
                const questionForEval = {
                    problemType: strategyData.problemType,
                    instance: strategyData.instance,
                    optimalStrategies: strategyData.optimalStrategies,
                    goodStrategies: strategyData.goodStrategies || [],
                    workingStrategies: strategyData.workingStrategies || [],
                    unsuitableStrategies: strategyData.unsuitableStrategies || []
                };
                
                const evaluation = strategyModule.evaluateAnswer(userAnswerText, questionForEval);
                
                results.push({
                    number: qNum,
                    type: 'strategy',
                    score: evaluation.score,
                    detectedStrategy: evaluation.detectedStrategy,
                    correctAnswer: strategyData.optimalStrategies[0],
                    feedback: evaluation.feedback ? evaluation.feedback.join('\n') : ''
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

// ---------------------------------------------------------
// 7. RUTA "ORACLE" & "UNIVERSAL SOLVER"
// ---------------------------------------------------------
app.post('/api/ask', (req, res) => {
    const { questionNumber, query } = req.body;
    
    if (!query) return res.status(400).json({ answer: "⚠️ Scrie enunțul problemei." });

    const text = query.toLowerCase();
    const qNum = parseInt(questionNumber) || 0; // 0 înseamnă mod SOLVER

    // =========================================================
    // MODUL A: SOLVER (Calculează pe loc din textul tău)
    // =========================================================
    if (qNum === 0) {
        let response = "";

        // --- 1. DETECTARE NASH ---
        // Caută perechi: (3,1) (0,2)...
        const nashPairs = [];
        const nashRegex = /\((\d+)\s*,\s*(\d+)\)/g;
        let nMatch;
        while ((nMatch = nashRegex.exec(text)) !== null) {
            nashPairs.push([parseInt(nMatch[1]), parseInt(nMatch[2])]);
        }

        if (nashPairs.length >= 4) {
            // Presupunem matrice pătratică
            const size = Math.sqrt(nashPairs.length);
            if (Number.isInteger(size)) {
                const matrix = [];
                for (let i = 0; i < size; i++) {
                    const row = [];
                    for (let j = 0; j < size; j++) {
                        row.push(nashPairs[i * size + j]);
                    }
                    matrix.push(row);
                }
                const solution = nashModule.findPureNashEquilibria(matrix);
                const solStr = solution.length > 0 ? solution.map(p => `(${p[0]},${p[1]})`).join(', ') : "Nu există echilibru pur.";
                
                return res.json({ 
                    answer: `🧮 **SOLVER NASH**\nAm detectat o matrice ${size}x${size}.\n\n**Soluția:** ${solStr}` 
                });
            }
        }

        // --- 2. DETECTARE CSP ---
        // Format așteptat: A={1,2} B={1,2} A!=B
        if (text.includes('={') || text.includes('!=')) {
            try {
                // a) Extragem domeniile: Litera={cifre}
                const domains = {};
                const domRegex = /([a-z])\s*=\s*\{([0-9,\s]+)\}/g;
                let dMatch;
                while ((dMatch = domRegex.exec(text)) !== null) {
                    const v = dMatch[1].toUpperCase();
                    const vals = dMatch[2].split(',').map(x => parseInt(x.trim()));
                    domains[v] = vals;
                }

                // b) Extragem constrângerile: A!=B, A>B, A<B
                const constraints = [];
                const conRegex = /([a-z])\s*(!=|<|>)\s*([a-z])/g;
                let cMatch;
                while ((cMatch = conRegex.exec(text)) !== null) {
                    constraints.push({
                        var1: cMatch[1].toUpperCase(),
                        operator: cMatch[2],
                        var2: cMatch[3].toUpperCase()
                    });
                }

                const vars = Object.keys(domains);

                if (vars.length > 0) {
                    // c) Mini-Solver Backtracking (Local)
                    const solveCSP = (assignment) => {
                        if (Object.keys(assignment).length === vars.length) return assignment;
                        
                        const unassigned = vars.find(v => !(v in assignment));
                        for (const val of domains[unassigned]) {
                            const nextAssignment = { ...assignment, [unassigned]: val };
                            
                            // Verificăm constrângerile
                            const valid = constraints.every(c => {
                                if ((c.var1 in nextAssignment) && (c.var2 in nextAssignment)) {
                                    const a = nextAssignment[c.var1];
                                    const b = nextAssignment[c.var2];
                                    if (c.operator === '!=') return a !== b;
                                    if (c.operator === '<') return a < b;
                                    if (c.operator === '>') return a > b;
                                }
                                return true;
                            });

                            if (valid) {
                                const res = solveCSP(nextAssignment);
                                if (res) return res;
                            }
                        }
                        return null;
                    };

                    const result = solveCSP({});
                    const solText = result 
                        ? Object.entries(result).map(([k,v]) => `${k}=${v}`).join(', ') 
                        : "Nu există soluție.";

                    return res.json({ 
                        answer: `🧮 **SOLVER CSP**\nVariabile: ${vars.join(', ')}\nConstrângeri: ${constraints.length}\n\n**Soluția:** ${solText}` 
                    });
                }
            } catch (e) { /* Continuăm dacă crapă parsarea */ }
        }

        // --- 3. DETECTARE MINMAX ---
        // Format așteptat: [1, 5, 2] (frunze) și opțional b=2 (branching)
        const leafRegex = /-?\d+/g;
        const potentialLeaves = (text.match(leafRegex) || []).map(Number);
        
        // Cuvinte cheie obligatorii pt MinMax ca să nu se activeze aiurea
        if ((text.includes('arbore') || text.includes('minmax') || text.includes('frunze')) && potentialLeaves.length >= 2) {
            
            // Încercăm să găsim branching factor (b=2 sau branching 2)
            const bMatch = text.match(/b(?:ranching)?\s*[:=]?\s*(\d+)/);
            const branching = bMatch ? parseInt(bMatch[1]) : 2; // Default arbore binar
            
            // Calculăm depth
            // Total frunze = branching ^ depth => depth = log_b(Total)
            // Pentru simplitate, reconstruim un arbore perfect echilibrat din frunze
            
            // Helper pentru a reconstrui arborele din lista plată de frunze
            let leafIdx = 0;
            function buildTree(currentHeight, isMax) {
                if (currentHeight === 0) {
                    if (leafIdx < potentialLeaves.length) {
                        return new minmaxModule.TreeNode(`L${leafIdx}`, potentialLeaves[leafIdx++], [], isMax);
                    }
                    return new minmaxModule.TreeNode(`L${leafIdx}`, -Infinity, [], isMax); // Padding
                }
                const children = [];
                for(let i=0; i<branching; i++) {
                    children.push(buildTree(currentHeight - 1, !isMax));
                }
                return new minmaxModule.TreeNode("N", null, children, isMax);
            }

            // Estimăm înălțimea necesară
            let h = 1;
            while (Math.pow(branching, h) < potentialLeaves.length) h++;
            
            const root = buildTree(h, true);
            const result = minmaxModule.minimaxAlphaBeta(root);

            return res.json({ 
                answer: `🧮 **SOLVER MINMAX**\nAm detectat ${potentialLeaves.length} frunze. Am construit un arbore cu ramificare ${branching}.\n\n**Valoare Rădăcină (Optim):** ${result.rootValue}\n**Frunze Vizitate:** ${result.leavesVisited}` 
            });
        }

        // --- 4. DETECTARE STRATEGY (AI Search Problems) ---
        // Folosim config-ul importat din strategyModule (index.js al tau)
        
        // Definim cuvinte cheie pentru a identifica DESPRE CE PROBLEMĂ vorbești
        const problemKeywords = {
            'n-queens': ['queen', 'regin', 'n-queens', 'table', 'sah'],
            'generalized-hanoi': ['hanoi', 'turn', 'disk', 'disc', 'tija', 'tije', 'mutare'],
            'graph-coloring': ['color', 'graf', 'harta', 'noduri', 'adiacent', 'chromatic'],
            'knights-tour': ['knight', 'cal', 'tour', 'tur', 'tabla', 'mutari']
        };

        let detectedProblemKey = null;

        // Căutăm în textul tău un cuvânt cheie care să indice problema
        for (const [key, keywords] of Object.entries(problemKeywords)) {
            if (keywords.some(w => text.includes(w))) {
                detectedProblemKey = key;
                break;
            }
        }

        if (detectedProblemKey) {
            // Accesăm baza de date din index.js (PROBLEM_STRATEGIES)
            const db = strategyModule.PROBLEM_STRATEGIES;
            
            if (db && db[detectedProblemKey]) {
                const config = db[detectedProblemKey];
                const optimal = config.optimal.strategies.join(', ');
                const explanation = config.optimal.explanation;
                
                // Opțional: luăm și strategiile "bune"
                const good = config.good ? config.good.strategies.join(', ') : '';

                return res.json({ 
                    answer: `🧮 **SOLVER STRATEGY**\nAm detectat că te referi la problema **${detectedProblemKey.toUpperCase()}**.\n\n` +
                            `✅ **Strategia Optimă:** ${optimal}\n` +
                            `📖 **Motiv:** ${explanation}\n\n` +
                            (good ? `⚠️ Alte strategii bune: ${good}` : '')
                });
            }
        }

        return res.json({ answer: "⚠️ Nu am putut rezolva problema. Verifică formatul:\n- Nash: (1,2) (3,4)...\n- CSP: A={1,2} A!=B\n- Minmax: frunze [1, 5, 2]" });
    }

    // =========================================================
    // MODUL B: MEMORIE (Dacă avem ID valid)
    // =========================================================
    // ... (Aici rămâne codul existent de citire din fișiere, neschimbat)
    let type = null;
    let solution = "";
    
    if (fs.existsSync(`nash/instanta_${qNum}.json`)) { type='nash'; solution = fs.readFileSync(`nash/_SOLUTIE_nash_${qNum}.txt`, 'utf-8'); }
    else if (fs.existsSync(`csp/instanta_${qNum}.json`)) { type='csp'; solution = fs.readFileSync(`csp/_SOLUTIE_csp_${qNum}.txt`, 'utf-8'); }
    else if (fs.existsSync(`minmax/instanta_${qNum}.json`)) { type='minmax'; solution = fs.readFileSync(`minmax/_SOLUTIE_minmax_${qNum}.json`, 'utf-8'); }
    else if (fs.existsSync(`strategy/instanta_${qNum}.json`)) { type='strategy'; solution = fs.readFileSync(`strategy/_SOLUTIE_strategy_${qNum}.txt`, 'utf-8'); }
    else { return res.json({ answer: `Nu există Q${qNum} în memorie.` }); }

    return res.json({ answer: `📂 **DIN MEMORIE (Q${qNum}):**\n${solution}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});