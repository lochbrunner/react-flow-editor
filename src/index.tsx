import * as React from 'react';
import * as _ from 'lodash';

export interface Size {
    width: number,
    height: number
}

export type BaseConnection = {
    name: string;
    id?: string;
    payload?: any;
    renderer?: (connection: BaseConnection) => JSX.Element;
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
    onChanged?: (node: Node) => void;
    connectionType?: 'bezier' | 'linear';
}

export interface Props {
    config: Config;
    nodes: Node[];
}

class vector2d {
    x: number;
    y: number;
    static add(a: vector2d, b: vector2d): vector2d {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    static compare(a: vector2d, b: vector2d) {
        return a.x === b.x && a.y === b.y;
    }
};

type NodeState = { pos: vector2d, size: vector2d, offset?: vector2d }


type State = {
    nodesState: Map<string, NodeState>;
    connectionState: Map<string, vector2d>;
}

class Connection {
    nodeId: string;
    connectionId: number;
    kind: 'input' | 'output';

    static computeId(nodeId: Connection['nodeId'], connectionId: Connection['connectionId'], kind: Connection['kind']) {
        return `${nodeId}_${connectionId}_${kind}`;
    }
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

    static compare(a: Rect, b: Rect): boolean {
        return a.size.x === b.size.x && a.size.y === b.size.y && a.pos.x === b.pos.x && a.pos.y === b.pos.y;
    }
}

export class Editor extends React.Component<Props, State> {

    private mouseDownPos?: {
        lastPos: vector2d, nodeId: string
    };
    private endpointCache: Map<string, vector2d>;

    constructor(props: Props) {
        super(props);
        this.endpointCache = new Map<string, vector2d>();
        this.state = this.initialState();
    }

    private initialState() {
        const { props } = this;
        const nodesState = new Map<string, NodeState>();
        const connectionState = new Map<string, vector2d>();
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

            let i = 0;
            for (let input of node.inputs) {
                const inputPos = { x: pos.x, y: pos.y + 100 + i * 100 };
                const key = Connection.computeId(node.id, i, 'input');
                connectionState.set(key, inputPos);
                ++i;
            }
            for (let output of node.outputs) {
                const outputPos = { x: pos.x + size.x, y: pos.y + 100 + i * 100 };
                const key = Connection.computeId(node.id, i, 'output');
                connectionState.set(key, outputPos);
                ++i;
            }
        }
        return { nodesState, connectionState };
    }

    private connection(outputConn: Connection, inputConn: Connection) {
        const { config } = this.props;
        const { nodesState, connectionState } = this.state;
        const inputKey = Connection.computeId(inputConn.nodeId, inputConn.connectionId, inputConn.kind);
        const outputKey = Connection.computeId(outputConn.nodeId, outputConn.connectionId, outputConn.kind);
        const key = `${outputKey}_${inputKey}`;
        const stroke = '#ccc';
        const width = 2;

        const outputOffset = connectionState.get(outputKey);
        const inputOffset = connectionState.get(inputKey);
        const outputNode = nodesState.get(outputConn.nodeId);
        const inputNode = nodesState.get(inputConn.nodeId);

        const a0 = vector2d.add(outputOffset, outputNode.pos);
        const a3 = vector2d.add(inputOffset, inputNode.pos);
        const dx = Math.max(Math.abs(a0.x - a3.x) / 1.5, 100);
        const a1 = { x: a0.x - dx, y: a0.y };
        const a2 = { x: a3.x + dx, y: a3.y };

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

    private setConnectionEndpoint(nodeId: string, endpointId: string, element: Element) {
        if (!element) return;
        // Only save relative position
        const parentPos = this.state.nodesState.get(nodeId).pos;
        const key = endpointId;
        const cached = this.endpointCache.get(key);
        const newDomRect: DOMRect = element.getBoundingClientRect() as DOMRect;
        const offset = { x: Math.floor(newDomRect.x + newDomRect.width / 2 - parentPos.x), y: Math.floor(newDomRect.y + newDomRect.height / 2 - parentPos.y) };
        if (cached === undefined || !vector2d.compare(offset, cached)) {
            this.endpointCache.set(key, offset);
            setImmediate(() =>
                this.setState((state, props) => {
                    state.connectionState.set(key, offset);
                    return state;
                }));
        }

    };


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
            MozUserSelect: 'none',
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

        const dot = (parentId: string, key: string, type: 'input' | 'output') => {
            const dotStyle = {
                height: '10px',
                width: '10px',
                borderRadius: '50%',
                display: 'inline-block',
                marginTop: '3px'
            };
            const inputStyle = {
                ...dotStyle,
                backgroundColor: '#e22',
                border: '1px solid #f55',
                float: 'right',
                marginRight: '-16px',
            };
            const outputStyle = {
                ...dotStyle,
                backgroundColor: '#2e2',
                border: '1px solid #5f5',
                float: 'left',
                marginLeft: '-16px',
            };
            return <div ref={this.setConnectionEndpoint.bind(this, parentId, key)} style={(type === 'input' ? inputStyle : outputStyle as any)} />
        };

        const properties = (node: Node) => {
            const properties = [];
            properties.push(...node.inputs.map((input, i) => {
                const key = Connection.computeId(node.id, i, 'input');
                return <div key={key}>
                    {input.name}
                    {dot(node.id, key, 'input')}
                </div>
            }));
            properties.push(...node.outputs.map((output, i) => {
                const key = Connection.computeId(node.id, i + node.inputs.length, 'output');
                return <div key={key}>
                    {output.renderer ? output.renderer(output) : output.name}
                    {dot(node.id, key, 'output')}
                </div>
            }));
            return properties;
        };

        const nodes = props.nodes.map(node =>
            <div key={node.id} style={nodeStyle(state.nodesState.get(node.id).pos) as any} className="node">
                <div onMouseDown={this.dragStarted.bind(this, node.id)} className="node-header" style={nodeHeaderStyle as any}>
                    {node.id}
                </div>
                <div className="node-body" style={nodeBodyStyle}>
                    {props.config.resolver(node.payload)}
                    {properties(node)}
                </div>
            </div>);

        const connections: { out: Connection, in: Connection }[] = [];
        for (let node of props.nodes) {
            let i = 0;
            for (let input of node.inputs) {
                const opp = props.nodes.filter(o => o.id === input.id);
                let j = 0;
                for (let output of opp[0].outputs) {
                    if (output.id === node.id) {
                        const inputConn: Connection = { nodeId: node.id, connectionId: i, kind: 'input' };
                        const outputConn: Connection = { nodeId: opp[0].id, connectionId: j + opp[0].inputs.length, kind: 'output' };
                        connections.push({ in: inputConn, out: outputConn });
                    }
                    ++j;
                }
                ++i;
            }
        }

        const connectionsLines = connections.map(conn => this.connection(conn.out, conn.in));

        return (
            <div onMouseLeave={this.dragEnded.bind(this)} onMouseMove={this.onDrag.bind(this)} onMouseUp={this.dragEnded.bind(this)} className="editor" >
                <svg style={svgStyle as any} xmlns="http://www.w3.org/2000/svg">
                    {connectionsLines}
                </svg>
                {nodes}
            </div>
        );
    }
}

