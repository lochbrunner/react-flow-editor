import {ChangeAction, Endpoint, Node} from 'react-flow-editor';
import {Connection} from 'react-flow-editor/dist/types';
import {Reducer} from 'redux';
import {Action} from 'redux-actions';

import * as Actions from './constants';

export interface RootState { nodes: Node[]; }

const loadMnist = () => {
  const conv2OutputDepth = 16;
  const conv1OutputDepth = 8;
  const inputDepth = 1;
  return [
    {
      id: 'input',
      legend: [],
      name: 'input',
      outputs: ['conv2d-1'],
      shape: [28, 28, inputDepth],
      type: 'input'
    },
    {
      type: 'variable',
      id: 'conv2d-1-weights',
      name: 'Conv 1 Kernel Weights',
      init: 'normal',
      outputs: ['conv2d-1'],
      shape: [5, 5, inputDepth, conv1OutputDepth],
      mean: 0.0,
      stdDev: 0.1
    },
    {
      type: 'convolution',
      id: 'conv2d-1',
      filters: 8,
      inputs: ['input', 'conv2d-1-weights'],
      name: 'Conv 1',
      outputs: ['relu-1'],
      strides: 1,
      depth: conv1OutputDepth
    },
    {
      type: 'relu',
      id: 'relu-1',
      name: 'ReLu 1',
      outputs: ['max-pool-1'],
      inputs: ['conv2d-1']
    },
    {
      type: 'max-pool',
      filterSize: [2, 2],
      id: 'max-pool-1',
      name: 'Max Pooling 1',
      pad: 0,
      strides: 2,
      outputs: ['conv2d-2'],
      inputs: ['relu-1']
    },
    {
      type: 'variable',
      id: 'conv2d-2-weights',
      name: 'Conv 2 Kernel Weights',
      init: 'normal',
      outputs: ['conv2d-2'],
      shape: [5, 5, conv1OutputDepth, conv2OutputDepth],
      mean: 0.0,
      stdDev: 0.1
    },
    {
      type: 'convolution',
      id: 'conv2d-2',
      filters: 8,
      inputs: ['max-pool-1', 'conv2d-2-weights'],
      name: 'Conv 2',
      outputs: ['relu-2'],
      strides: 1,
      depth: conv2OutputDepth
    },
    {
      type: 'relu',
      id: 'relu-2',
      name: 'ReLu 2',
      outputs: ['max-pool-2'],
      inputs: ['conv2d-2']
    },
    {
      type: 'max-pool',
      filterSize: [2, 2],
      id: 'max-pool-2',
      name: 'Max Pooling 2',
      pad: 0,
      strides: 2,
      outputs: ['reshape-3'],
      inputs: ['relu-2']
    },
    {
      type: 'reshape',
      id: 'reshape-3',
      name: 'Reshape',
      inputs: ['max-pool-2'],
      outputs: ['mat-mul-3'],
      shape: [7 * 7 * conv2OutputDepth]
    },
    {
      // Not used yet
      type: 'variable',
      id: 'mat-mul-3-weight',
      name: 'Multiplication Weights',
      outputs: ['mat-mul-3'],
      shape: [7 * 7 * conv2OutputDepth, 10],
      init: 'normal',
      mean: 0,
      stdDev: 0.1
    },
    {
      type: 'mat-mul',
      id: 'mat-mul-3',
      name: 'Multiplication',
      outputs: ['add-3'],
      inputs: ['reshape-3', 'mat-mul-3-weight']
    },
    {
      // Not uses yet
      type: 'variable',
      name: 'Addition Weights',
      id: 'add-3-weights',
      shape: [10],
      outputs: ['add-3'],
      init: 'zero'
    },
    {
      type: 'add',
      id: 'add-3',
      name: 'Add',
      outputs: ['result'],
      inputs: ['mat-mul-3', 'add-3-weights']
    }
  ];
};

const loadMock = (): Node[] =>
    [{
      name: 'Node 1',
      id: 'node-1',
      type: 'node-type-red ',
      payload: {},
      inputs: [
        {connection: [], name: 'input 1'}, {connection: [], name: 'input 2'}
      ],
      outputs: [
        {connection: [{nodeId: 'node-2', port: 0}], name: 'output 1'},
        {connection: [], name: 'output 2 '}
      ],
      properties: {display: 'only-dots'},
      classNames: ['red']
    },
     {
       name: 'Node 2',
       id: 'node-2',
       type: 'node-type-green ',
       payload: {},
       inputs: [{connection: [{nodeId: 'node-1', port: 0}], name: 'input 1'}],
       outputs: [
         {connection: [], name: 'output 1'},
         {connection: [], name: 'output 2 '}
       ],
       properties: {display: 'only-dots'},
       classNames: ['green']
     }];

