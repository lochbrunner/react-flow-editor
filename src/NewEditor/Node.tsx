import classNames from "classnames"
import React from "react"
import { ItemType } from "../Editor/types"
import { ConnectionType, Endpoint, IEndpoint } from "../Endpoint"
import { Vector2d } from "../geometry"
import { Node as NodeType, Port } from "../types"
import { EditorState } from "./types"

type NodeProps = {
  state: EditorState
  select: (type: ItemType | null, id: string | null) => void
  node: NodeType
  onDragStarted: (id: string, e: React.MouseEvent<HTMLElement>) => void
  toggleExpandNode: (id: string) => void
  resolver: (node: NodeType) => JSX.Element
  onCreateConnectionStarted: (endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) => void
  onCreateConnectionEnded: (endpoint: IEndpoint, e: React.MouseEvent<HTMLElement>) => void
  setConnectionEndpoint: (conn: IEndpoint, element: Element) => void
  dir: "ew" | "we"
  dropArea: "header" | "body"
}

const nodeStyle = (pos: Vector2d) => ({
  top: `${pos.y}px`,
  left: `${pos.x}px`
})

export const Node: React.FC<NodeProps> = (props) => {
  const nodeState = props.state.nodesState.get(props.node.id)
  const isCollapsed = props.node.isCollapsed !== undefined ? props.node.isCollapsed : nodeState.isCollapsed
  const isSelected = props.state.selection && props.state.selection.id === props.node.id
  const dirMapping = props.dir === "we" ? { input: "right", output: "left" } : { input: "left", output: "right" }

  const nodeClassNames = classNames(
    "node",
    {
      collapsed: isCollapsed,
      selected: isSelected
    },
    props.node.classNames || []
  )
  const headerClassNames = props.node.childrenCollapsed ? "" : "header"
  const iconClassNames = classNames("icon", {
    "arrow-down": isCollapsed,
    "arrow-right": !isCollapsed
  })

  const collapsedProperties = (node: NodeType) => {
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
      const dotClassName = classNames("dot", conn.kind, dirMapping[conn.kind])
      return (
        <div
          style={style()}
          key={key}
          onMouseDown={(e) => props.onCreateConnectionStarted(conn, e)}
          onMouseUp={(e) => props.onCreateConnectionEnded(conn, e)}
          ref={(el) => props.setConnectionEndpoint(conn, el)}
          className={node.childrenCollapsed ? "" : dotClassName}
          title={name}
        />
      )
    }
    const mapProp = (kind: IEndpoint["kind"], size: number) => (prop: Port, i: number) => {
      const key = Endpoint.computeId(node.id, i, kind)
      return dot({ nodeId: node.id, port: i, kind: kind, name: prop.name }, key, i, size, prop.name)
    }
    const inputsClassNames = classNames("connections", dirMapping["input"])
    const outputsClassNames = classNames("connections", dirMapping["output"])
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

  const properties = (node: NodeType) => {
    if (node.properties !== undefined && node.properties.display === "only-dots") {
      const dot = (kind: IEndpoint["kind"], total: number) => (prop: Port, index: number) => {
        const conn: IEndpoint = { nodeId: node.id, port: index, kind: kind, name: prop.name }
        const site = dirMapping[kind]
        const style = site === "right" ? { right: "7px" } : {}
        const dotClassName = classNames("dot", kind, site)
        return (
          <div key={Endpoint.computeId(node.id, index, kind)}>
            <div
              onMouseDown={(e) => props.onCreateConnectionStarted(conn, e)}
              onMouseUp={(e) => props.onCreateConnectionEnded(conn, e)}
              ref={(el) => props.setConnectionEndpoint(conn, el)}
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
      const dotClassName = (conn) => classNames("dot", conn.kind, dirMapping[conn.kind])
      // todo change algorithm, we should choose dot positions
      const dot = (conn: IEndpoint, name: string) => (
        <div
          onMouseDown={(e) => props.onCreateConnectionStarted(conn, e)}
          onMouseUp={(e) => props.onCreateConnectionEnded(conn, e)}
          ref={(el) => props.setConnectionEndpoint(conn, el)}
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

  return (
    <div
      onClick={() => props.select(ItemType.node, props.node.id)}
      style={nodeStyle(nodeState.pos)}
      onMouseDown={props.dropArea === "body" ? (e) => props.onDragStarted(props.node.id, e) : undefined}
      onDoubleClick={props.dropArea === "body" ? () => props.toggleExpandNode(props.node.id) : undefined}
      className={nodeClassNames}
    >
      <>
        <div
          onMouseDown={props.dropArea === "header" ? (e) => props.onDragStarted(props.node.id, e) : undefined}
          onDoubleClick={props.dropArea === "header" ? () => props.toggleExpandNode(props.node.id) : undefined}
          className={headerClassNames}
        >
          {!props.node.children && (
            <>
              <div
                className="expander"
                onClick={() => props.toggleExpandNode(props.node.id)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={iconClassNames} />
              </div>
              <span>{props.node.name}</span>
            </>
          )}
          {isCollapsed ? (
            <>
              {props.node.childrenCollapsed}
              {collapsedProperties(props.node)}
            </>
          ) : (
            ""
          )}
        </div>
        {isCollapsed ? (
          ""
        ) : (
          <div className="body">
            {props.node.children ? props.node.children : props.resolver(props.node)}
            {properties(props.node)}
          </div>
        )}
      </>
    </div>
  )
}
