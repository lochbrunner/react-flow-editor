import * as React from 'react';


export interface Size {
    width: number,
    height: number
}

export type BaseCommons = {
    name: string;
    id: string;
};

export type BaseInput = BaseCommons & {};

export type BaseOutput = BaseCommons & {};

export interface Node {
    id: string;
    payload: any;
    inputs: BaseInput[];
    outputs: BaseOutput[];
    size: Size;
}

export interface Config {

}

export interface Props {
    resolver: (payload: any) => JSX.Element;
    graph: Node[];
}


export interface State {

}


export class Editor<T> extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    render() {

        const { props } = this;

        const nodes = props.graph.map(node =>
            <div key={node.id} className="node">
                {props.resolver(node.payload)}
            </div>);

        return (
            <div className="editor">
                {nodes}
            </div>
        );
    }
}