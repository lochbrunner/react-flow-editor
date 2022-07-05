import React from "react"
import _ from "lodash"
import * as ReactDOM from "react-dom"

import { Vector2d, Rect } from "../geometry"
import { BUTTON_LEFT, KEY_CODE_DELETE, BUTTON_MIDDLE } from "./constants"
import { Connection, Size, Port, Node, Config } from "../types"
import classNames from "classnames"
import { NodeState, adjust } from "../adjust"
import { ConnectionType, Endpoint, IEndpoint } from "../Endpoint"
import { ItemType, EditorState, WorkItem, WorkItemConnection } from "./types"
import {
  compareConnections,
  computeConnectionId,
  epPredicate,
  extractConnectionFromId,
  filterIfArray,
  isEmptyArrayOrUndefined,
  nodeIdPredicate
} from "./helpers"

export namespace Editor {
  export interface Props {
    config: Config
    nodes: Node[]
    style?: React.CSSProperties
    additionalClassName?: string
  }
}

export class Editor extends React.Component<Editor.Props, EditorState> {
  private currentAction?:
    | {
        lastPos: Vector2d
        id: string
        type: "node"
      }
    | { lastPos: Vector2d; endpoint: IEndpoint; type: "connection" }
    | { lastPos: Vector2d; type: "translate" }
  private endpointCache: Map<string, Vector2d>
  private gridSize?: Size
  private editorBoundingRect?: DOMRect

  constructor(props: Editor.Props) {
    super(props)
    this.endpointCache = new Map<string, Vector2d>()
    this.state = this.initialState()
    ;(window as any).onStartCreatingNewNode = this.onStartCreatingNewNode.bind(this)
    // this.editorBoundingRect = { x: 0, y: 0, height: 0, width: 0, bottom: 0, left: 0, top: 0, right: 0 };
  }

  private initialState() {
    const { props } = this
    const nodesState = new Map<string, NodeState>()
    const connectionState = new Map<string, Vector2d>()
    const margin = { x: 100, y: 100 }
    const usedPlace: Rect[] = []
    for (let node of props.nodes) {
      if (nodesState.has(node.id)) {
        console.warn(`No state found for node ${node.id}`)
        continue
      }
      // Find suitable place
      const pos = node.position || { x: 10 + margin.x, y: 10 + margin.y }
      for (let place of usedPlace) {
        if (place.hit(pos)) pos.x = place.right + margin.x
        pos.y = place.top
      }
      const size = { x: 100, y: 100 } // TODO: get size out of ref
      nodesState.set(node.id, { pos, size, isCollapsed: false })
      usedPlace.push(new Rect(pos, size))

      for (let k in node.inputs) {
        const i = parseInt(k)
        const inputPos = { x: pos.x, y: pos.y + 100 + i * 100 }
        const key = Endpoint.computeId(node.id, i, ConnectionType.input)
        connectionState.set(key, inputPos)
      }
      for (let k in node.outputs) {
        const i = parseInt(k)
        const outputPos = { x: pos.x + size.x, y: pos.y + 100 + i * 100 }
        const key = Endpoint.computeId(node.id, i, ConnectionType.output)
        connectionState.set(key, outputPos)
      }
    }
    const transformation = { dx: 0, dy: 0, zoom: 1 }
    const componentSize: Size = { width: 800, height: 600 }
    return { nodesState, connectionState, transformation, componentSize }
  }

  //#region "User interaction"

  private select(type: ItemType | null, id: string | null) {
    if (!this.state.selection || this.state.selection.id !== id) {
      const updateState = () =>
        this.setState((state) => {
          return { ...state, selection: { id, type } }
        })
      const { config } = this.props
      if (config.onChanged && type === "node") {
        const node = this.props.nodes.find((n) => n.id === id)
        config.onChanged({ type: "NodeSelected", node: node }, updateState)
      } else if (config.onChanged && type === null) config.onChanged({ type: "NodeDeselected" }, updateState)
      if (config.onChanged === undefined || config.demoMode) updateState()
    }
  }

  private toggleExpandNode(id: string) {
    const node = this.props.nodes.find((n) => n.id === id)
    const desiredState = node.isCollapsed !== undefined ? !node.isCollapsed : !this.state.nodesState.get(id).isCollapsed
    const updateState = () =>
      this.setState((state) => {
        state.nodesState.get(id).isCollapsed = desiredState
        return { ...state }
      })
    const { config } = this.props
    if (config.onChanged)
      config.onChanged({ type: "NodeCollapseChanged", id, shouldBeCollapsed: desiredState }, updateState)
    if (config.onChanged === undefined || config.demoMode) updateState()
  }

