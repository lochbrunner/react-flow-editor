import {Endpoint} from './editor';
import {Node} from './types';

interface NodeRemoved {
  id: string;
  type: 'NodeRemoved';
}

interface ConnectionRemoved {
  id: string;
  type: 'ConnectionRemoved';
  input: Endpoint;
  output: Endpoint;
}

interface ConnectionCreated {
  input: {nodeId: string, port: number};
  output: {nodeId: string, port: number};
  type: 'ConnectionCreated';
}

interface NodeCreated {
  node: Node;
  type: 'NodeCreated';
}

interface NodeCollapseChanged {
  id: string;
  type: 'NodeCollapseChanged';
  shouldBeCollapsed: boolean;
}

export type ChangeAction = NodeRemoved|ConnectionRemoved|ConnectionCreated|
    NodeCreated|NodeCollapseChanged;