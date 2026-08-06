// Stub for react-devtools-core — the CLI never connects to React DevTools.
// @opentui/react internally imports this module and calls initialize() /
// connectToDevTools(); the stub provides no-op implementations so the bundle
// stays lean and DevTools is never actually connected.
export default {
  initialize() {},
  connectToDevTools() {}
};
export function connectToDevTools() {}
