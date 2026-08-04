import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice.js';
import agentsReducer from './slices/agentsSlice.js';
import watchReducer from './slices/watchSlice.js';
import toastReducer from './slices/toastSlice.js';

export const store = configureStore({
  reducer: {
    sessions: sessionReducer,
    agents: agentsReducer,
    watch: watchReducer,
    toasts: toastReducer
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false })
});
