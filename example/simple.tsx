import * as React from 'react';

import * as ReactDOM from 'react-dom';

import { Editor, Node, Config } from 'react-flow-editor';

const nodes: Node[] = [
    {
        id: 'Node 1',
        payload: { h1: 'hello' },
        inputs: [{ id: 'Node 2', name: 'input 1' }],
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
        outputs: [{ id: 'Node 1', name: 'output 1' }],
        size: {
            width: 100,
            height: 100
        }
    }
];

function resolver(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <h1>{payload.h1}</h1>
    );
}

const config: Config = {
    resolver,
    connectionType: 'bezier'
};

ReactDOM.render(
    <Editor config={config} nodes={nodes} />,
    document.getElementById('root')
);
