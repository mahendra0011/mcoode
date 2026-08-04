import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  current: null,
  list: [],
  active: {}
};

const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setSessions(state, action) {
      state.list = action.payload;
    },
    setCurrentSession(state, action) {
      state.current = action.payload;
    },
    markSessionActive(state, action) {
      state.active[action.payload] = true;
    },
    markSessionInactive(state, action) {
      state.active[action.payload] = false;
    }
  }
});

export const { setSessions, setCurrentSession, markSessionActive, markSessionInactive } = sessionSlice.actions;
export default sessionSlice.reducer;
