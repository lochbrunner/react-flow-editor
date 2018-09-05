import * as React from 'react';

import { ChangeAction } from './change-api';
import { Vector2d, Rect } from './geometry';

const KEY_CODE_BACK = 8;
const KEY_CODE_DELETE = 46;
const BUTTON_LEFT = 0;
const BUTTON_RIGHT = 2;
const BUTTON_MIDDLE = 1;

//#region "Type definitions"
export interface Size {
    width: number,
    height: number
}

export interface Connection {
    /**
     * The other node id which to connect
     */
    nodeId: string;
    /**
     * The id of the property to connect
     */
    port: number;
}

const compareConnections = (a: Connection) => (b: Connection) => a.port === b.port && a.nodeId === b.nodeId;
// const compareNodeConnection = (a: Node) => (b: Connection) => a.port === b.port && a.nodeId === b.nodeId;

export type BaseConnection = {
    name: string;
    connection?: Connection | Connection[];
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

type NodeState = { pos: Vector2d, size: Vector2d, offset?: Vector2d, isCollapsed: boolean }

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
    transformation: { dx: number, dy: number, zoom: number }
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

//#endregion "Type definitions"

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

function isEmptyArrayOrUndefined(obj) {
    return obj === undefined || (Array.isArray(obj) && obj.length === 0);
}

const nodeIdPredicate = (connection: Connection | Connection[]) => (node: Node) => Array.isArray(connection) ? connection.findIndex(conn => conn.nodeId === node.id) >= 0 : node.id === connection.nodeId;

const epPredicate = (nodeId: string, port?: number) => (ep: BaseConnection) => {
    const comp = (testee: Connection) => (port === undefined || testee.port === port) && testee.nodeId === nodeId;
    return Array.isArray(ep.connection) ? ep.connection.findIndex(comp) >= 0 : comp(ep.connection);
};

export class Editor extends React.Component<Props, State> {

    private currentAction?: {
        lastPos: Vector2d, id: string, type: 'node'
    } | { lastPos: Vector2d, endpoint: Endpoint, type: 'connection' } | { lastPos: Vector2d, type: 'translate' };
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
            nodesState.set(node.id, { pos, size, isCollapsed: false });
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
        const transformation = { dx: 0, dy: 0, zoom: 1 };
        return { nodesState, connectionState, transformation };
    }

    //#region "User interaction"

    private select(type: ItemType, id: string) {
        if (!this.state.selection || this.state.selection.id !== id) {
            this.setState(state => {
                return { ...state, selection: { id, type } };
            });
        }
    }

    private toggleExpandNode(id: string) {
        this.setState(state => {
            state.nodesState.get(id).isCollapsed = !state.nodesState.get(id).isCollapsed;
            return { ...state };
        });
    }

    private onDragStarted(id: string, e: React.MouseEvent) {
        if (e.button === BUTTON_LEFT)
            this.currentAction = { lastPos: { x: e.clientX, y: e.clientY }, id: id, type: 'node' };
    }

    private onDragEnded(e: React.MouseEvent) {
        this.currentAction = undefined;
        this.setState(state => ({ ...state, workingItem: undefined }));
    }

    private onDrag(e: React.MouseEvent) {
        if (this.currentAction === undefined) return;
        const newPos = { x: e.clientX, y: e.clientY };
        const dx = newPos.x - this.currentAction.lastPos.x;
        const dy = newPos.y - this.currentAction.lastPos.y;
        this.setState(state => {
            if (this.currentAction.type === 'node') {
                state.nodesState.get(this.currentAction.id).pos.x += dx;
                state.nodesState.get(this.currentAction.id).pos.y += dy;
                return { ...state };
            }
            else if (this.currentAction.type === 'connection') {
                const { endpoint } = this.currentAction;
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
            else if (this.currentAction.type === 'translate') {
                const pt = this.state.transformation;
                const transformation = { dx: pt.dx + dx, dy: pt.dy + dy, zoom: pt.zoom };
                this.setState(state => ({ ...state, transformation }));
            }
        });
        this.currentAction.lastPos = newPos;
    }

    private onCreateConnectionStarted(endpoint: Endpoint, e: React.MouseEvent) {
        this.currentAction = { lastPos: { x: e.screenX, y: e.screenY }, endpoint, type: 'connection' };
    }

    private onCreateConnectionEnded(endpoint: Endpoint, e: React.MouseEvent) {
        if (this.currentAction && this.currentAction.type === 'connection') {
            // Create new connection
            if (this.currentAction.endpoint.kind === 'input') {
                this.createConnection(this.currentAction.endpoint, endpoint);
            }
            else if (this.currentAction.endpoint.kind === 'output') {
                this.createConnection(endpoint, this.currentAction.endpoint);
            }
        }
    }

    private removeFromArrayOrValue(value: Connection | Connection[], toRemove: Connection | Connection[]) {
        if (!Array.isArray(value))
            return undefined;
        if (Array.isArray(toRemove)) {
            for (let it of toRemove) {
                const index = value.findIndex(compareConnections(it));
                if (index < 0) return value;
                value.splice(index, 1);
                return value;
            }
        }
        else {
            const index = value.findIndex(compareConnections(toRemove));
            if (index < 0) return value;
            value.splice(index, 1);
            return value;
        }
    }
    private removeConnection(input: Endpoint, output: Endpoint) {

        const { nodes } = this.props;
        const inputNode = nodes.find(node => node.id === input.nodeId);
        const outputNode = nodes.find(node => node.id === output.nodeId);

        inputNode.inputs[input.connectionId].connection =
            this.removeFromArrayOrValue(inputNode.inputs[input.connectionId].connection, { nodeId: output.nodeId, port: output.connectionId });
        outputNode.outputs[output.connectionId].connection =
            this.removeFromArrayOrValue(outputNode.outputs[output.connectionId].connection, { nodeId: input.nodeId, port: input.connectionId });
    }

    private createConnection(input: Endpoint, output: Endpoint) {
        const { nodes, config } = this.props;
        const inputNode = nodes.find(node => node.id === input.nodeId);
        const outputNode = nodes.find(node => node.id === output.nodeId);

        const isArrayOrUndefined = variable => {
            return variable === undefined || Array.isArray(variable);
        };

        if (input.kind === output.kind) {
            // Can only create connection between input and output
            return;
        }

        if (!isArrayOrUndefined(inputNode.inputs[input.connectionId].connection) || !isArrayOrUndefined(outputNode.outputs[output.connectionId].connection)) {
            // Connections already exist
            return;
        }

        if (config.connectionValidator && !config.connectionValidator(output, input)) {
            // User validation not passed
            return;
        }
        const outputConnection = { nodeId: outputNode.id, port: output.connectionId };
        if (Array.isArray(inputNode.inputs[input.connectionId].connection))
            (inputNode.inputs[input.connectionId].connection as Connection[]).push(outputConnection);
        else
            inputNode.inputs[input.connectionId].connection = outputConnection

        const inputConnection = { nodeId: inputNode.id, port: input.connectionId };
        if (Array.isArray(outputNode.outputs[output.connectionId].connection))
            (outputNode.outputs[output.connectionId].connection as Connection[]).push(inputConnection);
        else
            outputNode.outputs[output.connectionId].connection = inputConnection;

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
                    let inputIndex = -1;
                    for (let input of nodeToDelete.inputs) {
                        ++inputIndex;
                        if (isEmptyArrayOrUndefined(input.connection)) continue;
                        const peerNodes = this.props.nodes.filter(nodeIdPredicate(input.connection));//  find(nodePredicate(input.id));
                        for (let peerNode of peerNodes) {
                            const peerOutputs = peerNode.outputs.filter(epPredicate(nodeToDelete.id));
                            for (let peerOutput of peerOutputs)
                                peerOutput.connection = this.removeFromArrayOrValue(peerOutput.connection, { nodeId: nodeToDelete.id, port: inputIndex });
                        }
                    }

                    let outputIndex = -1;
                    for (let output of nodeToDelete.outputs) {
                        ++outputIndex;
                        if (isEmptyArrayOrUndefined(output.connection)) continue;
                        const peerNodes = this.props.nodes.filter(nodeIdPredicate(output.connection));
                        for (let peerNode of peerNodes) {
                            const peerInputs = peerNode.inputs.filter(epPredicate(nodeToDelete.id));
                            for (let peerInput of peerInputs)
                                peerInput.connection = this.removeFromArrayOrValue(peerInput.connection, { nodeId: nodeToDelete.id, port: outputIndex });
                        }
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

    private onMouseGlobalDown(e: React.MouseEvent) {
        if (e.button === BUTTON_MIDDLE) {
            this.currentAction = { type: 'translate', lastPos: { x: e.clientX, y: e.clientY } }
        }
        else if (e.button === BUTTON_LEFT) {
            this.setState(state => {
                return { ...state, selection: undefined };
            });
        }
    }

    private onWheel(e: React.WheelEvent) {
        if (e.ctrlKey) return;
        const pt = this.state.transformation;
        const zoomFactor = Math.pow(1.1, e.deltaY);
        const zoom = pt.zoom * zoomFactor;

        const cx = e.clientX;
        const cy = e.clientY;
        // See https://github.com/lochbrunner/meliodraw/blob/master/Melio.Draw/SharpDX/OrthogonalCamera.cs#L116
        const dy = cy * (pt.zoom - zoom) + pt.dy;
        const dx = cx * (pt.zoom - zoom) + pt.dx;
        const transformation = { dx, dy, zoom };

        this.setState(state => ({ ...state, transformation }));
    }

    //#endregion "User interaction"

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
                return (
                    <div key={key}>
                        {prop.renderer ? prop.renderer(prop) : prop.name}
                        {dot({ nodeId: node.id, connectionId: i, kind: kind })}
                    </div>
                );
            };
            return [...node.inputs.map(mapProp('input')), ...node.outputs.map(mapProp('output'))];
        };

        const collapsedProperties = (node: Node) => {
            const dot = (conn: Endpoint, key: string, index: number, size: number) => {
                const style = () => {
                    const radius = 14;
                    const angle = size === 1 ? 0 : (index - size / 2 + 0.5) * Math.PI / 3;
                    if (conn.kind === 'input') {
                        const center = { x: -11, y: 0 };
                        return {
                            top: `${center.y + radius * Math.sin(angle)}px`,
                            left: `${center.x + radius * Math.cos(angle)}px`
                        }
                    }
                    else if (conn.kind === 'output') {
                        const center = { x: -3, y: 0 };
                        return {
                            top: `${center.y + radius * Math.sin(angle)}px`,
                            left: `${center.x - radius * Math.cos(angle)}px`
                        }
                    }
                };
                return <div
                    style={style()}
                    key={key}
                    onMouseDown={this.onCreateConnectionStarted.bind(this, conn)}
                    onMouseUp={this.onCreateConnectionEnded.bind(this, conn)}
                    ref={this.setConnectionEndpoint.bind(this, conn)}
                    className={`dot ${conn.kind}`} />
            };
            const mapProp = (kind: Endpoint['kind'], size: number) => (prop: BaseConnection, i: number) => {
                const key = Endpoint.computeId(node.id, i, kind);
                return dot({ nodeId: node.id, connectionId: i, kind: kind }, key, i, size)
            };

            const inputs = <div key={node.id + 'inputs'} className="inputs">{node.inputs.map(mapProp('input', node.inputs.length))}</div>
            const outputs = <div key={node.id + 'outputs'} className="outputs">{node.outputs.map(mapProp('output', node.outputs.length))}</div>

            return [inputs, outputs];
        }

        const nodes = props.nodes.map(node => {
            const nodeState = state.nodesState.get(node.id);
            const { isCollapsed } = nodeState;
            const isSelected = this.state.selection && this.state.selection.id === node.id;
            return (
                <div onClick={this.select.bind(this, 'node', node.id)} key={node.id} style={nodeStyle(nodeState.pos)}
                    className={`node ${isCollapsed ? 'collapsed' : ''} ${isSelected ? 'selected' : ''}`}>
                    <div className="header" >
                        <div onClick={this.toggleExpandNode.bind(this, node.id)} className="expander" >
                            <div className={`icon ${isCollapsed ? 'arrow-down' : 'arrow-right'}`} />
                        </div>
                        <span onMouseDown={this.onDragStarted.bind(this, node.id)} >{node.id}</span>
                        {isCollapsed ? collapsedProperties(node) : ''}
                    </div>
                    {isCollapsed ? '' : <div className="body">
                        {props.config.resolver(node.payload)}
                        {properties(node)}
                    </div>}
                </div>
            );
        });

        const connections: { out: Endpoint, in: Endpoint }[] = [];

        for (let node of props.nodes) {
            let i = 0;
            for (let input of node.inputs) {
                if (input.connection === undefined) continue;
                if (Array.isArray(input.connection)) {
                    for (let conn of input.connection) {
                        const inputConn: Endpoint = { nodeId: node.id, connectionId: i, kind: 'input' };
                        const outputConn: Endpoint = { nodeId: conn.nodeId, connectionId: conn.port, kind: 'output' };
                        connections.push({ in: inputConn, out: outputConn });
                    }
                }
                else {
                    const inputConn: Endpoint = { nodeId: node.id, connectionId: i, kind: 'input' };
                    const outputConn: Endpoint = { nodeId: input.connection.nodeId, connectionId: input.connection.port, kind: 'output' };
                    connections.push({ in: inputConn, out: outputConn });
                }
                ++i;
            }
        }

        const connectionsLines = connections.map(conn => this.connection(conn.out, conn.in));
        const workingItem = state.workingItem && state.workingItem.type === 'connection' ? workingConnection(state.workingItem) : '';

        const { transformation } = state;
        const nodesStyle = {
            transform: `matrix(${transformation.zoom},0,0,${transformation.zoom},${transformation.dx},${transformation.dy})`
        };

        return (
            <div tabIndex={0} onKeyDown={this.onKeyDown.bind(this)} onWheel={this.onWheel.bind(this)} onMouseLeave={this.onDragEnded.bind(this)} onMouseMove={this.onDrag.bind(this)} onMouseDown={this.onMouseGlobalDown.bind(this)} onMouseUp={this.onDragEnded.bind(this)} className="editor" >
                <svg className="connections" xmlns="http://www.w3.org/2000/svg">
                    {connectionsLines}
                    {workingItem}
                </svg>
                <div style={nodesStyle} >
                    {nodes}
                </div>
            </div>
        );
    }
}
