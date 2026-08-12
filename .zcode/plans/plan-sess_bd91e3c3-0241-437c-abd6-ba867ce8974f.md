## Fix plan: Make chat streaming very fast (delta-based + debouncing)

**Problem:** `chat-agent.js:509` emits `stripActions(text)` (entire accumulated response) on every chunk → O(n²) bandwidth + O(n²) regex CPU. Each WebSocket frame grows larger, causing visible slowdown.

**Solution — 4 edits across 4 files:**

### 1. `packages/cli/src/core/chat-agent.js` (line 509) — emit delta not full text
```diff
- this.bus?.emit(EVENTS.MESSAGE, { kind: 'stream', text: stripActions(text) || '\u2026' });
+ this.bus?.emit(EVENTS.MESSAGE, { kind: 'stream', text: chunk });
```
`text` variable still accumulates locally for action extraction & final `chatDone` payload (which already contains the stripped narration).

### 2. `packages/web/src/store/chatSlice.js` — `streamUpdate` (line 96) — append deltas
```diff
- lastMessage.text = text;
+ lastMessage.text = (lastMessage.text || '') + text;
```

### 3. `packages/web/src/hooks/useChatSocket.js` — add 16ms render debounce (lines 137-141)
Buffer multiple rapid chunk arrivals, then flush a single batched `streamUpdate` dispatch — cuts React re-renders ~5-10x:
```js
const streamBufferRef = useRef('');
const streamTimerRef = useRef(null);
const onChatStream = (payload) => {
  if (payload && payload.text) {
    streamBufferRef.current += payload.text;
    if (!streamTimerRef.current) {
      streamTimerRef.current = setTimeout(() => {
        dispatch(streamUpdate(streamBufferRef.current));
        streamBufferRef.current = '';
        streamTimerRef.current = null;
      }, 16);
    }
  }
};
```

### 4. `packages/cli/src/ui/App.jsx` (lines 348-366) — match delta protocol
Change `streamBuffer.current = m.text` (replace) → accumulate: `streamBuffer.current = (streamBuffer.current || '') + m.text`. Change `flushStream` to append delta instead of replacing. Accumulate `thoughtRef.current` similarly.

### Result
- Bandwidth: O(n²) → O(n) (each chunk sends ~10-20 new chars)
- CPU: no per-chunk regex — `stripActions` runs once at end via chatDone
- Frontend: ~5-10x fewer React re-renders via 16ms batching
- `chatDone` final payload already provides clean stripped text for correctness