const addMock = (old: Node[]): Node[] => {
  const classNames = ['red', 'green', 'blue'];
  const randomColorIndex = Math.floor(Math.random() * 3);
  const x = Math.floor(Math.random() * 400);
  const y = Math.floor(Math.random() * 600);
  old.push({
    name: `Node ${old.length + 1}`,
    id: `node-${old.length + 1}`,
    type: 'node-type-1 ',
    payload: {},
    inputs: [{connection: [], name: 'input 1'}],
    outputs: [
      {connection: [], name: 'output 1'}, {connection: [], name: 'output 2 '}
    ],
    position: {x, y},
    properties: {display: 'only-dots'},
    classNames: [classNames[randomColorIndex]]
  });
  return [...old];
};

const changeData = (old: Node[]): Node[] => {
  if (old.length > 0) old[0].name = old[0].name + '3';
  return [...old];
};

const removeData = (old: Node[]): Node[] => {
  if (old.length > 0) {
    old.pop();
    return [...old];
  }
  return [];
};

const clearMock = (): Node[] => [];

const removeConnection = (state: RootState, connection: {
  input: Endpoint,
  output: Endpoint
}) => {
  const inputNodeIndex =
      state.nodes.findIndex(n => n.id === connection.input.nodeId);

  const inputConnections =
      state.nodes[inputNodeIndex].inputs[connection.input.port].connection as
      Connection[];
  const inputConnectionIndex = inputConnections.findIndex(
      s => s.nodeId === connection.output.nodeId &&
          s.port === connection.output.port);
  inputConnections.splice(inputConnectionIndex, 1);

  const outputNodeIndex =
      state.nodes.findIndex(n => n.id === connection.output.nodeId);
  const outputConnections =
      state.nodes[outputNodeIndex].outputs[connection.output.port].connection as
      Connection[];
  const outputConnectionIndex = outputConnections.findIndex(
      s => s.nodeId === connection.input.nodeId &&
          s.port === connection.input.port);
  outputConnections.splice(outputConnectionIndex, 1);
};

export const reducer: Reducer<RootState> =
    (state: RootState = {
      nodes: clearMock()
    },
     action: Action<{}|ChangeAction>) => {
      if (action.type === Actions.LOAD_DATA) {
        return {nodes: loadMock()};
      } else if (action.type === Actions.CLEAR_DATA) {
        return {nodes: clearMock()};
      } else if (action.type === Actions.ADD_DATA) {
        return {nodes: addMock(state.nodes)};
      } else if (action.type === Actions.CHANGE_DATA) {
        return {nodes: changeData(state.nodes)};
      } else if (action.type === Actions.REMOVE_DATA) {
        return {nodes: removeData(state.nodes)};
      } else if (action.type === Actions.EDITOR_UPDATES) {
        const payload = action.payload as ChangeAction;
        const classNames = Math.random() > 0.7 ? ['invalid'] : [];
        if (payload.type === 'ConnectionCreated') {
          const inputIndex =
              state.nodes.findIndex(n => n.id === payload.input.nodeId);
          const outputIndex =
              state.nodes.findIndex(n => n.id === payload.output.nodeId);
          const outputConnection: Connection = {
            nodeId: payload.output.nodeId,
            port: payload.output.port,
            classNames,
            notes:
                `Connects ${payload.input.nodeId} with ${payload.output.nodeId}`
          };
          const inputConnection: Connection = {
            nodeId: payload.input.nodeId,
            port: payload.input.port
          };
          (state.nodes[inputIndex].inputs[payload.input.port].connection as
           Connection[])
              .push(outputConnection);
          (state.nodes[outputIndex].outputs[payload.output.port].connection as
           Connection[])
              .push(inputConnection);
        } else if (payload.type === 'ConnectionRemoved') {
          removeConnection(state, payload);
        } else if (payload.type === 'NodeCreated') {
          state.nodes.push(payload.node);
        } else if (payload.type === 'NodeRemoved') {
          for (const conn of payload.correspondingConnections) {
            removeConnection(state, conn);
          }
          const inputNode = state.nodes.findIndex(n => n.id === payload.id);
          state.nodes.splice(inputNode, 1);
        } else if (payload.type === 'NodeCollapseChanged') {
          const nodeIndex = state.nodes.findIndex(n => n.id === payload.id);
          const node: Node = {
            ...state.nodes[nodeIndex],
            isCollapsed: payload.shouldBeCollapsed
          };
          state.nodes[nodeIndex] = node;
        }
        console.log(payload);
        return {...state};
      }
      return state;
    };
