import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [] // { id, kind: 'ok'|'warn'|'err'|'info', text, ts }
};

const toastSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    pushToast(state, action) {
      const { kind = 'info', text } = action.payload;
      state.items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, text, ts: Date.now() });
      if (state.items.length > 8) state.items = state.items.slice(-8);
    },
    dismissToast(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    }
  }
});

export const { pushToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;
