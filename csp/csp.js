// ===============================
// CSP Generator + Solver + Evaluator (Web-safe)
// CLI disabled
// ===============================

const crypto = require('crypto');

/* ---------- Algorithms ---------- */

const algorithms = [
    { id: 'FC', name: 'Forward Checking (FC)' },
    { id: 'MRV', name: 'Minimum Remaining Values (MRV)' },
    { id: 'AC3', name: 'Arc Consistency 3 (AC-3)' }
];

/* ---------- Domain & Constraints ---------- */

function generateDomains(numVars) {
    const domains = {};
    const possibleValues = [0, 1, 2, 3, 4];

    for (let i = 0; i < numVars; i++) {
        const varName = String.fromCharCode(65 + i); // A, B, C...
        const domainSize = Math.floor(Math.random() * 3) + 2; // 2–4 values
        const values = [];
        const available = [...possibleValues];

        for (let j = 0; j < domainSize; j++) {
            const idx = Math.floor(Math.random() * available.length);
            values.push(available[idx]);
            available.splice(idx, 1);
        }

        domains[varName] = values.sort((a, b) => a - b);
    }

    return domains;
}

function generateConstraints(variables) {
    const constraints = [];
    const operators = ['!=', '<', '>'];
    const pairs = [];

    for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
            pairs.push([variables[i], variables[j]]);
        }
    }

    pairs.sort(() => Math.random() - 0.5);
    const numConstraints = Math.min(pairs.length, Math.floor(Math.random() * 3) + 2);

    for (let i = 0; i < numConstraints; i++) {
        const [var1, var2] = pairs[i];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        constraints.push({ var1, var2, operator });
    }

    return constraints;
}

/* ---------- Constraint Logic ---------- */

function checkConstraint(constraint, assignment) {
    const { var1, var2, operator } = constraint;

    if (!(var1 in assignment) || !(var2 in assignment)) return true;

    const a = assignment[var1];
    const b = assignment[var2];

    if (operator === '!=') return a !== b;
    if (operator === '<') return a < b;
    if (operator === '>') return a > b;

    return true;
}

/* ---------- Forward Checking ---------- */

function applyForwardChecking(domains, assignment, constraints) {
    const newDomains = JSON.parse(JSON.stringify(domains));

    for (const v in newDomains) {
        if (v in assignment) continue;

        newDomains[v] = newDomains[v].filter(val => {
            const test = { ...assignment, [v]: val };
            return constraints.every(c => checkConstraint(c, test));
        });

        if (newDomains[v].length === 0) return null;
    }

    return newDomains;
}

/* ---------- AC-3 ---------- */

function applyAC3(domains, constraints, assignment) {
    const newDomains = JSON.parse(JSON.stringify(domains));
    const queue = [];

    for (const c of constraints) {
        if (!(c.var1 in assignment) && !(c.var2 in assignment)) {
            queue.push({ from: c.var1, to: c.var2, constraint: c });
            queue.push({ from: c.var2, to: c.var1, constraint: c });
        }
    }

    while (queue.length) {
        const { from, to, constraint } = queue.shift();
        if (from in assignment || to in assignment) continue;

        const original = [...newDomains[from]];

        newDomains[from] = newDomains[from].filter(vFrom =>
            newDomains[to].some(vTo =>
                checkConstraint(constraint, { ...assignment, [from]: vFrom, [to]: vTo })
            )
        );

        if (newDomains[from].length === 0) return null;

        if (newDomains[from].length < original.length) {
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

/* ---------- Backtracking Solver ---------- */

function solveWithBacktracking(algorithm, domains, constraints, assignment, variables) {
    const unassigned = variables.filter(v => !(v in assignment));
    if (unassigned.length === 0) return { success: true, assignment };

    let currentDomains = domains;

    if (algorithm === 'AC3') {
        currentDomains = applyAC3(domains, constraints, assignment);
        if (!currentDomains) return { success: false };
    }

    const nextVar =
        algorithm === 'MRV'
            ? unassigned.reduce((a, b) =>
                currentDomains[a].length < currentDomains[b].length ? a : b
              )
            : unassigned[0];

    for (const value of currentDomains[nextVar]) {
        const newAssignment = { ...assignment, [nextVar]: value };

        if (!constraints.every(c => checkConstraint(c, newAssignment))) continue;

        let newDomains = currentDomains;

        if (algorithm === 'FC' || algorithm === 'MRV') {
            newDomains = applyForwardChecking(currentDomains, newAssignment, constraints);
            if (!newDomains) continue;
        }

        const result = solveWithBacktracking(
            algorithm,
            newDomains,
            constraints,
            newAssignment,
            variables
        );

        if (result.success) return result;
    }

    return { success: false };
}

/* ---------- Question Generator ---------- */

function generateQuestion() {
    let attempts = 0;

    while (attempts++ < 50) {
        const numVars = Math.random() < 0.5 ? 3 : 4;
        const variables = Array.from({ length: numVars }, (_, i) =>
            String.fromCharCode(65 + i)
        );

        const domains = generateDomains(numVars);
        const constraints = generateConstraints(variables);
        const alg = algorithms[Math.floor(Math.random() * algorithms.length)];

        const solution = solveWithBacktracking(
            alg.id,
            domains,
            constraints,
            {},
            variables
        );

        if (solution.success) {
            return {
                id: crypto.randomUUID(),
                type: 'CSP',
                enunt:
                    `Considerăm variabilele ${variables.join(', ')} și domeniile ` +
                    variables.map(v => `D(${v})={${domains[v].join(', ')}}`).join(', ') +
                    `. Restricțiile sunt ${constraints.map(c => `${c.var1}${c.operator}${c.var2}`).join(', ')}. ` +
                    `Aplicați Backtracking cu optimizarea ${alg.name}.`,
                variables,
                domains,
                constraints,
                algorithm: alg.name,
                correctAnswer: solution.assignment,
                hasSolution: true
            };
        }
    }

    return null;
}

/* ---------- Evaluation ---------- */

// STRICT: matches only "A = 2", never 2) or (2,2)
function evaluateCSPTextAnswer(rawText, correctAnswer) {
    if (!correctAnswer) {
        return { score: 0, percentage: 0 };
    }

    const regex = /\b([A-Z])\s*=\s*(-?\d+)\b/g;
    const userAnswer = {};
    let match;

    while ((match = regex.exec(rawText)) !== null) {
        userAnswer[match[1]] = parseInt(match[2], 10);
    }

    const vars = Object.keys(correctAnswer);
    let correct = 0;

    for (const v of vars) {
        if (userAnswer[v] === correctAnswer[v]) correct++;
    }

    const pct = correct / vars.length;

    const score =
        pct === 1 ? 100 :
        pct >= 0.75 ? 75 :
        pct >= 0.5 ? 50 :
        pct >= 0.25 ? 25 : 0;

    return {
        score,
        percentage: Math.round(pct * 100),
        correct,
        total: vars.length
    };
}

/* ---------- Exports ---------- */

module.exports = {
    generateCSPForWeb: generateQuestion,
    evaluateCSPTextAnswer
};

/* ---------- CLI Disabled ---------- */
if (require.main === module) {
    console.log('CSP module loaded (CLI disabled)');
}
