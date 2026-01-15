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
/**
 * userData: { studentSaysExists: true/false, pairs: [[r,c],...] }
 * correctENP: [[r,c],...]
 */
function evaluateNashAnswer(userData, correctENP) {
    const correctExists = correctENP.length > 0;
    const studentExists = userData.studentSaysExists;

    if (!correctExists) {
        // Dacă studentul a spus corect că NU există -> 100 puncte
        if (studentExists === false) {
            return 100;
        }
        // Dacă studentul a spus că există -> 0 puncte
        return 0;
    }

    let structScore = 0;
    if ((correctExists && studentExists) || (!correctExists && !studentExists)) {
        structScore = 50;
    } else {
        // Dacă trebuia "Da" și a zis "Nu" -> 0 total
        return 0;
    }

    let pairScore = 0;
    if (correctExists && userData.pairs.length > 0) {
        const correctSet = new Set(correctENP.map(([r,c]) => `${r}-${c}`));
        const userSet = new Set(userData.pairs.map(([r,c]) => `${r}-${c}`));
        let matches = 0;
        userSet.forEach(p => { if (correctSet.has(p)) matches++; });
        pairScore = (matches / correctENP.length) * 50;
    }

    const falsePositives = userData.pairs.length - correctENP.length;
    if (falsePositives > 0) pairScore -= Math.min(falsePositives * 10, 50);

    const totalScore = structScore + pairScore;
    return Math.round(totalScore);
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

function parseAnswerText(text) {
    text = text.trim();

    const result = {
        studentSaysExists: null,
        pairs: []
    };

    // Check if student explicitly says "Nu există" or similar
    const noENPPattern = /(nu există|nu gaseste|nu există ENP|none)/i;
    if (noENPPattern.test(text)) {
        result.studentSaysExists = false;
        return result;
    }

    result.studentSaysExists = true;

    // Match pairs like (0,1) or 0,1
    const pairPattern = /\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/g;
    let match;
    while ((match = pairPattern.exec(text)) !== null) {
        result.pairs.push([parseInt(match[1]), parseInt(match[2])]);
    }

    return result;
}

module.exports = {
    generatePayoffMatrix,
    findPureNashEquilibria,
    readUserAnswerFile,
    evaluateNashAnswer,
    saveInstance,
    readInstance,
    parseAnswerText
};