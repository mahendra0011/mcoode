import { describe, it, expect, vi } from 'vitest';
import {
  WEB_SLASH_COMMANDS,
  SLASH_CATEGORIES,
  CODE_MODE_COMMANDS,
  getAvailableSlashCommands,
  getGroupedSlashCommands,
  handleSlashCommand,
  isSlashCommand
} from '../../web/src/lib/slashCommands.js';

describe('Slash Commands Parity & Execution (Doc 01–53)', () => {
  const ALL_CLI_COMMANDS = [
    'agent',
    'agents',
    'analytics',
    'audit',
    'bugcheck',
    'bugfix',
    'clear',
    'compliance',
    'connect',
    'context',
    'customize',
    'debug',
    'diff',
    'exit',
    'explain',
    'export',
    'god',
    'help',
    'history',
    'hooks',
    'init',
    'migrate',
    'mode',
    'model',
    'models',
    'pair',
    'plan',
    'quota',
    'record',
    'replay',
    'resume',
    'review',
    'rollback',
    'scheme',
    'security',
    'security-check',
    'stack',
    'test',
    'theme',
    'ui-mode',
    'undo',
    'watch',
    'workspaces'
  ];

  it('contains only curated, essential web commands in WEB_SLASH_COMMANDS without terminal bloat', () => {
    const commandNames = WEB_SLASH_COMMANDS.map((c) => c.cmd);
    const ESSENTIAL_WEB_COMMANDS = [
      'agent',
      'audit',
      'bugcheck',
      'clean',
      'clear',
      'connect',
      'context',
      'diff',
      'explain',
      'export',
      'god',
      'help',
      'migrate',
      'mode',
      'model',
      'pair',
      'plan',
      'resume',
      'review',
      'rollback',
      'security-check',
      'test',
      'undo',
      'watch'
    ];
    for (const expected of ESSENTIAL_WEB_COMMANDS) {
      expect(commandNames).toContain(expected);
    }
    // Ensures terminal clutter/redundancy is excluded from the Web picker
    const EXCLUDED_TERMINAL_COMMANDS = ['record', 'replay', 'exit', 'history', 'hooks', 'compliance', 'stack', 'workspaces'];
    for (const excluded of EXCLUDED_TERMINAL_COMMANDS) {
      expect(commandNames).not.toContain(excluded);
    }
    expect(WEB_SLASH_COMMANDS.length).toBe(24);
  });

  it('every slash command has cmd, desc, and icon', () => {
    for (const cmd of WEB_SLASH_COMMANDS) {
      expect(typeof cmd.cmd).toBe('string');
      expect(cmd.cmd.length).toBeGreaterThan(0);
      expect(typeof cmd.desc).toBe('string');
      expect(cmd.desc.length).toBeGreaterThan(0);
      expect(typeof cmd.icon).toBe('string');
      expect(cmd.icon.length).toBeGreaterThan(0);
    }
  });

  it('returns all curated web commands in AI Code Assistant tab', () => {
    const available = getAvailableSlashCommands('AI Code Assistant');
    expect(available.length).toBe(WEB_SLASH_COMMANDS.length);
    expect(available.length).toBe(24);
  });

  it('returns all curated web commands in AI Code Editor tab', () => {
    const available = getAvailableSlashCommands('AI Code Editor');
    expect(available.length).toBe(WEB_SLASH_COMMANDS.length);
    expect(available.length).toBe(24);
  });

  it('ensures no slash commands are shown or active in Chat tab', () => {
    const available = getAvailableSlashCommands('Chat');
    expect(available).toEqual([]);
    expect(available.length).toBe(0);
  });

  it('correctly identifies slash commands with isSlashCommand respecting activeTab', () => {
    expect(isSlashCommand('/god create an api', 'AI Code Assistant')).toBe(true);
    expect(isSlashCommand('/agents', 'AI Code Editor')).toBe(true);
    expect(isSlashCommand('  /help  ', 'AI Code Assistant')).toBe(true);
    // In Chat tab, slash commands are disabled
    expect(isSlashCommand('/help', 'Chat')).toBe(false);
    expect(isSlashCommand('/god', 'Chat')).toBe(false);
    expect(isSlashCommand('hello world')).toBe(false);
    expect(isSlashCommand('')).toBe(false);
    expect(isSlashCommand(null)).toBe(false);
  });

  it('does not intercept slash commands when in Chat tab', () => {
    const dispatch = vi.fn();
    const socket = { send: vi.fn(), undo: vi.fn() };
    const handled = handleSlashCommand('/help', dispatch, socket, { activeTab: 'Chat' });
    expect(handled).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('executes every single command in AI Code Assistant without throwing', () => {
    for (const cmdName of ALL_CLI_COMMANDS) {
      const dispatched = [];
      const dispatch = vi.fn((action) => dispatched.push(action));
      const socket = {
        send: vi.fn(),
        undo: vi.fn(),
        emit: vi.fn(),
      };
      const state = {
        activeTab: 'AI Code Assistant',
        messages: [
          { role: 'user', text: 'first command' },
          { role: 'assistant', text: 'first response' }
        ],
        subagents: [{ id: 'agent-1', domain: 'frontend', status: 'running', message: 'Building UI' }],
        plan: { summary: 'App plan', todos: [{ id: '1', title: 'Task 1', status: 'done', domain: 'db' }] },
        models: [{ id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' }],
        workspaces: [{ name: 'Project Alpha', _id: 'ws-1', source: 'git' }],
        chats: [{ title: 'Chat 1', summary: 'building rest api' }],
        toggleWatchMode: vi.fn(),
        runBugcheck: vi.fn(),
        runSecurityCheck: vi.fn(),
        runTestMode: vi.fn(),
        runReview: vi.fn(),
        runMigrate: vi.fn(),
        runAudit: vi.fn(),
        setGodMode: vi.fn(),
        clearMessages: vi.fn(),
        toggleDebug: vi.fn(),
        handleExport: vi.fn(),
        openSettings: vi.fn(),
        toggleZenMode: vi.fn(),
        togglePairMode: vi.fn(),
        send: vi.fn(),
      };

      const result = handleSlashCommand(`/${cmdName}`, dispatch, socket, state);
      expect(result, `Command /${cmdName} returned false`).toBe(true);
      expect(dispatch.mock.calls.length + (state.clearMessages.mock.calls.length ? 1 : 0), `Command /${cmdName} did not dispatch`).toBeGreaterThan(0);
    }
  });

  it('executes commands in AI Code Editor tab without throwing', () => {
    for (const cmdName of ['pair', 'diff', 'audit', 'test', 'explain', 'god', 'context', 'stack', 'ui-mode']) {
      const dispatch = vi.fn();
      const socket = { send: vi.fn(), undo: vi.fn(), emit: vi.fn() };
      const state = {
        activeTab: 'AI Code Editor',
        runReview: vi.fn(),
        runAudit: vi.fn(),
        togglePairMode: vi.fn(),
        toggleZenMode: vi.fn(),
      };
      const result = handleSlashCommand(`/${cmdName}`, dispatch, socket, state);
      expect(result).toBe(true);
    }
  });

  it('records macro sequence and replays it correctly', () => {
    const dispatch = vi.fn();
    const socket = { send: vi.fn(), undo: vi.fn(), emit: vi.fn() };
    const state = {
      activeTab: 'AI Code Assistant',
      toggleWatchMode: vi.fn(),
    };

    // Start recording
    expect(handleSlashCommand('/record', dispatch, socket, state)).toBe(true);

    // Run commands while recording
    handleSlashCommand('/help', dispatch, socket, state);
    handleSlashCommand('/context', dispatch, socket, state);

    // Stop recording
    expect(handleSlashCommand('/record', dispatch, socket, state)).toBe(true);

    // Replay
    expect(handleSlashCommand('/replay', dispatch, socket, state)).toBe(true);
  });

  it('every slash command belongs to a valid category in SLASH_CATEGORIES', () => {
    expect(SLASH_CATEGORIES.length).toBe(4);
    const validCategoryIds = new Set(SLASH_CATEGORIES.map((cat) => cat.id));
    expect(validCategoryIds).toEqual(new Set(['modes', 'code', 'agents', 'session']));

    for (const cmd of WEB_SLASH_COMMANDS) {
      expect(cmd.category).toBeDefined();
      expect(validCategoryIds.has(cmd.category)).toBe(true);
    }

    // Verify all 12 user-specified modes are in the 'modes' category
    const expectedModes = ['god', 'watch', 'plan', 'review', 'explain', 'migrate', 'audit', 'pair', 'bugcheck', 'security-check', 'test', 'clean'];
    for (const m of expectedModes) {
      const found = WEB_SLASH_COMMANDS.find((c) => c.cmd === m);
      expect(found, `Expected ${m} to exist`).toBeDefined();
      expect(found.category, `Expected ${m} to have category 'modes'`).toBe('modes');
    }
    // Verify agent and mode are outside modes category
    expect(WEB_SLASH_COMMANDS.find((c) => c.cmd === 'agent').category).toBe('agents');
    expect(WEB_SLASH_COMMANDS.find((c) => c.cmd === 'mode').category).toBe('session');
  });

  it('groups slash commands correctly with getGroupedSlashCommands', () => {
    const { filtered, groups } = getGroupedSlashCommands('AI Code Assistant', '');
    expect(filtered.length).toBe(WEB_SLASH_COMMANDS.length);
    expect(groups.length).toBe(4);

    // Filter by modes category
    const modesOnly = getGroupedSlashCommands('AI Code Assistant', '', 'modes');
    expect(modesOnly.groups.length).toBe(1);
    expect(modesOnly.groups[0].category.id).toBe('modes');
    expect(modesOnly.filtered.every((c) => c.category === 'modes')).toBe(true);
    expect(modesOnly.filtered.length).toBe(12);

    // Search query filtering
    const searchResult = getGroupedSlashCommands('AI Code Assistant', '/god');
    expect(searchResult.filtered.some((c) => c.cmd === 'god')).toBe(true);
  });

  it('/help outputs organized category sections including Modes', () => {
    const dispatch = vi.fn();
    const socket = { send: vi.fn(), undo: vi.fn(), emit: vi.fn() };
    const state = { activeTab: 'AI Code Assistant' };

    const handled = handleSlashCommand('/help', dispatch, socket, state);
    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalled();

    const dispatchedAction = dispatch.mock.calls[0][0];
    const text = dispatchedAction.payload?.text || dispatchedAction.text;
    expect(text).toContain('Available Slash Commands');
    expect(text).toContain('Modes');
    expect(text).toContain('Code & Dev');
    expect(text).toContain('AI & Models');
    expect(text).toContain('Session & Workspace');
  });
});

