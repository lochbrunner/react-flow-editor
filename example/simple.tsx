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

let log: (log: string) => void = undefined;
const onChanged: Config['onChanged'] = data => {
    if (log === undefined) return;
    if (data.type === 'ConnectionRemoved')
        log(`Connection '${data.id}' was removed.`);
    else if (data.type === 'NodeRemoved')
        log(`Node '${data.id}' was removed.`);
};

const config: Config = {
    resolver,
    connectionType: 'bezier',
    onChanged
};

ReactDOM.render(
    <div>
        <Log subscribe={update => log = update} />
        <Editor config={config} nodes={nodes} />
    </div>,
    document.getElementById('root')
);
