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

type vector2d = { x: number, y: number };

type NodeState = { pos: vector2d, size: vector2d }


type State = {
    nodesState: Map<string, NodeState>;
    connectionState: Map<string, NodeState>;
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
    private endpointCache: Map<string, Rect>;

    constructor(props: Props) {
        super(props);
        this.endpointCache = new Map<string, Rect>();
        this.state = this.initialState();
    }

    private initialState() {
        const { props } = this;
        const nodesState = new Map<string, NodeState>();
        const connectionState = new Map<string, NodeState>();
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
                const inputSize = { x: 12, y: 12 };
                const key = `${node.id}_${i}_in`;
                connectionState.set(key, { pos: inputPos, size: inputSize });
                ++i;
            }
            for (let output of node.outputs) {
                const outputPos = { x: pos.x + size.y, y: pos.y + 100 + i * 100 };
                const outputSize = { x: 12, y: 12 };
                const key = `${node.id}_${i}_out`;
                connectionState.set(key, { pos: outputPos, size: outputSize });
                ++i;
            }
        }
        return { nodesState, connectionState };
    }

    private connection(outputId: string, inputId: string) {
        const { config } = this.props;
        const { nodesState } = this.state;
        const key = `${outputId}_${inputId}`;
        const stroke = '#ccc';
        const width = 2;
        // const output = nodesState.get(outputId.substring(0, outputId.indexOf('_')));
        // const input = nodesState.get(inputId.substring(0, inputId.indexOf('_')));
        // const dy = 40;
        const output = this.state.connectionState.get(outputId);
        const input = this.state.connectionState.get(inputId);
        const a0 = { x: output.pos.x + output.size.x * 0.5, y: output.pos.y + output.size.y * 0.5 };
        const a3 = { x: input.pos.x + input.size.x * 0.5, y: input.pos.y + input.size.y * 0.5 };
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
        const newRect = new Rect({ x: newDomRect.x, y: newDomRect.y }, { x: newDomRect.width, y: newDomRect.height });
        if (cached === undefined || !Rect.compare(newRect, cached)) {
            // console.log(`setConnectionEndpoint(${id})`)
            // console.log(newRect);
            // console.log(cached);
            this.endpointCache.set(key, newRect);
            setImmediate(() =>
                this.setState((state, props) => {
                    // state.connectionState.set(key, { pos: newRect.pos, size: newRect.size });
                    state.connectionState.get(key).pos = newRect.pos;
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
                const key = `${node.id}_${i}_in`;
                return <div key={key}>
                    {input.name}
                    {dot(node.id, key, 'input')}
                </div>
            }));
            properties.push(...node.outputs.map((output, i) => {
                const key = `${node.id}_${i + node.inputs.length}_out`;
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

        // const connections: { in: string, out: string }[] = props.nodes.reduce((p, input, inputIndex) => [...p, ...input.outputs.map((output, outputIndex) => ({ in: `${input.id}_${inputIndex}_out`, out: `${output.id}_${outputIndex}_in` }))], []);
        // const connections: { in: string, out: string }[] = props.nodes.reduce((prev, input, inputIndex) => [...prev, ...input.outputs.map(o => props.nodes.filter(n => n.id === o.id)[0].inputs).map(inp => inp.)], []);
        const connections: { out: string, in: string }[] = [];
        for (let node of props.nodes) {
            let i = 0;
            for (let input of node.inputs) {
                const inputId = `${node.id}_${i}_in`;
                const opp = props.nodes.filter(o => o.id === input.id);
                let j = 0;
                for (let output of opp[0].outputs) {
                    if (output.id === node.id) {
                        const outputId = `${opp[0].id}_${j + opp[0].inputs.length}_out`;
                        connections.push({ in: inputId, out: outputId });
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

