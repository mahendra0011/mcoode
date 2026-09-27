/**
 * State ownership boundary (DEBT-008): Redux Toolkit owns the chat/session
 * domain (chatSlice + ModelSelector), Zustand owns UI chrome
 * (settingsStore, ideStore). Don't add a third system; keep chat state in
 * Redux and visual/persisted UI prefs in Zustand.
 */
import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
