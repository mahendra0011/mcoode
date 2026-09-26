/* Placeholder re-export — the real test runner lives in packages/cli/tests/. */
import { describe, it, expect } from 'vitest';
import { extractActions, stripActions } from '../src/core/chat-agent.js';

describe('extractActions — model drift tolerance', () => {
  it('parses standard mcode-action fence', () => {
    const actions = extractActions('Working.\n```mcode-action\n{"tool":"read_file","args":{"path":"a.js"}}\n```');
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('read_file');
  });

  it('parses ```json fence drift (provider emits wrong fence)', () => {
    const actions = extractActions('Sure.\n```json\n{"tool":"read_file","args":{"path":"a.js"}}\n```');
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('read_file');
  });

  it('parses XML tool_call blocks', () => {
    const actions = extractActions('<tool_call>read_file\npath: a.js</tool_call>');
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('read_file');
  });

  it('returns [] for a plain final answer', () => {
    expect(extractActions('Here is the summary of all changes I made.')).toEqual([]);
  });

  it('does NOT treat a normal json code block as an action', () => {
    const actions = extractActions('Use this config:\n```json\n{"name":"my-app","version":"1.0.0"}\n```');
    expect(actions).toEqual([]);
  });

  it('extracts multiple parallel actions', () => {
    const actions = extractActions(
      '```mcode-action\n{"tool":"read_file","args":{"path":"a.js"}}\n```\n```mcode-action\n{"tool":"read_file","args":{"path":"b.js"}}\n```'
    );
    expect(actions).toHaveLength(2);
  });
});

describe('stripActions — narration purity', () => {
  it('strips mcode-action fences, keeps narration', () => {
    expect(stripActions('Working on it.\n```mcode-action\n{"tool":"read_file","args":{"path":"a.js"}}\n```')).toBe('Working on it.');
  });

  it('strips action-looking fenced json so it never renders', () => {
    expect(stripActions('```json\n{"tool":"read_file","args":{"path":"a.js"}}\n```')).toBe('');
  });

  it('keeps a normal json code block intact', () => {
    const t = 'Use this config:\n```json\n{"name":"my-app"}\n```';
    expect(stripActions(t)).toBe(t);
  });

  it('strips bare json tool invocation object', () => {
    expect(stripActions('{"tool":"read_file","args":{"path":"a.js"}}')).toBe('');
  });
});

