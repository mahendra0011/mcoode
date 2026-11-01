/**
 * ChatPanel — the "AI Assistance" right-hand pane of the AI Code Editor tab.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * This JSX used to live inline inside `AIChatPage.tsx` (the "AI Chat Right Pane"
 * ResizablePanel). It is extracted verbatim so the panel can be rendered on its
 * own — the VS Code extension's webview renders exactly this component, with no
 * IDE layout, file tree, terminal or Monaco pane around it.
 *
 * WHAT DID NOT CHANGE
 * -------------------
 * Nothing. Every className, animation, condition and callback below is a
 * copy of what `AIChatPage` rendered before, and `AIChatPage` now renders
 * `<ChatPanel {...} />` with the same values it had in scope. The panel still:
 *
 *   • reads chat state from the same Zustand store (`useAppSelector`),
 *   • issues socket commands through the same `useChatSocket` callbacks,
 *   • toggles IDE layout via the same `useIDEStore` actions,
 *   • renders inside the same `ResizablePanel` in the IDE layout.
 *
 * The `ResizablePanel` / `ResizablePanelHandle` wrappers are deliberately NOT
 * extracted: they belong to the parent's `ResizablePanelGroup`, and moving
 * them would couple this component to `react-resizable-panels`.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, UploadCloud, ChevronDown, GitBranch, Paperclip,
  MessageSquare, Scissors, Slash, Square, Send,
} from 'lucide-react';

import { useAppDispatch } from '../../store';
import { useIDEStore } from '../../store/ideStore';
import {
  setMode, setGodMode, promptEnhancementResolved, clarifyAnswered,
  testModeSelectorClosed, auditDismissed,
} from '../../store/chatSlice';
import { getSocket } from '../../hooks/useChatSocket';
import { useI18n } from '../../lib/i18n';

import { ModelSelector } from '../ide/ModelSelector';
import { OutputLengthSelector } from './OutputLengthSelector';
import { SparkleButton } from '../ide/SparkleButton';
import { WaveProgress } from '../ide/WaveProgress';
import { ClarifyCard } from '../ide/ClarifyCard';
import { RoleAssignmentTable } from '../ide/RoleAssignmentTable';
import { CodebaseReadingCard } from '../ide/CodebaseReadingCard';
import { ComparisonTable } from '../ide/ComparisonTable';
import { PlaywrightAuditPanel } from '../ide/PlaywrightAuditPanel';
import { BugcheckReport } from '../ide/BugcheckReport';
import { SecurityChecklistCard } from '../ide/SecurityChecklistCard';
import { ReviewFindingsCard } from '../ide/ReviewFindingsCard';
import { AuditScorecard } from '../ide/AuditScorecard';
import { TestModeSelector } from '../ide/TestModeSelector';
import { AutonomousTestPanel } from '../ide/AutonomousTestPanel';
import { PermissionModal } from '../ide/PermissionModal';
import { TodoCard } from '../ide/TodoCard';
import { GodModeToggle } from './mcodeUX';
import { ThinkingIndicator } from './ThinkingIndicator';
import { AgentActionSequence } from './AgentActionSequence';
import { ReactionBurst } from './ReactionBurst';
import { VirtualChatMessages } from './VirtualChatMessages';
import { SlashCommandPicker } from './SlashCommandPicker';
import { ModeSelector } from './ModeSelector';

/**
 * Local copy of AIChatPage's `StreamInterruptedNotice` (kept private to the
 * page today). Duplicated rather than imported so the extracted panel stays
 * self-contained and no new export is added to AIChatPage.
 */
function StreamInterruptedNotice({ connectionState }: { connectionState: 'connected' | 'disconnected' | 'reconnecting' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="stream-interrupted-notice"
      className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-[12px] leading-relaxed text-amber-200/90"
    >
      <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
      <span>
        <strong className="font-medium text-amber-200">Lost the connection mid-turn.</strong>{' '}
        {connectionState === 'reconnecting'
          ? 'Reconnecting automatically — the run may still be in progress on the machine.'
          : 'The backend is unreachable, so progress cannot be shown. The run may still be in progress; start the backend with `mcode serve` and it will report back.'}
      </span>
    </div>
  );
}

/**
 * Every value below was already in `AIChatPage`'s scope at the extraction
 * site. They are passed in rather than re-derived so this component is a pure
 * presentation extraction: it adds no new state and no new socket or store
 * subscriptions beyond the ones the panel already performed in place.
 */
