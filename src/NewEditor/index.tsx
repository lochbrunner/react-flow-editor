import React, { useState } from "react"
import classNames from "classnames"

import { Config, Connection, Node as NodeType } from "../types"
import { ConnectionType, Endpoint, IEndpoint } from "../Endpoint"
import { initialState } from "./initialState"
import { EditorState } from "../Editor/types"
import { BUTTON_LEFT, BUTTON_MIDDLE, KEY_CODE_DELETE } from "./constants"
import { epPredicate, extractConnectionFromId, isEmptyArrayOrUndefined, nodeIdPredicate } from "../Editor/helpers"
import { removeConnection } from "./removeConnection"
import { CurrentAction, ItemType, WorkItem } from "./types"
import { Vector2d } from "../geometry"
import { Grid } from "./Grid"
import { Connections } from "./Connections"

import { Node } from "./Node"
import { adjust } from "../adjust"

export type EditorProps = {
  config: Config
  nodes: NodeType[]
  state: EditorState
  setState: React.Dispatch<React.SetStateAction<EditorState>>
  editorBoundingRect: DOMRect
  onEditorUpdate: (element: Element) => void
}

export const Editor: React.FC<EditorProps> = (props) => {
  const { state, setState, nodes, editorBoundingRect, onEditorUpdate } = props
  const [currentAction, setCurrentAction] = useState<CurrentAction>(undefined)
  const endpointCache = new Map<string, Vector2d>()

  const select = (type: ItemType | null, id: string | null) => {
    if (!state.selection || state.selection.id !== id) {
      const updateState = () =>
        setState((state) => {
          return { ...state, selection: { id, type } }
        })
      const { config } = props
      if (config.onChanged && type === "node") {
        const node = nodes.find((n) => n.id === id)
        config.onChanged({ type: "NodeSelected", node: node }, updateState)
      } else if (config.onChanged && type === null) config.onChanged({ type: "NodeDeselected" }, updateState)
      if (config.onChanged === undefined || config.demoMode) updateState()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const { selection } = state
    if (e.keyCode === KEY_CODE_DELETE) {
      if (selection) {
        if (selection.type === "connection") {
          const { input, output } = extractConnectionFromId(selection.id)
          const updateProps = () => {
            removeConnection(input, output, nodes)
          }
          if (props.config.onChanged !== undefined)
            props.config.onChanged({ input, output, type: "ConnectionRemoved", id: selection.id }, updateProps)
          if (props.config.onChanged === undefined || props.config.demoMode) updateProps()
        } else if (selection.type === "node") {
          const index = nodes.findIndex((node) => node.id === selection.id)
          // Delete all corresponding connections
          // TODO: Refactor the next two for loops in order to write the code only once
          const correspondingConnections: { input: IEndpoint; output: IEndpoint }[] = []
          const nodeToDelete = nodes[index]
          let inputIndex = -1
          for (let input of nodeToDelete.inputs) {
            ++inputIndex
            if (isEmptyArrayOrUndefined(input.connection)) continue
            const peerNodes = nodes.filter(nodeIdPredicate(input.connection)) //  find(nodePredicate(input.id));
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
            const peerNodes = nodes.filter(nodeIdPredicate(output.connection))
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
              removeConnection(connectionToDelete.input, connectionToDelete.output, nodes)
            }

            nodes.splice(index, 1)
          }
          if (props.config.onChanged !== undefined)
            props.config.onChanged({ type: "NodeRemoved", id: selection.id, correspondingConnections }, updateProps)
          if (props.config.onChanged === undefined || props.config.demoMode) updateProps()
        }

        select(null, null)
      }
    }
  }

  const onDragEnded = (e: React.MouseEvent<HTMLElement>) => {
    setCurrentAction(undefined)
    setState((state) => ({ ...state, workingItem: undefined }))
  }

  const onDrag = (e: React.MouseEvent<HTMLElement>) => {
    if (currentAction === undefined) return

    const newPos = { x: e.clientX, y: e.clientY }
    const { x: dx, y: dy } = Vector2d.subtract(newPos, currentAction.lastPos)
    setState((state) => {
      if (currentAction.type === "node") {
        state.nodesState.get(currentAction.id).pos.x += dx
        state.nodesState.get(currentAction.id).pos.y += dy
        return { ...state }
      } else if (currentAction.type === "connection") {
        const { endpoint } = currentAction
        const free = Vector2d.subtract(newPos, editorBoundingRect)

        const key = Endpoint.computeId(endpoint.nodeId, endpoint.port, endpoint.kind)

        const offset = state.connectionState.get(key)
        const node = state.nodesState.get(endpoint.nodeId)

        const fixed = Vector2d.add(offset, node.pos)

        if (endpoint.kind === ConnectionType.input) {
          const workingItem: WorkItem = { type: ItemType.connection, input: fixed, output: free }
          return { ...state, workingItem }
        } else if (endpoint.kind === ConnectionType.output) {
          const workingItem: WorkItem = { type: ItemType.connection, input: free, output: fixed }
          return { ...state, workingItem }
        }
      } else if (currentAction.type === "translate") {
        const pt = state.transformation
        const transformation = { dx: pt.dx + dx, dy: pt.dy + dy, zoom: pt.zoom }
        setState((state) => ({ ...state, transformation }))
      }
    })

    setCurrentAction({ ...currentAction, lastPos: newPos })
  }

  const onMouseGlobalDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button === BUTTON_MIDDLE) {
      setCurrentAction({ type: "translate", lastPos: { x: e.clientX, y: e.clientY } })
    } else if (e.button === BUTTON_LEFT && !(e.target as HTMLElement).closest(".selected")) {
      select(null, null)
    }
  }

  const onDragStarted = (id: string, e: React.MouseEvent<HTMLElement>) => {
    if (e.button === BUTTON_LEFT) setCurrentAction({ lastPos: { x: e.clientX, y: e.clientY }, id: id, type: "node" })
  }

  const toggleExpandNode = (id: string) => {
    const node = nodes.find((n) => n.id === id)
    const desiredState = node.isCollapsed !== undefined ? !node.isCollapsed : !state.nodesState.get(id).isCollapsed
    const updateState = () =>
      setState((state) => {
        state.nodesState.get(id).isCollapsed = desiredState
        return { ...state }
      })
    const { config } = props
    if (config.onChanged)
      config.onChanged({ type: "NodeCollapseChanged", id, shouldBeCollapsed: desiredState }, updateState)
    if (config.onChanged === undefined || config.demoMode) updateState()
  }

  const onCreateConnectionStarted = (endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setCurrentAction({ lastPos: { x: e.screenX, y: e.screenY }, endpoint, type: "connection" })
  }

  const createConnection = (input: IEndpoint, output: IEndpoint) => {
    const { nodes, config } = props
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

      setState((state) => state)
    }
    if (config.onChanged !== undefined) {
      config.onChanged({ type: "ConnectionCreated", input, output }, updateProps)
    }
    if (config.demoMode || config.onChanged === undefined) {
      updateProps()
    }
  }

  const onCreateConnectionEnded = (endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) => {
    if (currentAction && currentAction.type === "connection") {
      // Create new connection
      if (currentAction.endpoint.kind === ConnectionType.input) {
        createConnection(currentAction.endpoint, endpoint)
      } else if (currentAction.endpoint.kind === ConnectionType.output) {
        createConnection(endpoint, currentAction.endpoint)
      }
    }
  }

  const setConnectionEndpoint = (conn: IEndpoint, element: Element) => {
    if (!element) return
    // Only save relative position
    const parentPos = state.nodesState.get(conn.nodeId).pos
    const key = Endpoint.computeId(conn.nodeId, conn.port, conn.kind)
    const cached = endpointCache.get(key)
    const newDomRect: DOMRect = element.getBoundingClientRect() as DOMRect
    const globalOffset: Vector2d = editorBoundingRect || { x: 0, y: 0 }
    const offset = {
      x: Math.floor(newDomRect.x + newDomRect.width / 2 - parentPos.x - globalOffset.x),
      y: Math.floor(newDomRect.y + newDomRect.height / 2 - parentPos.y - globalOffset.y)
    }
    if (cached === undefined || !Vector2d.compare(offset, cached)) {
      endpointCache.set(key, offset)
      // TODO: Bundle all connection endpoint updates to one this.setState call
      setTimeout(
        () =>
          setState((state) => {
            state.connectionState.set(key, offset)
            return state
          }),
        0
      )
    }
  }

  const nodesContainerStyle = {
    transform: `matrix(${state.transformation.zoom},0,0,${state.transformation.zoom},${state.transformation.dx},${state.transformation.dy})`
  }

  const newNodes = adjust(state.nodesState, state.componentSize, props.nodes)

  newNodes.forEach((value, key) => state.nodesState.set(key, value))

  return (
    <div
      ref={onEditorUpdate}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseLeave={onDragEnded}
      onMouseMove={onDrag}
      onMouseDown={onMouseGlobalDown}
      onMouseUp={onDragEnded}
      className="react-flow-editor"
    >
      <Grid componentSize={state.componentSize} grid={props.config.grid} />
      <Connections state={state} setState={setState} nodes={nodes} select={select} config={props.config} />

      <div style={nodesContainerStyle}>
        {nodes.map((node) => (
          <Node
            state={state}
            select={select}
            node={node}
            onDragStarted={onDragStarted}
            toggleExpandNode={toggleExpandNode}
            resolver={props.config.resolver}
            dir={props.config.direction || "we"}
            onCreateConnectionStarted={onCreateConnectionStarted}
            onCreateConnectionEnded={onCreateConnectionEnded}
            setConnectionEndpoint={setConnectionEndpoint}
            dropArea={props.config.dragHandler || "header"}
            key={node.id}
          />
        ))}
      </div>
    </div>
  )
}
