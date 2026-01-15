// Semantic Strategy Evaluator using Natural NLP
// Uses TF-IDF and Jaro-Winkler similarity for semantic matching

const natural = require('natural');
const { TfIdf } = natural;
const compromise = require('compromise');

// ============================================================================
// CONFIGURATION - Modify strategies and scores here
// ============================================================================

const PROBLEM_STRATEGIES = {
    "n-queens": {
        "optimal": {
            "strategies": ["BACKTRACKING"],
            "score": 100,
            "explanation": "BACKTRACKING is optimal for n-queens as it systematically explores the solution space with efficient constraint checking and pruning."
        },
        "good": {
            "strategies": ["DFS", "SIMULATED ANNEALING"],
            "score": 75,
            "explanation": "These strategies work well but may be less efficient than BACKTRACKING."
        },
        "working": {
            "strategies": ["BFS", "HILL CLIMBING", "BEAM SEARCH"],
            "score": 50,
            "explanation": "These strategies can solve the problem but are less efficient."
        },
        "unsuitable": {
            "strategies": ["A*", "IDA*", "GREEDY BEST SEARCH", "BIDIRECTIONAL SEARCH"],
            "score": 25,
            "explanation": "These strategies are not well-suited for the n-queens problem."
        }
    },
    "generalized-hanoi": {
        "optimal": {
            "strategies": ["A*", "IDA*"],
            "score": 100,
            "explanation": "A* and IDA* find optimal solutions efficiently using good heuristics for the Tower of Hanoi problem."
        },
        "good": {
            "strategies": ["BFS", "BIDIRECTIONAL SEARCH"],
            "score": 75,
            "explanation": "These strategies guarantee optimal solutions but may use more memory."
        },
        "working": {
            "strategies": ["GREEDY BEST SEARCH", "BEAM SEARCH", "BACKTRACKING"],
            "score": 50,
            "explanation": "These strategies can solve the problem but may not guarantee optimality."
        },
        "unsuitable": {
            "strategies": ["DFS", "HILL CLIMBING", "SIMULATED ANNEALING"],
            "score": 25,
            "explanation": "These strategies are not well-suited for finding optimal Hanoi solutions."
        }
    },
    "graph-coloring": {
        "optimal": {
            "strategies": ["BACKTRACKING"],
            "score": 100,
            "explanation": "BACKTRACKING systematically explores the solution space with constraint checking, making it ideal for graph coloring."
        },
        "good": {
            "strategies": ["DFS", "GREEDY BEST SEARCH", "SIMULATED ANNEALING"],
            "score": 75,
            "explanation": "These strategies work well for graph coloring with appropriate heuristics."
        },
        "working": {
            "strategies": ["BEAM SEARCH", "HILL CLIMBING"],
            "score": 50,
            "explanation": "These strategies can find solutions but may get stuck in local optima."
        },
        "unsuitable": {
            "strategies": ["BFS", "A*", "IDA*", "BIDIRECTIONAL SEARCH"],
            "score": 25,
            "explanation": "These strategies are not well-suited for graph coloring problems."
        }
    },
    "knights-tour": {
        "optimal": {
            "strategies": ["BACKTRACKING", "GREEDY BEST SEARCH"],
            "score": 100,
            "explanation": "BACKTRACKING finds all solutions systematically. GREEDY BEST SEARCH with Warnsdorff's heuristic is highly effective."
        },
        "good": {
            "strategies": ["DFS", "BEAM SEARCH"],
            "score": 75,
            "explanation": "These strategies work well with appropriate heuristics."
        },
        "working": {
            "strategies": ["A*", "IDA*", "HILL CLIMBING"],
            "score": 50,
            "explanation": "These strategies can solve the problem but may be less efficient."
        },
        "unsuitable": {
            "strategies": ["BFS", "SIMULATED ANNEALING", "BIDIRECTIONAL SEARCH"],
            "score": 25,
            "explanation": "These strategies are not well-suited for knight's tour problems."
        }
    }
};

// Maximum number of strategies allowed in an answer (anti-enumeration protection)
const MAX_STRATEGIES_ALLOWED = 2;

// Penalty for enumeration attempts
const ENUMERATION_PENALTY_SCORE = 10;

// Available strategies
const strategies = [
    'BFS', 'DFS', 'BACKTRACKING', 'BIDIRECTIONAL SEARCH',
    'GREEDY BEST SEARCH', 'HILL CLIMBING', 'SIMULATED ANNEALING',
    'BEAM SEARCH', 'A*', 'IDA*'
];

