"use client";
import React, { useState } from 'react';
import {
  Wrench, Search, Copy, Check, Terminal, ExternalLink,
  Shield, Code2, Database, FolderTree, GitBranch, RefreshCw,
  Cpu, Sparkles, Layers, Box, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

interface ToolItem {
  id: string;
  name: string;
  category: 'fs' | 'exec' | 'git' | 'vault' | 'mcp' | 'agent';
  desc: string;
  args: string;
  example: string;
}

const TOOLS_CATALOG: ToolItem[] = [
  { id: 'view_file', name: 'view_file', category: 'fs', desc: 'Inspect file contents with 1-indexed lines and byte offset support.', args: '{ AbsolutePath: string, StartLine?: number, EndLine?: number }', example: 'mcode tool exec view_file --args \'{"AbsolutePath":"/src/main.js"}\'' },
  { id: 'replace_file_content', name: 'replace_file_content', category: 'fs', desc: 'Precisely patch contiguous line ranges with exact string matching.', args: '{ TargetFile: string, TargetContent: string, ReplacementContent: string }', example: 'mcode tool exec replace_file_content --args \'{"TargetFile":"/src/app.ts",...}\'' },
  { id: 'multi_replace', name: 'multi_replace_file_content', category: 'fs', desc: 'Perform multiple atomic non-contiguous edits across a file in a single transaction.', args: '{ TargetFile: string, ReplacementChunks: Array }', example: 'mcode tool exec multi_replace_file_content --args \'{...}\'' },
  { id: 'write_to_file', name: 'write_to_file', category: 'fs', desc: 'Create new files or overwrite existing files with automatic parent directory creation.', args: '{ TargetFile: string, CodeContent: string, Overwrite: boolean }', example: 'mcode tool exec write_to_file --args \'{"TargetFile":"/models/user.ts",...}\'' },
  { id: 'list_dir', name: 'list_dir', category: 'fs', desc: 'List files and directories with size, child count, and type metadata.', args: '{ DirectoryPath: string }', example: 'mcode tool exec list_dir --args \'{"DirectoryPath":"./packages"}\'' },
  { id: 'grep_search', name: 'grep_search', category: 'fs', desc: 'Fast ripgrep pattern matching across project files with glob filter inclusions.', args: '{ Query: string, SearchPath: string, Includes?: string[] }', example: 'mcode tool exec grep_search --args \'{"Query":"useAuth","SearchPath":"src"}\'' },
  { id: 'run_command', name: 'run_command', category: 'exec', desc: 'Execute system shell commands with stdout/stderr capture and async background daemons.', args: '{ CommandLine: string, Cwd: string, IsDaemon?: boolean }', example: 'mcode tool exec run_command --args \'{"CommandLine":"npm test"}\'' },
  { id: 'manage_task', name: 'manage_task', category: 'exec', desc: 'Inspect, kill, or stream input into running background CLI daemon tasks.', args: '{ Action: "status" | "kill" | "send_input", TaskId: string }', example: 'mcode tool exec manage_task --args \'{"Action":"status","TaskId":"task-1"}\'' },
  { id: 'git_status', name: 'git_diff_summary', category: 'git', desc: 'Inspect current uncommitted changes, staged files, and branch status.', args: '{ Staged?: boolean }', example: 'mcode tool exec git_diff_summary' },
  { id: 'git_checkpoint', name: 'checkpoint_save', category: 'git', desc: 'Create an encrypted rollback transaction checkpoint before risky edits.', args: '{ Message: string }', example: 'mcode tool exec checkpoint_save --args \'{"Message":"pre-auth"}\'' },
  { id: 'git_rewind', name: 'checkpoint_rollback', category: 'git', desc: 'Revert all files in workspace back to specified checkpoint hash.', args: '{ CheckpointId: string }', example: 'mcode tool exec checkpoint_rollback --args \'{"CheckpointId":"cp_8f1"}\'' },
  { id: 'vault_get', name: 'vault_retrieve_secret', category: 'vault', desc: 'Decrypt and securely inject an API credential without exposing plain text.', args: '{ SecretKey: string }', example: 'mcode tool exec vault_retrieve_secret --args \'{"SecretKey":"OPENAI_API_KEY"}\'' },
  { id: 'mcp_gateway', name: 'call_mcp_tool', category: 'mcp', desc: 'Forward an execution call to any connected Model Context Protocol server.', args: '{ ServerName: string, ToolName: string, Arguments: object }', example: 'mcode tool exec call_mcp_tool --args \'{"ServerName":"postgres","ToolName":"query"}\'' },
  { id: 'mcp_list_res', name: 'list_mcp_resources', category: 'mcp', desc: 'Browse available live resources from an MCP server (e.g. database schemas, logs).', args: '{ ServerName: string }', example: 'mcode tool exec list_mcp_resources --args \'{"ServerName":"github"}\'' },
  { id: 'agent_dispatch', name: 'dispatch_subagent', category: 'agent', desc: 'Spawn an autonomous child subagent with isolated context and bounded turns.', args: '{ TaskName: string, TaskPrompt: string, MaxTurns: number }', example: 'mcode tool exec dispatch_subagent --args \'{"TaskName":"test-fixer",...}\'' },
  { id: 'schedule_timer', name: 'schedule_timer', category: 'agent', desc: 'Set one-shot timer or recurring cron schedule to wake up background tasks.', args: '{ DurationSeconds?: number, CronExpression?: string, Prompt: string }', example: 'mcode tool exec schedule_timer --args \'{"DurationSeconds":60,...}\'' },
];

export function ToolsPage() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied CLI invocation command');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = TOOLS_CATALOG.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || t.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-amber-200/40 via-emerald-100/35 to-indigo-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-amber-800 text-xs font-bold uppercase tracking-wider mb-6">
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>Model Context Protocol & 46+ Built-in Tools</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Developer Tools &{' '}
            <span className="bg-gradient-to-r from-amber-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              MCP Gateway
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Explore the complete tool directory powering autonomous mcode subagents. Inspect JSON schemas, invoke tools directly from CLI, and connect external MCP servers.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl px-4 py-3 shadow-md mb-8">
            <Search className="w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search 46+ tools by name, description, or args..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none w-full font-mono"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {[
              { id: 'all', label: 'All Tools (46)' },
              { id: 'fs', label: 'Filesystem & AST' },
              { id: 'exec', label: 'Shell & Tasks' },
              { id: 'git', label: 'Git & Rollback' },
              { id: 'vault', label: 'Vault & Secrets' },
              { id: 'mcp', label: 'MCP Gateway' },
              { id: 'agent', label: 'Autonomous Agents' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCat === cat.id ? 'bg-amber-500 text-black shadow-sm font-extrabold' : 'bg-white border border-neutral-200 text-neutral-700 hover:text-black hover:bg-neutral-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ─────────────────── TOOLS GRID ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left max-w-6xl mx-auto mb-20">
            {filtered.map((tool) => (
              <div
                key={tool.id}
                className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm hover:shadow-lg hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-base font-bold text-amber-700">{tool.name}</span>
                    <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed mb-4">{tool.desc}</p>

                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 font-mono text-[11px] text-neutral-600 mb-4 overflow-x-auto">
                    <span className="text-neutral-400 font-bold">Params: </span>
                    <span className="text-neutral-800">{tool.args}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-emerald-700 font-medium truncate max-w-[80%]">$ {tool.example}</span>
                  <button
                    onClick={() => copy(tool.id, tool.example)}
                    className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer shrink-0"
                    title="Copy invocation"
                  >
                    {copiedId === tool.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── MCP INTEGRATION GUIDE ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 mb-2">Connecting Custom MCP Servers</h2>
            <p className="text-neutral-600 text-xs sm:text-sm">
              mcode natively speaks the Model Context Protocol. Add any MCP server to <code className="text-amber-700 font-bold">~/.mcode/config.json</code>:
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0d14] border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed shadow-xl">
            <p className="text-neutral-500">&#123;</p>
            <p className="pl-4 text-neutral-400">"mcpServers": &#123;</p>
            <p className="pl-8 text-neutral-300">"postgres": &#123;</p>
            <p className="pl-12 text-cyan-300">"command": "npx",</p>
            <p className="pl-12 text-cyan-300">"args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]</p>
            <p className="pl-8 text-neutral-300">&#125;,</p>
            <p className="pl-8 text-neutral-300">"github": &#123;</p>
            <p className="pl-12 text-cyan-300">"command": "npx",</p>
            <p className="pl-12 text-cyan-300">"args": ["-y", "@modelcontextprotocol/server-github"]</p>
            <p className="pl-8 text-neutral-300">&#125;</p>
            <p className="pl-4 text-neutral-400">&#125;</p>
            <p className="text-neutral-500">&#125;</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
