// MinMax Alpha-Beta Question Generator
// Generates game trees and evaluates MinMax with Alpha-Beta pruning

interface TreeNode {
    id: string;
    value?: number;           // For leaf nodes
    children: TreeNode[];
    isMax: boolean;           // Max or Min player
    alpha?: number;           // For Alpha-Beta
    beta?: number;
    visited?: boolean;
    pruned?: boolean;
    finalValue?: number;      // Computed value after algorithm
}

interface GameTree {
    root: TreeNode;
    depth: number;
    branchingFactor: number;
    leafValues: number[];
}

interface MinMaxResult {
    rootValue: number;
    leavesVisited: number;
    totalLeaves: number;
    prunedNodes: string[];
    executionTrace: string[];
}

interface Question {
    id: number;
    tree: GameTree;
    treeVisualization: string;
    question: string;
    correctAnswer: MinMaxResult;
    partialAnswers: {
        userRootValue?: number;
        userLeavesVisited?: number;
        score: number;
        feedback: string;
    }[];
}

interface TreeConfig {
    depth: number;
    branching: number;
    min: number;
    max: number;
    totalLeaves: number;
}

interface ConfigConstraints {
    depthMin: number;
    depthMax: number;
    branchingMin: number;
    branchingMax: number;
    valueMin: number;
    valueMax: number;
    maxTotalLeaves?: number;  // Optional limit to prevent huge trees
}

/**
 * Generates a completely random tree configuration
 * @param constraints - Optional constraints to keep trees reasonable
 * @returns Random tree configuration
 */
function generateRandomTreeConfig(constraints?: Partial<ConfigConstraints>): TreeConfig {
    // Default constraints (reasonable for educational purposes)
    const defaults: ConfigConstraints = {
        depthMin: 2,
        depthMax: 4,
        branchingMin: 2,
        branchingMax: 4,
        valueMin: 1,
        valueMax: 20,
        maxTotalLeaves: 50  // Prevent exponential explosion
    };

    const c = { ...defaults, ...constraints };

    let depth: number;
    let branching: number;
    let totalLeaves: number;

    // Keep generating until we get a valid combination
    do {
        depth = randomInt(c.depthMin, c.depthMax);
        branching = randomInt(c.branchingMin, c.branchingMax);
        totalLeaves = Math.pow(branching, depth);
    } while (c.maxTotalLeaves && totalLeaves > c.maxTotalLeaves);

    // Random value range
    const rangeSize = randomInt(5, 20);  // How wide the value range is
    const min = randomInt(c.valueMin, c.valueMax - rangeSize);
    const max = min + rangeSize;

    return {
        depth,
        branching,
        min,
        max,
        totalLeaves
    };
}

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate multiple unique random configs
 */
function generateMultipleConfigs(count: number, constraints?: Partial<ConfigConstraints>): TreeConfig[] {
    const configs: TreeConfig[] = [];
    const seen = new Set<string>();

    while (configs.length < count) {
        const config = generateRandomTreeConfig(constraints);

        // Create a unique key to avoid duplicate configs
        const key = `${config.depth}-${config.branching}-${config.min}-${config.max}`;

        if (!seen.has(key)) {
            seen.add(key);
            configs.push(config);
        }
    }

    return configs;
}

/**
 * Display a config in a readable format
 */
function displayConfig(config: TreeConfig, index?: number): void {
    const prefix = index !== undefined ? `Config ${index + 1}: ` : '';
    console.log(`${prefix}Depth=${config.depth}, Branching=${config.branching}, ` +
        `Values=[${config.min}-${config.max}], Leaves=${config.totalLeaves}`);
}

