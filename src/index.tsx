import * as React from 'react';


export interface Size {
    width: number,
    height: number
}

export type BaseConnection = {
    name: string;
    id?: string;
};

export type BaseInput = BaseConnection & {};

export type BaseOutput = BaseConnection & {};

export interface Node {
    id: string;
    payload: any;
    inputs: BaseInput[];
    outputs: BaseOutput[];
    size: Size;
}

export interface Config {
    resolver: (payload: any) => JSX.Element;
    connectionType?: 'bezier' | 'linear';
}

export interface Props {
    config: Config;
    nodes: Node[];
}


export interface State {

}

type vector2d = { x: number, y: number };

export class Editor extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    render() {

        const { props } = this;
        const { config } = props;

        const nodeStyle = (pos: vector2d) => ({
            display: 'inline-block',
            backgroundColor: '#fafafa',
            fontFamily: 'Arial',
            position: 'absolute',
            top: `${pos.y}px`,
            left: `${pos.x}px`,
            border: '1px solid #ddd',
            borderRadius: '10px'
        });

        const nodeHeaderStyle = {
            borderBottom: '1px solid #ddd',
            padding: '6px',
            textAlign: 'center',
            cursor: 'grab',
            backgroundColor: '#f7f7f7',
        };

        const nodeBodyStyle = {
            padding: '10px'
        };

        const svgStyle = {
            position: 'absolute',
            top: '0',
            left: '0'
        };

        const posMap = new Map<string, vector2d>();
        posMap.set('Node 1', { x: 10, y: 10 });
        posMap.set('Node 2', { x: 220, y: 110 });

        const connection = (start: vector2d, end: vector2d, key: string) => {
            const stroke = '#ccc';
            const width = 2;
            if (config.connectionType === 'bezier') {
                const sign = Math.sign(end.x - start.x);
                const a1 = { x: start.x + sign * 100, y: start.y };
                const a2 = { x: end.x - sign * 100, y: end.y };
                return <path key={key} d={`M${start.x} ${start.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${end.x} ${end.y}`} stroke={stroke} strokeWidth={width} fill="transparent" />;
            }
            else if (config.connectionType === 'linear')
                return <line key={key} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke} fill="transparent" strokeWidth={width} />
        };


        const nodes = props.nodes.map(node =>
            <div key={node.id} style={nodeStyle(posMap.get(node.id)) as any} className="node">
                <div className="node-header" style={nodeHeaderStyle as any}>
                    {node.id}
                </div>
                <div className="node-body" style={nodeBodyStyle}>
                    {props.config.resolver(node.payload)}
                </div>
            </div>);

        const connections: { in: string, out: string }[] = props.nodes.reduce((p, s) => [...p, ...s.outputs.map(o => ({ in: s.id, out: o.id }))], []);
        const connectionsLines = connections.map(conn => connection(posMap.get(conn.in), posMap.get(conn.out), `${conn.in}_${conn.out}`));

        return (
            <div className="editor">
                <svg style={svgStyle as any} width="auto" height="auto" xmlns="http://www.w3.org/2000/svg">
                    {connectionsLines}
                </svg>
                {nodes}
            </div>
        );
    }
}