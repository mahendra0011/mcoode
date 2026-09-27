# mcode Web Dashboard

The browser-based IDE and control center for **mcode**, built with Next.js 16, React 19, Monaco Editor, XTerm.js, Redux Toolkit, and Socket.IO.

## Features

- **AI Code Editor**: Multi-tab Monaco editor with syntax highlighting, autocomplete, and inline diffing.
- **Agent Chat & Turn Machine**: Real-time streaming AI conversation with live tool-call cards, subagent dispatch, and undo capability.
- **File Explorer**: Virtualized file tree (`react-arborist`) with drag-and-drop archive uploading and off-main-thread zipping.
- **Integrated Terminal**: Full-featured PTY terminal via `@xterm/xterm` with ANSI colors and fit addon.
- **Provider & Model Settings**: Configure API keys, local models (Ollama/LM Studio), routing rules, and CLI governance.
- **Watch & Live Monitor**: Real-time event monitoring of background watch daemon fixes and agent execution waves.

## Running Locally

Run from the monorepo root:

```bash
# Start backend server
npm run dev:backend

# Start web dashboard (port 3000)
npm run dev:web
```

Or run directly inside this workspace:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend server URL (default: `http://localhost:4000` or `http://localhost:3100`)
- `PORT`: Web dev server port (default: `3000`)