// Generate a random game tree
function generateGameTree(depth: number, branchingFactor: number, minValue: number = 1, maxValue: number = 20): GameTree {
    const totalLeaves = Math.pow(branchingFactor, depth);
    const leafValues: number[] = [];

    // Generate random leaf values
    for (let i = 0; i < totalLeaves; i++) {
        leafValues.push(Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue);
    }

    let leafIndex = 0;

    function buildTree(currentDepth: number, isMax: boolean, idPrefix: string): TreeNode {
        if (currentDepth === 0) {
            // Leaf node
            return {
                id: idPrefix,
                value: leafValues[leafIndex++],
                children: [],
                isMax,
                visited: false
            };
        }

        const children: TreeNode[] = [];
        for (let i = 0; i < branchingFactor; i++) {
            const childId = idPrefix === 'ROOT' ? String.fromCharCode(65 + i) : `${idPrefix}${i + 1}`;
            children.push(buildTree(currentDepth - 1, !isMax, childId));
        }

        return {
            id: idPrefix === 'ROOT' ? 'ROOT' : idPrefix,
            children,
            isMax,
            visited: false
        };
    }

    const root = buildTree(depth, true, 'ROOT');

    return {
        root,
        depth,
        branchingFactor,
        leafValues
    };
}

function visualizeTree(tree: GameTree): string {
    const lines: string[] = [];
    const { root, depth, branchingFactor } = tree;

    lines.push('═'.repeat(80));
    lines.push('ARBORELE DE JOC (Game Tree)');
    lines.push('═'.repeat(80));
    lines.push(`Adâncime: ${depth} | Ramificare: ${branchingFactor} | Total frunze: ${tree.leafValues.length}`);
    lines.push('');

    function printNode(node: TreeNode, level: number, prefix: string, isLast: boolean): void {
        const indent = prefix + (isLast ? '└── ' : '├── ');
        const nodeType = node.isMax ? '[MAX]' : '[MIN]';
        const nodeValue = node.value !== undefined ? ` = ${node.value}` : '';

        lines.push(`${indent}${node.id} ${nodeType}${nodeValue}`);

        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
            printNode(child, level + 1, newPrefix, index === node.children.length - 1);
        });
    }

    lines.push('ROOT [MAX]');
    root.children.forEach((child, index) => {
        printNode(child, 1, '', index === root.children.length - 1);
    });

    // Also show leaf values in a compact format
    lines.push('');
    lines.push('─'.repeat(80));
    lines.push('Valorile frunzelor (de la stânga la dreapta):');

    // Group by branches
    const leavesPerBranch = tree.leafValues.length / branchingFactor;
    for (let i = 0; i < branchingFactor; i++) {
        const branchLeaves = tree.leafValues.slice(i * leavesPerBranch, (i + 1) * leavesPerBranch);
        const branchName = String.fromCharCode(65 + i);
        lines.push(`  Ramura ${branchName}: [${branchLeaves.join(', ')}]`);
    }

    lines.push('═'.repeat(80));

    return lines.join('\n');
}

