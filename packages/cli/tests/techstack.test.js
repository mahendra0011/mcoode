import { describe, it, expect } from 'vitest';
import { smartDefaults } from '../src/core/techstack.js';

describe('smartDefaults', () => {
  it('returns npm test by default', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: [], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.testCommand).toBe('npm test');
    expect(d.buildCommand).toBe('npm run build');
    expect(d.devPort).toBe(3000);
  });

  it('selects Vitest command when detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: ['Vitest'], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.testCommand).toBe('npx vitest run');
  });

  it('selects Jest command when detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: ['Jest'], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.testCommand).toBe('npx jest');
  });

  it('selects Cypress command when detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: ['Cypress'], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.testCommand).toBe('npx cypress run');
  });

  it('selects Playwright command when detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: ['Playwright'], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.testCommand).toBe('npx playwright test');
  });

  it('uses port 5173 for Vite projects', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: [], buildTools: ['Vite'], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.devPort).toBe(5173);
  });

  it('uses port 5173 for Vue projects', () => {
    const d = smartDefaults({
      frontend: ['Vue'], backend: [], databases: [],
      testFrameworks: [], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.devPort).toBe(5173);
  });

  it('includes db domain when databases detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: ['PostgreSQL'],
      testFrameworks: [], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.domains).toContain('db');
  });

  it('includes backend and frontend domains when frameworks detected', () => {
    const d = smartDefaults({
      frontend: ['React'], backend: ['Node.js'], databases: [],
      testFrameworks: [], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.domains).toContain('backend');
    expect(d.domains).toContain('frontend');
  });

  it('always includes test and docs domains', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: [], buildTools: [], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.domains).toContain('test');
    expect(d.domains).toContain('docs');
  });

  it('includes devops when build tools detected', () => {
    const d = smartDefaults({
      frontend: [], backend: [], databases: [],
      testFrameworks: [], buildTools: ['Webpack'], languages: [],
      packageManager: 'npm', rawDeps: []
    });
    expect(d.domains).toContain('devops');
  });
});
