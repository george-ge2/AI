// minimax.js
class TreeNode {
  constructor(id, value = null, children = [], isMax = true) {
    this.id = id;
    this.value = value;
    this.children = children;
    this.isMax = isMax;
    this.visited = false;
    this.pruned = false;
  }
}

class MinMaxResult {
  constructor(rootValue, leavesVisited, totalLeaves) {
    this.rootValue = rootValue;
    this.leavesVisited = leavesVisited;
    this.totalLeaves = totalLeaves;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateGameTree(depth, branching, minVal = 1, maxVal = 10) {
  const totalLeaves = Math.pow(branching, depth);
  const leafValues = Array.from({ length: totalLeaves }, () =>
    randomInt(minVal, maxVal)
  );

  let leafIndex = 0;

  function buildTree(currentDepth, isMax, idPrefix) {
    if (currentDepth === 0) {
      return new TreeNode(idPrefix, leafValues[leafIndex++], [], isMax);
    }
    const children = [];
    for (let i = 0; i < branching; i++) {
      const childId =
        idPrefix === "ROOT" ? String.fromCharCode(65 + i) : `${idPrefix}${i + 1}`;
      children.push(buildTree(currentDepth - 1, !isMax, childId));
    }
    return new TreeNode(idPrefix === "ROOT" ? "ROOT" : idPrefix, null, children, isMax);
  }

  const root = buildTree(depth, true, "ROOT");
  return { root, depth, branchingFactor: branching, leafValues };
}

function minimaxAlphaBeta(node, alpha = -Infinity, beta = Infinity) {
  let leavesVisited = 0;

  function minimax(node, alpha, beta, isMax) {
    node.visited = true;

    if (!node.children || node.children.length === 0) {
      leavesVisited++;
      return node.value;
    }

    if (isMax) {
      let maxEval = -Infinity;
      for (const child of node.children) {
        if (maxEval >= beta) {
          markSubtreeAsPruned(child);
          continue;
        }
        const evalScore = minimax(child, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const child of node.children) {
        if (minEval <= alpha) {
          markSubtreeAsPruned(child);
          continue;
        }
        const evalScore = minimax(child, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
      }
      return minEval;
    }
  }

  function markSubtreeAsPruned(node) {
    node.pruned = true;
    if (node.children) node.children.forEach(markSubtreeAsPruned);
  }

  function countLeaves(node) {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
  }

  const rootValue = minimax(node, alpha, beta, true);
  const totalLeaves = countLeaves(node);

  return new MinMaxResult(rootValue, leavesVisited, totalLeaves);
}


function renderTreeNode(node, prefix = '', isLast = true) {
    if (!node) return '';
    const nodeType = node.is_max ? '[MAX]' : '[MIN]';
    const valueStr = node.value != null ? ` = ${node.value}` : '';
    let line = prefix + (prefix ? (isLast ? '└── ' : '├── ') : '') + `${node.id} ${nodeType}${valueStr}\n`;
    const newPrefix = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');
    node.children?.forEach((child, idx) => {
        line += renderTreeNode(child, newPrefix, idx === node.children.length - 1);
    });
    return line;
}

function renderTree(node, prefix = "", isLast = true) {
  if (!node) return "";
  let str = prefix + (isLast ? "└── " : "├── ") + node.id + (node.isMax ? " [MAX]" : " [MIN]") + "\n";
  const newPrefix = prefix + (isLast ? "    " : "│   ");
  node.children.forEach((child, idx) => {
    str += renderTree(child, newPrefix, idx === node.children.length - 1);
  });
  return str;
}


module.exports = {
    TreeNode,
    generateGameTree,
    minimaxAlphaBeta,
    renderTree,
    renderTreeNode
};
