// answerKey.json - External configuration file
const fs = require('fs');
const path = require('path');

// Default answer key structure
const defaultAnswerKey = {
"version": "1.0",
"lastUpdated": "2025-01-15",
"problemTypes": {
"n-queens": {
"name": "n-queens",
"description": "N-Queens placement problems",
"optimalStrategy": "BACKTRACKING",
"goodStrategies": ["DFS"],
"workingStrategies": ["BFS", "IDA*"],
"reasoning": "Backtracking with constraint propagation efficiently explores the solution space for all board sizes. The constraint satisfaction nature of the problem makes backtracking ideal.",
"notes": "Same strategy applies regardless of n value. For very large n (>100), local search methods might be considered, but that's beyond typical academic scope.",
"scoreLog": []
},
"graph-coloring": {
"name": "graph coloring",
"description": "Graph vertex coloring problems",
"optimalStrategy": "BACKTRACKING",
"goodStrategies": ["DFS", "GREEDY BEST SEARCH"],
"workingStrategies": ["BFS", "BEAM SEARCH"],
"reasoning": "Backtracking systematically explores color assignments with constraint checking. This is a constraint satisfaction problem.",
"notes": "Graph size and density don't fundamentally change the best approach - backtracking remains optimal for exact solutions.",
"scoreLog": []
},
"knights-tour": {
"name": "knight's tour",
"description": "Knight's tour on chess board",
"optimalStrategy": "BACKTRACKING",
"goodStrategies": ["DFS", "GREEDY BEST SEARCH"],
"workingStrategies": ["BEAM SEARCH", "IDA*"],
"reasoning": "Backtracking explores all possible knight moves. Greedy heuristics (Warnsdorff's rule) work well as guidance.",
"notes": "For small boards, backtracking is best. For larger boards, greedy with Warnsdorff's heuristic is commonly taught.",
"scoreLog": []
},
"generalized-hanoi": {
"name": "generalized Hanoi",
"description": "Tower of Hanoi variants",
"optimalStrategy": "A*",
"goodStrategies": ["IDA*", "BFS"],
"workingStrategies": ["BIDIRECTIONAL SEARCH", "GREEDY BEST SEARCH"],
"reasoning": "A* with appropriate heuristic finds optimal solution. For memory constraints, IDA* is excellent alternative.",
"notes": "This is a shortest path problem in state space, making A* family algorithms ideal.",
"scoreLog": []
}
},
"strategies": [
"BFS", "DFS", "BACKTRACKING", "BIDIRECTIONAL SEARCH",
"GREEDY BEST SEARCH", "HILL CLIMBING", "SIMULATED ANNEALING",
"BEAM SEARCH", "A*", "IDA*"
]
};

