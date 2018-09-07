# Graph editor

![Screenshot](./docs/screen.gif)

## Getting started

```typescript
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

Try the [demo](https://lochbrunner.github.io/react-flow-editor/simple/index.html) in your browser.

## Side effects

* Before creating new nodes, the node under the cursor is a direct child of `document.body`.
* In order to decouple editor and menu components they use `window.onStartCreatingNewNode` to communicate.