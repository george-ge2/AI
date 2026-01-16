/**
 * Generates a Perceptron weight update problem
 * Asks for new weights after a single update step
 */

function generatePerceptronProblem() {
    // Number of features (2-3 for simplicity)
    const numFeatures = Math.random() < 0.6 ? 2 : 3;

    // Initial weights (small values)
    const weights = [];
    for (let i = 0; i < numFeatures; i++) {
        weights.push(parseFloat((Math.random() * 2 - 1).toFixed(2))); // -1 to 1
    }

    // Bias
    const bias = parseFloat((Math.random() * 2 - 1).toFixed(2));

    // Learning rate
    const learningRate = [0.1, 0.2, 0.5, 1.0][Math.floor(Math.random() * 4)];

    // Input vector
    const input = [];
    for (let i = 0; i < numFeatures; i++) {
        input.push(Math.floor(Math.random() * 5) - 2); // -2 to 2 integers
    }

    // True label (1 or -1)
    const trueLabel = Math.random() < 0.5 ? 1 : -1;

    // Compute prediction
    let sum = bias;
    for (let i = 0; i < numFeatures; i++) {
        sum += weights[i] * input[i];
    }
    const prediction = sum >= 0 ? 1 : -1;

    // Check if misclassified (we want problems with updates)
    // If correctly classified, flip the label to force an update
    const actualLabel = (prediction === trueLabel) ? -trueLabel : trueLabel;

    return {
        weights,
        bias,
        learningRate,
        input,
        trueLabel: actualLabel,
        prediction,
        numFeatures
    };
}

/**
 * Compute Perceptron update
 * w_new = w + η * (y - ŷ) * x
 * b_new = b + η * (y - ŷ)
 */
function computePerceptronUpdate(problem) {
    const { weights, bias, learningRate, input, trueLabel } = problem;

    // Compute current prediction
    let sum = bias;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i] * input[i];
    }
    const prediction = sum >= 0 ? 1 : -1;

    // If correct, no update needed
    if (prediction === trueLabel) {
        return {
            newWeights: [...weights],
            newBias: bias,
            updated: false
        };
    }

    // Compute error (y - ŷ) for perceptron: this is 2 or -2
    const error = trueLabel - prediction;

    // Update weights: w_new = w + η * error * x
    const newWeights = weights.map((w, i) => {
        return parseFloat((w + learningRate * error * input[i]).toFixed(2));
    });

    // Update bias: b_new = b + η * error
    const newBias = parseFloat((bias + learningRate * error).toFixed(2));

    return {
        newWeights,
        newBias,
        updated: true,
        error
    };
}

/**
 * Generate question text
 */
function generateQuestion() {
    const problem = generatePerceptronProblem();
    const result = computePerceptronUpdate(problem);

    // Format weights
    const weightsStr = problem.weights.map((w, i) => `w${i+1}=${w}`).join(', ');
    const inputStr = problem.input.map((x, i) => `x${i+1}=${x}`).join(', ');

    // Ask for a specific weight (randomly choose which one)
    const askWeightIndex = Math.floor(Math.random() * problem.weights.length);
    const correctAnswer = result.newWeights[askWeightIndex];

    const questionText =
        `Considerăm un perceptron cu:\n` +
        `- Ponderi: ${weightsStr}\n` +
        `- Bias: b=${problem.bias}\n` +
        `- Learning rate: η=${problem.learningRate}\n\n` +
        `Se primește exemplul de antrenare:\n` +
        `- Input: ${inputStr}\n` +
        `- Etichetă corectă: y=${problem.trueLabel}\n\n` +
        `Aplicați regula de actualizare Perceptron.\n` +
        `Care este noua valoare a ponderii w${askWeightIndex + 1}?`;

    return {
        questionText,
        instance: {
            ...problem,
            askWeightIndex
        },
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
                message: `Corect! w=${correctAnswer}`
            };
        }
    }

    // Wrong answer
    return {
        score: 0,
        message: `Incorect. Răspuns corect: w=${correctAnswer}`
    };
}

module.exports = {
    generateQuestion,
    evaluateAnswer,
    generatePerceptronProblem,
    computePerceptronUpdate
};

// CLI test
if (require.main === module) {
    console.log("=== Perceptron Test ===\n");
    const q = generateQuestion();
    console.log(q.questionText);
    console.log("\n--- SOLUTION ---");
    console.log(`Answer: ${q.correctAnswer}`);
}
