import * as React from 'react';
import { Vector2d } from './geometry';
import { BUTTON_LEFT } from './constants';
import { Node } from './types';

export namespace MenuItem {

    export interface Props {
        name: string;
        nodeName?: string;
        classNames?: string[];

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

    private onStartCreatingNewNode(e: React.MouseEvent<HTMLElement>) {
        if (e.button === BUTTON_LEFT) {
            const { props } = this;
            const pos = this.offset;
            const offset = Vector2d.subtract({ x: e.clientX, y: e.clientY }, pos);
            if ((window as any).onStartCreatingNewNode)
                (window as any).onStartCreatingNewNode(props.nodeName ? props.nodeName : props.name, props.factory, pos, offset, props.classNames);
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
            this.offset = { x: rect.left, y: rect.top };
            this.setState(state => state);
        }
    }

    render() {
        return (
            <div ref={this.onMenuItemUpdate.bind(this)}
                className={`react-flow-editor-menu-item ${this.props.classNames ? this.props.classNames.join(' ') : ''}`}
                onMouseDown={this.onStartCreatingNewNode.bind(this)} >
                <span>{this.props.name}</span>
            </div>
        );
    }
}