// Strategy name variations for extraction
const strategyVariations = {
    'A*': ['a*', 'a star', 'a-star', 'astar', 'a algorithm'],
    'IDA*': ['ida*', 'ida star', 'ida-star', 'idastar'],
    'BFS': ['bfs', 'breadth first', 'breadth-first', 'breadth first search'],
    'DFS': ['dfs', 'depth first', 'depth-first', 'depth first search'],
    'BACKTRACKING': ['backtracking', 'backtrack', 'back tracking'],
    'BIDIRECTIONAL SEARCH': ['bidirectional', 'bi-directional', 'bidirectional search', 'bi directional'],
    'GREEDY BEST SEARCH': ['greedy', 'greedy best', 'greedy search', 'greedy best search', 'greedy best first'],
    'HILL CLIMBING': ['hill climbing', 'hill-climbing', 'hillclimbing'],
    'SIMULATED ANNEALING': ['simulated annealing', 'annealing', 'simulated-annealing'],
    'BEAM SEARCH': ['beam search', 'beam', 'beam-search']
};

// ============================================================================
// PROBLEM TYPE DEFINITIONS
// ============================================================================

const problemTypes = {
    'n-queens': {
        name: 'n-queens',
        generateInstance: () => {
            const n = Math.random() < 0.3 ? 4 : (Math.random() < 0.5 ? 8 : (Math.random() < 0.7 ? 12 : 16));
            return { n, description: `n=${n}` };
        }
    },
    'generalized-hanoi': {
        name: 'generalized Hanoi',
        generateInstance: () => {
            const disks = Math.random() < 0.4 ? 3 : (Math.random() < 0.6 ? 4 : (Math.random() < 0.8 ? 5 : 6));
            const pegs = Math.random() < 0.5 ? 3 : 4;
            return { disks, pegs, description: `${disks} disks, ${pegs} pegs` };
        }
    },
    'graph-coloring': {
        name: 'graph coloring',
        generateInstance: () => {
            const nodes = Math.random() < 0.3 ? 5 : (Math.random() < 0.6 ? 8 : (Math.random() < 0.8 ? 12 : 15));
            const density = Math.random() < 0.5 ? 'sparse' : 'dense';
            const colors = Math.floor(nodes / 3) + Math.floor(Math.random() * 2) + 2;
            return { nodes, density, colors, description: `${nodes} nodes, ${density} graph, ${colors} colors` };
        }
    },
    'knights-tour': {
        name: "knight's tour",
        generateInstance: () => {
            const size = Math.random() < 0.4 ? 5 : (Math.random() < 0.7 ? 6 : 8);
            const type = Math.random() < 0.7 ? 'open' : 'closed';
            return { size, type, description: `${size}x${size} board, ${type} tour` };
        }
    }
};

// ============================================================================
// SEMANTIC EVALUATION FUNCTIONS
// ============================================================================

// Extract mentioned strategies from text with fuzzy matching for typos
function extractStrategies(text) {
    const found = new Set();
    const lowerText = text.toLowerCase();

    // First pass: exact matches
    for (const [strategy, variations] of Object.entries(strategyVariations)) {
        for (const variation of variations) {
            if (lowerText.includes(variation)) {
                found.add(strategy);
                break;
            }
        }
    }

    // Second pass: fuzzy matching for common typos (if not already found)
    for (const [strategy, variations] of Object.entries(strategyVariations)) {
        if (found.has(strategy)) continue;

        for (const variation of variations) {
            // Split text into words to check each one
            const words = lowerText.split(/\s+/);

            for (const word of words) {
                // Use Levenshtein distance for fuzzy matching
                // Allow 1-2 character differences for typos
                const distance = natural.LevenshteinDistance(word, variation);
                const maxDistance = variation.length > 6 ? 2 : 1;

                if (distance <= maxDistance && distance > 0) {
                    console.log(`  Fuzzy match: "${word}" → ${strategy} (distance: ${distance})`);
                    found.add(strategy);
                    break;
                }
            }

            if (found.has(strategy)) break;
        }
    }

    return Array.from(found);
}

// Generate reference sentences for each strategy
function generateReferenceSentences(strategy) {
    return [
        `The correct strategy for this problem is ${strategy}`,
        `The best strategy is ${strategy}`,
        `I would use ${strategy}`,
        `${strategy} is the optimal strategy`,
        `The answer is ${strategy}`,
        `${strategy} is the most suitable strategy`,
        `I choose ${strategy}`,
        `${strategy} works best here`,
        `${strategy} is correct`,
        `${strategy} should be used`,
        `Use ${strategy} for this problem`,
        `${strategy} is the right choice`
    ];
}

