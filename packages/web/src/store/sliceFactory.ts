import { produce } from 'immer';

/** Action object produced by the local slice factory (same shape as RTK —
 *  payload stays `any` exactly as before, so no consumer types change). */
export interface SliceAction {
  type: string;
  payload?: any;
}

type CaseReducer<State> = (state: State, action: SliceAction) => void;

interface SliceOptions<State, Reducers extends Record<string, CaseReducer<State>>> {
  name: string;
  initialState: State;
  reducers: Reducers;
}

type ActionCreators<Reducers> = {
  [K in keyof Reducers]: (payload?: any) => SliceAction;
};

/**
 * DEBT-008: minimal `createSlice` replacement backed by `immer` directly.
 * The chat slice keeps its exact reducer logic; only the Redux Toolkit
 * dependency is gone (the store itself now lives in zustand — see index.ts).
 */
export function createSlice<State, Reducers extends Record<string, CaseReducer<State>>>({
  name,
  initialState,
  reducers,
}: SliceOptions<State, Reducers>) {
  const actions = {} as ActionCreators<Reducers>;
  for (const key of Object.keys(reducers) as (keyof Reducers)[]) {
    (actions as Record<string, (payload?: any) => SliceAction>)[key as string] = (
      payload?: any
    ) => ({ type: `${name}/${String(key)}`, payload });
  }
  const reducer = (state: State = initialState, action: SliceAction): State => {
    const prefix = `${name}/`;
    if (action && typeof action.type === 'string' && action.type.startsWith(prefix)) {
      const key = action.type.slice(prefix.length);
      const fn = (reducers as Record<string, CaseReducer<State>>)[key];
      if (fn) {
        return produce(state, (draft: State) => {
          fn(draft, action);
        });
      }
    }
    return state;
  };
  return { name, reducer, actions };
}
