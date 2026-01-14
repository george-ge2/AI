// CSP Question Generator for Command Line
// Run with: node index.js
// Run with answers: node index.js -a
// Run in test mode: node index.js -t
// Run in quiz mode: node index.js -q

const algorithms = [
    { id: 'FC', name: 'Forward Checking (FC)' },
    { id: 'MRV', name: 'Minimum Remaining Values (MRV)' },
    { id: 'AC3', name: 'Arc Consistency 3 (AC-3)' }
];

function generateDomains(numVars) {
    const domains = {};
    const possibleValues = [0, 1, 2, 3, 4];

    for (let i = 0; i < numVars; i++) {
        const varName = String.fromCharCode(65 + i); // A, B, C, D
        const domainSize = Math.floor(Math.random() * 3) + 2; // 2-4 values
        const values = [];
        const availableValues = [...possibleValues];

        for (let j = 0; j < domainSize; j++) {
            const idx = Math.floor(Math.random() * availableValues.length);
            values.push(availableValues[idx]);
            availableValues.splice(idx, 1);
        }

        domains[varName] = values.sort((a, b) => a - b);
    }

    return domains;
}

function generateConstraints(variables) {
    const constraints = [];
    const operators = ['!=', '<', '>'];

    // Generate 2-4 constraints ensuring at least some solutions exist
    const numConstraints = Math.floor(Math.random() * 3) + 2;
    const pairs = [];

    // Get all possible pairs
    for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
            pairs.push([variables[i], variables[j]]);
        }
    }

    // Shuffle pairs
    pairs.sort(() => Math.random() - 0.5);

    // Select constraints
    for (let i = 0; i < Math.min(numConstraints, pairs.length); i++) {
        const [var1, var2] = pairs[i];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        constraints.push({ var1, var2, operator });
    }

    return constraints;
}

function checkConstraint(constraint, assignment) {
    const { var1, var2, operator } = constraint;

    if (!(var1 in assignment) || !(var2 in assignment)) return true;

    const val1 = assignment[var1];
    const val2 = assignment[var2];

    switch (operator) {
        case '!=': return val1 !== val2;
        case '<': return val1 < val2;
        case '>': return val1 > val2;
        default: return true;
    }
}

function applyForwardChecking(domains, assignment, constraints) {
    const newDomains = JSON.parse(JSON.stringify(domains));

    for (const unassignedVar in newDomains) {
        if (unassignedVar in assignment) continue;

        newDomains[unassignedVar] = newDomains[unassignedVar].filter(val => {
            const testAssignment = { ...assignment, [unassignedVar]: val };
            return constraints.every(c => checkConstraint(c, testAssignment));
        });

        if (newDomains[unassignedVar].length === 0) {
            return null; // Domain wipeout
        }
    }

    return newDomains;
}

function applyAC3(domains, constraints, assignment) {
    const newDomains = JSON.parse(JSON.stringify(domains));
    const queue = [];

    // Initialize queue with all arcs
    for (const constraint of constraints) {
        const { var1, var2 } = constraint;
        if (!(var1 in assignment) && !(var2 in assignment)) {
            queue.push({ from: var1, to: var2, constraint });
            queue.push({ from: var2, to: var1, constraint });
        }
    }

    while (queue.length > 0) {
        const { from, to, constraint } = queue.shift();

        if (from in assignment || to in assignment) continue;

        let revised = false;
        const originalDomain = [...newDomains[from]];

        newDomains[from] = newDomains[from].filter(valFrom => {
            const testAssignment = { ...assignment, [from]: valFrom };
            return newDomains[to].some(valTo => {
                testAssignment[to] = valTo;
                return checkConstraint(constraint, testAssignment);
            });
        });

        if (newDomains[from].length < originalDomain.length) {
            revised = true;
        }

        if (newDomains[from].length === 0) {
            return null; // Domain wipeout
        }

        if (revised) {
            // Add all arcs pointing to 'from'
            for (const c of constraints) {
                if (c.var1 === from && c.var2 !== to && !(c.var2 in assignment)) {
                    queue.push({ from: c.var2, to: from, constraint: c });
                }
                if (c.var2 === from && c.var1 !== to && !(c.var1 in assignment)) {
                    queue.push({ from: c.var1, to: from, constraint: c });
                }
            }
        }
    }

    return newDomains;
}

