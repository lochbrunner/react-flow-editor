import {Endpoint} from './editor';
import {Node} from './types';

export interface NodeRemoved {
  id: string;
  type: 'NodeRemoved';
  correspondingConnections: {input: Endpoint; output: Endpoint;}[];
}

export interface ConnectionRemoved {
  id: string;
  type: 'ConnectionRemoved';
  input: Endpoint;
  output: Endpoint;
}

export interface CreatedConnectionInfo {
  nodeId: string;
  port: number;
  name?: string;
}

export interface ConnectionCreated {
  input: CreatedConnectionInfo;
  output: CreatedConnectionInfo;
  type: 'ConnectionCreated';
}

export interface NodeCreated {
  node: Node;
  type: 'NodeCreated';
}

export interface NodeCollapseChanged {
  id: string;
  type: 'NodeCollapseChanged';
  shouldBeCollapsed: boolean;
}

export type ChangeAction = NodeRemoved|ConnectionRemoved|ConnectionCreated|
    NodeCreated|NodeCollapseChanged;