import * as React from 'react';

import { ChangeAction } from './change-api';
import { Vector2d, Rect } from './geometry';

const KEY_CODE_BACK = 8;
const KEY_CODE_DELETE = 46;

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
    position?: Vector2d;
}

export interface Config {
    resolver: (payload: any) => JSX.Element;
    connectionValidator?: (output: { nodeId: string, connectionId: number }, input: { nodeId: string, connectionId: number }) => boolean;
    onChanged?: (node: ChangeAction) => void;
    connectionType?: 'bezier' | 'linear';
}

export interface Props {
    config: Config;
    nodes: Node[];
}

type NodeState = { pos: Vector2d, size: Vector2d, offset?: Vector2d }

type ItemType = 'node' | 'connection';

interface WorkItemConnection {
    type: 'connection';
    input: Vector2d;
    output: Vector2d;
}
type WorkItem = WorkItemConnection;

type State = {
    nodesState: Map<string, NodeState>;
    connectionState: Map<string, Vector2d>;
    selection?: { type: ItemType, id: string };
    workingItem?: WorkItem;
}

class Endpoint {
    nodeId: string;
    connectionId: number;
    kind: 'input' | 'output';

    static computeId(nodeId: Endpoint['nodeId'], connectionId: Endpoint['connectionId'], kind: Endpoint['kind']) {
        return `${nodeId}_${connectionId}_${kind}`;
    }

    static computeIdIn(conn: Endpoint) {
        return `${conn.nodeId}_${conn.connectionId}_${conn.kind}`;
    }

    static extractEndpointInfo(id: string): Endpoint {
        const regex = /(.+)_(\d+)_(input|output)/g;
        const match = regex.exec(id);
        if (match === null) throw Error(`Illegal id string ${id}`);
        return { nodeId: match[1], connectionId: parseInt(match[2]), kind: match[3] as any };
    }
}

function computeConnectionId(input: Endpoint, output: Endpoint) {
    return `${Endpoint.computeIdIn(input)}__${Endpoint.computeIdIn(output)}`;
}

/**
 * The reverse of computeConnectionId
 */
function extractConnectionFromId(id: string) {
    const sepIndex = id.indexOf('__');
    const inputId = id.substr(0, sepIndex);
    const outputId = id.substr(sepIndex + 2);
    return { input: Endpoint.extractEndpointInfo(inputId), output: Endpoint.extractEndpointInfo(outputId) }
}

export class Editor extends React.Component<Props, State> {

    private mouseDownPos?: {
        lastPos: Vector2d, id: string, type: 'node'
    } | { lastPos: Vector2d, endpoint: Endpoint, type: 'connection' };
    private endpointCache: Map<string, Vector2d>;

    constructor(props: Props) {
        super(props);
        this.endpointCache = new Map<string, Vector2d>();
        this.state = this.initialState();
    }

    private initialState() {
        const { props } = this;
        const nodesState = new Map<string, NodeState>();
        const connectionState = new Map<string, Vector2d>();
        const margin = { x: 100, y: 100 };
        const usedPlace: Rect[] = [];
        for (let node of props.nodes) {
            // Find suitable place
            const pos = node.position || { x: 10 + margin.x, y: 10 + margin.y };
            for (let place of usedPlace) {
                if (place.hit(pos))
                    pos.x = place.right + margin.x;
                pos.y = place.top;
            }
            const size = { x: 100, y: 100 };    // TODO: get size out of ref 
            nodesState.set(node.id, { pos, size });
            usedPlace.push(new Rect(pos, size));

            for (let k in node.inputs) {
                const i = parseInt(k);
                const inputPos = { x: pos.x, y: pos.y + 100 + i * 100 };
                const key = Endpoint.computeId(node.id, i, 'input');
                connectionState.set(key, inputPos);
            }
            for (let k in node.outputs) {
                const i = parseInt(k);
                const outputPos = { x: pos.x + size.x, y: pos.y + 100 + i * 100 };
                const key = Endpoint.computeId(node.id, i, 'output');
                connectionState.set(key, outputPos);
            }
        }
        return { nodesState, connectionState };
    }

    private select(type: ItemType, id: string) {
        if (!this.state.selection || this.state.selection.id !== id) {
            this.setState((state, props) => {
                return { ...state, selection: { id, type } };
            });
        }
    }

    private onDragStarted(id: string, e: React.MouseEvent) {
        this.mouseDownPos = { lastPos: { x: e.clientX, y: e.clientY }, id: id, type: 'node' };
    }

    private onDragEnded(e: React.MouseEvent) {
        this.mouseDownPos = undefined;
        this.setState(state => ({ ...state, workingItem: undefined }));
    }

