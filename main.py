import random
import sys
from typing import List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class TreeNode:
    id: str
    value: Optional[int] = None
    children: List['TreeNode'] = None
    is_max: bool = True
    visited: bool = False
    pruned: bool = False

    def __post_init__(self):
        if self.children is None:
            self.children = []


@dataclass
class GameTree:
    root: TreeNode
    depth: int
    branching_factor: int
    leaf_values: List[int]


@dataclass
class MinMaxResult:
    root_value: int
    leaves_visited: int
    total_leaves: int


def random_int(min_val: int, max_val: int) -> int:
    """Generate random integer between min and max (inclusive)"""
    return random.randint(min_val, max_val)


def generate_game_tree(depth: int, branching: int, min_val: int, max_val: int) -> GameTree:
    """Generate a random game tree"""
    total_leaves = branching ** depth
    leaf_values = [random_int(min_val, max_val) for _ in range(total_leaves)]

    leaf_index = [0]  # Use list to maintain reference in nested function

    def build_tree(current_depth: int, is_max: bool, id_prefix: str) -> TreeNode:
        if current_depth == 0:
            # Leaf node
            node = TreeNode(
                id=id_prefix,
                value=leaf_values[leaf_index[0]],
                children=[],
                is_max=is_max,
                visited=False
            )
            leaf_index[0] += 1
            return node

        children = []
        for i in range(branching):
            if id_prefix == 'ROOT':
                child_id = chr(65 + i)  # A, B, C, ...
            else:
                child_id = f"{id_prefix}{i + 1}"

            children.append(build_tree(current_depth - 1, not is_max, child_id))

        return TreeNode(
            id=id_prefix if id_prefix != 'ROOT' else 'ROOT',
            children=children,
            is_max=is_max,
            visited=False
        )

    root = build_tree(depth, True, 'ROOT')

    return GameTree(
        root=root,
        depth=depth,
        branching_factor=branching,
        leaf_values=leaf_values
    )


