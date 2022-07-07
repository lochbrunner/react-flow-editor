import * as React from "react"
import * as ReactDOM from "react-dom"

import { useEditor, Editor, Node, Config, Connection } from "@kseniass/react-flow-editor"
import "./simple.scss"

type LogProps = { subscribe: (update: (log: string) => void) => void }
type LogState = { content: string }

class Log extends React.Component<LogProps, LogState> {
  constructor(props: LogProps) {
    super(props)
    this.state = { content: "" }
    props.subscribe(this.update.bind(this))
  }

  private update(log: string) {
    this.setState({ content: log })
  }

  render() {
    return (
      <div className="log">
        <p>{this.state.content}</p>
      </div>
    )
  }
}

type NodeAttributesProps = { subscribe: (update: (node: Node | null) => void) => void }
type NodeAttributesState = { node: Node | null }
class NodeAttributes extends React.Component<NodeAttributesProps, NodeAttributesState> {
  constructor(props: any) {
    super(props)
    this.state = { node: null }
    props.subscribe(this.update.bind(this))
  }

  private update(node: Node | null) {
    this.setState({ node: node })
  }

  render() {
    return (
      <div>
        <h2>Node Attributes</h2>
        <p>{this.state.node === null ? "No node selected" : "Data: " + JSON.stringify(this.state.node.payload.data)}</p>
      </div>
    )
  }
}

const node1Factory = (connections?: { input: (Connection | Connection[])[] }) => ({
  name: "Node 1",
  id: "Node_1",
  type: "node-type-1",
  payload: { h1: "hello", data: { custom: "data 1" } },
  children: <div>Simple children</div>,
  childrenCollapsed: <div>Header</div>,
  inputs: [
    {
      connection: connections ? connections.input[0] : [],
      name: "input 1"
    },
    {
      connection: connections ? connections.input[0] : [],
      name: "input 2"
    }
  ],
  outputs: []
})

const node2Factory = (connections?: {
  input: (Connection | Connection[])[]
  output: (Connection | Connection[])[]
}) => ({
  name: "Node 2",
  id: "Node_2",
  type: "node-type-2",
  payload: { h1: "world", data: { custom: "data 2" } },
  inputs: [
    { connection: connections ? connections.input[0] : [], name: "input 1" },
    { connection: connections ? connections.input[1] : [], name: "input 2" },
    { connection: connections ? connections.input[2] : [], name: "input 3" }
  ],
  outputs: [
    { connection: connections ? connections.output[0] : [], name: "output 1" },
    { connection: connections ? connections.output[1] : [], name: "output 2" },
    { connection: connections ? connections.output[2] : [], name: "output 3" }
  ]
})

const node3Factory = (connections?: { output: (Connection | Connection[])[] }) => ({
  name: "Node 3",
  id: "Node_3",
  type: "node-type-3",
  payload: { h1: "!", data: {} },
  inputs: [],
  outputs: [{ connection: connections ? connections.output[0] : [], name: "output 1" }]
})

const nodes: Node[] = [
  {
    ...node1Factory({
      input: [[{ nodeId: "Node_2", port: 0 }]]
    }),
    id: "Node_1"
  },
  {
    ...node2Factory({
      input: [[{ nodeId: "Node_3", port: 0 }]],
      output: [{ nodeId: "Node_1", port: 0 }]
    }),
    id: "Node_2"
  },
  {
    ...node3Factory({
      output: [[{ nodeId: "Node_2", port: 0 }]]
    }),
    id: "Node_3"
  }
]

function resolver(node: Node): JSX.Element {
  if (node.payload.type === "") return <h2 />
  return <p style={{ height: "100px", width: "60px" }}>{node.payload.h1}</p>
}

let log: (log: string) => void = undefined
let attributes: (node: Node | null) => void = undefined
const onChanged: Config["onChanged"] = (data) => {
  if (log === undefined) return
  if (data.type === "ConnectionRemoved") log(`Connection '${data.id}' was removed.`)
  else if (data.type === "NodeRemoved") log(`Node '${data.id}' was removed.`)
  else if (data.type === "NodeCreated") log(`Node '${data.node.id}' was created.`)
  else if (data.type === "ConnectionCreated")
    log(
      `New connection between nodes '${data.input.nodeId}' [${data.input.port}]  and '${data.output.nodeId}' [${data.output.port}] created.`
    )
  else if (data.type === "NodeCollapseChanged")
    log(`Collapse state of Node '${data.id}' is now ${data.shouldBeCollapsed}.`)
  else if (data.type === "NodeSelected") {
    log(`Node selected: '${data.node.id}'.`)
    attributes(data.node)
  } else if (data.type === "NodeDeselected") {
    log(`Node deselected.`)
    attributes(null)
  }
}

const config: Config = {
  resolver,
  connectionType: "bezier",
  dragHandler: "body",
  onChanged,
  grid: true,
  demoMode: true,
  direction: "we"
}

const App = () => {
  const { editorProps, createNewNode, setTransformation } = useEditor({ initialNodes: nodes, config })

  const onWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (e.ctrlKey) return
    const pt = editorProps.state.transformation
    const zoomFactor = Math.pow(1.25, Math.sign(e.deltaY))
    const zoom = pt.zoom * zoomFactor

    const cx = e.clientX
    const cy = e.clientY
    // See https://github.com/lochbrunner/meliodraw/blob/master/Melio.Draw/SharpDX/OrthogonalCamera.cs#L116
    const dy = cy * (pt.zoom - zoom) + pt.dy
    const dx = cx * (pt.zoom - zoom) + pt.dx

    const transformation = { dx, dy, zoom }

    setTransformation(transformation)
  }

  return (
    <div>
      <div className="flow-menu">
        <div
          onClick={() =>
            createNewNode(node1Factory(), {
              x: editorProps.editorBoundingRect.width / 2,
              y: editorProps.editorBoundingRect.height / 2
            })
          }
        >
          Create new Node 1
        </div>

        <div
          onClick={() =>
            createNewNode(node2Factory(), {
              x: editorProps.editorBoundingRect.width / 2,
              y: editorProps.editorBoundingRect.height / 2
            })
          }
        >
          Create new Node 2
        </div>

        <div
          onClick={() =>
            createNewNode(node3Factory(), {
              x: editorProps.editorBoundingRect.width / 2,
              y: editorProps.editorBoundingRect.height / 2
            })
          }
        >
          Create new Node 3
        </div>
      </div>
      <Log subscribe={(update) => (log = update)} />
      <div onWheel={onWheel}>
        <Editor {...editorProps} />
      </div>
      <div className="node-attributes">
        <NodeAttributes subscribe={(update) => (attributes = update)} />
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById("root"))
