const fs = require('fs');

const nashModule = require('./gen.js'); 
// node app_cli.js generate nash
// node app_cli.js evaluate nash raspuns_student.txt -> creeaza raspuns_student.txt mai intai

function handleGenerateQuestion(type) {
    let instance;
    let correctAnswer;
    let questionText = `Tip Întrebare: ${type.toUpperCase()}\n\n`;
    
    const INSTANCE_FILE = `instanta_${type}.json`; 

    if (type === 'nash') {
        
        const matrix = nashModule.generatePayoffMatrix();
        instance = matrix;
        correctAnswer = nashModule.findPureNashEquilibria(matrix);

        nashModule.saveInstance(matrix, INSTANCE_FILE); 
        // -----------------------------------------------------------

        questionText += "Pentru jocul dat în forma normală (matricea atașată), există echilibru Nash pur? Care este acesta?\n\n";
        
        questionText += "Matricea de Câștig (R1, C2):\n";
        
        const formattedMatrix = matrix.map(row => 
            row.map(([c1, c2]) => `(${c1}, ${c2})`).join('\t')
        ).join('\n');
        questionText += formattedMatrix + '\n';
        
        let answerText = "--- RĂSPUNS CORECT NASH ---\n";
        if (correctAnswer.length === 0) {
            answerText += "Răspuns: Nu există Echilibru Nash Pur.\n";
        } else {
            answerText += `Răspuns: Da, există ${correctAnswer.length} ENP:\n`;
            correctAnswer.forEach(([r, c, payoffs]) => {
                 answerText += `\t- S${r}, S${c} (Câștiguri: ${payoffs[0]}, ${payoffs[1]})\n`;
            });
        }
        fs.writeFileSync(`_SOLUTIE_${type}.txt`, answerText);
        
    } else if (type === 'nqueens') {
        //pt nqueens - ignore
        questionText += "Atenție: Modulul N-Queens nu este încă implementat în app_cli.js.";
       
        
    } else {
        console.error("Tip de întrebare necunoscut.");
        return;
    }

    fs.writeFileSync(`intrebare_${type}.txt`, questionText);
    
    console.log(`\n✅ Întrebare ${type.toUpperCase()} generată în: intrebare_${type}.txt`);
    console.log(`Instanța problemei (Matricea) salvată în: ${INSTANCE_FILE}`); // <--- NOU
    console.log(`(Soluția a fost salvată în: _SOLUTIE_${type}.txt)\n`);
}

function handleEvaluateAnswer(type, userAnswerFile) {
    if (type !== 'nash') {
        console.error("Evaluarea este implementată doar pentru tipul 'nash' deocamdată.");
        return;
    }

    const INSTANCE_FILE = `instanta_${type}.json`;
    
    const oldMatrix = nashModule.readInstance(INSTANCE_FILE);
    if (!oldMatrix) {
        console.error("Evaluare eșuată: Nu s-a putut citi instanța problemei.");
        return;
    }
    
    const correctENP = nashModule.findPureNashEquilibria(oldMatrix);

    const userAnswer = nashModule.readUserAnswerFile(userAnswerFile);
    
    const score = nashModule.evaluateNashAnswer(userAnswer, correctENP);

    let evaluationOutput = "\n--- REZULTAT EVALUARE NASH ---\n";
    evaluationOutput += `Punctaj obținut: ${score}%\n`;
    evaluationOutput += `Răspuns Corect (ENP): ${JSON.stringify(correctENP.map(([r, c]) => [r, c]))}\n`;

    fs.writeFileSync(`evaluare_${type}.txt`, evaluationOutput);
    console.log(evaluationOutput);
    console.log(`Evaluarea a fost salvată în: evaluare_${type}.txt`);
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
