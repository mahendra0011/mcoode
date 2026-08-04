import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projects: {},
  activity: []
};

const watchSlice = createSlice({
  name: 'watch',
  initialState,
  reducers: {
    watchStatus(state, action) {
      const { projectId, status } = action.payload;
      if (!projectId) return;
      state.projects[projectId] = { ...(state.projects[projectId] || {}), status };
    },
    watchScan(state, action) {
      const { projectId, filesScanned } = action.payload;
      state.projects[projectId] = {
        ...(state.projects[projectId] || {}),
        scansRun: (state.projects[projectId]?.scansRun || 0) + 1,
        filesScanned
      };
    },
    watchFix(state, action) {
      const { projectId, file, outcome, detail } = action.payload;
      state.projects[projectId] = {
        ...(state.projects[projectId] || {}),
        fixesApplied: (state.projects[projectId]?.fixesApplied || 0) + (outcome === 'auto-fixed' ? 1 : 0)
      };
      state.activity.unshift({ id: `${Date.now()}-${Math.random()}`, projectId, file, outcome, detail, timestamp: new Date().toISOString() });
      state.activity = state.activity.slice(0, 100);
    },
    setProjectState(state, action) {
      const { projectId, data } = action.payload;
      state.projects[projectId] = { ...(state.projects[projectId] || {}), ...data };
    }
  }
});

export const { watchStatus, watchScan, watchFix, setProjectState } = watchSlice.actions;
export default watchSlice.reducer;
