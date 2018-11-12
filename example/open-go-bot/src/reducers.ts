import {Node} from 'react-flow-editor';
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
      type: 'node-type-1 ',
      payload: {},
      inputs: [{connection: [], name: 'input 1'}],
      outputs: [
        {connection: [], name: 'output 1'},
        {connection: [], name: 'output 2 '}
      ],
      properties: {display: 'only-dots'}
    },
     {
       name: 'Node 2',
       id: 'node-2',
       type: 'node-type-1 ',
       payload: {},
       inputs: [{connection: [], name: 'input 1'}],
       outputs: [
         {connection: [], name: 'output 1'},
         {connection: [], name: 'output 2 '}
       ],
       properties: {display: 'only-dots'}
     }];

const addMock = (old: Node[]): Node[] => {
  old.push({
    name: 'Node 3',
    id: 'node-3',
    type: 'node-type-1 ',
    payload: {},
    inputs: [{connection: [], name: 'input 1'}],
    outputs: [
      {connection: [], name: 'output 1'}, {connection: [], name: 'output 2 '}
    ],
    properties: {display: 'only-dots'}
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

export const reducer: Reducer<RootState> =
    (state: RootState = {
      nodes: clearMock()
    },
     action: Action<RootState>) => {
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
      }
      return state;
    };
