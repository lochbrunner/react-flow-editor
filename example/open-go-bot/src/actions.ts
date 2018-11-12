import {createAction} from 'redux-actions';

import * as Actions from './constants';

export const loadAction = createAction<{}>(Actions.LOAD_DATA);
export const clearAction = createAction<{}>(Actions.CLEAR_DATA);
export const addAction = createAction<{}>(Actions.ADD_DATA);
export const removeAction = createAction<{}>(Actions.REMOVE_DATA);
export const changeAction = createAction<{}>(Actions.CHANGE_DATA);