export interface ChatPanelProps {
  /** Chat slice fields rendered by the panel. */
  messages: any[];
  isStreaming: boolean;
  mode: string;
  godMode: boolean;
  plan: unknown;
  enhancedPrompt: any;
  clarifyQuestions: any;
  codebaseReading: any;
  roleAssignments: any;
  waves: any;
  subagents: any;
  buildSummary: any;
  projectTier: any;
  concurrency: any;
  comparisonRows: any;
  verificationPass: any;
  securityAudit: any;
  migration: any;
  playwrightAudit: any;
  bugcheck: any;
  securityCheckup: any;
  reviewFindings: any;
  audit: any;
  testMode: any;
  permissionRequest: any;

  /** `useChatSocket` callbacks. */
  connectionState: 'connected' | 'disconnected' | 'reconnecting';
  send: (text: string) => void;
  interrupt: () => void;
  answerPermission: (requestId: string, answer: string) => void;
  undo: (msg: any) => void;
  fixSelectedSecurity: (ids: string[]) => void;
  runTestMode: (types?: any, targetUrl?: any) => void;
  runReview: (mode?: string) => void;
  runAudit: (opts?: { pdf?: boolean }) => void;
  runCleanMode: () => void;

  /** Composer state + submit handlers. */
  prompt: string;
  setPrompt: (v: string) => void;
  handleSubmit: (e: React.SyntheticEvent) => void;
  handleChatKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, submitFn: (e: React.SyntheticEvent) => void) => void;
  commandPickerRef: React.RefObject<HTMLDivElement | null>;

  /** Slash-command picker state. */
  showCommandPicker: boolean;
  setShowCommandPicker: (v: boolean) => void;
  selectedCmdIndex: number;
  setSelectedCmdIndex: React.Dispatch<React.SetStateAction<number>>;
  activeTab: string;

  /** Workspace / chrome actions that open modals owned by the page. */
  activeWorkspaceId: string | null;
  workspaces: any[];
  activeBranch: string;
  isUploading: boolean;
  setIsModalsOpen: (v: boolean) => void;
  setShowBranchDropdown: (v: boolean) => void;

  /** Derived display state computed in the page. */
  isCleanScanning: boolean;
  showThinkingIndicator: boolean;
  activeToolLabel: string | undefined;
  showReactionBurst: boolean;
  streamInterrupted: boolean;
}

