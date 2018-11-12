/// <reference types="react" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';

import { configureStore } from './store';
import * as Actions from './actions';

require('./open-go-bot.scss');

import { Editor, Node, Config, MenuItem } from 'react-flow-editor';
import { RootState } from './reducers';
import { bindActionCreators } from 'redux';

function resolver(payload: any): JSX.Element {
    if (payload.type === '') return <h2 />;
    return (
        <div style={{ height: '200px', width: '200px' }}>{payload.h1}</div>
    );
}

const config: Config = {
    resolver,
    connectionType: 'bezier',
    // onChanged,
    grid: false,
    direction: 'we',
    connectionAnchorsLength: 40
};

const store = configureStore();

interface Props {
    actions: typeof Actions;
    state: RootState;
}

const render = (props: Props) =>
    <div>
        <Editor config={config} nodes={props.state.nodes} />
        <div className="menu">
            <button type="button" onClick={props.actions.loadAction} >Load</button>
            <button type="button" onClick={props.actions.clearAction} >Clear</button>
            <button type="button" onClick={props.actions.addAction} >Add</button>
            <button type="button" onClick={props.actions.changeAction} >Change</button>
            <button type="button" onClick={props.actions.removeAction} >Remove</button>
        </div>
    </div>;

const mapStateToProps = (state: RootState): Partial<Props> => ({
    state
});

const mapDispatchToProps = (dispatch): Partial<Props> => ({
    actions: bindActionCreators(Actions, dispatch),
});

const Container = connect(
    mapStateToProps,
    mapDispatchToProps
)(render);

ReactDOM.render(
    <Provider store={store}>
        <Container />
    </Provider>,
    document.getElementById('root')
);