    private onDrag(e: React.MouseEvent) {
        if (this.mouseDownPos === undefined) return;
        const newPos = { x: e.clientX, y: e.clientY };
        const dx = newPos.x - this.mouseDownPos.lastPos.x;
        const dy = newPos.y - this.mouseDownPos.lastPos.y;
        this.setState(state => {
            if (this.mouseDownPos.type === 'node') {
                state.nodesState.get(this.mouseDownPos.id).pos.x += dx;
                state.nodesState.get(this.mouseDownPos.id).pos.y += dy;
                return { ...state };
            }
            else if (this.mouseDownPos.type === 'connection') {
                const { endpoint } = this.mouseDownPos;
                const free = newPos;

                const key = Endpoint.computeId(endpoint.nodeId, endpoint.connectionId, endpoint.kind);

                const offset = this.state.connectionState.get(key);
                const node = this.state.nodesState.get(endpoint.nodeId);

                const fixed = Vector2d.add(offset, node.pos);

                if (endpoint.kind === 'input') {
                    const workingItem: WorkItem = { type: 'connection', input: fixed, output: free };
                    return { ...state, workingItem }
                } else if (endpoint.kind === 'output') {
                    const workingItem: WorkItem = { type: 'connection', input: free, output: fixed };
                    return { ...state, workingItem }
                }
            }
        });
        this.mouseDownPos.lastPos = newPos;
    }

    private onCreateConnectionStarted(endpoint: Endpoint, e: React.MouseEvent) {
        this.mouseDownPos = { lastPos: { x: e.screenX, y: e.screenY }, endpoint, type: 'connection' };
    }

    private onCreateConnectionEnded(endpoint: Endpoint, e: React.MouseEvent) {
        if (this.mouseDownPos && this.mouseDownPos.type === 'connection') {
            // Create new connection
            if (this.mouseDownPos.endpoint.kind === 'input') {
                this.createConnection(this.mouseDownPos.endpoint, endpoint);
            }
            else if (this.mouseDownPos.endpoint.kind === 'output') {
                this.createConnection(endpoint, this.mouseDownPos.endpoint);
            }
        }
    }

    private removeConnection(input: Endpoint, output: Endpoint) {
        const { nodes } = this.props;
        const inputNode = nodes.find(node => node.id === input.nodeId);
        const outputNode = nodes.find(node => node.id === output.nodeId);

        inputNode.inputs[input.connectionId].id = undefined;
        outputNode.outputs[output.connectionId].id = undefined;
    }

    private createConnection(input: Endpoint, output: Endpoint) {
        const { nodes, config } = this.props;
        const inputNode = nodes.find(node => node.id === input.nodeId);
        const outputNode = nodes.find(node => node.id === output.nodeId);

        if (inputNode.inputs[input.connectionId].id || outputNode.outputs[output.connectionId].id) {
            // Connections already exist
            return;
        }

        if (input.kind === output.kind) {
            // Can only create connection between input and output
            return;
        }

        if (config.connectionValidator && !config.connectionValidator(output, input)) {
            // User validation not passed
            return;
        }

        inputNode.inputs[input.connectionId].id = outputNode.id;
        outputNode.outputs[output.connectionId].id = inputNode.id;
        config.onChanged({ type: 'ConnectionCreated', input, output });
        this.setState(state => state);
    }

    private onKeyDown(e: React.KeyboardEvent) {
        // console.log(`Key down: ${e.keyCode}`);
        const { selection } = this.state;
        if (e.keyCode === KEY_CODE_DELETE) {
            if (selection) {
                if (selection.type === 'connection') {
                    const { input, output } = extractConnectionFromId(selection.id);
                    this.removeConnection(input, output);
                    if (this.props.config.onChanged)
                        this.props.config.onChanged({ type: 'ConnectionRemoved', id: selection.id });
                }
                else if (selection.type === 'node') {
                    const index = this.props.nodes.findIndex(node => node.id === selection.id);
                    // Delete all corresponding connections
                    const nodeToDelete = this.props.nodes[index];
                    for (let input of nodeToDelete.inputs) {
                        if (input.id === undefined) continue;
                        const peerNode = this.props.nodes.find(node => node.id === input.id);
                        const peerOutput = peerNode.outputs.find(ep => ep.id === nodeToDelete.id);
                        peerOutput.id = undefined;
                    }

                    for (let output of nodeToDelete.outputs) {
                        if (output.id === undefined) continue;
                        const peerNode = this.props.nodes.find(node => node.id === output.id);
                        const peerInput = peerNode.inputs.find(ep => ep.id === nodeToDelete.id);
                        peerInput.id = undefined;
                    }

                    if (this.props.config.onChanged)
                        this.props.config.onChanged({ type: 'NodeRemoved', id: selection.id });
                    this.props.nodes.splice(index, 1);
                }

                this.setState((state) => {
                    return { ...state, selection: undefined };
                });
            }
        }
    }

    private setConnectionEndpoint(conn: Endpoint, element: Element) {
        if (!element) return;
        // Only save relative position
        const parentPos = this.state.nodesState.get(conn.nodeId).pos;
        const key = Endpoint.computeId(conn.nodeId, conn.connectionId, conn.kind);
        const cached = this.endpointCache.get(key);
        const newDomRect: DOMRect = element.getBoundingClientRect() as DOMRect;
        const offset = { x: Math.floor(newDomRect.x + newDomRect.width / 2 - parentPos.x), y: Math.floor(newDomRect.y + newDomRect.height / 2 - parentPos.y) };
        if (cached === undefined || !Vector2d.compare(offset, cached)) {
            this.endpointCache.set(key, offset);
            setImmediate(() =>
                this.setState((state, props) => {
                    state.connectionState.set(key, offset);
                    return state;
                }));
        }

    }

