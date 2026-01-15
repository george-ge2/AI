const fs = require('fs');

const nashModule = require('./gen.js'); 
// node app_cli.js generate nash
// node app_cli.js evaluate nash raspuns_student.txt -> creeaza raspuns_student.txt mai intai

function handleGenerateQuestions(type, count = 1) {
    for (let i = 0; i < count; i++) {
        handleGenerateQuestion(type, i + 1);
    }
}

function handleGenerateQuestion(type, index = 1) {
    const INSTANCE_FILE = `instanta_${type}_${index}.json`;
    const SOL_FILE = `_SOLUTIE_${type}_${index}.txt`;

    if (type === 'nash') {
        const matrix = nashModule.generatePayoffMatrix();
        const solution = nashModule.findPureNashEquilibria(matrix);

        nashModule.saveInstance(matrix, INSTANCE_FILE);

        let answerText = "--- RĂSPUNS CORECT NASH ---\n";
        if (!solution.length) answerText += "Nu există Echilibru Nash Pur.\n";
        else {
            answerText += `Da, există ${solution.length} ENP:\n`;
            solution.forEach(([r, c]) => answerText += `- ${r}, ${c}\n`);
        }

        fs.writeFileSync(SOL_FILE, answerText);

        const questionText = `Întrebare ${index} (${type.toUpperCase()}):\nPentru jocul dat, există echilibru Nash pur?\nMatrice:\n${matrix.map(row => row.map(([r, c]) => `(${r},${c})`).join('\t')).join('\n')}\n`;
        fs.writeFileSync(`intrebare_${type}_${index}.txt`, questionText);

        console.log(`✅ Întrebare #${index} generată: intrebare_${type}_${index}.txt`);
    } else {
        console.log(`❌ Tipul '${type}' nu este implementat încă.`);
    }
}

function handleEvaluateAnswer(type, userAnswerFile) {
    if (type !== 'nash') {
        console.error("Evaluarea este implementată doar pentru tipul 'nash'.");
        return;
    }

    const INSTANCE_FILE = `instanta_${type}.json`;

    const matrix = nashModule.readInstance(INSTANCE_FILE);
    if (!matrix) {
        console.error("Nu s-a putut citi instanța problemei.");
        return;
    }

    const correctENP = nashModule.findPureNashEquilibria(matrix);

    const userData = nashModule.readUserAnswerFile(userAnswerFile);

    // noul sistem de evaluare returnează doar scorul → trebuie să calculăm detalii separat
    const studentExists = 
        userData.studentSaysExists !== null 
            ? userData.studentSaysExists 
            : userData.pairs.length > 0;

    const correctExists = correctENP.length > 0;

    // calculăm detalii pentru explain
    const correctSet = new Set(correctENP.map(([r,c]) => `${r}-${c}`));
    const userSet = new Set(userData.pairs.map(([r,c]) => `${r}-${c}`));

    let matches = 0;
    userSet.forEach(p => { if (correctSet.has(p)) matches++; });

    const falsePositives = userSet.size - matches;

    // scor final
    const score = nashModule.evaluateNashAnswer(userData, correctENP);

    // construire raport detaliat
    let explanation = "\n--- EVALUARE DETALIATĂ NASH ---\n\n";

    explanation += `► Studentul a spus că există ENP: ${studentExists ? "DA" : "NU"}\n`;
    explanation += `► În realitate există ENP: ${correctExists ? "DA" : "NU"}\n\n`;

    explanation += `► ENP corecte (${correctENP.length}): ${correctENP.map(x => `(${x[0]},${x[1]})`).join(", ")}\n`;
    explanation += `► Perechi date de student (${userData.pairs.length}): ${
        userData.pairs.length ? userData.pairs.map(x => `(${x[0]},${x[1]})`).join(", ") : "niciuna"
    }\n\n`;

    explanation += `✔ Perechi corecte găsite: ${matches}\n`;
    explanation += `✘ Perechi greșite: ${falsePositives}\n\n`;

    // scor structură (existență ENP)
    let structScore = 0;
    if (!correctExists && !studentExists) structScore = 50;
    else if (correctExists && studentExists) structScore = 50;

    explanation += `► Punctaj structură (există / nu există ENP): ${structScore}/50\n`;

    // punctaj perechi
    let pairScore = correctExists ? (matches / correctENP.length) * 50 : 0;
    explanation += `► Punctaj perechi corecte: ${pairScore.toFixed(2)}/50\n`;

    // penalizare
    let penalty = Math.min(falsePositives * 10, 30);
    explanation += `► Penalizare perechi greșite: -${penalty}\n\n`;

    explanation += `--------------------------------------\n`;
    explanation += `► SCOR FINAL: ${score}%\n`;
    explanation += `--------------------------------------\n`;

    // salvăm rezultatul
    const output = explanation;
    fs.writeFileSync(`evaluare_${type}.txt`, output);

    console.log(output);
    console.log(`Evaluarea a fost salvată în evaluare_${type}.txt`);
}


// --- Punctul Principal de Intrare (Main) ---
function mainCLI() {
    const command = process.argv[2]; // ex: node app_cli.js generate
    const type = process.argv[3];    // ex: node app_cli.js generate nash

    if (command === 'generate' && (type === 'nash' || type === 'nqueens')) {
        handleGenerateQuestion(type);
    } else if (command === 'evaluate' && type === 'nash') {
        const userAnswerFile = process.argv[4];
        if (!userAnswerFile) {
            console.error("Vă rugăm să specificați fișierul de răspuns: node app_cli.js evaluate nash [fisier_raspuns.txt]");
            return;
        }
       
        handleEvaluateAnswer(type, userAnswerFile, null);
    } else {
        console.log(`\nUtilizare:
  1. Generare Întrebare: node app_cli.js generate [nash] 
  2. Evaluare Răspuns:   node app_cli.js evaluate [nash] [fisier_raspuns_utilizator.txt]`); 
    }
}

mainCLI();
