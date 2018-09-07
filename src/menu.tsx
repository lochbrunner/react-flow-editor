import * as React from 'react';
import { Vector2d } from './geometry';
import { BUTTON_LEFT } from './constants';
import { Node } from './types';


export namespace MenuItem {

    export interface Props {
        nodeType: string;
        name: string;

        factory: () => Node;
    }
}

interface State {

}

export class MenuItem extends React.Component<MenuItem.Props, State> {

    private boundingRect?: DOMRect;
    private offset?: Vector2d;

    constructor(props: MenuItem.Props) {
        super(props);
    }

    private onStartCreatingNewNode(e: React.MouseEvent) {
        if (e.button === BUTTON_LEFT) {
            const { props } = this;
            const pos = this.offset;
            const offset = Vector2d.subtract({ x: e.clientX, y: e.clientY }, pos);
            if ((window as any).onStartCreatingNewNode)
                (window as any).onStartCreatingNewNode(props.nodeType, props.factory, pos, offset);
            else console.warn('window.onStartCreatingNewNode does not exist!');
        }
    }

    private onMenuItemUpdate(element: Element) {
        if (element === null) return;
        const rect = element.getBoundingClientRect() as DOMRect;

        if (this.boundingRect === undefined ||
            this.boundingRect.x !== rect.x ||
            this.boundingRect.y !== rect.y) {
            this.boundingRect = rect;
            const bodyRect = document.body.getBoundingClientRect();
            this.offset = { x: rect.left - bodyRect.left, y: rect.top - bodyRect.top };
            this.setState(state => state);
        }
    }

    render() {
        return (
            <div ref={this.onMenuItemUpdate.bind(this)}
                className="react-flow-editor-menu-item"
                onMouseDown={this.onStartCreatingNewNode.bind(this)} >
                <span>{this.props.name}</span>
            </div>
        );
    }
}