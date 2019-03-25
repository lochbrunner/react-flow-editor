import {Vector2d} from './geometry';
import {Node, Size} from './types';


export interface NodeState {
  pos: Vector2d;
  size: Vector2d;
  offset?: Vector2d;
  isCollapsed: boolean;
}

interface NodeCorrelation {
  //   state: NodeState;
  left: string[];
  right: string[];
}

/**
 * For now assume input being right and output being left
 * @param prev The existing node states
 * @param size The total size of the editor
 * @param nodes All nodes
 */
export const adjust = (prev: Map<string, NodeState>, size: Size, nodes: Node[]):
    Map<string, NodeState> => {

      const newNodes: Map<string, NodeState> = new Map();
      const correlations: Map<string, NodeCorrelation> = new Map();
      for (const node of nodes) {
        if (!prev.has(node.id)) {
          const left = [];
          for (const input of node.inputs) {
            for (const conn of input.connection || []) {
              left.push(conn.nodeId);
            }
          }
          const right = [];
          for (const output of node.outputs) {
            for (const conn of output.connection || []) {
              right.push(conn.nodeId);
            }
          }

          correlations.set(node.id, {left, right});

          newNodes.set(node.id, {
            isCollapsed: node.isCollapsed !== undefined ? node.isCollapsed :
                                                          true,
            pos: node.position || {x: 0, y: 0},
            size: {x: 100, y: 100}
          });
        }
      }
      if (newNodes.size === 0) return newNodes;

      // Ignore cycles for now
      // Ignore previous nodes for now
      // Create columns -> find first
      // TODO: count connection as visited in order to find and handle
      // collisions const visited: Set<string> = new Set();
      const idToColumn: Map<string, number> = new Map();
      const columnToId: Map<number, string[]> = new Map();
      let initialColumn = 0;
      // Each loop one cluster
      const nodesKey = newNodes.keys();
      while (idToColumn.size < newNodes.size) {
        const queue: {column: number, id: string}[] = [];
        const nextNode = nodesKey.next().value;
        if (idToColumn.has(nextNode)) continue;
        queue.push({column: initialColumn, id: nextNode});
        while (queue.length > 0) {
          const item = queue.shift();
          idToColumn.set(item.id, item.column);
          if (columnToId.has(item.column))
            columnToId.get(item.column).push(item.id);
          else
            columnToId.set(item.column, [item.id]);
          const cor = correlations.get(item.id);
          for (const l of cor.left) {
            if (idToColumn.has(l)) continue;
            queue.push({column: item.column + 1, id: l});
          }
          for (const r of cor.right) {
            if (idToColumn.has(r)) continue;
            queue.push({column: item.column - 1, id: r});
          }
        }
      }

      // Find appropriate location
      // Going column-wise. Stack on collisions
      const width = size.width * 3;    // Scaling here is a bad hack
      const height = size.height * 4;  // Scaling here is a bad hack
      const dx = width / columnToId.size;
      let x = -dx / 2;
      for (const [, columnNodes] of new Map([...columnToId.entries()].sort())) {
        x += dx;

        for (const is in columnNodes) {
          const i = parseInt(is);
          const nodeId = columnNodes[i];
          const y = height * (1 + 2 * i) / (columnNodes.length * 2);
          newNodes.get(nodeId).pos = {x, y};
        }
      }
      return newNodes;
    };