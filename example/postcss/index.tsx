import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Editor, Node, Config } from 'react-flow-editor';

import * as style from './index.scss';


function resolver(node: Node): JSX.Element {
    if (node.payload.type === '') return <h2 />;
    return (
        <p style={{ height: '100px', width: '60px' }}>{node.payload.h1}</p>
    );
}

const nodes: Node[] =
    [{
        name: 'Node 1',
        id: 'node-1',
        type: 'node-type-red ',
        payload: {},
        inputs: [
            { connection: [], name: 'input 1' }, { connection: [], name: 'input 2' }
        ],
        outputs: [
            { connection: [{ nodeId: 'node-2', port: 0 }], name: 'output 1' },
            { connection: [], name: 'output 2 ' }
        ],
        properties: { display: 'only-dots' },
        classNames: ['red']
    },
    {
        name: 'Node 2',
        id: 'node-2',
        type: 'node-type-green ',
        payload: {},
        inputs: [{ connection: [{ nodeId: 'node-1', port: 0 }], name: 'input 1' }],
        outputs: [
            { connection: [], name: 'output 1' },
            { connection: [], name: 'output 2 ' }
        ],
        properties: { display: 'only-dots' },
        classNames: ['green']
    }];


const config: Config = {
    resolver,
    connectionType: 'bezier',
    grid: true,
    demoMode: true,
    direction: 'we',
    style
};

ReactDOM.render(
    <div>
        <Editor config={config} nodes={nodes} />
    </div>,
    document.getElementById('root')
);