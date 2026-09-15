import { describe, it, expect } from 'vitest';
import { correctTypos, offlineEnhancePrompt } from '../src/routes/prompt.js';

describe('Prompt Enhancer & Typo Correction', () => {
  it('corrects common programming and English typos', () => {
    const input = 'creat a logn pag with rfrsh tokn and mangodb';
    const { corrected, corrections } = correctTypos(input);
    expect(corrected.toLowerCase()).toContain('create');
    expect(corrected.toLowerCase()).toContain('login');
    expect(corrected.toLowerCase()).toContain('refresh token');
    expect(corrected).toContain('MongoDB');
    expect(corrections.length).toBeGreaterThanOrEqual(4);
  });

  it('capitalizes sentence beginnings', () => {
    const input = 'buid me a rest api in expressjs. add unit test.';
    const { corrected } = correctTypos(input);
    expect(corrected).toMatch(/^Build/);
    expect(corrected).toContain('Express');
  });

  it('expands short underspecified prompt with structural requirements', () => {
    const input = 'creat auth api with jwt and nodjs';
    const enhanced = offlineEnhancePrompt(input);
    expect(enhanced).toContain('Key Requirements');
    expect(enhanced).toContain('security best practices');
    expect(enhanced).toContain('Node.js');
  });

  it('enhances frontend UI prompt with modern responsive guidelines', () => {
    const input = 'buid a react dasboard with tailwnd';
    const enhanced = offlineEnhancePrompt(input);
    expect(enhanced).toContain('React');
    expect(enhanced).toContain('dashboard');
    expect(enhanced).toContain('Tailwind CSS');
    expect(enhanced).toContain('responsive');
  });
});
