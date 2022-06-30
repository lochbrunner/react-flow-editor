import { createStore, Store } from "redux"

import { reducer, RootState } from "./reducers"

export function configureStore(initialState?: RootState): Store<RootState> {
  const store = createStore(
    reducer,
    initialState,
    (window as any).devToolsExtension && (window as any).devToolsExtension()
  )

  return store
}
