import { Node as NodeType, Size } from "../types"
import { Rect, Vector2d } from "../geometry"
import { NodeState } from "../adjust"
import { ConnectionType, Endpoint } from "../Endpoint"

export const initialState = (nodes: NodeType[]) => {
  const nodesState = new Map<string, NodeState>()
  const connectionState = new Map<string, Vector2d>()
  const margin = { x: 100, y: 100 }
  const usedPlace: Rect[] = []
  for (let node of nodes) {
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