function solveWithBacktracking(algorithm, domains, constraints, assignment, variables) {
    const unassigned = variables.filter(v => !(v in assignment));

    if (unassigned.length === 0) {
        return { success: true, assignment };
    }

    let nextVar;
    let currentDomains = domains;

    // Apply preprocessing based on algorithm
    if (algorithm === 'AC3') {
        currentDomains = applyAC3(domains, constraints, assignment);
        if (currentDomains === null) {
            return { success: false, assignment: null };
        }
    }

    if (algorithm === 'MRV') {
        // Select variable with minimum remaining values
        nextVar = unassigned.reduce((min, v) =>
            currentDomains[v].length < currentDomains[min].length ? v : min
        );
    } else {
        nextVar = unassigned[0]; // Take in order (alphabetical)
    }

    for (const value of currentDomains[nextVar]) {
        const newAssignment = { ...assignment, [nextVar]: value };

        // Check if assignment is consistent
        const isConsistent = constraints.every(c => checkConstraint(c, newAssignment));

        if (!isConsistent) {
            continue;
        }

        let newDomains = currentDomains;

        if (algorithm === 'FC' || algorithm === 'MRV') {
            newDomains = applyForwardChecking(currentDomains, newAssignment, constraints);
            if (newDomains === null) {
                continue;
            }
        }

        const result = solveWithBacktracking(algorithm, newDomains, constraints, newAssignment, variables);

        if (result.success) {
            return result;
        }
    }

    return { success: false, assignment: null };
}

function generateQuestion() {
    let question = null;
    let attempts = 0;
    const maxAttempts = 50;

    // Keep generating until we get a solvable problem
    while (attempts < maxAttempts) {
        attempts++;

        const numVars = Math.random() < 0.5 ? 3 : 4; // 3 or 4 variables (50/50 chance)
        const variables = Array.from({ length: numVars }, (_, i) => String.fromCharCode(65 + i));
        const domains = generateDomains(numVars);
        const constraints = generateConstraints(variables);
        const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];

        // Try to solve
        const solution = solveWithBacktracking(algorithm.id, domains, constraints, {}, variables);

        if (solution.success) {
            const domainStr = variables.map(v =>
                `D(${v}) = {${domains[v].join(', ')}}`
            ).join(', ');

            const constraintStr = constraints.map(c =>
                `${c.var1}${c.operator}${c.var2}`
            ).join(', ');

            const variableOrder = variables.join(', ');

            const questionText = `Considerăm variabilele ${variables.join(', ')} și domeniile ${domainStr}. Restricțiile sunt ${constraintStr}. Aplicați pas cu pas (cât mai detaliat posibil) algoritmul Backtracking cu optimizarea ${algorithm.name} până când găsiți o soluție sau până când detectați că nu există una. Considerați că variabilele sunt ordonate astfel: ${variableOrder}.`;

            const answerStr = variables.map(v =>
                `${v} = ${solution.assignment[v]}`
            ).join(', ');

            question = {
                enunt: questionText,
                raspunsCorect: answerStr,
                variables,
                domains,
                constraints,
                algorithm: algorithm.name,
                algorithmId: algorithm.id,
                correctAnswer: solution.assignment,
                hasSolution: true
            };
            break;
        }
    }

    // If we couldn't generate a solvable one, return the last attempt anyway
    if (!question) {
        const numVars = 3;
        const variables = Array.from({ length: numVars }, (_, i) => String.fromCharCode(65 + i));
        const domains = generateDomains(numVars);
        const constraints = generateConstraints(variables);
        const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];

        const domainStr = variables.map(v =>
            `D(${v}) = {${domains[v].join(', ')}}`
        ).join(', ');

        const constraintStr = constraints.map(c =>
            `${c.var1}${c.operator}${c.var2}`
        ).join(', ');

        const variableOrder = variables.join(', ');

        const questionText = `Considerăm variabilele ${variables.join(', ')} și domeniile ${domainStr}. Restricțiile sunt ${constraintStr}. Aplicați pas cu pas (cât mai detaliat posibil) algoritmul Backtracking cu optimizarea ${algorithm.name} până când găsiți o soluție sau până când detectați că nu există una. Considerați că variabilele sunt ordonate astfel: ${variableOrder}.`;

        question = {
            enunt: questionText,
            raspunsCorect: "Nu există soluție",
            variables,
            domains,
            constraints,
            algorithm: algorithm.name,
            algorithmId: algorithm.id,
            correctAnswer: null,
            hasSolution: false
        };
    }

    return question;
}

