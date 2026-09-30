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
    <div className="h-full border-l border-white/5 bg-[#0e0e0e] flex flex-col relative z-20 w-full min-w-[280px] overflow-hidden">
    <div className="p-3 px-4 flex items-center justify-between border-b border-white/5 bg-[#121212]/50">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">AI Assistance</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Mode toggle pill: Chat vs Agent */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => dispatch(setMode('chat'))}
            className={`px-2 py-0.5 rounded-md transition font-medium ${mode === 'chat' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => dispatch(setMode('agent'))}
            className={`px-2 py-0.5 rounded-md transition font-medium ${mode === 'agent' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-white/40 hover:text-white'}`}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => dispatch(setMode('explain'))}
            className={`px-2 py-0.5 rounded-md transition font-medium ${mode === 'explain' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-white/40 hover:text-white'}`}
          >
            Explain
          </button>
        </div>
        <button
          type="button"
          onClick={() => useIDEStore.getState().setSecondarySideBarVisible(false)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
          title={t('ide.closePanel')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
<div className="flex-1 flex flex-col min-h-0 p-4">
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
        <TodoCard plan={plan as any} />
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
      <div className="p-4 border-t border-white/5 bg-[#0c0c0c]">
        <form onSubmit={handleSubmit} className="w-full relative rounded-[20px] group">
          <div className="absolute -inset-[1.5px] rounded-[21px] overflow-hidden z-0">
            <div className="absolute inset-[-150%] mcode-input-glow-reversed opacity-50 group-focus-within:opacity-100 transition-opacity duration-500"></div>
          </div>
          <div className="absolute inset-[0px] bg-[#121212] rounded-[20px] z-0"></div>
          <div className="relative z-10 rounded-[20px] p-2 flex flex-col gap-2" ref={commandPickerRef}>
            {/* Top Action Bar (Upload & Git Branch) */}
            <div className="flex items-center gap-3 px-1 pb-1">
              <motion.button type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} suppressHydrationWarning className="flex items-center gap-1.5 text-[13px] font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-500/20 transition disabled:opacity-50 cursor-pointer" title={activeWorkspaceId ? "Project Options" : "Upload Folder, File, or ZIP"}>
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <UploadCloud className="w-4 h-4 text-purple-400"/>}
                <span suppressHydrationWarning>{activeWorkspaceId ? (workspaces.find((w: any) => w._id === activeWorkspaceId)?.name || 'Project') : 'Upload Folder'}</span>
                <ChevronDown className="w-3 h-3 opacity-50"/>
              </motion.button>
              <motion.button type="button" onClick={() => setShowBranchDropdown(true)} className="branch-dropdown flex items-center gap-1.5 text-[13px] font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer" title={t('ide.gitBranch')}>
                <GitBranch className="w-4 h-4 text-blue-400"/>
                <span>{activeBranch}</span>
                <ChevronDown className="w-3 h-3 opacity-50"/>
              </motion.button>
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
              className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none px-2 py-1 min-h-[40px] text-sm"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setIsModalsOpen(true)} disabled={isUploading} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition backdrop-blur-md border border-white/10 disabled:opacity-50" title={t('ide.uploadProject')}>
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Paperclip className="w-3.5 h-3.5" />}
                </motion.button>
                <SparkleButton prompt={prompt} setPrompt={setPrompt} />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => runReview('diff')}
                  className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white transition backdrop-blur-md border border-white/10 cursor-pointer"
                  title={t('ide.reviewChanges')}
                >
                  <MessageSquare className="w-3 h-3 text-blue-400" /> Review Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => runCleanMode()}
                  className="h-7 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5 text-[11px] text-amber-300 transition backdrop-blur-md border border-amber-500/30 cursor-pointer"
                  title={t('ide.cleanMode')}
                >
                  {isCleanScanning ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> : <Scissors className="w-3 h-3 text-amber-400" />} Clean
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => { setPrompt('/'); setShowCommandPicker(true); setSelectedCmdIndex(0); }} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition backdrop-blur-md border border-white/10" title={t('ide.cmdPalette')}>
                  <Slash className="w-4 h-4" />
                </motion.button>
                {mode === 'agent' && (
                  <GodModeToggle value={godMode} onChange={(v: boolean) => dispatch(setGodMode(v))} size="xs" />
                )}
              </div>
<div className="flex items-center gap-2">
                <ModelSelector />
                <AnimatePresence mode="wait">
                  {isStreaming ? (
                    <motion.button
                      key="stop-btn"
                      type="button"
                      onClick={interrupt}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className="w-7 h-7 rounded-[8px] bg-[#303030] hover:bg-[#404040] flex items-center justify-center transition-all"
                    >
                      <Square className="w-3.5 h-3.5 text-[#d0d0d0] fill-current" />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="send-btn"
                      type="submit"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className="w-7 h-7 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition disabled:opacity-50"
                      disabled={!prompt.trim() || isStreaming}
                      title={t('ide.sendMessage')}
                    >
                      <Send className="w-3.5 h-3.5 ml-0.5" />
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