  private onDragStarted(id: string, e: React.MouseEvent<HTMLElement>) {
    if (e.button === BUTTON_LEFT) this.currentAction = { lastPos: { x: e.clientX, y: e.clientY }, id: id, type: "node" }
  }

  private onDragEnded(e: React.MouseEvent<HTMLElement>) {
    this.currentAction = undefined
    this.setState((state) => ({ ...state, workingItem: undefined }))
  }

  private onDrag(e: React.MouseEvent<HTMLElement>) {
    if (this.currentAction === undefined) return
    const newPos = { x: e.clientX, y: e.clientY }
    const { x: dx, y: dy } = Vector2d.subtract(newPos, this.currentAction.lastPos)
    this.setState((state) => {
      if (this.currentAction.type === "node") {
        state.nodesState.get(this.currentAction.id).pos.x += dx
        state.nodesState.get(this.currentAction.id).pos.y += dy
        return { ...state }
      } else if (this.currentAction.type === "connection") {
        const { endpoint } = this.currentAction
        const free = Vector2d.subtract(newPos, this.editorBoundingRect)

        const key = Endpoint.computeId(endpoint.nodeId, endpoint.port, endpoint.kind)

        const offset = this.state.connectionState.get(key)
        const node = this.state.nodesState.get(endpoint.nodeId)

        const fixed = Vector2d.add(offset, node.pos)

        if (endpoint.kind === ConnectionType.input) {
          const workingItem: WorkItem = { type: ItemType.connection, input: fixed, output: free }
          return { ...state, workingItem }
        } else if (endpoint.kind === ConnectionType.output) {
          const workingItem: WorkItem = { type: ItemType.connection, input: free, output: fixed }
          return { ...state, workingItem }
        }
      } else if (this.currentAction.type === "translate") {
        const pt = this.state.transformation
        const transformation = { dx: pt.dx + dx, dy: pt.dy + dy, zoom: pt.zoom }
        this.setState((state) => ({ ...state, transformation }))
      }
    })
    this.currentAction.lastPos = newPos
  }

  private onCreateConnectionStarted(endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    this.currentAction = { lastPos: { x: e.screenX, y: e.screenY }, endpoint, type: "connection" }
  }

  private onCreateConnectionEnded(endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) {
    if (this.currentAction && this.currentAction.type === "connection") {
      // Create new connection
      if (this.currentAction.endpoint.kind === ConnectionType.input) {
        this.createConnection(this.currentAction.endpoint, endpoint)
      } else if (this.currentAction.endpoint.kind === ConnectionType.output) {
        this.createConnection(endpoint, this.currentAction.endpoint)
      }
    }
  }

  private removeFromArrayOrValue(value: Connection | Connection[], toRemove: Connection | Connection[]) {
    if (!Array.isArray(value)) return undefined
    if (Array.isArray(toRemove)) {
      for (let it of toRemove) {
        const index = value.findIndex(compareConnections(it))
        if (index < 0) return value
        value.splice(index, 1)
        return value
      }
    } else {
      const index = value.findIndex(compareConnections(toRemove))
      if (index < 0) return value
      value.splice(index, 1)
      return value
    }
  }
  private removeConnection(input: IEndpoint, output: IEndpoint) {
    const { nodes } = this.props
    const inputNode = nodes.find((node) => node.id === input.nodeId)
    const outputNode = nodes.find((node) => node.id === output.nodeId)

    inputNode.inputs[input.port].connection = this.removeFromArrayOrValue(inputNode.inputs[input.port].connection, {
      nodeId: output.nodeId,
      port: output.port
    })
    outputNode.outputs[output.port].connection = this.removeFromArrayOrValue(
      outputNode.outputs[output.port].connection,
      { nodeId: input.nodeId, port: input.port }
    )
  }