function formatQuestion(q, showAnswers = false) {
    const domainStr = q.variables.map(v =>
        `D(${v}) = {${q.domains[v].join(', ')}}`
    ).join(', ');

    const constraintStr = q.constraints.map(c =>
        `${c.var1}${c.operator}${c.var2}`
    ).join(', ');

    const variableOrder = q.variables.join(', ');

    let question = `Considerăm variabilele ${q.variables.join(', ')} și domeniile ${domainStr}.\n`;
    question += `Restricțiile sunt ${constraintStr}.\n`;
    question += `Aplicați pas cu pas (cât mai detaliat posibil) algoritmul Backtracking cu optimizarea ${q.algorithm}\n`;
    question += `până când găsiți o soluție sau până când detectați că nu există una.\n`;
    question += `Considerați că variabilele sunt ordonate astfel: ${variableOrder}.`;

    // Add correct answer only if -a flag is set
    if (showAnswers) {
        question += '\n\n--- RĂSPUNS CORECT ---\n';
        if (q.hasSolution && q.correctAnswer) {
            const answerStr = q.variables.map(v =>
                `${v} = ${q.correctAnswer[v]}`
            ).join(', ');
            question += `Soluție găsită: ${answerStr}`;
        } else {
            question += 'Nu există soluție pentru această problemă.';
        }
    }

    return question;
}

function evaluateAnswer(userAnswer, correctAnswer) {
    if (!correctAnswer) {
        return {
            score: 0,
            percentage: 0,
            message: "Nu există soluție pentru această problemă.",
            details: []
        };
    }

    const variables = Object.keys(correctAnswer);
    let correctCount = 0;
    const details = [];

    for (const variable of variables) {
        const userValue = userAnswer[variable];
        const correctValue = correctAnswer[variable];

        if (userValue === correctValue) {
            correctCount++;
            details.push({
                variable,
                correct: true,
                userValue,
                correctValue
            });
        } else {
            details.push({
                variable,
                correct: false,
                userValue: userValue !== undefined ? userValue : 'lipsă',
                correctValue
            });
        }
    }

    const percentage = correctCount / variables.length;
    let score = 0;

    if (percentage === 1) score = 100;
    else if (percentage >= 0.75) score = 75;
    else if (percentage >= 0.5) score = 50;
    else if (percentage >= 0.25) score = 25;

    return {
        score,
        percentage: Math.round(percentage * 100),
        correctCount,
        totalCount: variables.length,
        details
    };
}

function generateQuestions(count = 5) {
    const questions = [];

    for (let i = 0; i < count; i++) {
        questions.push(generateQuestion());
    }

    return questions;
}

