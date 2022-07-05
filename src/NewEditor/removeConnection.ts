import { IEndpoint } from "../Endpoint"
import { Connection, Node as NodeType } from "../types"
import { compareConnections } from "./helpers"

export const removeFromArrayOrValue = (value: Connection | Connection[], toRemove: Connection | Connection[]) => {
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

export const removeConnection = (input: IEndpoint, output: IEndpoint, nodes: NodeType[]) => {
  const inputNode = nodes.find((node) => node.id === input.nodeId)
  const outputNode = nodes.find((node) => node.id === output.nodeId)

  inputNode.inputs[input.port].connection = removeFromArrayOrValue(inputNode.inputs[input.port].connection, {
    nodeId: output.nodeId,
    port: output.port
  })
  outputNode.outputs[output.port].connection = removeFromArrayOrValue(outputNode.outputs[output.port].connection, {
    nodeId: input.nodeId,
    port: input.port
  })
}