  private createConnection(input: IEndpoint, output: IEndpoint) {
    const { nodes, config } = this.props
    const inputNode = nodes.find((node) => node.id === input.nodeId)
    const outputNode = nodes.find((node) => node.id === output.nodeId)

    const isArrayOrUndefined = (variable) => {
      return variable === undefined || Array.isArray(variable)
    }

    if (input.kind === output.kind) {
      // Can only create connection between input and output
      return
    }

    if (
      !isArrayOrUndefined(inputNode.inputs[input.port].connection) ||
      !isArrayOrUndefined(outputNode.outputs[output.port].connection)
    ) {
      // Connections already exist
      return
    }

    if (config.connectionValidator && !config.connectionValidator(output, input)) {
      // User validation not passed
      return
    }
    const updateProps = () => {
      const outputConnection = { nodeId: outputNode.id, port: output.port }
      if (Array.isArray(inputNode.inputs[input.port].connection))
        (inputNode.inputs[input.port].connection as Connection[]).push(outputConnection)
      else inputNode.inputs[input.port].connection = outputConnection

      const inputConnection = { nodeId: inputNode.id, port: input.port }
      if (Array.isArray(outputNode.outputs[output.port].connection))
        (outputNode.outputs[output.port].connection as Connection[]).push(inputConnection)
      else outputNode.outputs[output.port].connection = inputConnection

      this.setState((state) => state)
    }
    if (config.onChanged !== undefined) {
      config.onChanged({ type: "ConnectionCreated", input, output }, updateProps)
    }
    if (config.demoMode || config.onChanged === undefined) {
      updateProps()
    }
  }

  private onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    // console.log(`Key down: ${e.keyCode}`);

