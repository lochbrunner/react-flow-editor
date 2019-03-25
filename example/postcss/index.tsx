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
const properties: Node['properties'] = { display: 'only-dots' };

const nodes: Node[] =
    [{
        name: 'Node 1',
        id: 'node-1',
        type: 'node-type-red ',
        payload: {},
        inputs: [
            { connection: [{ nodeId: 'node-4', port: 0 }], name: 'input 1' }, { connection: [], name: 'input 2' }
        ],
        outputs: [
            { connection: [{ nodeId: 'node-2', port: 0 }], name: 'output 1' },
            { connection: [{ nodeId: 'node-3', port: 0 }], name: 'output 2 ' }
        ],
        properties,
        classNames: ['red'],
        isCollapsed: false
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
        properties,
        classNames: ['green'],
        isCollapsed: false
    },
    {
        name: 'Node 3',
        id: 'node-3',
        type: 'node-type-green ',
        payload: {},
        inputs: [{ connection: [{ nodeId: 'node-1', port: 1 }], name: 'input 1' }],
        outputs: [
            { connection: [], name: 'output 1' },
            { connection: [], name: 'output 2 ' }
        ],
        properties,
        classNames: ['green'],
        isCollapsed: false
    },
    {
        name: 'Node 4',
        id: 'node-4',
        type: 'node-type-green ',
        payload: {},
        inputs: [{ connection: [], name: 'input 1' }],
        outputs: [
            { connection: [{ nodeId: 'node-1', port: 0 }], name: 'output 1' },
            { connection: [], name: 'output 2 ' }
        ],
        properties,
        classNames: ['green'],
        isCollapsed: false
    }];


const config: Config = {
    resolver,
    connectionType: 'bezier',
    grid: true,
    demoMode: false,
    direction: 'we',
    style
};

interface State {
    nodes: Node[];
}

class Component extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = { nodes: [] };

        setTimeout(() => {
            this.setState(prev => ({ ...prev, nodes }));
        }, 500);
    }

    componentDidMount() {

    }
    render() {
        return (
            <div>
                <Editor config={config} nodes={this.state.nodes} />
            </div>
        );
    }
}

ReactDOM.render(
    <Component />,
    document.getElementById('root')
);