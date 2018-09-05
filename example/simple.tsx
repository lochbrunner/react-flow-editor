import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Editor, Node, Config } from 'react-flow-editor';

require('./index.scss');

type LogProps = { subscribe: (update: (log: string) => void) => void };
type LogState = { content: string };

class Log extends React.Component<LogProps, LogState> {
    constructor(props: LogProps) {
        super(props);
        this.state = { content: '' };
        props.subscribe(this.update.bind(this));
    }

    private update(log: string) {
        this.setState({ content: log });
    }

    render() {
        const style = {
            fontFamily: 'Arial',
            position: 'absolute',
            bottom: '0'
        } as any;
        return <p style={style}>{this.state.content}</p>;
    }
}

const nodes: Node[] = [
    {
        id: 'Node 1',
        payload: { h1: 'hello' },
        inputs: [{
            connection: [{ nodeId: 'Node 2', port: 0 }], name: 'input 1',
            renderer: () => <input style={{ width: '80px' }} type="range" min="1" max="100" className="slider" />
        }],
        outputs: []
    },
    {
        id: 'Node 2',
        payload: { h1: 'world' },
        inputs: [
            { connection: [{ nodeId: 'Node 3', port: 0 }], name: 'input 1' },
            { connection: [], name: 'input 2' },
            { connection: [], name: 'input 3' }
        ],
        outputs: [
            { connection: [{ nodeId: 'Node 1', port: 0 }], name: 'output 1' },
            { connection: [], name: 'output 2' },
            { connection: [], name: 'output 3' }
        ]
    },
    {
        id: 'Node 3',
        payload: { h1: '!' },
        inputs: [],
        outputs: [{ connection: [{ nodeId: 'Node 2', port: 0 }], name: 'output 1' }]
    }
];

function resolver(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <p style={{ height: '100px', width: '60px' }}>{payload.h1}</p>
    );
}

let log: (log: string) => void = undefined;
const onChanged: Config['onChanged'] = data => {
    if (log === undefined) return;
    if (data.type === 'ConnectionRemoved')
        log(`Connection '${data.id}' was removed.`);
    else if (data.type === 'NodeRemoved')
        log(`Node '${data.id}' was removed.`);
    else if (data.type === 'ConnectionCreated') {
        log(`New connection between nodes '${data.input.nodeId}' [${data.input.connectionId}]  and '${data.output.nodeId}' [${data.output.connectionId}] created.`);
    }
};

const config: Config = {
    resolver,
    connectionType: 'bezier',
    onChanged,
    showGrid: true
};

ReactDOM.render(
    <div>
        <Log subscribe={update => log = update} />
        <Editor config={config} nodes={nodes} />
    </div>,
    document.getElementById('root')
);