    const { selection } = this.state
    if (e.keyCode === KEY_CODE_DELETE) {
      if (selection) {
        const { config } = this.props
        if (selection.type === "connection") {
          const { input, output } = extractConnectionFromId(selection.id)
          const updateProps = () => {
            this.removeConnection(input, output)
          }
          if (config.onChanged !== undefined)
            config.onChanged({ input, output, type: "ConnectionRemoved", id: selection.id }, updateProps)
          if (config.onChanged === undefined || config.demoMode) updateProps()
        } else if (selection.type === "node") {
          const index = this.props.nodes.findIndex((node) => node.id === selection.id)
          // Delete all corresponding connections
          // TODO: Refactor the next two for loops in order to write the code only once
          const correspondingConnections: { input: IEndpoint; output: IEndpoint }[] = []
          const nodeToDelete = this.props.nodes[index]
          let inputIndex = -1
          for (let input of nodeToDelete.inputs) {
            ++inputIndex
            if (isEmptyArrayOrUndefined(input.connection)) continue
            const peerNodes = this.props.nodes.filter(nodeIdPredicate(input.connection)) //  find(nodePredicate(input.id));
            for (let peerNode of peerNodes) {
              const peerOutputsIds = peerNode.outputs
                .map((v, i) => ({ v, i }))
                .filter((o) => epPredicate(nodeToDelete.id)(o.v))
                .map((o) => o.i)
              for (const peerOutputId of peerOutputsIds) {
                correspondingConnections.push({
                  input: { kind: ConnectionType.input, nodeId: nodeToDelete.id, port: inputIndex },
                  output: { kind: ConnectionType.output, nodeId: peerNode.id, port: peerOutputId }
                })
              }
            }
          }

          let outputIndex = -1
          for (let output of nodeToDelete.outputs) {
            ++outputIndex
            if (isEmptyArrayOrUndefined(output.connection)) continue
            const peerNodes = this.props.nodes.filter(nodeIdPredicate(output.connection))
            for (let peerNode of peerNodes) {
              const peerInputsIds = peerNode.inputs
                .map((v, i) => ({ v, i }))
                .filter((o) => epPredicate(nodeToDelete.id)(o.v))
                .map((o) => o.i)
              for (const peerInputId of peerInputsIds) {
                correspondingConnections.push({
                  input: { kind: ConnectionType.input, nodeId: peerNode.id, port: peerInputId },
                  output: {
                    kind: ConnectionType.output,
                    nodeId: nodeToDelete.id,
                    port: outputIndex
                  }
                })
              }
            }
          }

          const updateProps = () => {
            for (const connectionToDelete of correspondingConnections) {
              this.removeConnection(connectionToDelete.input, connectionToDelete.output)
            }
            this.props.nodes.splice(index, 1)
          }
          if (config.onChanged !== undefined)
            config.onChanged({ type: "NodeRemoved", id: selection.id, correspondingConnections }, updateProps)
          if (config.onChanged === undefined || config.demoMode) updateProps()
        }

        this.select(null, null)
      }
    }
  }

  private onMouseGlobalDown(e: React.MouseEvent<HTMLElement>) {
    if (e.button === BUTTON_MIDDLE) {
      this.currentAction = { type: "translate", lastPos: { x: e.clientX, y: e.clientY } }
    } else if (e.button === BUTTON_LEFT && !(e.target as HTMLElement).closest(".selected")) {
      this.select(null, null)
    }
  }

  private onWheel(e: React.WheelEvent<HTMLElement>) {
    if (e.ctrlKey) return
    if (this.props.config.disableZoom) return
    const pt = this.state.transformation
    const zoomFactor = Math.pow(1.25, Math.sign(e.deltaY))
    const zoom = pt.zoom * zoomFactor

    const cx = e.clientX
    const cy = e.clientY
    // See https://github.com/lochbrunner/meliodraw/blob/master/Melio.Draw/SharpDX/OrthogonalCamera.cs#L116
    const dy = cy * (pt.zoom - zoom) + pt.dy
    const dx = cx * (pt.zoom - zoom) + pt.dx
    const transformation = { dx, dy, zoom }

    this.setState((state) => ({ ...state, transformation }))
  }

  //#endregion "User interaction"

  private setConnectionEndpoint(conn: IEndpoint, element: Element) {
    if (!element) return
    // Only save relative position
    const parentPos = this.state.nodesState.get(conn.nodeId).pos
    const key = Endpoint.computeId(conn.nodeId, conn.port, conn.kind)
    const cached = this.endpointCache.get(key)
    const newDomRect: DOMRect = element.getBoundingClientRect() as DOMRect
    const globalOffset: Vector2d = this.editorBoundingRect || { x: 0, y: 0 }
    const offset = {
      x: Math.floor(newDomRect.x + newDomRect.width / 2 - parentPos.x - globalOffset.x),
      y: Math.floor(newDomRect.y + newDomRect.height / 2 - parentPos.y - globalOffset.y)
    }
    if (cached === undefined || !Vector2d.compare(offset, cached)) {
      this.endpointCache.set(key, offset)
      // TODO: Bundle all connection endpoint updates to one this.setState call
      setTimeout(
        () =>
          this.setState((state) => {
            state.connectionState.set(key, offset)
            return state
          }),
        0
      )
    }
  }

  private updateEditorSize(element: Element) {
    if (element === null) return
    const width = Math.floor((element as any).width.baseVal.value)
    const height = Math.floor((element as any).height.baseVal.value)

    // console.log(`updateEditorSize: ${width}x${width}`);
    if (width < 1 || height < 1) return
    if (this.state.componentSize.width !== width || this.state.componentSize.height !== height)
      setTimeout(() => this.setState((state) => ({ ...state, componentSize: { height, width } })), 0)
  }

  private connection(outputConn: IEndpoint, inputConn: IEndpoint) {
    const { nodesState, connectionState } = this.state
    const inputKey = Endpoint.computeId(inputConn.nodeId, inputConn.port, inputConn.kind)
    const outputKey = Endpoint.computeId(outputConn.nodeId, outputConn.port, outputConn.kind)
    const key = `${outputKey}_${inputKey}`
    const connId = computeConnectionId(inputConn, outputConn)
    const isSelected = this.state.selection && this.state.selection.id === connId

    if (!connectionState.has(inputKey)) {
      // This connection seems to be created outside the editor
      // Therefor dont render it yet
      return ""
    }

    if (!connectionState.has(outputKey)) {
      // This connection seems to be created outside the editor
      // Therefor dont render it yet
      return ""
    }
    const outputOffset = connectionState.get(outputKey)
    const inputOffset = connectionState.get(inputKey)
    const outputNode = nodesState.get(outputConn.nodeId)
    const inputNode = nodesState.get(inputConn.nodeId)

    const output = Vector2d.add(outputOffset, outputNode.pos)
    const input = Vector2d.add(inputOffset, inputNode.pos)
    const additionalClassNames = [...(outputConn.additionalClassName || []), ...(inputConn.additionalClassName || [])]
    const notes = outputConn.notes || inputConn.notes || undefined
    return this.connectionPath(
      output,
      input,
      additionalClassNames,
      notes,
      isSelected,
      key,
      this.select.bind(this, "connection", connId)
    )
  }

  private connectionPath(
    output: Vector2d,
    input: Vector2d,
    additionalClassNames?: string[],
    notes?: string,
    selected?: boolean,
    key?: string,
    onClick?: (e: React.MouseEvent<SVGPathElement>) => void
  ) {
    const { props } = this
    const classNameOrDefault = (label: string) => {
      if (props.config.style && props.config.style[label]) return props.config.style[label]
      return label
    }
    const a0 = output
    const a3 = input
    const anchorLength = props.config.connectionAnchorsLength || 100
    const dir = props.config.direction || "we"
    // TODO: Anchor length depends on y distance as well
    const dx = Math.max(Math.abs(a0.x - a3.x) / 1.5, anchorLength) * (dir === "we" ? 1 : -1)
    const a1 = { x: a0.x - dx, y: a0.y }
    const a2 = { x: a3.x + dx, y: a3.y }

    let cmd: string

    if (props.config.connectionType === "bezier")
      cmd = `M ${a0.x} ${a0.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${a3.x} ${a3.y}`
    else if (props.config.connectionType === "linear") cmd = `M ${a0.x} ${a0.y} L ${a3.x} ${a3.y}`

    const width = 3 * this.state.transformation.zoom

    const pathClassNames = classNames(
      classNameOrDefault("connection"),
      { [classNameOrDefault("selected")]: selected },
      additionalClassNames || []
    )

    if (notes)
      return (
        <path
          className={pathClassNames}
          onClick={onClick ? onClick : () => {}}
          key={key || "wk"}
          strokeWidth={`${width}px`}
          d={cmd}
        >
          <title>{notes}</title>
        </path>
      )
    else
      return (
        <path
          className={pathClassNames}
          onClick={onClick ? onClick : () => {}}
          key={key || "wk"}
          strokeWidth={`${width}px`}
          d={cmd}
        />
      )
  }

  private onEditorUpdate(element: Element) {
    if (element === null) return
    const rect = element.getBoundingClientRect() as DOMRect

    if (
      this.editorBoundingRect === undefined ||
      this.editorBoundingRect.x !== rect.x ||
      this.editorBoundingRect.y !== rect.y
    ) {
      this.editorBoundingRect = rect
      this.setState((state) => state)
    }
  }

  createNewNode(name: string, factory: () => Node, pos: Vector2d) {
    const isInRange = (min: number, size: number, value: number) => min <= value && min + size >= value

    if (
      isInRange(this.editorBoundingRect.x, this.editorBoundingRect.width, pos.x) &&
      isInRange(this.editorBoundingRect.y, this.editorBoundingRect.height, pos.y)
    ) {
    } else {
      return
    }

    pos.x -= this.editorBoundingRect.x
    pos.y -= this.editorBoundingRect.y

    const createHash = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      const LENGTH = 6
      return _.times(LENGTH)
        .map(() => Math.floor(Math.random() * chars.length))
        .map((i) => chars.charAt(i))
        .reduce((p, c) => p + c, "")
    }

    const proto = factory()
    const id = `${proto.type}_${createHash()}`
    // const name = type;

    // Make deep (enough) copy
    // const inputs = factory.inputs.map(input => ({ ...input }));
    // const outputs = template.outputs.map(output => ({ ...output }));

    const { config } = this.props
    const updateProps = () => {
      this.props.nodes.push({ ...proto, id })
      this.setState((state) => {
        state.nodesState.set(id, { isCollapsed: true, pos, size: { x: 100, y: 100 } })
        return { ...state }
      })
    }
    if (config.onChanged !== undefined) {
      this.state.nodesState.set(id, { isCollapsed: true, pos, size: { x: 100, y: 100 } })
      config.onChanged({ type: "NodeCreated", node: { ...proto, id } }, updateProps)
    }
    if (config.demoMode || config.onChanged === undefined) {
      updateProps()
    }
  }

  onStartCreatingNewNode(
    children: JSX.Element,
    name: string,
    factory: () => Node,
    pos: Vector2d,
    offset: Vector2d,
    additionalClassNames?: string[]
  ) {
    const classNameOrDefault = (label: string) => {
      if (this.props.config.style && this.props.config.style[label]) return this.props.config.style[label]
      return label
    }
    const node = document.createElement("div")
    node.className = classNames(classNameOrDefault("node"), classNameOrDefault("collapsed"), additionalClassNames || [])
    node.style.top = `${pos.y}px`
    node.style.left = `${pos.x}px`
    node.style.position = "absolute"
    ReactDOM.render(children, node)

    const host = document.createElement("div")
    host.className = classNameOrDefault("react-flow-creating-node")
    host.appendChild(node)

    document.body.appendChild(host)

    const onFinishCreatingNewNode = () => {
      const nodeRect = node.getBoundingClientRect()
      document.body.removeChild(host)
      document.body.removeEventListener("mouseup", onFinishCreatingNewNode)
      document.body.removeEventListener("mouseleave", onFinishCreatingNewNode)
      document.body.removeEventListener("mousemove", onMove)
      this.createNewNode(name, factory, Vector2d.floor({ x: nodeRect.left, y: nodeRect.top }))
    }

    const onMove = (e: MouseEvent) => {
      node.style.left = `${e.x - offset.x}px`
      node.style.top = `${e.y - offset.y}px`
    }

    document.body.addEventListener("mouseup", onFinishCreatingNewNode)
    document.body.addEventListener("mouseleave", onFinishCreatingNewNode)
    document.body.addEventListener("mousemove", onMove)
  }

  getPositions(): Map<string, Vector2d> {
    const map = new Map<string, Vector2d>()
    for (const [key, entry] of this.state.nodesState.entries()) {
      map.set(key, entry.pos)
    }
    return map
  }

  render() {
    const workingConnection = (info: WorkItemConnection) => {
      return this.connectionPath(info.output, info.input)
    }

    const classNameOrDefault = (label: string) => {
      if (props.config.style && props.config.style[label]) return props.config.style[label]
      return label
    }

    const { props, state } = this

    const nodeStyle = (pos: Vector2d) => ({
      top: `${pos.y}px`,
      left: `${pos.x}px`
    })

    const dir = this.props.config.direction || "we"
    const dropArea = this.props.config.dragHandler || "header"
    const dirMapping = dir === "we" ? { input: "right", output: "left" } : { input: "left", output: "right" }

    const properties = (node: Node) => {
      if (node.properties !== undefined && node.properties.display === "only-dots") {
        const dot = (kind: IEndpoint["kind"], total: number) => (prop: Port, index: number) => {
          const conn: IEndpoint = { nodeId: node.id, port: index, kind: kind, name: prop.name }
          const site = dirMapping[kind]
          const style = site === "right" ? { right: "7px" } : {}
          const dotClassName = classNames(classNameOrDefault("dot"), classNameOrDefault(kind), classNameOrDefault(site))
          return (
            <div key={Endpoint.computeId(node.id, index, kind)}>
              <div
                onMouseDown={this.onCreateConnectionStarted.bind(this, conn)}
                onMouseUp={this.onCreateConnectionEnded.bind(this, conn)}
                ref={this.setConnectionEndpoint.bind(this, conn)}
                className={dotClassName}
                style={{
                  ...style,
                  position: "absolute",
                  top: `calc(${(100 * (index + 1)) / (total + 1)}% - 8px)`
                }}
                title={prop.name}
              />
            </div>
          )
        }
        return [
          ...node.inputs.map(dot(ConnectionType.input, node.inputs.length)),
          ...node.outputs.map(dot(ConnectionType.output, node.outputs.length))
        ]
      } else {
        const dotClassName = (conn) =>
          classNames(
            classNameOrDefault("dot"),
            classNameOrDefault(conn.kind),
            classNameOrDefault(dirMapping[conn.kind])
          )
        // todo change algorithm, we should choose dot positions
        const dot = (conn: IEndpoint, name: string) => (
          <div
            onMouseDown={this.onCreateConnectionStarted.bind(this, conn)}
            onMouseUp={this.onCreateConnectionEnded.bind(this, conn)}
            ref={this.setConnectionEndpoint.bind(this, conn)}
            className={dotClassName(conn)}
            title={name}
          />
        )

        const mapProp = (kind: IEndpoint["kind"]) => (prop: Port, index: number) => {
          const key = Endpoint.computeId(node.id, index, kind)
          return (
            <div key={key}>
              {node.children ? null : prop.renderer ? prop.renderer(prop) : prop.name}
              {dot({ nodeId: node.id, port: index, kind: kind, name: prop.name }, prop.name)}
            </div>
          )
        }
        return [...node.inputs.map(mapProp(ConnectionType.input)), ...node.outputs.map(mapProp(ConnectionType.output))]
      }
    }

    const collapsedProperties = (node: Node) => {
      const dot = (conn: IEndpoint, key: string, index: number, size: number, name: string) => {
        const style = () => {
          const radius = 20
          const angle = size === 1 ? 0 : ((index - size / 2 + 0.5) * Math.PI) / 4
          if (dirMapping[conn.kind] === "right") {
            const center = { x: -20, y: 1 }
            return {
              top: `${center.y + radius * Math.sin(angle)}px`,
              left: `${center.x + radius * Math.cos(angle)}px`
            }
          } else if (dirMapping[conn.kind] === "left") {
            const center = { x: 0, y: 1 }
            return {
              top: `${center.y + radius * Math.sin(angle)}px`,
              left: `${center.x - radius * Math.cos(angle)}px`
            }
          } else {
            console.warn(`Unknown dir ${conn.kind}`)
          }
        }
        const dotClassName = classNames(
          classNameOrDefault("dot"),
          classNameOrDefault(conn.kind),
          classNameOrDefault(dirMapping[conn.kind])
        )
        return (
          <div
            style={style()}
            key={key}
            onMouseDown={this.onCreateConnectionStarted.bind(this, conn)}
            onMouseUp={this.onCreateConnectionEnded.bind(this, conn)}
            ref={this.setConnectionEndpoint.bind(this, conn)}
            className={node.childrenCollapsed ? "" : dotClassName}
            title={name}
          />
        )
      }
      const mapProp = (kind: IEndpoint["kind"], size: number) => (prop: Port, i: number) => {
        const key = Endpoint.computeId(node.id, i, kind)
        return dot({ nodeId: node.id, port: i, kind: kind, name: prop.name }, key, i, size, prop.name)
      }
      const inputsClassNames = classNames(classNameOrDefault("connections"), classNameOrDefault(dirMapping["input"]))
      const outputsClassNames = classNames(classNameOrDefault("connections"), classNameOrDefault(dirMapping["output"]))
      const inputs = (
        <div key={node.id + "inputs"} className={inputsClassNames}>
          {node.inputs.map(mapProp(ConnectionType.input, node.inputs.length))}
        </div>
      )
      const outputs = (
        <div key={node.id + "outputs"} className={outputsClassNames}>
          {node.outputs.map(mapProp(ConnectionType.output, node.outputs.length))}
        </div>
      )

      return [inputs, outputs]
    }

    const newNodes = adjust(state.nodesState, state.componentSize, props.nodes)

    newNodes.forEach((value, key) => state.nodesState.set(key, value))

    const nodes = props.nodes.map((node) => {
      const nodeState = state.nodesState.get(node.id)
      const isCollapsed = node.isCollapsed !== undefined ? node.isCollapsed : nodeState.isCollapsed
      const isSelected = this.state.selection && this.state.selection.id === node.id
      const nodeClassNames = classNames(
        classNameOrDefault("node"),
        {
          [classNameOrDefault("collapsed")]: isCollapsed,
          [classNameOrDefault("selected")]: isSelected
        },
        node.classNames || []
      )
      const headerClassNames = node.childrenCollapsed ? "" : classNameOrDefault("header")
      const expanderClassNames = classNameOrDefault("expander")
      const iconClassNames = classNames(classNameOrDefault("icon"), {
        [classNameOrDefault("arrow-down")]: isCollapsed,
        [classNameOrDefault("arrow-right")]: !isCollapsed
      })
      const bodyClassNames = classNameOrDefault("body")

      return (
        <div
          onClick={this.select.bind(this, "node", node.id)}
          key={node.id}
          style={nodeStyle(nodeState.pos)}
          onMouseDown={dropArea === "body" ? this.onDragStarted.bind(this, node.id) : undefined}
          onDoubleClick={dropArea === "body" ? this.toggleExpandNode.bind(this, node.id) : undefined}
          className={nodeClassNames}
        >
          <>
            <div
              onMouseDown={dropArea === "header" ? this.onDragStarted.bind(this, node.id) : undefined}
              onDoubleClick={dropArea === "header" ? this.toggleExpandNode.bind(this, node.id) : undefined}
              className={headerClassNames}
            >
              {!node.children && (
                <>
                  <div
                    className={expanderClassNames}
                    onClick={this.toggleExpandNode.bind(this, node.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className={iconClassNames} />
                  </div>
                  <span>{node.name}</span>
                </>
              )}
              {isCollapsed ? (
                <div>
                  {node.childrenCollapsed}
                  {collapsedProperties(node)}
                </div>
              ) : (
                ""
              )}
            </div>
            {isCollapsed ? (
              ""
            ) : (
              <div className={bodyClassNames}>
                {node.children ? node.children : props.config.resolver(node)}
                {properties(node)}
              </div>
            )}
          </>
        </div>
      )
    })

    // Find all connections
    const connections: { out: IEndpoint; in: IEndpoint }[] = []
    const nodeDict = new Map<String, Node>()
    for (let node of props.nodes) {
      nodeDict.set(node.id, node)
    }

    for (let node of props.nodes) {
      let i = 0
      for (let input of node.inputs) {
        if (input.connection === undefined) continue
        if (Array.isArray(input.connection)) {
          for (let connection of input.connection) {
            const opponentNode = nodeDict.get(connection.nodeId)
            // Is the opponent node available?
            if (opponentNode === undefined) continue

            const oppConnectionRaw = opponentNode.outputs[connection.port].connection
            const oppConnection = filterIfArray(oppConnectionRaw, (c) => c.nodeId === node.id)

            const inputConn: IEndpoint = {
              nodeId: node.id,
              port: i,
              kind: ConnectionType.input,
              additionalClassName: connection.classNames,
              notes: connection.notes
            }
            const outputConn: IEndpoint = {
              nodeId: connection.nodeId,
              port: connection.port,
              kind: ConnectionType.output,
              additionalClassName: oppConnection.classNames,
              notes: oppConnection.notes
            }
            connections.push({ in: inputConn, out: outputConn })
          }
        } else {
          const connection = input.connection as Connection
          const opponentNode = nodeDict.get(connection.nodeId)
          // Is the opponent node available?
          if (opponentNode === undefined) continue
          const oppConnectionRaw = opponentNode.outputs[connection.port].connection
          const oppConnection = filterIfArray(oppConnectionRaw, (c) => c.nodeId === node.id)

          if (props.nodes.findIndex((n) => n.id === connection.nodeId) < 0) continue
          const inputConn: IEndpoint = {
            nodeId: node.id,
            port: i,
            kind: ConnectionType.input,
            additionalClassName: connection.classNames,
            notes: connection.notes
          }
          const outputConn: IEndpoint = {
            nodeId: input.connection.nodeId,
            port: input.connection.port,
            kind: ConnectionType.output,
            additionalClassName: oppConnection.classNames,
            notes: oppConnection.notes
          }
          connections.push({ in: inputConn, out: outputConn })
        }
        ++i
      }
    }

    const connectionsLines = connections.map((conn) => this.connection(conn.out, conn.in))
    const workingItem =
      state.workingItem && state.workingItem.type === "connection" ? workingConnection(state.workingItem) : ""

    const { transformation } = state

    const grid = () => {
      if (props.config.grid === false) return ""

      let dy = 18
      let dx = 18

      if (props.config.grid !== null && typeof props.config.grid === "object") {
        dx = props.config.grid.size || 18
        dy = props.config.grid.size || 18
      }
      const { width, height } = state.componentSize

      const draw = (element: HTMLCanvasElement) => {
        if (element === null) return
        if (this.gridSize !== undefined && this.gridSize.height === height && this.gridSize.width === width) return
        this.gridSize = { height, width }
        const ctx = element.getContext("2d")
        ctx.clearRect(0, 0, element.width, element.height)
        ctx.beginPath()
        ctx.strokeStyle = "#f2f2f2"
        for (let iy = 0; iy < height / dy; ++iy) {
          const y = dy * (iy + 0.5)
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
        }

        for (let ix = 0; ix < width / dx; ++ix) {
          const x = dx * (ix + 0.5)
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
        }
        ctx.stroke()
      }
      const gridClassName = classNameOrDefault("grid")
      return <canvas className={gridClassName} width={width} height={height} ref={draw.bind(this)} />
    }

    const nodesContainerStyle = {
      transform: `matrix(${transformation.zoom},0,0,${transformation.zoom},${transformation.dx},${transformation.dy})`
    }

    const editorClassName = classNames(classNameOrDefault("react-flow-editor"), props.additionalClassName || [])

    return (
      <div
        style={props.style}
        ref={this.onEditorUpdate.bind(this)}
        tabIndex={0}
        onKeyDown={this.onKeyDown.bind(this)}
        onWheel={this.onWheel.bind(this)}
        onMouseLeave={this.onDragEnded.bind(this)}
        onMouseMove={this.onDrag.bind(this)}
        onMouseDown={this.onMouseGlobalDown.bind(this)}
        onMouseUp={this.onDragEnded.bind(this)}
        className={editorClassName}
      >
        {grid()}
        <svg
          ref={this.updateEditorSize.bind(this)}
          className={classNameOrDefault("connections")}
          xmlns="http://www.w3.org/2000/svg"
        >
          {connectionsLines}
          {workingItem}
        </svg>
        <div style={nodesContainerStyle}>{nodes}</div>
      </div>
    )
  }
}
