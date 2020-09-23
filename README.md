[![npm version](https://badge.fury.io/js/react-flow-editor.svg)](https://badge.fury.io/js/react-flow-editor)
[![Downloads](https://img.shields.io/npm/dt/react-flow-editor.svg)](https://www.npmjs.com/package/react-flow-editor)
[![GitHub issues](https://img.shields.io/github/issues/lochbrunner/react-flow-editor.svg)](https://github.com/lochbrunner/react-flow-editor/issues)
![David](https://img.shields.io/david/lochbrunner/react-flow-editor.svg)
![David](https://img.shields.io/david/dev/lochbrunner/react-flow-editor.svg)
![lib](https://github.com/lochbrunner/react-flow-editor/workflows/lib/badge.svg)
![examples](https://github.com/lochbrunner/react-flow-editor/workflows/examples/badge.svg)

# Graph editor

An ui library for creating flow based editors with react and typescript/javascript.

![Screen Video](./docs/screen.gif)

Try the [demo](https://lochbrunner.github.io/react-flow-editor/simple) in your browser.

If you are interested in *redux* dive into the [example](./example/redux/) or try the more advanced [demo](https://lochbrunner.github.io/react-flow-editor/redux/index.html).

## Getting started

```typescript
import * as ReactDOM from 'react-dom';
import { Editor, Node, Config} from 'react-flow-editor';

// Create the initial graph
const nodes: Node[] = [
    {
        id: 'Node 1',
        name: 'First Node',
        payload: { h1: 'hello' },
        inputs: [{
            connection: [], name: 'input 1'
        }],
        outputs: []
}];

// Renders the body of each node
function resolver(data: any): JSX.Element {
    if (data.type === '') return <h2 />;
    return (
        <p>{data.payload.h1}</p>
    );
}

const config: Config = {
    resolver,
    connectionType: 'bezier',
    grid: true,
    demoMode: true,
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
    connectionValidator?: (output: { nodeId: string, port: number }, input: { nodeId: string, port: number }) => boolean;
    onChanged?: (node: ChangeAction) => void;
    connectionType?: 'bezier' | 'linear';
    grid?: boolean | { size: number };
    connectionAnchorsLength?: number;
    direction?: 'ew' | 'we';
    demoMode?: boolean;
}
```

| Property                  | Description                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolver`                | A function returning a React component which gets placed into the node                                                                       |
| `connectionValidator`     | A function which evaluates if a possible connection might be valid or not                                                                    |
| `onChanged`               | A callback which gets called when the flow graph changed                                                                                     |
| `connectionType`          | The geometry type of the connection lines between the nodes                                                                                  |
| `grid`                    | Specifies if the grid should be rendered or not (Default is `true`). Optional specifies distances between the lines (`size`). Default is 18. |
| `connectionAnchorsLength` | Specifies the langth of the anker when using `bezier` as `connectionType`.                                                                   |
| `direction`               | Specifies the orientation of the input and output ports. Default is `we`.                                                                    |
| `demoMode`                | If this set to true, the Editor takes care of updating the nodes in the props. Be carful using this in production.                           |

### Nodes

A node is specified by the following interface

```typescript
export interface Node {
  name: string;
  type: string;
  id: string;
  inputs: InputPort[];
  outputs: OutputPort[];
  payload?: any;
  position?: Vector2d;
  properties?: {display: 'stacked' | 'only-dots'};
  classNames?: string[];
  style: Style;
}
```

For now `InputPort` and `OutputPort` are identically to the `Port` interface:

```typescript
export interface Port {
  name: string;
  connection?: Connection|Connection[];
  payload?: any;
  renderer?: (connection: Port) => JSX.Element;
}
```

```typescript
export interface Connection {
  nodeId: string;
  port: number;
  classNames?: string[];
  notes?: string;
}
```

### Themes

By default we recommend to import the default theme with

```sass
@import "react-flow-editor/dist/default-theme.scss";
```

But you can change the style of all components by coping that file and adjust its values.

### Postcss support

When using postcss generated class names just forward them with

```ts
import * as style from './style.scss';

// ...

const config: Config = {
    resolver,
    connectionType: 'bezier',
    grid: true,
    demoMode: true,
    direction: 'we',
    style
};
// ...
```

See [Example](./example/postcss).

## Roadmap

* Editing the title of the node
* Grouping nodes (similar to *Blender*)
* Optimize hooking
* Fix zooming and scrolling

## Contributing

This library is very young. So please consider that it might have some bugs, but I will try to fix them, when they get reported.

If you have any problems or miss an important feature:

**Feel free to create a PR or report an issue!**