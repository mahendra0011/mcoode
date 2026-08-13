# ZCode Tools & Dependencies — From Actual App Source

> ✅ Extracted from `ZCode/resources/app-extracted/node_modules/` — actual installed packages in the ZCode Electron app.

---

## Core Frameworks & Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.x | UI rendering engine |
| `framer-motion` | 11.x | Animation library (primary) |
| `react-redux` | 9.x | State management |
| `redux` | 4.x | Redux store |
| `redux-thunk` | 3.x | Async Redux middleware |
| `zustand` | 5.x | Alternative lightweight state |
| `tailwindcss` | 4.2.2 | CSS framework |
| `@radix-ui` | latest | Headless UI primitives |
| `radix-ui` | latest | Headless UI primitives |

---

## UI Components & Styling

| Package | Purpose |
|---------|---------|
| `lucide-react` | Icon library (all icons used) |
| `tailwind-merge` | Tailwind class deduplication |
| `tailwind-scrollbar-hide` | Custom scrollbar hiding |
| `tw-animate-css` | Tailwind animation utilities |
| `class-variance-authority` | Component variant management |
| `clsx` | Conditional classnames |
| `motion` / `motion-dom` / `motion-utils` | Framer Motion internals |
| `shdncn` | ShadCN UI components (modified) |

---

## Code Editing & Display

| Package | Purpose |
|---------|---------|
| `lexical` | Rich text editor (Chat input formatting) |
| `react-resizable-panels` | Split-view pane resizing |
| `react-remove-scroll` | Scroll lock when modals open |
| `react-style-singleton` | CSS-in-JS style injection |
| `@xterm/xterm` | Terminal component |
| `highlight.js` | Syntax highlighting |
| `shiki` | Text-based syntax highlighting |
| `katex` | Math/LaTeX rendering |
| `mermaid` | Diagram generation |
| `echarts` | Chart visualization |
| `recharts` | React charting library |
| `zrender` | Canvas rendering for charts |

---

## Markdown & Content

| Package | Purpose |
|---------|---------|
| `remark-parse` | Markdown parser |
| `remark-rehype` | Markdown → HTML |
| `rehype-katex` | Math rendering |
| `rehype-raw` | Raw HTML in markdown |
| `rehype-sanitize` | XSS sanitization |
| `rehype-stringify` | HTML stringification |
| `remark-gfm` | GitHub Flavored Markdown |
| `remark-math` | Math in markdown |
| `mdast-util-*` | Markdown AST utilities |
| `hast-util-*` | HTML AST utilities |

---

## Terminal & Shell

| Package | Purpose |
|---------|---------|
| `node-pty` | Pseudo-terminal for shells |
| `xterm` | Terminal frontend |
| `ansi-to-react` | ANSI escape code parsing |
| `anser` | ANSI rendering |
| `cli-spinners` | Spinner animations |
| `cli-cursor` | Cursor utilities |

---

## File Operations & Git

| Package | Purpose |
|---------|---------|
| `fs-extra` | Enhanced file system |
| `node-fetch` | HTTP fetching |
| `axios` | HTTP client |
| `form-data` | FormData handling |

---

## Authentication & Security

| Package | Purpose |
|---------|---------|
| `jose` | JWT handling |
| `pkce-challenge` | OAuth PKCE |
| `bcrypt-pbkdf` | Password hashing |
| `cookie-signature` | Cookie signing |

---

## Visualization & Media

| Package | Purpose |
|---------|---------|
| `pdfjs-dist` | PDF rendering |
| `react-pdf` | React PDF component |
| `docx-preview` | DOCX preview |
| `qrcode` | QR code generation |
| `jszip` | ZIP file handling |
| `fflate` | Compression |
| `pngjs` | PNG manipulation |
| `utif` | TIFF/Flate support |
| `yazl` | ZIP creation |

---

## Remote & Connection

| Package | Purpose |
|---------|---------|
| `ws` | WebSocket (primary) |
| `socket.io-client` | Socket.IO |
| `xhr2` | XMLHttpRequest polyfill |
| `follow-redirects` | HTTP redirect following |
| `https-proxy-agent` | HTTPS proxy |
| `http-errors` | HTTP error utilities |
| `sshto` / `ssh2` | SSH connections |
| `is-docker` | Docker detection |

---

## Data Processing & Utilities

| Package | Purpose |
|---------|---------|
| `d3-*` | Data visualization toolkit |
| `lodash.*` | Utility functions |
| `fuzzysort` | Fuzzy search |
| `escape-html` | HTML escaping |
| `json5` | JSON5 parsing |
| `yaml` | YAML parsing |
| `csv-parse` | CSV parsing |

---

## AI & Agent Tools

| Package | Purpose |
|---------|---------|
| `ai` | AI SDK for LLM integration |
| `json-schema-typed` | Schema validation |
| `zod` | TypeScript validation |
| `zod-to-json-schema` | Schema conversion |

---

## Animation Libraries Used Together

ZCode uses a multi-layer animation approach:

1. **Framer Motion** — Primary animation library
   - Message appearing: `initial={{ opacity: 0, y: 6 }} → animate={{ opacity: 1, y: 0 }}`
   - Stagger children: `0.04s` delay per item
   - Hover effects: `whileHover={{ scale: 1.02 }}`
   - Tap effects: `whileTap={{ scale: 0.92 }}`

2. **CSS Animations** — For streaming and loading
   - `zcode-stream-text-in` — 900ms fade-in for stream chunks
   - `zcode-stream-marker-in` — 900ms marker animation
   - `zcode-collapsible-up` — 300ms collapse
   - `zcode-update-charge-sweep` — 1.15s infinite loop

3. **Tailwind Animations** — Utility classes
   - `animate-spin` — Loading spinner
   - `animate-pulse` — Loading placeholders
   - `animate-ping` — Notification pings

4. **Custom easing functions** (verified in CSS):
   - `cubic-bezier(0.16, 1, 0.3, 1)` — Apple-style "easeOut" (primary)
   - `cubic-bezier(0.4, 0, 0.2, 1)` — Standard easing
   - `cubic-bezier(0.65, 0, 0.35, 1)` — Update sweep animation
   - `spring(stiffness: 500, damping: 20)` — Pop-in effects