// Interactive test mode
async function testMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
        rl.question(prompt, resolve);
    });

    console.log("=== MOD TEST - Introduceți propriile date ===\n");

    try {
        // Get number of variables
        const numVarsStr = await question("Numărul de variabile: ");
        const numVars = parseInt(numVarsStr);

        if (isNaN(numVars) || numVars < 1 || numVars > 26) {
            console.log("Număr invalid de variabile!");
            rl.close();
            return;
        }

        // Get variable names
        const variablesStr = await question(`Introduceți ${numVars} variabile separate prin spații (ex: A B C): `);
        const variables = variablesStr.trim().split(/\s+/).slice(0, numVars);

        if (variables.length !== numVars) {
            console.log("Numărul de variabile nu corespunde!");
            rl.close();
            return;
        }

        // Get domains for each variable
        const domains = {};
        for (const varName of variables) {
            const domainStr = await question(`Domeniul pentru ${varName} (valori separate prin spații, ex: 0 1 2): `);
            const values = domainStr.trim().split(/\s+/).map(v => parseInt(v));

            if (values.some(isNaN)) {
                console.log(`Valori invalide pentru domeniul lui ${varName}!`);
                rl.close();
                return;
            }

            domains[varName] = values.sort((a, b) => a - b);
        }

        // Get constraints
        console.log("\nIntroduceți restricțiile în format: <variabilă><operator><variabilă>");
        console.log("Operatori valizi: != < >");
        console.log("Exemplu: A!=B");
        console.log("Apăsați Enter pe o linie goală pentru a termina.\n");

        const constraints = [];
        while (true) {
            const constraintStr = await question("Restricție (sau Enter pentru a termina): ");

            if (constraintStr.trim() === '') {
                break;
            }

            // Parse constraint (format: A!=B, A<B, A>B)
            const match = constraintStr.match(/^\s*([A-Za-z]+)\s*(!=|<|>)\s*([A-Za-z]+)\s*$/);

            if (!match) {
                console.log("Format invalid! Folosiți formatul: <variabilă><operator><variabilă>");
                continue;
            }

            const [, var1, operator, var2] = match;

            if (!variables.includes(var1) || !variables.includes(var2)) {
                console.log(`Variabilă inexistentă! Variabilele disponibile sunt: ${variables.join(', ')}`);
                continue;
            }

            constraints.push({ var1, var2, operator });
        }

        // Get algorithm
        console.log("\nAlgoritmi disponibili:");
        algorithms.forEach((alg, index) => {
            console.log(`  ${index + 1}. ${alg.name} (${alg.id})`);
        });

        const algChoice = await question("\nAlegeți algoritmul (introduceți numărul sau ID-ul): ");
        let selectedAlgorithm = null;

        // Try to parse as number first
        const algIndex = parseInt(algChoice) - 1;
        if (!isNaN(algIndex) && algIndex >= 0 && algIndex < algorithms.length) {
            selectedAlgorithm = algorithms[algIndex];
        } else {
            // Try to match by ID
            selectedAlgorithm = algorithms.find(alg =>
                alg.id.toLowerCase() === algChoice.trim().toLowerCase()
            );
        }

        if (!selectedAlgorithm) {
            console.log("Algoritm invalid!");
            rl.close();
            return;
        }

        // Display the problem
        console.log("\n" + "=".repeat(80));
        console.log("PROBLEMA INTRODUSĂ:");
        console.log("=".repeat(80));

        const domainStr = variables.map(v =>
            `D(${v}) = {${domains[v].join(', ')}}`
        ).join(', ');

        const constraintStr = constraints.map(c =>
            `${c.var1}${c.operator}${c.var2}`
        ).join(', ');

        console.log(`\nVariabile: ${variables.join(', ')}`);
        console.log(`Domenii: ${domainStr}`);
        console.log(`Restricții: ${constraintStr}`);
        console.log(`Algoritm: ${selectedAlgorithm.name}`);
        console.log(`Ordinea variabilelor: ${variables.join(', ')}`);

        // Solve the problem
        console.log("\n" + "=".repeat(80));
        console.log("REZOLVARE:");
        console.log("=".repeat(80) + "\n");

        const solution = solveWithBacktracking(selectedAlgorithm.id, domains, constraints, {}, variables);

        if (solution.success) {
            console.log("✓ Soluție găsită!");
            const answerStr = variables.map(v =>
                `${v} = ${solution.assignment[v]}`
            ).join(', ');
            console.log(`\nRăspuns: ${answerStr}\n`);

            // Display as JSON
            console.log("JSON:");
            console.log(JSON.stringify(solution.assignment, null, 2));
        } else {
            console.log("✗ Nu există soluție pentru această problemă.\n");
        }

        rl.close();

    } catch (error) {
        console.error("Eroare:", error.message);
        rl.close();
    }
}

