export enum ConnectionType {
  input = "input",
  output = "output"
}

export interface IEndpoint {
  nodeId: string
  port: number
  kind: ConnectionType
  additionalClassName?: string[]
  notes?: string
  name?: string
}

export class Endpoint implements IEndpoint {
  nodeId: string
  port: number
  kind: ConnectionType
  name?: string
  additionalClassName?: string[]

  static computeId(nodeId: IEndpoint["nodeId"], connectionId: IEndpoint["port"], kind: IEndpoint["kind"]) {
    return `${nodeId}_${connectionId}_${kind}`
  }

  static computeIdIn(conn: IEndpoint) {
    return `${conn.nodeId}_${conn.port}_${conn.kind}`
  }

  static extractEndpointInfo(id: string): IEndpoint {
    const regex = /(.+)_(\d+)_(input|output)/g
    const match = regex.exec(id)
    if (match === null) throw Error(`Illegal id string ${id}`)
    return { nodeId: match[1], port: parseInt(match[2]), kind: match[3] as any }
  }
}
