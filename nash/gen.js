const fs = require('fs');

// --------------------------
//  GENERARE MATRICE PAYOFF
// --------------------------
function generatePayoffMatrix() {
    const matrix = [];
    const size = 3;
    const MAX_PAYOFF = 10;

    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            const payoff1 = Math.floor(Math.random() * (MAX_PAYOFF + 1));
            const payoff2 = Math.floor(Math.random() * (MAX_PAYOFF + 1));
            matrix[i][j] = [payoff1, payoff2];
        }
    }
    return matrix;
}

// --------------------------
//  CALCUL ENP (NASH)
// --------------------------
function findPureNashEquilibria(matrix) {
    const size = matrix.length;
    const nashEquilibria = [];

    const bestResponses1 = Array.from({ length: size }, () => []);
    const bestResponses2 = Array.from({ length: size }, () => []);

    // Best responses for player 1
    for (let j = 0; j < size; j++) {
        let maxPayoff = Math.max(...matrix.map(row => row[j][0]));
        for (let i = 0; i < size; i++) {
            if (matrix[i][j][0] === maxPayoff) bestResponses1[j].push(i);
        }
    }

    // Best responses for player 2
    for (let i = 0; i < size; i++) {
        let maxPayoff = Math.max(...matrix[i].map(cell => cell[1]));
        for (let j = 0; j < size; j++) {
            if (matrix[i][j][1] === maxPayoff) bestResponses2[i].push(j);
        }
    }

    // Intersection (NASH)
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (bestResponses1[j].includes(i) && bestResponses2[i].includes(j)) {
                nashEquilibria.push([i + 1, j + 1, matrix[i][j]]);
            }
        }
    }

    return nashEquilibria;
}

// --------------------------
//  CITIRE RĂSPUNS STUDENT
//  (DETECTARE "DA/NU EXISTĂ")
// --------------------------
function readUserAnswerFile(filename) {
    try {
        const raw = fs.readFileSync(filename, 'utf8').trim();
        const lines = raw
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== "");

        let studentSaysExists = null;
        let pairs = [];

        for (const line of lines) {
            const l = line.toLowerCase();

            // Interpretări textuale
            if (l.includes("nu") && l.includes("exista")) studentSaysExists = false;
            else if (l === "nu") studentSaysExists = false;
            else if (l.includes("nu exista")) studentSaysExists = false;

            else if (l.includes("da") && !l.includes(",")) studentSaysExists = true;
            else if (l.includes("exista") && !l.includes("nu")) studentSaysExists = true;
        }

        // Extract pairs
        // Extragem perechi de forma "număr, număr" chiar și dacă sunt în text
        const pairRegex = /(\d+)\s*,\s*(\d+)/g;

        for (const line of lines) {
            let match;
            while ((match = pairRegex.exec(line)) !== null) {
                const r = parseInt(match[1]);
                const c = parseInt(match[2]);
                pairs.push([r, c]);
            }
        }

        return { studentSaysExists, pairs };

    } catch (err) {
        console.error("Eroare citire fișier răspuns:", err);
        return { studentSaysExists: null, pairs: [] };
    }
}

// --------------------------
//  EVALUARE CU PUNCTAJ PARȚIAL
// --------------------------
function evaluateNashAnswer(userData, correctEquilibria) {

    const { studentSaysExists, pairs } = userData;

    const correctExists = correctEquilibria.length > 0;

    let structureScore = 0;

    // Dacă studentul nu spune explicit nici DA nici NU => deducem după perechi
    let studentExists =
        studentSaysExists !== null ? studentSaysExists : pairs.length > 0;

    // --- SCOR 50% PENTRU DIRECȚIA CORECTĂ ---
    if (!correctExists && !studentExists) structureScore = 50;
    else if (correctExists && studentExists) structureScore = 50;
    else structureScore = 0;

    // Dacă nu există ENP -> scor final = structureScore
    if (!correctExists) return structureScore;

    // --- SCOR 50% PENTRU PERECHI ---
    const correctSet = new Set(correctEquilibria.map(([r, c]) => `${r}-${c}`));
    const userSet = new Set(pairs.map(([r, c]) => `${r}-${c}`));

    let matches = 0;
    for (const p of userSet) {
        if (correctSet.has(p)) matches++;
    }

    const pairScore = (matches / correctEquilibria.length) * 50;

    // Penalizare pentru perechi greșite (-10 fiecare)
    const falsePositives = userSet.size - matches;
    let penalty = falsePositives * 10;
    penalty = Math.min(penalty, 30);

    let finalScore = structureScore + pairScore - penalty;
    return Math.max(0, Math.min(100, Math.round(finalScore)));
}

// --------------------------
function saveInstance(instance, filename) {
    try {
        fs.writeFileSync(filename, JSON.stringify(instance, null, 2), 'utf8');
        console.log(`[Persistență] Instanța salvată în ${filename}`);
    } catch (error) {
        console.error("Eroare salvare instanță:", error);
    }
}

function readInstance(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (e) {
        console.error("Eroare citire instanță:", e);
        return null;
    }
}

module.exports = {
    generatePayoffMatrix,
    findPureNashEquilibria,
    readUserAnswerFile,
    evaluateNashAnswer,
    saveInstance,
    readInstance
};
