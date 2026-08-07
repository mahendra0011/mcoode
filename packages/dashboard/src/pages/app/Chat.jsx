import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SOCKET } from '@mcode/shared';
import {
  setMode, setWorkspaces, setWorkspace, setHasKeys, setFileTree,
  setActiveFile,
  setError as setChatError
} from '../../store/slices/chatSlice.js';
import {
  connectSocket, startChat, sendChatMessage, interruptChat, getSocket
} from '../../socket/socket.js';
import { listWorkspaces, listKeys, listFiles, readFile } from '../../api/chatApi.js';
import { pushToast } from '../../store/slices/toastSlice.js';
import { ChatTopBar } from '../../components/chat/ChatTopBar.jsx';
import { MessageList } from '../../components/chat/MessageList.jsx';
import { FileTreeSidebar } from '../../components/chat/FileTreeSidebar.jsx';
import { EditorPanel } from '../../components/chat/EditorPanel.jsx';
import { ToolStrip } from '../../components/chat/ToolStrip.jsx';
import { PermissionModal } from '../../components/chat/PermissionModal.jsx';
import { WorkspaceModal } from '../../components/chat/WorkspaceModal.jsx';

export function ChatPage() {
  const dispatch = useDispatch();
  const { mode, isReady, hasKeys, isGenerating, workspace, workspaces, fileTree, activeFile, error } =
    useSelector((s) => s.chat);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const pendingPermission = useSelector((s) => s.chat.pendingPermission);

  // Bootstrap: connect socket, load keys/workspaces
  useEffect(() => {
    const bootstrap = async () => {
      // Ensure socket is connected
      const sock = connectSocket();
      if (!sock) {
        dispatch(setChatError('not authenticated'));
        return;
      }

      // Check API keys
      try {
        const { keys } = await listKeys();
        dispatch(setHasKeys(keys.length > 0));
      } catch {
        dispatch(setHasKeys(false));
      }

      // Load workspaces
      try {
        const { workspaces: wss } = await listWorkspaces();
        dispatch(setWorkspaces(wss));
        if (wss.length === 0) {
          setShowWorkspaceModal(true);
        } else if (!workspace) {
          dispatch(setWorkspace(wss[0]));
        }
      } catch {
        dispatch(setWorkspaces([]));
      }

      // Start chat session
      if (!isReady) {
        startChat({ workspaceId: workspace?._id });
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When workspace changes, restart chat session
  const startChatForWorkspace = useCallback(() => {
    if (!getSocket()) connectSocket();
    startChat({ workspaceId: workspace?._id });
  }, [workspace]);

  // Load file tree when workspace is set
  useEffect(() => {
    if (!workspace?._id) return;
    const loadTree = async () => {
      try {
        const { files } = await listFiles(workspace._id);
        dispatch(setFileTree(files));
      } catch (err) {
        dispatch(pushToast({ kind: 'err', text: `failed to load file tree: ${err.message}` }));
      }
    };
    loadTree();
  }, [workspace?._id, dispatch]);

  // Handle workspace selection
  const handleWorkspaceSelect = async (ws) => {
    dispatch(setWorkspace(ws));
    startChatForWorkspace();
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  // Handle send
  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;
    const prompt = inputText.trim();
    setInputText('');
    sendChatMessage({ prompt, mode });
  };

  // Handle interrupt
  const handleInterrupt = () => {
    interruptChat();
  };

  // Handle file click in tree
  const handleFileClick = async (file) => {
    try {
      const { content } = await readFile(workspace._id, file.path);
      dispatch(setActiveFile({ path: file.path, name: file.name, content }));
    } catch (err) {
      dispatch(pushToast({ kind: 'err', text: `failed to read file: ${err.message}` }));
    }
  };

  // Permission answer
  const handlePermissionAnswer = (answer) => {
    if (pendingPermission) {
      getSocket()?.emit(SOCKET.CLIENT_TO_SERVER.CHAT_PERMISSION_ANSWER, {
        requestId: pendingPermission.requestId,
        answer
      });
    }
  };

  const isAgent = mode === 'agent';

  return (
    <div className="flex flex-col h-screen bg-mcode-bg text-gray-200 font-mono">
      {/* Top bar with toggle, model, workspace */}
      <ChatTopBar
        mode={mode}
        setMode={(m) => dispatch(setMode(m))}
        workspace={workspace}
        workspaces={workspaces}
        onSelectWorkspace={handleWorkspaceSelect}
        onOpenWorkspaceModal={() => setShowWorkspaceModal(true)}
        hasKeys={hasKeys}
      />

      {/* Red warning when no keys */}
      {!hasKeys && (
        <div className="bg-mcode-red/15 border-b border-mcode-red/30 px-4 py-2">
          <span className="font-mono text-sm text-mcode-red">
            ⚠ please select your api keys to use mcode
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Agent mode: file tree on the left */}
        {isAgent && (
          <FileTreeSidebar
            files={fileTree}
            activeFile={activeFile}
            onFileClick={handleFileClick}
          />
        )}

        {/* Main message area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isAgent && activeFile ? (
            <>
              <div className="flex-1 overflow-hidden">
                <MessageList mode={mode} isGenerating={isGenerating} maxHeight={300} />
              </div>
              <div className="h-1 border-t border-mcode-border" />
              <div className="flex-1 overflow-hidden">
                <EditorPanel activeFile={activeFile} onClose={() => dispatch(setActiveFile(null))} />
              </div>
            </>
          ) : (
            <MessageList mode={mode} isGenerating={isGenerating} />
          )}

          {/* Input area */}
          <div className="border-t border-mcode-border bg-mcode-panel p-3">
            {!hasKeys && (
              <div className="mb-2 text-xs text-mcode-red">
                No API keys configured — click the model button to add keys
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  hasKeys
                    ? (isAgent ? 'Ask mcode agent (or type /help for commands)...' : 'Ask mcode...')
                    : 'Add API keys first to start chatting...'
                }
                disabled={!hasKeys || isGenerating}
                rows={3}
                className="flex-1 resize-none rounded-lg border border-mcode-border bg-mcode-bg px-3 py-2 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-mcode-green disabled:opacity-50"
              />
              {isGenerating ? (
                <button
                  onClick={handleInterrupt}
                  className="px-4 py-2 rounded-lg border border-mcode-red text-mcode-red hover:bg-mcode-red/10 font-mono text-sm"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!hasKeys || !inputText.trim()}
                  className="px-4 py-2 rounded-lg bg-mcode-green text-black font-mono text-sm font-semibold hover:bg-mcode-greenBright disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Agent mode: right sidebar tool strip */}
        {isAgent && <ToolStrip />}
      </div>

      {/* Modals */}
      <PermissionModal
        pendingPermission={pendingPermission}
        onAnswer={handlePermissionAnswer}
      />
      <WorkspaceModal
        open={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
      />
    </div>
  );
}
