/// <reference types="react" />

import * as React from "react"
import * as ReactDOM from "react-dom"
import { Provider, connect } from "react-redux"

import { configureStore } from "./store"
import * as Actions from "./actions"
import "./redux.scss"

import { Editor, Node, Config, MenuItem } from "react-flow-editor"
import { RootState } from "./reducers"
import { bindActionCreators } from "redux"

function resolver(node: Node): JSX.Element {
  return <div style={{ height: "200px", width: "200px" }}></div>
}

const config: Config = {
  resolver,
  connectionType: "bezier",
  grid: false,
  direction: "we",
  connectionAnchorsLength: 40
}

const store = configureStore()

interface Props {
  actions: typeof Actions
  state: RootState
}

const factory = (type: "red" | "green" | "blue") => (): Node => ({
  name: `${type} node`,
  type,
  id: "",
  inputs: [{ connection: [], name: "input 1" }],
  outputs: [
    { connection: [], name: "output 1 " },
    { connection: [], name: "output 2" }
  ],
  properties: { display: "only-dots" },
  classNames: [type]
})

const View = (props: Props) => (
  <div>
    <Editor
      config={{ ...config, onChanged: props.actions.editorUpdatesAction }}
      nodes={props.state.nodes}
    />
    <div className="menu">
      <button type="button" onClick={props.actions.loadAction}>
        Load
      </button>
      <button type="button" onClick={props.actions.clearAction}>
        Clear
      </button>
      <button type="button" onClick={props.actions.addAction}>
        Add
      </button>
      <button type="button" onClick={props.actions.changeAction}>
        Change
      </button>
      <button type="button" onClick={props.actions.removeAction}>
        Remove
      </button>
    </div>
    <div className="flow-menu">
      <MenuItem classNames={["red"]} name="red node" factory={factory("red")} />
      <MenuItem classNames={["green"]} name="green node" factory={factory("green")} />
      <MenuItem classNames={["blue"]} name="blue node" factory={factory("blue")} />
    </div>
  </div>
)

const mapStateToProps = (state: RootState): Partial<Props> => ({
  state
})

const mapDispatchToProps = (dispatch): Partial<Props> => ({
  actions: bindActionCreators(Actions, dispatch)
})

const Container = connect(mapStateToProps, mapDispatchToProps)(View)

ReactDOM.render(
  <Provider store={store}>
    <Container />
  </Provider>,
  document.getElementById("root")
)
