/**
 * Generates a simple Bayesian Network problem
 * Asks for probability calculations
 */

function generateBayesianNetwork() {
    const useThreeNodes = Math.random() < 0.4;

    if (useThreeNodes) {
        return generateThreeNodeNetwork();
    } else {
        return generateTwoNodeNetwork();
    }
}

/**
 * Two-node network: A → B
 */
function generateTwoNodeNetwork() {
    // P(A)
    const pA = roundProb(Math.random() * 0.5 + 0.2); // 0.2-0.7

    // P(B|A=true)
    const pB_given_A_true = roundProb(Math.random() * 0.5 + 0.3); // 0.3-0.8

    // P(B|A=false)
    const pB_given_A_false = roundProb(Math.random() * 0.5 + 0.1); // 0.1-0.6

    const network = {
        type: 'two-node',
        nodes: ['A', 'B'],
        structure: 'A → B',
        probs: {
            'P(A)': pA,
            'P(B|A=true)': pB_given_A_true,
            'P(B|A=false)': pB_given_A_false
        }
    };

    // Generate question
    const questionType = Math.random();

    if (questionType < 0.4) {
        // Joint probability P(A=true, B=true)
        const answer = pA * pB_given_A_true;
        return {
            network,
            question: 'Care este P(A=true, B=true)?',
            answer: roundProb(answer)
        };
    } else if (questionType < 0.7) {
        // Joint probability P(A=false, B=true)
        const answer = (1 - pA) * pB_given_A_false;
        return {
            network,
            question: 'Care este P(A=false, B=true)?',
            answer: roundProb(answer)
        };
    } else {
        // Marginal P(B=true)
        const answer = pA * pB_given_A_true + (1 - pA) * pB_given_A_false;
        return {
            network,
            question: 'Care este P(B=true)?',
            answer: roundProb(answer)
        };
    }
}

/**
 * Three-node network: A → B, A → C (independent B and C given A)
 */
function generateThreeNodeNetwork() {
    // P(A)
    const pA = roundProb(Math.random() * 0.5 + 0.2);

    // P(B|A)
    const pB_given_A_true = roundProb(Math.random() * 0.5 + 0.3);
    const pB_given_A_false = roundProb(Math.random() * 0.5 + 0.1);

    // P(C|A)
    const pC_given_A_true = roundProb(Math.random() * 0.5 + 0.3);
    const pC_given_A_false = roundProb(Math.random() * 0.5 + 0.1);

    const network = {
        type: 'three-node',
        nodes: ['A', 'B', 'C'],
        structure: 'A → B, A → C',
        probs: {
            'P(A)': pA,
            'P(B|A=true)': pB_given_A_true,
            'P(B|A=false)': pB_given_A_false,
            'P(C|A=true)': pC_given_A_true,
            'P(C|A=false)': pC_given_A_false
        }
    };

    // Generate question
    const questionType = Math.random();

    if (questionType < 0.5) {
        // P(A=true, B=true, C=true)
        const answer = pA * pB_given_A_true * pC_given_A_true;
        return {
            network,
            question: 'Care este P(A=true, B=true, C=true)?',
            answer: roundProb(answer)
        };
    } else {
        // P(B=true, C=true)
        const answer =
            pA * pB_given_A_true * pC_given_A_true +
            (1 - pA) * pB_given_A_false * pC_given_A_false;
        return {
            network,
            question: 'Care este P(B=true, C=true)?',
            answer: roundProb(answer)
        };
    }
}

/**
 * Round probability to 2 decimals
 */
function roundProb(p) {
    return parseFloat(p.toFixed(2));
}

/**
 * Format question
 */
function generateQuestion() {
    const data = generateBayesianNetwork();
    const { network, question, answer } = data;

    let probsText = '';
    for (const [key, value] of Object.entries(network.probs)) {
        probsText += `${key} = ${value}\n`;
    }

    const questionText =
        `Considerăm o rețea Bayesiană cu structura: ${network.structure}\n\n` +
        `Probabilități:\n${probsText}\n` +
        question;

    return {
        questionText,
        instance: network,
        correctAnswer: answer
    };
}

/**
 * Evaluate student answer
 */
function evaluateAnswer(userText, correctAnswer) {
    // Extract number from text (handles both 0.35 and 35%)
    const decimalRegex = /0\.\d+|\d+\.\d+/g;
    const percentRegex = /(\d+)%/g;

    let userAnswer = null;

    // Try decimal first
    const decimalMatches = userText.match(decimalRegex);
    if (decimalMatches) {
        userAnswer = parseFloat(decimalMatches[0]);
    }

    // Try percentage
    if (userAnswer === null) {
        const percentMatches = userText.match(percentRegex);
        if (percentMatches) {
            userAnswer = parseFloat(percentMatches[1]) / 100;
        }
    }

    if (userAnswer === null) {
        return {
            score: 0,
            message: "Nu s-a detectat nicio probabilitate în răspuns."
        };
    }

    // Check if close enough (tolerance ±0.02)
    if (Math.abs(userAnswer - correctAnswer) <= 0.02) {
        return {
            score: 100,
            message: `Corect! P=${correctAnswer}`
        };
    }

    // Wrong answer
    return {
        score: 0,
        message: `Incorect. Răspuns corect: P=${correctAnswer}`
    };
}

module.exports = {
    generateQuestion,
    evaluateAnswer,
    generateBayesianNetwork
};

// CLI test
if (require.main === module) {
    console.log("=== Bayesian Network Test ===\n");
    const q = generateQuestion();
    console.log(q.questionText);
    console.log("\n--- SOLUTION ---");
    console.log(`Answer: ${q.correctAnswer}`);
}
