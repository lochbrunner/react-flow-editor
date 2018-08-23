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
    size?: Size;
    position?: Size;
}

export interface Config {
    resolver: (payload: any) => JSX.Element;
    // connectionValidator?: (output: Node, input: Node) => boolean;
    connectionType?: 'bezier' | 'linear';
}

export interface Props {
    config: Config;
    nodes: Node[];
}

type vector2d = { x: number, y: number };

type NodeState = { pos: vector2d, size: vector2d }

type State = {
    nodesState: Map<string, NodeState>;
}

class Rect {
    pos: vector2d;
    size: vector2d;

    constructor(pos: vector2d, size: vector2d) {
        this.pos = pos;
        this.size = size;
    }
    hit(v: vector2d) {
        return v.x >= this.pos.x && v.x <= this.pos.x + this.size.x && this.pos.y && v.y <= this.pos.y + this.size.y;
    }
    get left() { return this.pos.x; }
    get right() { return this.pos.x + this.size.x; }
    get top() { return this.pos.y; }
    get bottom() { return this.pos.y + this.size.y; }
}

export class Editor extends React.Component<Props, State> {

    private mouseDownPos?: {
        lastPos: vector2d, nodeId: string
    };
    constructor(props: Props) {
        super(props);
        this.state = { nodesState: this.calcNodesState() };
    }

    private calcNodesState(): Map<string, NodeState> {
        const { props } = this;
        const nodesState = new Map<string, NodeState>();
        const margin = { x: 100, y: 100 };
        const usedPlace: Rect[] = [];
        for (let node of props.nodes) {
            // Find suitable place
            const pos = { x: 10 + margin.x, y: 10 + margin.y };
            for (let place of usedPlace) {
                if (place.hit(pos))
                    pos.x = place.right + margin.x;
                pos.y = place.top;
            }
            const size = { x: 100, y: 100 };    // TODO: get size out of ref 
            nodesState.set(node.id, { pos, size });
            usedPlace.push(new Rect(pos, size));
        }
        return nodesState;
    }

    private connection(outputId: string, inputId: string) {
        const { config } = this.props;
        const { nodesState } = this.state;
        const key = `${outputId}_${inputId}`;
        const stroke = '#ccc';
        const width = 2;
        const output = nodesState.get(outputId);
        const input = nodesState.get(inputId);
        const sign = Math.sign(input.pos.x - output.pos.x);
        const dy = 20;
        const a0 = { x: output.pos.x + output.size.x, y: output.pos.y + dy };
        const a1 = { x: a0.x + sign * 100, y: a0.y };
        const a3 = { x: input.pos.x, y: input.pos.y + dy };
        const a2 = { x: input.pos.x - sign * 100, y: a3.y };

        if (config.connectionType === 'bezier') {
            return <path key={key} d={`M${a0.x} ${a0.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${a3.x} ${a3.y}`} stroke={stroke} strokeWidth={width} fill="transparent" />;
        }
        else if (config.connectionType === 'linear')
            return <line key={key} x1={a0.x} y1={a0.y} x2={a3.x} y2={a3.y} stroke={stroke} fill="transparent" strokeWidth={width} />
    };

    private dragStarted(id: string, e: React.MouseEvent) {
        this.mouseDownPos = { lastPos: { x: e.screenX, y: e.screenY }, nodeId: id };
    }

    private dragEnded(e: React.MouseEvent) {
        this.mouseDownPos = undefined;
    }

    private onDrag(e: React.MouseEvent) {
        if (this.mouseDownPos === undefined) return;
        const dx = e.screenX - this.mouseDownPos.lastPos.x;
        const dy = e.screenY - this.mouseDownPos.lastPos.y;
        this.setState((state, props) => {
            state.nodesState.get(this.mouseDownPos.nodeId).pos.x += dx;
            state.nodesState.get(this.mouseDownPos.nodeId).pos.y += dy;
            return state;
        });
        this.mouseDownPos.lastPos = { x: e.screenX, y: e.screenY };
    }

    render() {

        const { props, state } = this;

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
            userSelect: 'none',
            borderRadius: '10px 10px 0 0'
        };

        const nodeBodyStyle = {
            padding: '10px'
        };

        const svgStyle = {
            position: 'absolute',
            top: '0',
            left: '0',
            bottom: '0px',
            right: '0px',
            height: '100%',
            width: '100%',
        };

        const nodes = props.nodes.map(node =>
            <div key={node.id} style={nodeStyle(state.nodesState.get(node.id).pos) as any} className="node">
                <div onMouseDown={this.dragStarted.bind(this, node.id)} className="node-header" style={nodeHeaderStyle as any}>
                    {node.id}
                </div>
                <div className="node-body" style={nodeBodyStyle}>
                    {props.config.resolver(node.payload)}
                </div>
            </div>);

        const connections: { in: string, out: string }[] = props.nodes.reduce((p, s) => [...p, ...s.outputs.map(o => ({ in: s.id, out: o.id }))], []);
        const connectionsLines = connections.map(conn => this.connection(conn.out, conn.in));

        return (
            <div onMouseLeave={this.dragEnded.bind(this)} onMouseMove={this.onDrag.bind(this)} onMouseUp={this.dragEnded.bind(this)} className="editor" >
                <svg style={svgStyle as any} width="auto" height="auto" xmlns="http://www.w3.org/2000/svg">
                    {connectionsLines}
                </svg>
                {nodes}
            </div>
        );
    }
}