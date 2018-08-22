import * as React from 'react';

import * as ReactDOM from 'react-dom';

import { Editor, Node } from 'react-flow-editor';

const graph: Node[] = [
    {
        id: 'Node 1',
        payload: { h1: 'hello' },
        inputs: [{ id: 'Node 2', name: 'input_1' }],
        outputs: [],
        size: {
            width: 100,
            height: 100
        }
    },
    {
        id: 'Node 2',
        payload: { h1: 'world' },
        inputs: [],
        outputs: [{ id: 'Node 1', name: 'output_1' }],
        size: {
            width: 100,
            height: 100
        }
    }
];

function resolve(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <h1>{payload.h1}</h1>
    );
}

ReactDOM.render(
    <Editor resolver={resolve} graph={graph} />,
    document.getElementById('root')
);
