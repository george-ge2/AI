const fs = require('fs');

function generatePayoffMatrix() {
    const matrix = [];
    const size = 3;
    const MAX_PAYOFF = 10;

    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            // Castig pentru Jucatorul 1 (Rand)
            const payoff1 = Math.floor(Math.random() * (MAX_PAYOFF + 1));
            // Câștig pentru Jucatorul 2 (Coloana)
            const payoff2 = Math.floor(Math.random() * (MAX_PAYOFF + 1));
            matrix[i][j] = [payoff1, payoff2]; // [C1, C2]
        }
    }
    return matrix;
}

function findPureNashEquilibria(matrix) {
    const size = matrix.length;
    const nashEquilibria = [];

    const bestResponses1 = new Array(size).fill(null).map(() => []);

    for (let j = 0; j < size; j++) { 
        let maxPayoff = -Infinity;       
        for (let i = 0; i < size; i++) {
            if (matrix[i][j][0] > maxPayoff) {
                maxPayoff = matrix[i][j][0];
            }
        }
        
        for (let i = 0; i < size; i++) {
            if (matrix[i][j][0] === maxPayoff) {
                bestResponses1[j].push(i);
            }
        }
    }

    const bestResponses2 = new Array(size).fill(null).map(() => []);

    for (let i = 0; i < size; i++) { 
        let maxPayoff = -Infinity;
        for (let j = 0; j < size; j++) {
            if (matrix[i][j][1] > maxPayoff) {
                maxPayoff = matrix[i][j][1];
            }
        }
        for (let j = 0; j < size; j++) {
            if (matrix[i][j][1] === maxPayoff) {
                bestResponses2[i].push(j);
            }
        }
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const isBR1 = bestResponses1[j].includes(i); // Este i (rand) cel mai bun raspuns la j (coloana)?
            const isBR2 = bestResponses2[i].includes(j); // Este j (coloana) cel mai bun raspuns la i (rand)?

            if (isBR1 && isBR2) {
                nashEquilibria.push([i + 1, j + 1, matrix[i][j]]);
            }
        }
    }

    return nashEquilibria;
}

function evaluateNashAnswer(userEquilibria, correctEquilibria) {
    if (correctEquilibria.length === 0) {
        return userEquilibria.length === 0 ? 100 : 0;
    }

    const correctSet = new Set(correctEquilibria.map(([r, c]) => `${r}-${c}`));
    const userSet = new Set(userEquilibria.map(([r, c]) => `${r}-${c}`));

    let correctMatches = 0;
    
    userSet.forEach(userENP => {
        if (correctSet.has(userENP)) {
            correctMatches++;
        }
    });

    const totalCorrect = correctEquilibria.length;
    const totalUserIdentified = userEquilibria.length;
    
    let finalScore = (correctMatches / totalCorrect) * 100;
    
    const falsePositives = totalUserIdentified - correctMatches;
    if (falsePositives > 0) {
        const penaltyPerMistake = (100 / totalCorrect) * 0.5; 
        const totalPenalty = falsePositives * penaltyPerMistake;
        
        finalScore -= totalPenalty;
    }
    
    return Math.max(0, Math.min(100, Math.round(finalScore)));
}

function readUserAnswerFile(filename) {
    const fs = require('fs'); 

    try {
        const data = fs.readFileSync(filename, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        const userEquilibria = lines.map(line => {
            const parts = line.split(',').map(p => parseInt(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return [parts[0], parts[1]]; // [r, c]
            }
            return null; 
        }).filter(item => item !== null);
        
        return userEquilibria;
        
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`[Eroare] Fișierul de răspuns '${filename}' nu a fost găsit.`);
        } else {
            console.error("Eroare la citirea fișierului de răspuns:", err);
        }
        
        return []; 
    }
}

function saveInstance(instance, filename) {
    try {
        const data = JSON.stringify(instance, null, 2); // null, 2 pentru formatare lizibilă
        fs.writeFileSync(filename, data, 'utf8');
        console.log(`[Persistență] Instanța problemei salvată în: ${filename}`);
    } catch (error) {
        console.error(`Eroare la salvarea instanței în ${filename}:`, error);
    }
}

function readInstance(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`[Eroare Citire] Fișierul instanței '${filename}' nu a fost găsit.`);
        } else {
            console.error(`Eroare la citirea sau parsarea instanței din ${filename}:`, error);
        }
        return null;
    }
}

module.exports = {
    generatePayoffMatrix,
    findPureNashEquilibria,
    evaluateNashAnswer,
    readUserAnswerFile,
    saveInstance,
    readInstance
};