export function ChatPanel(props: ChatPanelProps) {
  const {
    messages, isStreaming, mode, godMode, plan,
    enhancedPrompt, clarifyQuestions, codebaseReading, roleAssignments,
    waves, subagents, buildSummary, projectTier, concurrency,
    comparisonRows, verificationPass, securityAudit, migration,
    playwrightAudit, bugcheck, securityCheckup, reviewFindings, audit,
    testMode, permissionRequest,
    connectionState, send, interrupt, answerPermission, undo,
    fixSelectedSecurity, runTestMode, runReview, runAudit, runCleanMode,
    prompt, setPrompt, handleSubmit, handleChatKeyDown, commandPickerRef,
    showCommandPicker, setShowCommandPicker, selectedCmdIndex, setSelectedCmdIndex,
    activeTab, activeWorkspaceId, workspaces, activeBranch, isUploading,
    setIsModalsOpen, setShowBranchDropdown,
    isCleanScanning, showThinkingIndicator, activeToolLabel, showReactionBurst, streamInterrupted,
  } = props;

  const dispatch = useAppDispatch();
  const { t } = useI18n();

  return (
    <div className="dark h-full border-l border-white/[0.06] bg-[#0c0c0e] text-[#f4f4f5] flex flex-col relative z-20 w-full min-w-[280px] overflow-hidden">
      {/* Header */}
      <div className="p-2.5 px-3.5 flex items-center justify-between border-b border-white/[0.06] bg-[#121215]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-[12.5px] font-semibold text-white tracking-wide">AI Assistance</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle pill: Chat vs Agent vs Explain */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => dispatch(setMode('chat'))}
              className={`px-2 py-0.5 rounded-md transition font-medium cursor-pointer ${mode === 'chat' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => dispatch(setMode('agent'))}
              className={`px-2 py-0.5 rounded-md transition font-semibold cursor-pointer ${mode === 'agent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/40 hover:text-white'}`}
            >
              Agent
            </button>
            <button
              type="button"
              onClick={() => dispatch(setMode('explain'))}
              className={`px-2 py-0.5 rounded-md transition font-semibold cursor-pointer ${mode === 'explain' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/40 hover:text-white'}`}
            >
              Explain
            </button>
          </div>
          <button
            type="button"
            onClick={() => useIDEStore.getState().setSecondarySideBarVisible(false)}
            className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition cursor-pointer"
            title={t('ide.closePanel')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-3 overflow-y-auto custom-scrollbar">
        {/* Rich Empty State when there are no messages */}
        {messages.length === 0 && !enhancedPrompt?.pending && !clarifyQuestions?.length && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center select-none my-auto">
            <div className="relative group mb-3">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 blur-md opacity-60"></div>
              <div className="relative w-11 h-11 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-[13px] font-semibold text-white tracking-tight mb-1">
              AI Code Assistant
            </h3>
            <p className="text-[11.5px] text-white/40 max-w-[240px] leading-relaxed mb-4">
              Ask questions, generate components, or run agentic tasks on your workspace.
            </p>
            <div className="w-full max-w-[260px] flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setPrompt('Explain the current file structure and code architecture')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 text-[11px] text-white/70 hover:text-white transition flex items-center gap-2 group cursor-pointer"
              >
                <span className="text-emerald-400 font-mono text-[10px]">✦</span>
                <span className="truncate">Explain file architecture</span>
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Find potential bugs, edge cases, and performance bottlenecks in this workspace')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 text-[11px] text-white/70 hover:text-white transition flex items-center gap-2 group cursor-pointer"
              >
                <span className="text-blue-400 font-mono text-[10px]">⚡</span>
                <span className="truncate">Scan for bugs & issues</span>
              </button>
              <button
                type="button"
                onClick={() => setPrompt('Write comprehensive unit tests with edge case coverage')}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 text-[11px] text-white/70 hover:text-white transition flex items-center gap-2 group cursor-pointer"
              >
                <span className="text-purple-400 font-mono text-[10px]">🧪</span>
                <span className="truncate">Write unit tests</span>
              </button>
            </div>
          </div>
        )}

        {enhancedPrompt?.pending && (
          <ThinkingIndicator label="expanding your prompt..." size="sm" />
        )}
        {enhancedPrompt && !enhancedPrompt.pending && !enhancedPrompt.accepted && enhancedPrompt.enhanced && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 p-4">
            <div className="text-xs text-white/50 mb-2">Your prompt looks short — expanded it:</div>
            <div className="text-sm text-white/80 bg-black/30 rounded-lg p-3">{enhancedPrompt.enhanced}</div>
            <div className="flex gap-2 mt-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { dispatch(promptEnhancementResolved(true)); send(enhancedPrompt.enhanced); }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium">
                Use expanded version
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { dispatch(promptEnhancementResolved(false)); send(enhancedPrompt.original); }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium">
                Keep original
              </motion.button>
            </div>
          </motion.div>
        )}
        {clarifyQuestions && clarifyQuestions.map((q: any) => (
          <ClarifyCard key={q.question} question={q} onAnswer={(question: string, answer: string) => {
            dispatch(clarifyAnswered({ question, answer }));
            const socket = getSocket();
            if (socket && socket.connected) {
              socket.emit('clarify:answer', { question, answer });
            }
          }} />
        ))}
        <CodebaseReadingCard state={codebaseReading} />
        <RoleAssignmentTable assignments={roleAssignments} />
        {Boolean(plan && (plan as any).todos && (plan as any).todos.length > 0) && (
          <TodoCard plan={plan as any} defaultCollapsed={messages.length > 0} />
        )}
        {godMode && (
          <div className="mb-2">
            <WaveProgress
              waves={waves as any}
              subagents={subagents as any}
              buildSummary={buildSummary}
              godMode={godMode}
              projectTier={projectTier}
              concurrency={concurrency}
            />
          </div>
        )}
        {comparisonRows && comparisonRows.length > 0 && (
          <ComparisonTable rows={comparisonRows} pass={verificationPass} maxPasses={8} title={t('ide.verification')} />
        )}
        {securityAudit && securityAudit.rows && securityAudit.rows.length > 0 && (
          <ComparisonTable rows={securityAudit.rows} pass={securityAudit.pass} maxPasses={5} title={t('ide.securityAudit')} />
        )}
        {migration && migration.equivalenceRows && migration.equivalenceRows.length > 0 && (
          <ComparisonTable rows={migration.equivalenceRows} pass={migration.pass} maxPasses={migration.maxPasses || 5} title={t('ide.equivalence')} />
        )}
        {playwrightAudit && (
          <PlaywrightAuditPanel
            active={playwrightAudit.active}
            pass={playwrightAudit.pass ?? 1}
            maxPasses={5}
            issues={playwrightAudit.issues ?? []}
            clean={playwrightAudit.clean ?? false}
          />
        )}
        {bugcheck && (bugcheck.running || bugcheck.deepFindings?.length > 0 || bugcheck.tierStatus?.some((t: any) => t.done)) && (
          <BugcheckReport
            findings={bugcheck.deepFindings}
            reportUrl={bugcheck.reportUrl || undefined}
            running={bugcheck.running}
            tierStatus={bugcheck.tierStatus}
          />
        )}
        {securityCheckup && (securityCheckup.running || securityCheckup.findings?.length > 0) && (
          <SecurityChecklistCard
            findings={securityCheckup.findings}
            onFixSelected={(ids: string[]) => fixSelectedSecurity(ids)}
          />
        )}
        {reviewFindings && reviewFindings.length > 0 && (
          <ReviewFindingsCard findings={reviewFindings} />
        )}
        {audit && (audit.running || (audit.grades && Object.keys(audit.grades).length > 0)) && (
          <AuditScorecard
            grades={audit.grades || {}}
            overallGrade={audit.overallGrade || 'A'}
            results={audit.results}
            onDownloadPDF={() => {
              if (audit.pdfUrl) {
                window.open(audit.pdfUrl, '_blank');
              } else {
                runAudit({ pdf: true });
              }
            }}
            onDismiss={() => dispatch(auditDismissed())}
          />
        )}
        {testMode.selecting && (
          <TestModeSelector
            onStart={(types: any, targetUrl: any) => {
              dispatch(testModeSelectorClosed());
              runTestMode(types, targetUrl);
            }}
            onCancel={() => dispatch(testModeSelectorClosed())}
          />
        )}
        {(testMode.running || (testMode.features?.length ?? 0) > 0 || !!testMode.summary) && (
          <AutonomousTestPanel
            active
            inventoryCount={testMode.inventoryCount}
            features={testMode.features}
            traditional={testMode.traditional}
            summary={testMode.summary}
            reportUrl={testMode.reportUrl}
            targetUrl={testMode.targetUrl}
          />
        )}
        <PermissionModal request={permissionRequest as any} onAnswer={answerPermission} />
        <VirtualChatMessages
          messages={messages}
          isStreaming={isStreaming}
          size="sm"
          isNormalChat={mode === 'chat'}
          undo={undo as any}
          onResubmitPrompt={send}
        />
        {streamInterrupted && (
          <StreamInterruptedNotice connectionState={connectionState} />
        )}
        {showThinkingIndicator && (
          <motion.div
            key="thinking-indicator-ide"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-start gap-2.5"
          >
            <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center text-xs">
              M
            </div>
            <div className="flex-1 min-w-0">
              <AgentActionSequence key="agent-action-sequence-2" mode={mode} statusLabel={activeToolLabel} />
            </div>
          </motion.div>
        )}
        <ReactionBurst key="ide-reaction-burst" emoji="✓" show={showReactionBurst} />
      </div>

      {/* Inline Chat Input */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0e0e11]/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative rounded-xl bg-[#141416] border border-white/[0.08] focus-within:border-emerald-500/40 p-2 flex flex-col gap-1.5 transition-all shadow-xl" ref={commandPickerRef}>
            {/* Top Action Bar (Upload & Git Branch) */}
            {/* Top Toolbar: Workspace / Branch & Mode Selector */}
            <div className="flex items-center justify-between gap-1 px-1 pb-1 flex-wrap min-w-0">
              <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                <motion.button 
                  type="button" 
                  onClick={() => setIsModalsOpen(true)} 
                  disabled={isUploading} 
                  suppressHydrationWarning 
                  className="flex items-center gap-1 text-[10.5px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded-md border border-purple-500/20 transition disabled:opacity-50 cursor-pointer flex-shrink-0" 
                  title={activeWorkspaceId ? "Project Options" : "Upload Folder, File, or ZIP"}
                >
                  {isUploading ? <Loader2 className="w-2.5 h-2.5 animate-spin text-purple-400" /> : <UploadCloud className="w-2.5 h-2.5 text-purple-400"/>}
                  <span className="truncate max-w-[55px] sm:max-w-[75px]" suppressHydrationWarning>{activeWorkspaceId ? (workspaces.find((w: any) => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload'}</span>
                  <ChevronDown className="w-2 h-2 opacity-50"/>
                </motion.button>
                <motion.button 
                  type="button" 
                  onClick={() => setShowBranchDropdown(true)} 
                  className="branch-dropdown flex items-center gap-1 text-[10.5px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded-md border border-blue-500/20 transition cursor-pointer flex-shrink-0" 
                  title={t('ide.gitBranch')}
                >
                  <GitBranch className="w-2.5 h-2.5 text-blue-400"/>
                  <span className="truncate max-w-[35px] sm:max-w-[50px]">{activeBranch}</span>
                  <ChevronDown className="w-2 h-2 opacity-50"/>
                </motion.button>
              </div>
              <div className="flex-shrink-0 ml-auto">
                <ModeSelector
                  mode={mode}
                  onModeChange={(m) => dispatch(setMode(m))}
                  godMode={godMode}
                  onGodModeChange={(g) => dispatch(setGodMode(g))}
                  size="xs"
                  compact
                />
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => {
                const val = e.target.value;
                setPrompt(val);
                if (val.startsWith('/')) setShowCommandPicker(true);
                else if (!val.includes('/')) setShowCommandPicker(false);
              }}
              placeholder={t('chat.askAgent')}
              rows={2}
              className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-1.5 py-1 min-h-[38px] text-[12.5px] leading-relaxed custom-scrollbar"
              onKeyDown={(e) => handleChatKeyDown(e, handleSubmit)}
            />

            {/* Slash Command Picker */}
            <AnimatePresence>
              {showCommandPicker && prompt.startsWith('/') && (
                <SlashCommandPicker
                  activeTab={activeTab}
                  prompt={prompt}
                  selectedCmdIndex={selectedCmdIndex}
                  setSelectedCmdIndex={setSelectedCmdIndex}
                  onSelectCommand={(cmd: string) => setPrompt('/' + cmd + ' ')}
                  onClose={() => setShowCommandPicker(false)}
                />
              )}
            </AnimatePresence>

            {/* Bottom Toolbar - Clean, Non-overflowing Layout */}
            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] gap-1 w-full min-w-0">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink min-w-0 overflow-x-auto no-scrollbar">
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  type="button" 
                  onClick={() => setIsModalsOpen(true)} 
                  disabled={isUploading} 
                  className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition border border-white/[0.06] disabled:opacity-50 flex-shrink-0" 
                  title={t('ide.uploadProject')}
                >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <Paperclip className="w-3 h-3" />}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  type="button" 
                  onClick={() => { setPrompt('/'); setShowCommandPicker(true); setSelectedCmdIndex(0); }} 
                  className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition border border-white/[0.06] flex-shrink-0" 
                  title={t('ide.cmdPalette')}
                >
                  <Slash className="w-3 h-3" />
                </motion.button>
                <SparkleButton prompt={prompt} setPrompt={setPrompt} />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => runReview('diff')}
                  className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-white/[0.04] hover:bg-blue-500/15 flex items-center justify-center text-white/50 hover:text-blue-300 transition border border-white/[0.06] cursor-pointer flex-shrink-0"
                  title={t('ide.reviewChanges')}
                >
                  <MessageSquare className="w-3 h-3 text-blue-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => runCleanMode()}
                  className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-white/[0.04] hover:bg-amber-500/15 flex items-center justify-center text-white/50 hover:text-amber-300 transition border border-white/[0.06] cursor-pointer flex-shrink-0"
                  title={t('ide.cleanMode')}
                >
                  {isCleanScanning ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> : <Scissors className="w-3 h-3 text-amber-400" />}
                </motion.button>
              </div>

              {/* Right: Output Length, Model Selector & Send Button */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
                <OutputLengthSelector compact />
                <ModelSelector compact />
                <AnimatePresence mode="wait">
                  {isStreaming ? (
                    <motion.button
                      key="stop-btn"
                      type="button"
                      onClick={interrupt}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center text-red-400 transition flex-shrink-0"
                      title="Stop streaming"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="send-btn"
                      type="submit"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none flex-shrink-0 shadow-sm"
                      disabled={!prompt.trim() || isStreaming}
                      title={t('ide.sendMessage')}
                    >
                      <Send className="w-3.5 h-3.5 fill-current" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