// Normalize text for comparison
function normalizeText(text) {
    let normalized = text.toLowerCase()
        .replace(/[^\w\s*-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized;
}

// Calculate TF-IDF similarity between user answer and reference sentences
function calculateTfIdfSimilarity(userAnswer, referenceSentences) {
    const tfidf = new TfIdf();

    // Add user answer
    tfidf.addDocument(normalizeText(userAnswer));

    // Add reference sentences
    referenceSentences.forEach(ref => {
        tfidf.addDocument(normalizeText(ref));
    });

    // Calculate similarity scores
    const similarities = [];
    const userTerms = new Set();

    // Get terms from user document
    tfidf.listTerms(0).forEach(item => {
        userTerms.add(item.term);
    });

    // Compare with each reference
    for (let i = 1; i < referenceSentences.length + 1; i++) {
        let similarity = 0;
        let termCount = 0;

        tfidf.listTerms(i).forEach(item => {
            if (userTerms.has(item.term)) {
                similarity += item.tfidf;
                termCount++;
            }
        });

        // Normalize by number of matching terms
        const normalizedSim = termCount > 0 ? similarity / Math.sqrt(termCount) : 0;

        similarities.push({
            sentence: referenceSentences[i - 1],
            similarity: normalizedSim,
            matchingTerms: termCount
        });
    }

    return similarities;
}

// Calculate string similarity using Jaro-Winkler
function calculateStringSimilarity(userAnswer, referenceSentence) {
    const userNorm = normalizeText(userAnswer);
    const refNorm = normalizeText(referenceSentence);

    return natural.JaroWinklerDistance(userNorm, refNorm);
}

// Analyze sentiment and intent using compromise
function analyzeIntent(text, strategy) {
    const lowerText = text.toLowerCase();

    // Strategy mention context
    const strategyLower = strategy.toLowerCase();
    const strategyIndex = lowerText.indexOf(strategyLower);

    if (strategyIndex === -1) return 'neutral';

    // Check words around strategy mention
    const before = lowerText.substring(Math.max(0, strategyIndex - 30), strategyIndex);
    const after = lowerText.substring(strategyIndex, Math.min(lowerText.length, strategyIndex + strategyLower.length + 30));

    const context = before + after;
    const hasNegativeNearby = /\b(not|isnt|isn't|dont|don't|wouldnt|wouldn't|avoid|wrong|maybe)\b/.test(context);
    const hasPositiveNearby = /\b(is|best|optimal|correct|good|use|choose|should|right)\b/.test(context);

    if (hasNegativeNearby) return 'negative';
    if (hasPositiveNearby) return 'positive';

    return 'neutral';
}

// Find which category a strategy belongs to for a given problem type
function getStrategyCategory(problemType, strategy) {
    const config = PROBLEM_STRATEGIES[problemType];
    if (!config) return null;

    for (const [category, data] of Object.entries(config)) {
        if (data.strategies.includes(strategy)) {
            return {
                category,
                score: data.score,
                explanation: data.explanation
            };
        }
    }

    return null;
}

// Main evaluation function
function evaluateAnswer(userAnswer, question) {
    const { problemType } = question;

    console.log('\n' + '='.repeat(80));
    console.log('SEMANTIC EVALUATION');
    console.log('='.repeat(80));
    console.log(`User answer: "${userAnswer}"`);
    console.log(`Problem type: ${problemType}`);
    console.log();

    // Extract mentioned strategies
    const mentionedStrategies = extractStrategies(userAnswer);

    if (mentionedStrategies.length === 0) {
        console.log('⚠ No strategy keywords detected in answer');
        const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;
        return {
            score: 0,
            category: 'no strategy detected',
            detectedStrategy: null,
            feedback: ['⚠ No strategy detected in your answer. Please mention a specific strategy.'],
            correctAnswers: optimalStrategies,
            similarities: []
        };
    }

    // Check for enumeration attempt (listing too many strategies)
    if (mentionedStrategies.length > MAX_STRATEGIES_ALLOWED) {
        console.log(`⚠ ENUMERATION DETECTED: ${mentionedStrategies.length} strategies mentioned (max allowed: ${MAX_STRATEGIES_ALLOWED})`);
        console.log(`Strategies mentioned: ${mentionedStrategies.join(', ')}`);

        const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;
        return {
            score: ENUMERATION_PENALTY_SCORE,
            category: 'enumeration attempt',
            detectedStrategy: null,
            feedback: [
                `⚠ ENUMERATION DETECTED: You mentioned ${mentionedStrategies.length} strategies.`,
                `  Please provide a single, focused answer (maximum ${MAX_STRATEGIES_ALLOWED} strategies).`,
                `  Listing multiple strategies to increase your chances is not allowed.`,
                `  Optimal strategies: ${optimalStrategies.join(', ')}`
            ],
            correctAnswers: optimalStrategies,
            similarities: [],
            enumerationDetected: true
        };
    }

    console.log(`Strategies mentioned: ${mentionedStrategies.join(', ')}`);
    console.log('\nComputing semantic similarities...\n');

    // Analyze each mentioned strategy
    const results = [];

    for (const strategy of mentionedStrategies) {
        const referenceSentences = generateReferenceSentences(strategy);

        // Calculate TF-IDF similarity
        const tfidfSimilarities = calculateTfIdfSimilarity(userAnswer, referenceSentences);
        const maxTfidf = Math.max(...tfidfSimilarities.map(s => s.similarity));

        // Calculate string similarities
        const stringSimilarities = referenceSentences.map(ref => ({
            sentence: ref,
            similarity: calculateStringSimilarity(userAnswer, ref)
        }));
        const maxString = Math.max(...stringSimilarities.map(s => s.similarity));

        // Analyze intent
        const intent = analyzeIntent(userAnswer, strategy);

        // Combined score
        const combinedScore = (maxTfidf * 0.6 + maxString * 0.4);

        // Adjust for intent
        let finalScore = combinedScore;
        if (intent === 'negative') {
            finalScore = -1; // Strong negative signal
        } else if (intent === 'positive') {
            finalScore = combinedScore * 1.2; // Boost positive
        }

        const bestTfidf = tfidfSimilarities.find(s => s.similarity === maxTfidf);

        results.push({
            strategy,
            tfidfScore: maxTfidf,
            stringScore: maxString,
            combinedScore,
            finalScore,
            intent,
            bestMatch: bestTfidf.sentence,
            matchingTerms: bestTfidf.matchingTerms
        });

        console.log(`${strategy}:`);
        console.log(`  TF-IDF similarity: ${(maxTfidf * 100).toFixed(1)}%`);
        console.log(`  String similarity: ${(maxString * 100).toFixed(1)}%`);
        console.log(`  Intent: ${intent}`);
        console.log(`  Final score: ${(finalScore * 100).toFixed(1)}%`);
        console.log(`  Best match: "${bestTfidf.sentence}"`);
        console.log();
    }

    // Sort by final score
    results.sort((a, b) => b.finalScore - a.finalScore);

    // The strategy with highest score is the detected answer
    const topResult = results[0];

    if (topResult.finalScore < 0) {
        const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;
        return {
            score: 5,
            category: 'negative intent',
            detectedStrategy: null,
            feedback: [
                `⚠ You mentioned ${topResult.strategy} negatively or with uncertainty.`,
                `  Please state clearly which strategy you think is correct.`,
                `  Optimal strategies: ${optimalStrategies.join(', ')}`
            ],
            correctAnswers: optimalStrategies,
            similarities: results
        };
    }

    const detectedStrategy = topResult.strategy;
    const confidence = topResult.finalScore;

    console.log(`Detected strategy: ${detectedStrategy} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    // Require minimum confidence threshold
    if (confidence < 0.15) {
        const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;
        return {
            score: 5,
            category: 'low confidence',
            detectedStrategy: null,
            feedback: [
                '⚠ Your answer is unclear. Please state your chosen strategy more explicitly.',
                `  Optimal strategies: ${optimalStrategies.join(', ')}`
            ],
            correctAnswers: optimalStrategies,
            similarities: results
        };
    }

    // Score based on category from JSON config
    const categoryInfo = getStrategyCategory(problemType, detectedStrategy);

    if (!categoryInfo) {
        // Strategy not in any category for this problem
        const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;
        return {
            score: 0,
            category: 'unknown',
            detectedStrategy,
            confidence,
            feedback: [
                `✗ ${detectedStrategy} is not categorized for this problem type.`,
                `  Optimal strategies: ${optimalStrategies.join(', ')}`
            ],
            correctAnswers: optimalStrategies,
            similarities: results
        };
    }

    const { category, score, explanation } = categoryInfo;
    const optimalStrategies = PROBLEM_STRATEGIES[problemType].optimal.strategies;

    let feedback = [];

    if (category === 'optimal') {
        feedback.push(`✓ Excellent! ${detectedStrategy} is an optimal strategy for this problem.`);
        feedback.push(`  ${explanation}`);
    } else if (category === 'good') {
        feedback.push(`✓ Very good! ${detectedStrategy} is a near-optimal strategy.`);
        feedback.push(`  ${explanation}`);
        feedback.push(`  Optimal strategies: ${optimalStrategies.join(', ')}`);
    } else if (category === 'working') {
        feedback.push(`✓ Acceptable. ${detectedStrategy} works, but is not the most efficient.`);
        feedback.push(`  ${explanation}`);
        feedback.push(`  Optimal strategies: ${optimalStrategies.join(', ')}`);
    } else if (category === 'unsuitable') {
        feedback.push(`✗ ${detectedStrategy} is a valid strategy, but not suitable for this problem.`);
        feedback.push(`  ${explanation}`);
        feedback.push(`  Optimal strategies: ${optimalStrategies.join(', ')}`);
    }

    return {
        score,
        category,
        detectedStrategy,
        confidence,
        feedback,
        correctAnswers: optimalStrategies,
        similarities: results
    };
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

function generateQuestion() {
    const problemTypeKeys = Object.keys(problemTypes);
    const selectedType = problemTypeKeys[Math.floor(Math.random() * problemTypeKeys.length)];
    const problemDef = problemTypes[selectedType];

    const instance = problemDef.generateInstance();

    const questionText = `For the ${problemDef.name} problem with the instance (${instance.description}), which is the most suitable solving strategy?`;

    const config = PROBLEM_STRATEGIES[selectedType];

    return {
        enunt: questionText,
        problemType: selectedType,
        instance: instance,
        optimalStrategies: config.optimal.strategies,
        goodStrategies: config.good.strategies,
        workingStrategies: config.working.strategies,
        unsuitableStrategies: config.unsuitable.strategies,
        explanation: config.optimal.explanation
    };
}

function formatQuestion(q, showAnswers = false) {
    const cleanEnunt = q.enunt.replace(/\s+/g, ' ').trim();
    let output = cleanEnunt;

    if (showAnswers) {
        output += '\n\n--- CORRECT ANSWER ---\n';
        output += `Optimal strategies (100p): ${q.optimalStrategies.join(', ')}\n`;
        if (q.goodStrategies.length > 0) {
            output += `Good strategies (75p): ${q.goodStrategies.join(', ')}\n`;
        }
        if (q.workingStrategies.length > 0) {
            output += `Working strategies (50p): ${q.workingStrategies.join(', ')}\n`;
        }
        if (q.unsuitableStrategies.length > 0) {
            output += `Unsuitable strategies (25p): ${q.unsuitableStrategies.join(', ')}\n`;
        }
        output += `\nExplanation: ${q.explanation}\n`;
    }

    return output;
}

function generateQuestions(count = 5) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push(generateQuestion());
    }
    return questions;
}

// ============================================================================
// QUIZ MODE
// ============================================================================

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
    console.log("QUIZ MODE - Semantic NLP Evaluation");
    console.log("=".repeat(80));
    console.log("\nYour answers will be evaluated using NLP semantic understanding.");
    console.log("You can answer naturally in English, for example:");
    console.log("  - 'Backtracking'");
    console.log("  - 'The best strategy is A*'");
    console.log("  - 'I would use Greedy Best Search'");
    console.log("  - 'The optimal strategy for this problem is Backtracking'");
    console.log();
    console.log(`⚠ Anti-enumeration: Maximum ${MAX_STRATEGIES_ALLOWED} strategies per answer.`);
    console.log("   Listing many strategies will result in a penalty.\n");

    let totalScore = 0;
    const numQuestions = 5;

    for (let i = 0; i < numQuestions; i++) {
        const q = generateQuestion();

        console.log("=".repeat(80));
        console.log(`QUESTION ${i + 1} of ${numQuestions}`);
        console.log("=".repeat(80));
        console.log();
        console.log(formatQuestion(q, false));
        console.log();

        const userAnswer = await question("Your answer:\n> ");

        const evaluation = evaluateAnswer(userAnswer, q);

        console.log("=".repeat(80));
        console.log('RESULT');
        console.log("=".repeat(80));
        console.log(`Score: ${evaluation.score}/100`);

        if (evaluation.enumerationDetected) {
            console.log('⚠ ENUMERATION PENALTY APPLIED');
        }

        console.log(`Detected strategy: ${evaluation.detectedStrategy || 'None'}`);
        if (evaluation.confidence) {
            console.log(`Confidence: ${(evaluation.confidence * 100).toFixed(1)}%`);
        }
        console.log();

        evaluation.feedback.forEach(f => console.log(f));

        totalScore += evaluation.score;

        console.log();

        if (i < numQuestions - 1) {
            await question("Press Enter for the next question...");
            console.log();
        }
    }

    console.log("=".repeat(80));
    console.log("FINAL SCORE");
    console.log("=".repeat(80));
    console.log();
    console.log(`Average score: ${Math.round(totalScore / numQuestions)}/100`);
    console.log(`Questions completed: ${numQuestions}`);
    console.log();

    rl.close();
}

// ============================================================================
// TEACHER MODE
// ============================================================================

async function teacherMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
        rl.question(prompt, resolve);
    });

    console.log("=".repeat(80));
    console.log("TEACHER MODE - Get Correct Answers");
    console.log("=".repeat(80));
    console.log("\nAvailable problem types:");

    const problemTypeKeys = Object.keys(problemTypes);
    problemTypeKeys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${problemTypes[key].name}`);
    });
    console.log();

    const userInput = await question("Enter the problem type (name or number):\n> ");

    // Parse user input - can be name or number
    let selectedType = null;
    const inputLower = userInput.trim().toLowerCase();

    // Check if it's a number
    const inputNum = parseInt(inputLower);
    if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= problemTypeKeys.length) {
        selectedType = problemTypeKeys[inputNum - 1];
    } else {
        // Try to match by name
        selectedType = problemTypeKeys.find(key => {
            const name = problemTypes[key].name.toLowerCase();
            return name.includes(inputLower) || inputLower.includes(name.replace(/'/g, ''));
        });
    }

    if (!selectedType) {
        console.log("\n✗ Invalid problem type. Please run the program again.");
        rl.close();
        return;
    }

    const problemDef = problemTypes[selectedType];
    const config = PROBLEM_STRATEGIES[selectedType];

    console.log("\n" + "=".repeat(80));
    console.log(`CORRECT ANSWER FOR: ${problemDef.name.toUpperCase()}`);
    console.log("=".repeat(80));
    console.log();
    console.log("📊 STRATEGY RANKINGS:");
    console.log();

    console.log("✓ OPTIMAL (100 points):");
    console.log(`  Strategies: ${config.optimal.strategies.join(', ')}`);
    console.log(`  ${config.optimal.explanation}`);
    console.log();

    if (config.good.strategies.length > 0) {
        console.log("✓ GOOD (75 points):");
        console.log(`  Strategies: ${config.good.strategies.join(', ')}`);
        console.log(`  ${config.good.explanation}`);
        console.log();
    }

    if (config.working.strategies.length > 0) {
        console.log("✓ WORKING (50 points):");
        console.log(`  Strategies: ${config.working.strategies.join(', ')}`);
        console.log(`  ${config.working.explanation}`);
        console.log();
    }

    if (config.unsuitable.strategies.length > 0) {
        console.log("✗ UNSUITABLE (25 points):");
        console.log(`  Strategies: ${config.unsuitable.strategies.join(', ')}`);
        console.log(`  ${config.unsuitable.explanation}`);
        console.log();
    }

    console.log("=".repeat(80));
    console.log();

    rl.close();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const quizMode_flag = process.argv.includes('-q');
const teacherMode_flag = process.argv.includes('-t');

if (quizMode_flag) {
    quizMode().catch(console.error);
} else if (teacherMode_flag) {
    teacherMode().catch(console.error);
} else {
    console.log("=== Problem Generator (Semantic NLP Evaluation) ===\n");
    console.log("Usage:");
    console.log("  node index.js -q    Quiz mode (take the test)");
    console.log("  node index.js -t    Teacher mode (get correct answers)\n");

    const questions = generateQuestions(3);
    questions.forEach((q, index) => {
        console.log("=".repeat(80));
        console.log(`QUESTION ${index + 1}`);
        console.log("=".repeat(80));
        console.log();
        console.log(formatQuestion(q, true));
        console.log();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateQuestion,
        generateQuestions,
        evaluateAnswer,
        formatQuestion,
        strategies,
        problemTypes,
        PROBLEM_STRATEGIES
    };
}