// MinMax algorithm with Alpha-Beta pruning
function minMaxAlphaBeta(node: TreeNode, depth: number, alpha: number, beta: number, isMaximizing: boolean, trace: string[]): MinMaxResult {
    let leavesVisited = 0;
    const prunedNodes: string[] = [];

    function minimax(node: TreeNode, depth: number, alpha: number, beta: number, isMax: boolean, path: string): number {
        node.visited = true;

        // Leaf node
        if (node.children.length === 0) {
            leavesVisited++;
            trace.push(`  → Vizitare frunză ${node.id}: valoare = ${node.value}`);
            node.finalValue = node.value!;
            return node.value!;
        }

        if (isMax) {
            let maxEval = -Infinity;
            trace.push(`  [MAX] Evaluare nod ${node.id} (α=${alpha}, β=${beta})`);

            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];

                // Check if we can prune
                if (maxEval >= beta) {
                    trace.push(`  ✂ PRUNING: Ramura ${child.id} (α=${alpha} >= β=${beta})`);
                    prunedNodes.push(child.id);
                    child.pruned = true;
                    markSubtreeAsPruned(child, prunedNodes);
                    continue;
                }

                const evalScore = minimax(child, depth - 1, alpha, beta, false, path + '→' + child.id);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);

                trace.push(`    ${child.id} returns ${evalScore}, maxEval = ${maxEval}, α = ${alpha}`);
            }

            node.finalValue = maxEval;
            return maxEval;

        } else {
            let minEval = Infinity;
            trace.push(`  [MIN] Evaluare nod ${node.id} (α=${alpha}, β=${beta})`);

            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];

                // Check if we can prune
                if (minEval <= alpha) {
                    trace.push(`  ✂ PRUNING: Ramura ${child.id} (β=${beta} <= α=${alpha})`);
                    prunedNodes.push(child.id);
                    child.pruned = true;
                    markSubtreeAsPruned(child, prunedNodes);
                    continue;
                }

                const evalScore = minimax(child, depth - 1, alpha, beta, true, path + '→' + child.id);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);

                trace.push(`    ${child.id} returns ${evalScore}, minEval = ${minEval}, β = ${beta}`);
            }

            node.finalValue = minEval;
            return minEval;
        }
    }

    function markSubtreeAsPruned(node: TreeNode, pruned: string[]): void {
        node.pruned = true;
        for (const child of node.children) {
            if (!child.visited) {
                pruned.push(child.id);
            }
            markSubtreeAsPruned(child, pruned);
        }
    }

    const rootValue = minimax(node, depth, alpha, beta, true, 'ROOT');

    const totalLeaves = countLeaves(node);

    return {
        rootValue,
        leavesVisited,
        totalLeaves,
        prunedNodes: [...new Set(prunedNodes)], // Remove duplicates
        executionTrace: trace
    };
}