def parse_custom_tree() -> GameTree:
    """Parse a custom tree from user input"""
    print('\n' + '═' * 80)
    print('INTRODUCERE ARBORE PERSONALIZAT')
    print('═' * 80)
    print('Introduceți structura arborelui:')
    print('Format: Adâncime Ramificare Valori_frunze (separate prin spații)')
    print('Exemplu: 2 3 5 8 3 7 9 2 4 6 1')
    print('  (Adâncime=2, Ramificare=3, apoi 9 valori pentru frunze)')
    print('═' * 80)

    try:
        input_line = input('\nIntroduceți datele: ').strip()
        parts = list(map(int, input_line.split()))

        if len(parts) < 3:
            raise ValueError("Trebuie să introduceți cel puțin adâncimea, ramificarea și o valoare")

        depth = parts[0]
        branching = parts[1]
        leaf_values = parts[2:]

        expected_leaves = branching ** depth

        if len(leaf_values) != expected_leaves:
            raise ValueError(
                f"Număr incorect de valori frunze. Așteptat: {expected_leaves}, Primit: {len(leaf_values)}")

        # Build tree with custom values
        leaf_index = [0]

        def build_tree(current_depth: int, is_max: bool, id_prefix: str) -> TreeNode:
            if current_depth == 0:
                # Leaf node
                node = TreeNode(
                    id=id_prefix,
                    value=leaf_values[leaf_index[0]],
                    children=[],
                    is_max=is_max,
                    visited=False
                )
                leaf_index[0] += 1
                return node

            children = []
            for i in range(branching):
                if id_prefix == 'ROOT':
                    child_id = chr(65 + i)  # A, B, C, ...
                else:
                    child_id = f"{id_prefix}{i + 1}"

                children.append(build_tree(current_depth - 1, not is_max, child_id))

            return TreeNode(
                id=id_prefix if id_prefix != 'ROOT' else 'ROOT',
                children=children,
                is_max=is_max,
                visited=False
            )

        root = build_tree(depth, True, 'ROOT')

        return GameTree(
            root=root,
            depth=depth,
            branching_factor=branching,
            leaf_values=leaf_values
        )

    except ValueError as e:
        print(f'\n✗ Eroare: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'\n✗ Eroare la parsare: {e}')
        sys.exit(1)


def visualize_tree(tree: GameTree) -> str:
    """Visualize tree in ASCII"""
    lines = []

    lines.append('\n' + '═' * 80)
    lines.append('ARBORELE DE JOC')
    lines.append('═' * 80)
    lines.append(
        f'Adâncime: {tree.depth} | Ramificare: {tree.branching_factor} | Total frunze: {len(tree.leaf_values)}\n')

    def print_node(node: TreeNode, prefix: str, is_last: bool):
        indent = prefix + ('└── ' if is_last else '├── ')
        node_type = '[MAX]' if node.is_max else '[MIN]'
        node_value = f' = {node.value}' if node.value is not None else ''

        lines.append(f'{indent}{node.id} {node_type}{node_value}')

        new_prefix = prefix + ('    ' if is_last else '│   ')
        for i, child in enumerate(node.children):
            print_node(child, new_prefix, i == len(node.children) - 1)

    lines.append('ROOT [MAX]')
    for i, child in enumerate(tree.root.children):
        print_node(child, '', i == len(tree.root.children) - 1)

    lines.append('\n' + '─' * 80)
    lines.append('Valorile frunzelor:')

    leaves_per_branch = len(tree.leaf_values) // tree.branching_factor
    for i in range(tree.branching_factor):
        branch_leaves = tree.leaf_values[i * leaves_per_branch:(i + 1) * leaves_per_branch]
        branch_name = chr(65 + i)
        lines.append(f'  Ramura {branch_name}: [{", ".join(map(str, branch_leaves))}]')

    lines.append('═' * 80)

    return '\n'.join(lines)


def minimax_alpha_beta(node: TreeNode, depth: int, alpha: float, beta: float) -> MinMaxResult:
    """Execute MinMax with Alpha-Beta pruning"""
    leaves_visited = [0]  # Use list to maintain reference

    def minimax(node: TreeNode, alpha: float, beta: float, is_max: bool) -> int:
        node.visited = True

        # Leaf node
        if not node.children:
            leaves_visited[0] += 1
            return node.value

        if is_max:
            max_eval = float('-inf')

            for child in node.children:
                if max_eval >= beta:
                    mark_subtree_as_pruned(child)
                    continue

                eval_score = minimax(child, alpha, beta, False)
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)

            return max_eval
        else:
            min_eval = float('inf')

            for child in node.children:
                if min_eval <= alpha:
                    mark_subtree_as_pruned(child)
                    continue

                eval_score = minimax(child, alpha, beta, True)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)

            return min_eval

    def mark_subtree_as_pruned(node: TreeNode):
        node.pruned = True
        for child in node.children:
            mark_subtree_as_pruned(child)

    def count_leaves(node: TreeNode) -> int:
        if not node.children:
            return 1
        return sum(count_leaves(child) for child in node.children)

    root_value = minimax(node, alpha, beta, True)
    total_leaves = count_leaves(node)

    return MinMaxResult(
        root_value=int(root_value),
        leaves_visited=leaves_visited[0],
        total_leaves=total_leaves
    )


def generate_question() -> Tuple[GameTree, MinMaxResult]:
    """Generate a random question"""
    while True:
        depth = random_int(2, 4)
        branching = random_int(2, 4)
        total_leaves = branching ** depth

        # Limit tree size
        if total_leaves > 50:
            continue

        min_value = random_int(1, 10)
        max_value = min_value + random_int(10, 20)

        tree = generate_game_tree(depth, branching, min_value, max_value)
        result = minimax_alpha_beta(tree.root, tree.depth, float('-inf'), float('inf'))

        return tree, result


