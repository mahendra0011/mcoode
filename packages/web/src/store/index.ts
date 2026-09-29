/**
 * State ownership (DEBT-008 — resolved): zustand is the single client-state
 * library. Chat/session state lives here, driven by the reducer in
 * chatSlice.ts; UI chrome lives in settingsStore/ideStore. react-redux and
 * @reduxjs/toolkit were removed.
 *
 * `useAppDispatch` / `useAppSelector` keep their exact Redux-era API so all
 * existing consumers work unchanged: selectors receive `{ chat }` and
 * dispatch accepts the action objects from chatSlice.
 */
import { create } from 'zustand';
import chatReducer, { initialState } from './chatSlice';
import type { ChatState } from './chatSlice';
import type { SliceAction } from './sliceFactory';

export type RootState = { chat: ChatState };
export type AppDispatch = (action: SliceAction) => void;

interface ChatStore extends ChatState {
  dispatch: AppDispatch;
}

export const useChatStore = create<ChatStore>()((set) => ({
  ...initialState,
  dispatch: (action: SliceAction) =>
    set((s) => {
      const next = chatReducer(s as ChatState, action);
      return { ...next, dispatch: s.dispatch };
    }),
}));

export const useAppDispatch = (): AppDispatch => useChatStore((s) => s.dispatch);

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useChatStore((s) => selector({ chat: s as ChatState }));
}
