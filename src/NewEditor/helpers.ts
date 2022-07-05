import { Endpoint, IEndpoint } from "../Endpoint"
import { Connection, Node, Port } from "../types"

export const compareConnections = (a: Connection) => (b: Connection) => a.port === b.port && a.nodeId === b.nodeId

export const computeConnectionId = (input: IEndpoint, output: IEndpoint) => {
  return `${Endpoint.computeIdIn(input)}__${Endpoint.computeIdIn(output)}`
}

/**
 * The reverse of computeConnectionId
 */
export const extractConnectionFromId = (id: string) => {
  const sepIndex = id.indexOf("__")
  const inputId = id.substr(0, sepIndex)
  const outputId = id.substr(sepIndex + 2)
  return {
    input: Endpoint.extractEndpointInfo(inputId),
    output: Endpoint.extractEndpointInfo(outputId)
  }
}

export const isEmptyArrayOrUndefined = (obj) => {
  return obj === undefined || (Array.isArray(obj) && obj.length === 0)
}

export const nodeIdPredicate = (connection: Connection | Connection[]) => (node: Node) =>
  Array.isArray(connection)
    ? connection.findIndex((conn) => conn.nodeId === node.id) >= 0
    : node.id === connection.nodeId

export const epPredicate = (nodeId: string, port?: number) => (ep: Port) => {
  const comp = (testee: Connection) => (port === undefined || testee.port === port) && testee.nodeId === nodeId
  return Array.isArray(ep.connection) ? ep.connection.findIndex(comp) >= 0 : comp(ep.connection)
}

export const filterIfArray = <T>(input: T | T[], predicate: (t: T) => boolean): T => {
  if (input instanceof Array) return input.find(predicate)
  else return input
}