class AnswerKeyManager {
constructor(configPath = './answerKey.json') {
this.configPath = configPath;
this.answerKey = this.loadAnswerKey();
}

loadAnswerKey() {
try {
if (fs.existsSync(this.configPath)) {
const data = fs.readFileSync(this.configPath, 'utf8');
return JSON.parse(data);
}
} catch (error) {
console.warn(`Could not load answer key from ${this.configPath}, using defaults`);
}
return defaultAnswerKey;
}

saveAnswerKey() {
try {
fs.writeFileSync(
this.configPath,
JSON.stringify(this.answerKey, null, 2),
'utf8'
);
return true;
} catch (error) {
console.error('Error saving answer key:', error.message);
return false;
}
}

initializeAnswerKey() {
this.answerKey = defaultAnswerKey;
return this.saveAnswerKey();
}

getProblemConfig(problemType) {
return this.answerKey.problemTypes[problemType] || null;
}

getOptimalStrategy(problemType) {
const config = this.getProblemConfig(problemType);
return config ? config.optimalStrategy : null;
}

logTestResult(problemType, instance, userAnswer, score, detectedStrategy) {
const config = this.getProblemConfig(problemType);
if (!config) return;

if (!config.scoreLog) {
config.scoreLog = [];
}

config.scoreLog.push({
timestamp: new Date().toISOString(),
instance: instance,
userAnswer: userAnswer,
detectedStrategy: detectedStrategy,
score: score,
wasCorrect: detectedStrategy === config.optimalStrategy
});

// Keep only last 50 entries per problem type
if (config.scoreLog.length > 50) {
config.scoreLog = config.scoreLog.slice(-50);
}

this.saveAnswerKey();
}

getStatistics(problemType) {
const config = this.getProblemConfig(problemType);
if (!config || !config.scoreLog || config.scoreLog.length === 0) {
return null;
}

const log = config.scoreLog;
const totalAttempts = log.length;
const correctAttempts = log.filter(entry => entry.wasCorrect).length;
const avgScore = log.reduce((sum, entry) => sum + entry.score, 0) / totalAttempts;

const strategyDistribution = {};
log.forEach(entry => {
const strat = entry.detectedStrategy || 'None';
strategyDistribution[strat] = (strategyDistribution[strat] || 0) + 1;
});

return {
problemType,
totalAttempts,
correctAttempts,
accuracy: (correctAttempts / totalAttempts * 100).toFixed(1) + '%',
avgScore: avgScore.toFixed(1),
optimalStrategy: config.optimalStrategy,
strategyDistribution
};
}

updateProblemConfig(problemType, updates) {
if (!this.answerKey.problemTypes[problemType]) {
console.error(`Problem type ${problemType} not found`);
return false;
}

Object.assign(this.answerKey.problemTypes[problemType], updates);
this.answerKey.lastUpdated = new Date().toISOString();

return this.saveAnswerKey();
}

exportReport() {
const report = {
version: this.answerKey.version,
lastUpdated: this.answerKey.lastUpdated,
problemTypes: {}
};

for (const [type, config] of Object.entries(this.answerKey.problemTypes)) {
report.problemTypes[type] = {
name: config.name,
optimalStrategy: config.optimalStrategy,
goodStrategies: config.goodStrategies,
workingStrategies: config.workingStrategies,
reasoning: config.reasoning,
statistics: this.getStatistics(type)
};
}

return report;
}

printReport() {
console.log('\n' + '='.repeat(80));
console.log('ANSWER KEY CONFIGURATION REPORT');
console.log('='.repeat(80));
console.log(`Version: ${this.answerKey.version}`);
console.log(`Last Updated: ${this.answerKey.lastUpdated}`);
console.log();

for (const [type, config] of Object.entries(this.answerKey.problemTypes)) {
console.log('-'.repeat(80));
console.log(`Problem: ${config.name.toUpperCase()}`);
console.log('-'.repeat(80));
console.log(`Optimal Strategy: ${config.optimalStrategy} (100 points)`);
console.log(`Good Strategies: ${config.goodStrategies.join(', ')} (75 points)`);
console.log(`Working Strategies: ${config.workingStrategies.join(', ')} (50 points)`);
console.log(`\nReasoning: ${config.reasoning}`);

if (config.notes) {
console.log(`Notes: ${config.notes}`);
}

const stats = this.getStatistics(type);
if (stats) {
console.log(`\nTest Statistics:`);
console.log(`  Total Attempts: ${stats.totalAttempts}`);
console.log(`  Accuracy: ${stats.accuracy}`);
console.log(`  Average Score: ${stats.avgScore}/100`);
console.log(`  Strategy Distribution:`);
for (const [strat, count] of Object.entries(stats.strategyDistribution)) {
console.log(`    ${strat}: ${count}`);
}
}
console.log();
}
}
}

// Integration with existing evaluator
function evaluateAnswerWithLogging(userAnswer, question, answerKeyManager) {
const config = answerKeyManager.getProblemConfig(question.problemType);

if (!config) {
console.error(`No configuration found for problem type: ${question.problemType}`);
return null;
}

// Use configuration instead of question's strategy info
const evaluationQuestion = {
...question,
optimalStrategy: config.optimalStrategy,
goodStrategies: config.goodStrategies,
workingStrategies: config.workingStrategies
};

// Call your existing evaluateAnswer function
const evaluation = evaluateAnswer(userAnswer, evaluationQuestion);

// Log the result
answerKeyManager.logTestResult(
question.problemType,
question.instance,
userAnswer,
evaluation.score,
evaluation.detectedStrategy
);

return evaluation;
}

// CLI Commands
if (require.main === module) {
const args = process.argv.slice(2);
const command = args[0];

const manager = new AnswerKeyManager();

switch (command) {
case 'init':
if (manager.initializeAnswerKey()) {
console.log('✓ Answer key initialized successfully');
console.log(`  Location: ${path.resolve(manager.configPath)}`);
}
break;

case 'report':
manager.printReport();
break;

case 'export':
const report = manager.exportReport();
console.log(JSON.stringify(report, null, 2));
break;

case 'update':
// Example: node answerKey.js update n-queens optimalStrategy "BACKTRACKING"
const [, problemType, field, value] = args;
if (problemType && field && value) {
const updates = { [field]: JSON.parse(value) };
if (manager.updateProblemConfig(problemType, updates)) {
console.log(`✓ Updated ${problemType}.${field}`);
}
} else {
console.log('Usage: node answerKey.js update <problemType> <field> <value>');
}
break;

case 'stats':
const statsType = args[1];
if (statsType) {
const stats = manager.getStatistics(statsType);
if (stats) {
console.log(JSON.stringify(stats, null, 2));
} else {
console.log(`No statistics available for ${statsType}`);
}
} else {
console.log('Usage: node answerKey.js stats <problemType>');
}
break;

default:
console.log('Answer Key Manager');
console.log('\nUsage:');
console.log('  node answerKey.js init              - Initialize answer key file');
console.log('  node answerKey.js report            - Print full report');
console.log('  node answerKey.js export            - Export JSON report');
console.log('  node answerKey.js stats <type>      - Show stats for problem type');
console.log('  node answerKey.js update <type> <field> <value> - Update config');
}
}

module.exports = { AnswerKeyManager, evaluateAnswerWithLogging, defaultAnswerKey };