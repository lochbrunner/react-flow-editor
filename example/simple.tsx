import * as React from 'react';

import * as ReactDOM from 'react-dom';

import { Editor, Node, Config } from 'react-flow-editor';

const nodes: Node[] = [
    {
        id: 'Node 1',
        payload: { h1: 'hello' },
        inputs: [{ id: 'Node 2', name: 'input 1' }],
        outputs: []
    },
    {
        id: 'Node 2',
        payload: { h1: 'world' },
        inputs: [{ id: 'Node 3', name: 'input 1' }],
        outputs: [{ id: 'Node 1', name: 'output 1' }]
    },
    {
        id: 'Node 3',
        payload: { h1: '!' },
        inputs: [],
        outputs: [{ id: 'Node 2', name: 'output 1' }]
    }
];

function resolver(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <p style={{ height: '100px', width: '80px' }}>{payload.h1}</p>
    );
}

const config: Config = {
    resolver,
    connectionType: 'bezier',
    onChanged: node => { }
};

ReactDOM.render(
    <Editor config={config} nodes={nodes} />,
    document.getElementById('root')
);