// Quiz mode - generate questions and get user answers
async function quizMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
        rl.question(prompt, resolve);
    });

    console.log("=".repeat(80));
    console.log("MOD QUIZ - Răspundeți la întrebări");
    console.log("=".repeat(80));
    console.log();
    console.log("Vor fi generate 5 întrebări. Pentru fiecare, introduceți răspunsul dvs.");
    console.log();

    let totalScore = 0;
    let totalVariables = 0;
    let correctVariables = 0;

    for (let i = 0; i < 5; i++) {
        // Generate one question at a time
        const q = generateQuestion();

        console.log("=".repeat(80));
        console.log(`ÎNTREBAREA ${i + 1} din 5`);
        console.log("=".repeat(80));
        console.log();

        console.log(formatQuestion(q, false));

        console.log();
        console.log("--- Introduceți răspunsul dvs. ---");
        console.log("Format: pentru fiecare variabilă, introduceți valoarea pe o linie separată.");
        console.log(`Variabilele sunt: ${q.variables.join(', ')}`);
        console.log();

        const userAnswer = {};

        for (const varName of q.variables) {
            const answerStr = await question(`Valoarea pentru ${varName}: `);
            const value = parseInt(answerStr.trim());

            if (!isNaN(value)) {
                userAnswer[varName] = value;
            } else {
                console.log(`⚠ Valoare invalidă pentru ${varName}, se consideră lipsă.`);
            }
        }

        // Evaluate immediately
        console.log();
        console.log("--- Evaluare ---");
        console.log();

        if (q.hasSolution && q.correctAnswer) {
            const evaluation = evaluateAnswer(userAnswer, q.correctAnswer);

            console.log("Răspunsul dvs.:");
            for (const varName of q.variables) {
                const userVal = userAnswer[varName] !== undefined ? userAnswer[varName] : 'lipsă';
                console.log(`  ${varName} = ${userVal}`);
            }

            console.log();
            console.log("Răspuns corect:");
            for (const varName of q.variables) {
                console.log(`  ${varName} = ${q.correctAnswer[varName]}`);
            }

            console.log();
            console.log("Detalii:");
            evaluation.details.forEach(detail => {
                const icon = detail.correct ? '✓' : '✗';
                console.log(`  ${icon} ${detail.variable}: ${detail.userValue} ${detail.correct ? '(corect)' : `(greșit, corect: ${detail.correctValue})`}`);
            });

            console.log();
            console.log(`Scor pentru această întrebare: ${evaluation.score}/100`);
            console.log(`Variabile corecte: ${evaluation.correctCount}/${evaluation.totalCount}`);

            totalScore += evaluation.score;
            totalVariables += evaluation.totalCount;
            correctVariables += evaluation.correctCount;
        } else {
            console.log("Această problemă nu are soluție.");
            console.log("Răspunsul corect era: Nu există soluție");
        }

        console.log();

        if (i < 4) {
            await question("Apăsați Enter pentru următoarea întrebare...");
            console.log();
        }
    }

    // Final score
    console.log("=".repeat(80));
    console.log("SCOR FINAL");
    console.log("=".repeat(80));
    console.log();
    console.log(`Scor mediu: ${Math.round(totalScore / 5)}/100`);
    console.log(`Variabile corecte: ${correctVariables}/${totalVariables} (${Math.round(correctVariables / totalVariables * 100)}%)`);
    console.log(`Întrebări completate: 5`);
    console.log();

    rl.close();
}

// Check for flags
const showAnswers = process.argv.includes('-a');
const testMode_flag = process.argv.includes('-t');
const quizMode_flag = process.argv.includes('-q');

// Main execution
if (testMode_flag) {
    testMode();
} else if (quizMode_flag) {
    quizMode();
} else {
    console.log("=== Generator Probleme CSP ===\n");

    if (showAnswers) {
        console.log("(Mod cu răspunsuri activate)\n");
    }

    // Generate 5 questions
    const questions = generateQuestions(5);

    questions.forEach((q, index) => {
        console.log("=".repeat(80));
        console.log(`ÎNTREBAREA ${index + 1}`);
        console.log("=".repeat(80));
        console.log();
        console.log(formatQuestion(q, showAnswers));
        console.log();
    });

    // Print all questions as a single JSON at the end
    console.log("=".repeat(80));
    console.log("DATE JSON (TOATE ÎNTREBĂRILE)");
    console.log("=".repeat(80));
    console.log();
    const jsonOutput = questions.map(q => ({
        enunt: q.enunt,
        raspunsCorect: q.raspunsCorect,
        variables: q.variables,
        domains: q.domains,
        constraints: q.constraints,
        algorithm: q.algorithm,
        correctAnswer: q.correctAnswer,
        hasSolution: q.hasSolution
    }));
    console.log(JSON.stringify(jsonOutput, null, 2));
    console.log();
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateQuestion,
        generateQuestions,
        evaluateAnswer,
        formatQuestion
    };
}