def display_question(tree: GameTree):
    """Display the question"""
    print(visualize_tree(tree))

    # Afișare format pentru input (-t)
    print('\n' + '─' * 80)
    print('Format pentru reintroducere (opțiunea -t):')
    format_string = f"{tree.depth} {tree.branching_factor} {' '.join(map(str, tree.leaf_values))}"
    print(f'  {format_string}')
    print('─' * 80)

    print('\nÎNTREBARE:')
    print('Pentru arborele de joc dat, aplicați algoritmul MinMax cu Alpha-Beta pruning.')
    print('\nPresupuneți că:')
    print('  • Rădăcina este jucătorul MAX')
    print('  • Alternează niveluri MAX-MIN-MAX...')
    print('  • Valorile α și β inițiale sunt -∞ și +∞')
    print('\n1. Care va fi valoarea din rădăcină?')
    print('2. Câte noduri frunză vor fi vizitate?\n')


def evaluate_answer(user_root: int, user_leaves: int, correct_root: int, correct_leaves: int):
    """Evaluate user's answer"""
    root_correct = user_root == correct_root
    leaves_correct = user_leaves == correct_leaves

    print('\n' + '═' * 80)
    print('EVALUARE')
    print('═' * 80)

    if root_correct and leaves_correct:
        print('✓ CORECT! (100 puncte)')
        print(f'  Valoare rădăcină: {user_root} ✓')
        print(f'  Frunze vizitate: {user_leaves} ✓')
    elif leaves_correct:
        print('50 puncte. Raspuns corect numar frunze. Raspuns gresit root')
        print(f'{correct_root}')
    elif root_correct:
        print('50 puncte. Raspuns corect root. Raspuns gresit numar frunze')
        print(f'{correct_leaves}')
    else:
        print('✗ INCORECT! (0 puncte)')
        root_msg = '✓' if root_correct else f'✗ (corect: {correct_root})'
        leaves_msg = '✓' if leaves_correct else f'✗ (corect: {correct_leaves})'
        print(f'  Valoare rădăcină: {user_root} {root_msg}')
        print(f'  Frunze vizitate: {user_leaves} {leaves_msg}')

    print('═' * 80 + '\n')


def main():
    """Main CLI interface"""
    if len(sys.argv) < 2 or ('-q' not in sys.argv and '-t' not in sys.argv):
        print('Usage: python minimax_cli.py [-q|-t] [-d]')
        print('  -q: Generate a random question')
        print('  -t: Input a custom tree')
        print('  -d: Debug mode (show correct answers)')
        return

    debug_mode = '-d' in sys.argv
    custom_tree_mode = '-t' in sys.argv

    # Generate or input tree
    if custom_tree_mode:
        tree = parse_custom_tree()
        result = minimax_alpha_beta(tree.root, tree.depth, float('-inf'), float('inf'))
    else:
        tree, result = generate_question()

    display_question(tree)

    # Show answers in debug mode
    if debug_mode:
        print('─' * 80)
        print('DEBUG MODE - Răspunsuri corecte:')
        print(f'  Valoare rădăcină: {result.root_value}')
        print(f'  Frunze vizitate: {result.leaves_visited}')
        print('─' * 80)
        print()

    # Get user input
    try:
        root_answer = input('Valoarea din rădăcină: ').strip()
        leaves_answer = input('Frunze vizitate: ').strip()

        user_root = int(root_answer)
        user_leaves = int(leaves_answer)

        evaluate_answer(user_root, user_leaves, result.root_value, result.leaves_visited)

    except ValueError:
        print('\n✗ Răspunsuri invalide! Introduceți numere întregi.')
    except KeyboardInterrupt:
        print('\n\nÎntrerupt de utilizator.')
    except EOFError:
        print('\n\nSfârșit de input.')


if __name__ == '__main__':
    main()