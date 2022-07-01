import { ChangeAction, Endpoint, Node, Connection } from "@kseniass/react-flow-editor"
import { Reducer } from "redux"
import { Action } from "redux-actions"

import * as Actions from "./constants"

export interface RootState {
  nodes: Node[]
}

const loadMock = (): Node[] => [
  {
    name: "Node 1",
    id: "node-1",
    type: "node-type-red ",
    payload: {},
    inputs: [
      { connection: [], name: "input 1" },
      { connection: [], name: "input 2" }
    ],
    outputs: [
      { connection: [{ nodeId: "node-2", port: 0 }], name: "output 1" },
      { connection: [], name: "output 2 " }
    ],
    properties: { display: "only-dots" },
    classNames: ["red"]
  },
  {
    name: "Node 2",
    id: "node-2",
    type: "node-type-green ",
    payload: {},
    inputs: [{ connection: [{ nodeId: "node-1", port: 0 }], name: "input 1" }],
    outputs: [
      { connection: [], name: "output 1" },
      { connection: [], name: "output 2 " }
    ],
    properties: { display: "only-dots" },
    classNames: ["green"]
  }
]

const addMock = (old: Node[]): Node[] => {
  const classNames = ["red", "green", "blue"]
  const randomColorIndex = Math.floor(Math.random() * 3)
  const x = Math.floor(Math.random() * 400)
  const y = Math.floor(Math.random() * 600)
  old.push({
    name: `Node ${old.length + 1}`,
    id: `node-${old.length + 1}`,
    type: "node-type-1 ",
    payload: {},
    inputs: [{ connection: [], name: "input 1" }],
    outputs: [
      { connection: [], name: "output 1" },
      { connection: [], name: "output 2 " }
    ],
    position: { x, y },
    properties: { display: "only-dots" },
    classNames: [classNames[randomColorIndex]]
  })
  return [...old]
}

const changeData = (old: Node[]): Node[] => {
  if (old.length > 0) old[0].name = old[0].name + "3"
  return [...old]
}

const removeData = (old: Node[]): Node[] => {
  if (old.length > 0) {
    old.pop()
    return [...old]
  }
  return []
}

const clearMock = (): Node[] => []

const removeConnection = (
  state: RootState,
  connection: {
    input: Endpoint
    output: Endpoint
  }
) => {
  const inputNodeIndex = state.nodes.findIndex((n) => n.id === connection.input.nodeId)

  const inputConnections = state.nodes[inputNodeIndex].inputs[connection.input.port].connection as Connection[]
  const inputConnectionIndex = inputConnections.findIndex(
    (s) => s.nodeId === connection.output.nodeId && s.port === connection.output.port
  )
  inputConnections.splice(inputConnectionIndex, 1)

  const outputNodeIndex = state.nodes.findIndex((n) => n.id === connection.output.nodeId)
  const outputConnections = state.nodes[outputNodeIndex].outputs[connection.output.port].connection as Connection[]
  const outputConnectionIndex = outputConnections.findIndex(
    (s) => s.nodeId === connection.input.nodeId && s.port === connection.input.port
  )
  outputConnections.splice(outputConnectionIndex, 1)
}

export const reducer: Reducer<RootState> = (
  state: RootState = {
    nodes: clearMock()
  },
  action: Action<{} | ChangeAction>
) => {
  if (action.type === Actions.LOAD_DATA) {
    return { nodes: loadMock() }
  } else if (action.type === Actions.CLEAR_DATA) {
    return { nodes: clearMock() }
  } else if (action.type === Actions.ADD_DATA) {
    return { nodes: addMock(state.nodes) }
  } else if (action.type === Actions.CHANGE_DATA) {
    return { nodes: changeData(state.nodes) }
  } else if (action.type === Actions.REMOVE_DATA) {
    return { nodes: removeData(state.nodes) }
  } else if (action.type === Actions.EDITOR_UPDATES) {
    const payload = action.payload as ChangeAction
    const classNames = Math.random() > 0.7 ? ["invalid"] : []
    if (payload.type === "ConnectionCreated") {
      const inputIndex = state.nodes.findIndex((n) => n.id === payload.input.nodeId)
      const outputIndex = state.nodes.findIndex((n) => n.id === payload.output.nodeId)
      const outputConnection: Connection = {
        nodeId: payload.output.nodeId,
        port: payload.output.port,
        classNames,
        notes: `Connects ${payload.input.nodeId} with ${payload.output.nodeId}`
      }
      const inputConnection: Connection = {
        nodeId: payload.input.nodeId,
        port: payload.input.port
      }
      ;(state.nodes[inputIndex].inputs[payload.input.port].connection as Connection[]).push(outputConnection)
      ;(state.nodes[outputIndex].outputs[payload.output.port].connection as Connection[]).push(inputConnection)
    } else if (payload.type === "ConnectionRemoved") {
      removeConnection(state, payload)
    } else if (payload.type === "NodeCreated") {
      state.nodes.push(payload.node)
    } else if (payload.type === "NodeRemoved") {
      for (const conn of payload.correspondingConnections) {
        removeConnection(state, conn)
      }
      const inputNode = state.nodes.findIndex((n) => n.id === payload.id)
      state.nodes.splice(inputNode, 1)
    } else if (payload.type === "NodeCollapseChanged") {
      const nodeIndex = state.nodes.findIndex((n) => n.id === payload.id)
      const node: Node = {
        ...state.nodes[nodeIndex],
        isCollapsed: payload.shouldBeCollapsed
      }
      state.nodes[nodeIndex] = node
    }
    console.log(payload)
    return { ...state }
  }
  return state
}