function countLeaves(node: TreeNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

// Generate question
function generateQuestion(questionId: number, useRandomConfig: boolean = true): Question {
    let config: TreeConfig;

    if (useRandomConfig) {
        // Generate completely random configuration
        config = generateRandomTreeConfig({
            depthMin: 2,
            depthMax: 4,
            branchingMin: 2,
            branchingMax: 4,
            valueMin: 1,
            valueMax: 20,
            maxTotalLeaves: 50
        });

        console.log(`\n[Question ${questionId}] Generated random config:`);
        displayConfig(config);
    } else {
        // Fall back to old hardcoded configs
        const configs = [
            {depth: 2, branching: 3, min: 1, max: 15, totalLeaves: 9},
            {depth: 3, branching: 2, min: 1, max: 20, totalLeaves: 8},
            {depth: 2, branching: 4, min: 1, max: 12, totalLeaves: 16},
            {depth: 3, branching: 3, min: 1, max: 10, totalLeaves: 27},
        ];
        config = configs[questionId % configs.length];
    }
    const tree = generateGameTree(config.depth, config.branching, config.min, config.max);
    const treeVis = visualizeTree(tree);

    // Calculate correct answer
    const trace: string[] = [];
    const result = minMaxAlphaBeta(tree.root, tree.depth, -Infinity, Infinity, true, trace);

    // Generate partial answers
    const partialAnswers = [
        {
            userRootValue: result.rootValue,
            userLeavesVisited: result.totalLeaves, // Wrong: all leaves
            score: 50,
            feedback: `Valoarea rădăcinii este corectă (${result.rootValue}), dar ai vizitat TOATE frunzele (${result.totalLeaves}). Alpha-Beta pruning reduce numărul de vizitări la ${result.leavesVisited}.`
        },
        {
            userRootValue: result.rootValue + 1, // Wrong value
            userLeavesVisited: result.leavesVisited,
            score: 50,
            feedback: `Numărul de frunze vizitate este corect (${result.leavesVisited}), dar valoarea rădăcinii este greșită. Verifică calculele MinMax.`
        },
        {
            userRootValue: result.rootValue - 2,
            userLeavesVisited: result.leavesVisited - 1,
            score: 25,
            feedback: `Ambele răspunsuri sunt incorecte. Valoarea corectă în rădăcină este ${result.rootValue}, și se vizitează ${result.leavesVisited} frunze.`
        },
        {
            userRootValue: result.rootValue,
            userLeavesVisited: result.leavesVisited,
            score: 100,
            feedback: `Perfect! Valoarea rădăcinii (${result.rootValue}) și numărul de frunze vizitate (${result.leavesVisited}) sunt corecte.`
        }
    ];

    return {
        id: questionId,
        tree,
        treeVisualization: treeVis,
        question: `Pentru arborele de joc dat mai jos, aplicați algoritmul MinMax cu optimizarea Alpha-Beta.

ÎNTREBĂRI:
1. Care va fi valoarea din rădăcină?
2. Câte noduri frunză vor fi vizitate?

Presupuneți că:
- Rădăcina este jucătorul MAX (maximizator)
- Alternează niveluri MAX-MIN-MAX...
- Valorile α și β inițiale sunt -∞ și +∞`,
        correctAnswer: result,
        partialAnswers
    };
}

// Display question
function displayQuestion(q: Question): void {
    console.log('\n' + '═'.repeat(80));
    console.log(`ÎNTREBAREA ${q.id}`);
    console.log('═'.repeat(80));
    console.log(q.treeVisualization);
    console.log('\n' + q.question);
    console.log('\n' + '═'.repeat(80));
}

// Display correct answer with full trace
function displayCorrectAnswer(q: Question): void {
    const result = q.correctAnswer;

    console.log('\n' + '═'.repeat(80));
    console.log('RĂSPUNS CORECT (100%)');
    console.log('═'.repeat(80));
    console.log(`\n1. Valoarea din rădăcină: ${result.rootValue}`);
    console.log(`2. Frunze vizitate: ${result.leavesVisited} din ${result.totalLeaves}`);
    console.log(`\nNoduri tăiate (pruned): ${result.prunedNodes.length > 0 ? result.prunedNodes.join(', ') : 'niciuna'}`);

    console.log('\n' + '─'.repeat(80));
    console.log('TRASEU DE EXECUȚIE (Execution Trace):');
    console.log('─'.repeat(80));
    result.executionTrace.forEach(line => console.log(line));

    console.log('\n' + '─'.repeat(80));
    console.log('EXPLICAȚIE:');
    console.log('─'.repeat(80));
    console.log(`• Alpha-Beta pruning elimină ${result.totalLeaves - result.leavesVisited} frunze din ${result.totalLeaves}`);
    console.log(`• Eficiență: ${((1 - result.leavesVisited/result.totalLeaves) * 100).toFixed(1)}% reducere în explorare`);
    console.log(`• În cazul cel mai bun, Alpha-Beta reduce O(b^d) la O(b^(d/2))`);
    console.log(`• Pruning apare când: α ≥ β (pentru MAX) sau β ≤ α (pentru MIN)`);
}

// Evaluate user answer
interface EvaluationResult {
    score: number;
    feedback: string;
    details: {
        rootValueCorrect: boolean;
        leavesVisitedCorrect: boolean;
        rootValueError?: number;
        leavesVisitedError?: number;
    };
}

function evaluateAnswer(q: Question, userRootValue: number, userLeavesVisited: number): EvaluationResult {
    const correct = q.correctAnswer;
    const rootValueCorrect = userRootValue === correct.rootValue;
    const leavesVisitedCorrect = userLeavesVisited === correct.leavesVisited;

    const rootValueError = Math.abs(userRootValue - correct.rootValue);
    const leavesVisitedError = Math.abs(userLeavesVisited - correct.leavesVisited);

    // Both correct
    if (rootValueCorrect && leavesVisitedCorrect) {
        return {
            score: 100,
            feedback: `🎉 Perfect! Ambele răspunsuri sunt corecte!\n   Valoare rădăcină: ${userRootValue} ✓\n   Frunze vizitate: ${userLeavesVisited} ✓`,
            details: { rootValueCorrect, leavesVisitedCorrect }
        };
    }

    // Only root value correct
    if (rootValueCorrect && !leavesVisitedCorrect) {
        let feedback = `Valoarea rădăcinii este corectă (${userRootValue}) ✓\n`;

        if (userLeavesVisited === correct.totalLeaves) {
            feedback += `   Dar ai indicat TOATE frunzele (${userLeavesVisited}). Alpha-Beta reduce la ${correct.leavesVisited}! ✗`;
            return { score: 50, feedback, details: { rootValueCorrect, leavesVisitedCorrect, leavesVisitedError } };
        } else {
            feedback += `   Numărul de frunze vizitate este incorect: ai indicat ${userLeavesVisited}, corect este ${correct.leavesVisited} ✗`;
            return { score: 50, feedback, details: { rootValueCorrect, leavesVisitedCorrect, leavesVisitedError } };
        }
    }

    // Only leaves visited correct
    if (!rootValueCorrect && leavesVisitedCorrect) {
        return {
            score: 50,
            feedback: `Numărul de frunze vizitate este corect (${userLeavesVisited}) ✓\n   Dar valoarea rădăcinii este incorectă: ai indicat ${userRootValue}, corect este ${correct.rootValue} ✗`,
            details: { rootValueCorrect, leavesVisitedCorrect, rootValueError }
        };
    }

    // Both wrong but close
    if (rootValueError <= 2 && leavesVisitedError <= 2) {
        return {
            score: 25,
            feedback: `Aproape! Ambele răspunsuri sunt foarte apropiate de cele corecte.\n   Valoare rădăcină: ${userRootValue} (corect: ${correct.rootValue}) ~\n   Frunze vizitate: ${userLeavesVisited} (corect: ${correct.leavesVisited}) ~`,
            details: { rootValueCorrect, leavesVisitedCorrect, rootValueError, leavesVisitedError }
        };
    }

    // Both wrong
    return {
        score: 0,
        feedback: `Ambele răspunsuri sunt incorecte ✗\n   Valoare rădăcină: ai indicat ${userRootValue}, corect este ${correct.rootValue}\n   Frunze vizitate: ai indicat ${userLeavesVisited}, corect este ${correct.leavesVisited}`,
        details: { rootValueCorrect, leavesVisitedCorrect, rootValueError, leavesVisitedError }
    };
}

// Demonstrate evaluation
function demonstrateEvaluation(q: Question): void {
    console.log('\n' + '═'.repeat(80));
    console.log('DEMONSTRAȚIE EVALUARE RĂSPUNSURI');
    console.log('═'.repeat(80));

    const examples = [
        { root: q.correctAnswer.rootValue, leaves: q.correctAnswer.leavesVisited },
        { root: q.correctAnswer.rootValue, leaves: q.correctAnswer.totalLeaves },
        { root: q.correctAnswer.rootValue + 1, leaves: q.correctAnswer.leavesVisited },
        { root: q.correctAnswer.rootValue - 2, leaves: q.correctAnswer.leavesVisited + 1 },
    ];

    examples.forEach((ex, i) => {
        console.log(`\n[Exemplu ${i + 1}] Răspuns: Valoare=${ex.root}, Frunze=${ex.leaves}`);
        const result = evaluateAnswer(q, ex.root, ex.leaves);
        console.log(`   Punctaj: ${result.score}%`);
        console.log(`   ${result.feedback}`);
    });
}

// Main application
function main(): void {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║         GENERATOR ÎNTREBĂRI - MINIMAX CU ALPHA-BETA PRUNING               ║');
    console.log('║                    Teoria Jocurilor - Game Theory                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    // Generate 3 different questions
    for (let i = 0; i < 3; i++) {
        const question = generateQuestion(i);

        displayQuestion(question);
        displayCorrectAnswer(question);
        demonstrateEvaluation(question);

        console.log('\n' + '═'.repeat(80));
        console.log('\n');
    }

    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         GENERARE COMPLETĂ                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
}

// Export for use in other modules
export {
    Question,
    GameTree,
    MinMaxResult,
    EvaluationResult,
    generateQuestion,
    evaluateAnswer,
    visualizeTree,
    minMaxAlphaBeta
};

// Run the application
main();
