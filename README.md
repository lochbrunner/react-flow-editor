[![npm version](https://badge.fury.io/js/react-flow-editor.svg)](https://badge.fury.io/js/react-flow-editor)
[![Downloads](https://img.shields.io/npm/dt/react-flow-editor.svg)](https://www.npmjs.com/package/react-flow-editor)
[![GitHub issues](https://img.shields.io/github/issues/lochbrunner/react-flow-editor.svg)](https://github.com/lochbrunner/react-flow-editor/issues)

# Graph editor

An ui library for creating flow based editors with react and typescript/javascript.

![Screen Video](./docs/screen.gif)

Try the [demo](https://lochbrunner.github.io/react-flow-editor/simple) in your browser.

## Getting started

```typescript
import * as ReactDOM from 'react-dom';
import { Editor, Node, Config} from 'react-flow-editor';

// Create the initial graph
const nodes: Node[] = [
    {
        id: 'Node 1',
        payload: { h1: 'hello' },
        inputs: [{
            connection: [], name: 'input 1'
        }],
        outputs: []
}];

// Renders the body of each node
function resolver(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <p>{payload}</p>
    );
}

const config: Config = {
    resolver,
    connectionType: 'bezier',
    showGrid: true
};

ReactDOM.render(
    <div>
        <Editor config={config} nodes={nodes} />
    </div>,
    document.getElementById('root')
);

```

See [example](./example/) for usage.

## Side effects

* Before creating new nodes, the node under the cursor is a direct child of `document.body`.
* In order to decouple editor and menu components they use `window.onStartCreatingNewNode` to communicate.

## API

### Configuration

The config interface looks as follow

```typescript
export interface Config {
    resolver: (payload: any) => JSX.Element;
    connectionValidator?: (output: { nodeId: string, connectionId: number }, input: { nodeId: string, connectionId: number }) => boolean;
    onChanged?: (node: ChangeAction) => void;
    connectionType?: 'bezier' | 'linear';
    showGrid?: boolean;
}
```

Property | Description
--- | ---
resolver | A function returning a React component which gets placed into the node
connectionValidator | A function which evaluates if a possible connection might be valid or not
onChanged | A callback which gets called when the flow graph changed
connectionType | The geometry type of the connection lines between the nodes
showGrid | Specifies if the grid should be rendered or not (Default is `false`)

### Themes

By default we recommend to import the default theme with

```sass
@import "react-flow-editor/dist/default-theme.scss";
```

But you can change the style of all components by coping that file and adjust its values.

## Contributing

This library is very young. So please consider that it might have some bugs, but I will try to fix them, when they get reported.

If you have any problems or miss an important feature:

**Feel free to create a PR or report an issue!**