    private connection(outputConn: Endpoint, inputConn: Endpoint) {
        const { nodesState, connectionState } = this.state;
        const inputKey = Endpoint.computeId(inputConn.nodeId, inputConn.connectionId, inputConn.kind);
        const outputKey = Endpoint.computeId(outputConn.nodeId, outputConn.connectionId, outputConn.kind);
        const key = `${outputKey}_${inputKey}`;
        const connId = computeConnectionId(inputConn, outputConn);
        const isSelected = this.state.selection && this.state.selection.id === connId;

        const outputOffset = connectionState.get(outputKey);
        const inputOffset = connectionState.get(inputKey);
        const outputNode = nodesState.get(outputConn.nodeId);
        const inputNode = nodesState.get(inputConn.nodeId);

        const output = Vector2d.add(outputOffset, outputNode.pos);
        const input = Vector2d.add(inputOffset, inputNode.pos);

        return this.connectionPath(output, input, isSelected, key, this.select.bind(this, 'connection', connId));
    }

    private connectionPath(output: Vector2d, input: Vector2d, selected?: boolean, key?: string, onClick?: (e: React.MouseEvent) => void) {
        const a0 = output;
        const a3 = input;
        const dx = Math.max(Math.abs(a0.x - a3.x) / 1.5, 100);
        const a1 = { x: a0.x - dx, y: a0.y };
        const a2 = { x: a3.x + dx, y: a3.y };

        let cmd: string;

        if (this.props.config.connectionType === 'bezier')
            cmd = `M ${a0.x} ${a0.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${a3.x} ${a3.y}`;
        else if (this.props.config.connectionType === 'linear')
            cmd = `M ${a0.x} ${a0.y} L ${a3.x} ${a3.y}`;

        return <path className={selected ? 'connection selected' : 'connection'} onClick={onClick ? onClick : () => { }} key={key || 'wk'} d={cmd} />;
    }

    render() {

        const workingConnection = (info: WorkItemConnection) => {
            return this.connectionPath(info.output, info.input);
        };

        const { props, state } = this;

        const nodeStyle = (pos: Vector2d) => ({
            top: `${pos.y}px`,
            left: `${pos.x}px`,
        });


        const properties = (node: Node) => {
            const dot = (conn: Endpoint) => {
                return <div
                    onMouseDown={this.onCreateConnectionStarted.bind(this, conn)}
                    onMouseUp={this.onCreateConnectionEnded.bind(this, conn)}
                    ref={this.setConnectionEndpoint.bind(this, conn)}
                    className={`dot ${conn.kind}`} />
            };

            const mapProp = (kind: Endpoint['kind']) => (prop: BaseConnection, i: number) => {
                const key = Endpoint.computeId(node.id, i, kind);
                return <div key={key}>
                    {prop.renderer ? prop.renderer(prop) : prop.name}
                    {dot({ nodeId: node.id, connectionId: i, kind: kind })}
                </div>
            };
            return [...node.inputs.map(mapProp('input')), ...node.outputs.map(mapProp('output'))];
        };

        const nodes = props.nodes.map(node =>
            <div onClick={this.select.bind(this, 'node', node.id)} key={node.id} style={nodeStyle(state.nodesState.get(node.id).pos)} className={`node ${this.state.selection && this.state.selection.id === node.id ? 'selected' : ''}`}>
                <div onMouseDown={this.onDragStarted.bind(this, node.id)} className="header" >
                    {node.id}
                </div>
                <div className="body">
                    {props.config.resolver(node.payload)}
                    {properties(node)}
                </div>
            </div>);

        const connections: { out: Endpoint, in: Endpoint }[] = [];
        for (let node of props.nodes) {
            let i = 0;
            for (let input of node.inputs) {
                const opp = props.nodes.filter(o => o.id === input.id);
                if (opp.length < 1 || opp[0].id === undefined)
                    continue;
                let j = 0;
                for (let output of opp[0].outputs) {
                    if (output.id === node.id) {
                        const inputConn: Endpoint = { nodeId: node.id, connectionId: i, kind: 'input' };
                        const outputConn: Endpoint = { nodeId: opp[0].id, connectionId: j, kind: 'output' };
                        connections.push({ in: inputConn, out: outputConn });
                    }
                    ++j;
                }
                ++i;
            }
        }

        const connectionsLines = connections.map(conn => this.connection(conn.out, conn.in));
        const workingItem = state.workingItem && state.workingItem.type === 'connection' ? workingConnection(state.workingItem) : '';

        return (
            <div tabIndex={0} onKeyDown={this.onKeyDown.bind(this)} onMouseLeave={this.onDragEnded.bind(this)} onMouseMove={this.onDrag.bind(this)} onMouseUp={this.onDragEnded.bind(this)} className="editor" >
                <svg className="connections" xmlns="http://www.w3.org/2000/svg">
                    {connectionsLines}
                    {workingItem}
                </svg>
                {nodes}
            </div>
        );
    }
}
