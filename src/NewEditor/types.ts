import { NodeState } from "../adjust"
import { IEndpoint } from "../Endpoint"
import { Vector2d } from "../geometry"
import { Size } from "../types"

export enum ItemType {
  node = "node",
  connection = "connection"
}

export interface WorkItemConnection {
  type: ItemType.connection
  input: Vector2d
  output: Vector2d
}

export type WorkItem = WorkItemConnection

export type EditorState = {
  nodesState: Map<string, NodeState>
  connectionState: Map<string, Vector2d>
  selection?: { type: ItemType; id: string }
  workingItem?: WorkItem
  transformation: { dx: number; dy: number; zoom: number }
  componentSize: Size
}

export type CurrentAction =
  | {
      lastPos: Vector2d
      id: string
      type: "node"
    }
  | { lastPos: Vector2d; endpoint: IEndpoint; type: "connection" }
  | { lastPos: Vector2d; type: "translate" }
