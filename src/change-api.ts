interface NodeRemoved {
  id: string;
  type: 'NodeRemoved';
}

interface ConnectionRemoved {
  id: string;
  type: 'ConnectionRemoved';
}

interface ConnectionCreated {
  input: {nodeId: string, connectionId: number};
  output: {nodeId: string, connectionId: number};
  type: 'ConnectionCreated';
}

interface NodeCreated {
  id: string;
  type: 'NodeCreated';
}


export type ChangeAction =
    NodeRemoved|ConnectionRemoved|ConnectionCreated|NodeCreated;