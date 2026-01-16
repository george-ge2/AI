/**
 * Generates a Q-Learning update problem
 * Asks for Q(s,a) after applying the update rule
 */

function generateQLearningProblem() {
    // States and actions
    const states = ['S0', 'S1', 'S2', 'S3'];
    const actions = ['a1', 'a2', 'a3'];

    // Pick random state and action for the update
    const state = states[Math.floor(Math.random() * states.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    // Initial Q-value for Q(s,a)
    const initialQ = parseFloat((Math.random() * 10 - 2).toFixed(2)); // -2 to 8

    // Transition: (s, a, r, s')
    const reward = parseFloat((Math.random() * 10 - 2).toFixed(2)); // -2 to 8
    const nextState = states[Math.floor(Math.random() * states.length)];

    // Q-values at next state (for all actions)
    const qValuesNextState = {};
    actions.forEach(a => {
        qValuesNextState[a] = parseFloat((Math.random() * 10 - 2).toFixed(2));
    });

    // Max Q-value at next state
    const maxQNext = Math.max(...Object.values(qValuesNextState));

    // Learning rate and discount
    const alpha = Math.random() < 0.5 ? 0.1 : 0.2;
    const gamma = Math.random() < 0.5 ? 0.9 : 0.95;

    return {
        state,
        action,
        initialQ,
        reward,
        nextState,
        qValuesNextState,
        maxQNext,
        alpha,
        gamma
    };
}

/**
 * Compute Q-learning update
 * Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
 */
function computeQLearningUpdate(problem) {
    const { initialQ, reward, maxQNext, alpha, gamma } = problem;

    const target = reward + gamma * maxQNext;
    const tdError = target - initialQ;
    const newQ = initialQ + alpha * tdError;

    return parseFloat(newQ.toFixed(2));
}

/**
 * Generate question text
 */
function generateQuestion() {
    const problem = generateQLearningProblem();
    const correctAnswer = computeQLearningUpdate(problem);

    // Format Q-values at next state
    let qNextText = '';
    for (const [a, q] of Object.entries(problem.qValuesNextState)) {
        qNextText += `Q(${problem.nextState}, ${a}) = ${q}\n`;
    }

    const questionText =
        `Considerăm un agent Q-Learning cu parametrii:\n` +
        `- Learning rate: α = ${problem.alpha}\n` +
        `- Discount factor: γ = ${problem.gamma}\n\n` +
        `Valoarea Q inițială:\n` +
        `Q(${problem.state}, ${problem.action}) = ${problem.initialQ}\n\n` +
        `Agentul experimentează tranziția: (${problem.state}, ${problem.action}, r=${problem.reward}, ${problem.nextState})\n\n` +
        `Valorile Q pentru starea următoare sunt:\n${qNextText}\n` +
        `Aplicați regula de actualizare Q-Learning.\n` +
        `Care este noua valoare Q(${problem.state}, ${problem.action})?`;

    return {
        questionText,
        instance: problem,
        correctAnswer
    };
}

/**
 * Evaluate student answer
 */
function evaluateAnswer(userText, correctAnswer) {
    // Extract number from text
    const numberRegex = /-?\d+\.?\d*/g;
    const matches = userText.match(numberRegex);

    if (!matches || matches.length === 0) {
        return {
            score: 0,
            message: "Nu s-a detectat niciun număr în răspuns."
        };
    }

    // Try each number found
    for (const match of matches) {
        const userAnswer = parseFloat(match);

        // Check if close enough (tolerance ±0.1)
        if (Math.abs(userAnswer - correctAnswer) <= 0.1) {
            return {
                score: 100,
                message: `Corect! Q=${correctAnswer}`
            };
        }
    }

    // Wrong answer
    return {
        score: 0,
        message: `Incorect. Răspuns corect: Q=${correctAnswer}`
    };
}

module.exports = {
    generateQuestion,
    evaluateAnswer,
    generateQLearningProblem,
    computeQLearningUpdate
};

// CLI test
if (require.main === module) {
    console.log("=== Q-Learning Test ===\n");
    const q = generateQuestion();
    console.log(q.questionText);
    console.log("\n--- SOLUTION ---");
    console.log(`Answer: ${q.correctAnswer}`);
}
