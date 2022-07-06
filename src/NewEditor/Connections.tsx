import classNames from "classnames"
import React, { useEffect } from "react"
import { computeConnectionId, filterIfArray } from "./helpers"
import { ConnectionType, Endpoint, IEndpoint } from "../Endpoint"
import { Vector2d } from "../geometry"
import { Config, Connection, Node as NodeType } from "../types"
import { EditorState, ItemType, WorkItemConnection } from "./types"

type ConnectionProps = {
  state: EditorState
  setState: React.Dispatch<React.SetStateAction<EditorState>>
  nodes: NodeType[]
  select: (type: ItemType | null, id: string | null) => void
  config: Config
}

export const Connections: React.FC<ConnectionProps> = (props) => {
  const [, _forceRerender] = React.useState({})

  useEffect(() => {
    setTimeout(() => {
      _forceRerender({})
    })
  }, [props])

  const connection = (outputConn: IEndpoint, inputConn: IEndpoint) => {
    const { nodesState, connectionState } = props.state
    const inputKey = Endpoint.computeId(inputConn.nodeId, inputConn.port, inputConn.kind)
    const outputKey = Endpoint.computeId(outputConn.nodeId, outputConn.port, outputConn.kind)
    const key = `${outputKey}_${inputKey}`
    const connId = computeConnectionId(inputConn, outputConn)
    const isSelected = props.state.selection && props.state.selection.id === connId

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

    return connectionPath(output, input, additionalClassNames, notes, isSelected, key, () =>
      props.select(ItemType.connection, connId)
    )
  }

  const connectionPath = (
    output: Vector2d,
    input: Vector2d,
    additionalClassNames?: string[],
    notes?: string,
    selected?: boolean,
    key?: string,
    onClick?: (e: React.MouseEvent<SVGPathElement>) => void
  ) => {
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

    const width = 3 * props.state.transformation.zoom

    const pathClassNames = classNames("connection", { selected: selected }, additionalClassNames || [])

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

  // Find all connections
  const connections: { out: IEndpoint; in: IEndpoint }[] = []
  const nodeDict = new Map<String, NodeType>()
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

  const connectionsLines = connections.map((conn) => connection(conn.out, conn.in))

  const updateEditorSize = (element: Element) => {
    if (element === null) return
    const width = Math.floor((element as any).width.baseVal.value)
    const height = Math.floor((element as any).height.baseVal.value)

    // console.log(`updateEditorSize: ${width}x${width}`);
    if (width < 1 || height < 1) return
    if (props.state.componentSize.width !== width || props.state.componentSize.height !== height)
      setTimeout(() => props.setState((state) => ({ ...state, componentSize: { height, width } })), 0)
  }

  const workingConnection = (info: WorkItemConnection) => {
    return connectionPath(info.output, info.input)
  }

  const workingItem =
    props.state.workingItem && props.state.workingItem.type === "connection"
      ? workingConnection(props.state.workingItem)
      : ""

  return (
    <svg ref={updateEditorSize} className="connections" xmlns="http://www.w3.org/2000/svg">
      {connectionsLines}
      {workingItem}
    </svg>
  )
}
