import _ from "lodash"
import { useState } from "react"

import { Config } from "./../types"
import { Vector2d } from "../geometry"
import { EditorProps } from "../NewEditor"
import { initialState } from "../NewEditor/initialState"
import { EditorState } from "../NewEditor/types"
import { Node as NodeType } from "../types"

type UseEditorInput = {
  initialNodes: NodeType[]
  config: Config
}

type UseEditorOutput = {
  editorProps: EditorProps
  createNewNode: (newNode: NodeType, pos: Vector2d) => void
  setTransformation: (transformation: { dx: number; dy: number; zoom: number }) => void
}

export const useEditor = (props: UseEditorInput): UseEditorOutput => {
  const [state, setState] = useState<EditorState>(initialState(props.initialNodes))
  const [nodes, setNodes] = useState<NodeType[]>(props.initialNodes)
  const [editorBoundingRect, setEditorBoundingRect] = useState<DOMRect>(undefined)

  const createNewNode = (newNode: NodeType, pos: { x: number; y: number }) => {
    const createHash = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      const LENGTH = 6
      return _.times(LENGTH)
        .map(() => Math.floor(Math.random() * chars.length))
        .map((i) => chars.charAt(i))
        .reduce((p, c) => p + c, "")
    }

    const id = `${newNode.type}_${createHash()}`
    // const name = type;

    // Make deep (enough) copy
    // const inputs = factory.inputs.map(input => ({ ...input }));
    // const outputs = template.outputs.map(output => ({ ...output }));

    const { config } = props
    const updateProps = () => {
      setNodes([...nodes, { ...newNode, id }])
      setState((state) => {
        state.nodesState.set(id, { isCollapsed: false, pos, size: { x: 100, y: 100 } })
        return { ...state }
      })
    }
    if (config.onChanged !== undefined) {
      state.nodesState.set(id, { isCollapsed: false, pos, size: { x: 100, y: 100 } })
      config.onChanged({ type: "NodeCreated", node: { ...newNode, id } }, updateProps)
    }
    if (config.demoMode || config.onChanged === undefined) {
      updateProps()
    }
  }

  const onEditorUpdate = (element: Element) => {
    if (element === null) return
    const rect = element.getBoundingClientRect() as DOMRect

    if (editorBoundingRect === undefined || editorBoundingRect.x !== rect.x || editorBoundingRect.y !== rect.y) {
      setEditorBoundingRect(rect)
      setState((state) => state)
    }
  }

  const setTransformation = (transformation: { dx: number; dy: number; zoom: number }) =>
    setState({ ...state, transformation })

  return {
    editorProps: { state, setState, nodes, onEditorUpdate, editorBoundingRect, config: props.config },
    createNewNode,
    setTransformation
  }
}
