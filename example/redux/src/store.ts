import {createStore, Store} from 'redux';

import {reducer, RootState} from './reducers';

export function configureStore(initialState?: RootState): Store<RootState> {
  const store = createStore(
      reducer, initialState,
      (window as any).devToolsExtension && (window as any).devToolsExtension());

  if (module.hot) {
    module.hot.accept('./reducers', () => {
      store.replaceReducer(reducer);
    });
  }

  return store;
}
