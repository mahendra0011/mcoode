import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  agents: [], // { sessionId, todoId, model, domain, status, step, total, message, startedAt }
  plans: {}
};

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    planGenerated(state, action) {
      const { sessionId, todos } = action.payload;
      state.plans[sessionId] = todos || [];
    },
    agentStarted(state, action) {
      const { sessionId, todoId, model, domain } = action.payload;
      state.agents = state.agents.filter((a) => a.todoId !== todoId);
      state.agents.push({
        sessionId,
        todoId,
        model,
        domain,
        status: 'running',
        step: 0,
        total: 0,
        message: 'starting...',
        startedAt: Date.now()
      });
    },
    agentStep(state, action) {
      const { todoId, step, total, message } = action.payload;
      const agent = state.agents.find((a) => a.todoId === todoId);
      if (agent) {
        agent.step = step;
        agent.total = total;
        agent.message = message;
      }
    },
    agentDone(state, action) {
      const { todoId, result } = action.payload;
      const agent = state.agents.find((a) => a.todoId === todoId);
      if (agent) {
        agent.status = 'done';
        agent.message = result?.summary || 'done';
      }
    },
    agentFailed(state, action) {
      const { todoId, error } = action.payload;
      const agent = state.agents.find((a) => a.todoId === todoId);
      if (agent) {
        agent.status = 'failed';
        agent.message = error || 'failed';
      }
    },
    agentNeedsReview(state, action) {
      const { todoId, reason } = action.payload;
      const agent = state.agents.find((a) => a.todoId === todoId);
      if (agent) {
        agent.status = 'needs_review';
        agent.message = reason || 'needs review';
      }
    },
    removeAgent(state, action) {
      state.agents = state.agents.filter((a) => a.todoId !== action.payload);
    }
  }
});

export const {
  planGenerated,
  agentStarted,
  agentStep,
  agentDone,
  agentFailed,
  agentNeedsReview,
  removeAgent
} = agentsSlice.actions;
export default agentsSlice.reducer;
