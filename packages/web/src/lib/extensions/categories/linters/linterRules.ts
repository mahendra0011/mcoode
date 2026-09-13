/**
 * Linter rules and analyzers for popular languages.
 */

export interface LintProblem {
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  column?: number;
}

export async function lintWithEslint(code: string): Promise<LintProblem[]> {
  try {
    const { Linter } = await import('eslint-linter-browserify');
    const linter = new Linter();
    const messages = linter.verify(code, {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-var': 'error',
        'semi': ['warn', 'always'],
        'no-unused-vars': 'warn',
        'no-debugger': 'error',
        'no-duplicate-case': 'error',
        'no-empty': 'warn',
        'no-extra-semi': 'warn',
      },
    });

    return messages.map((msg: any) => ({
      message: msg.message,
      severity: msg.severity === 1 ? 'warning' : 'error',
      line: msg.line,
      column: msg.column,
    }));
  } catch (err) {
    console.warn('ESLint browser execution warning:', err);
    return [];
  }
}

export function lintCss(code: string): LintProblem[] {
  const problems: LintProblem[] = [];
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check for missing semicolon in CSS declarations
    if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
      problems.push({
        message: 'Missing semicolon at end of CSS declaration',
        severity: 'warning',
        line: lineNum,
        column: line.length,
      });
    }

    // Check for empty rulesets
    if (trimmed.includes('{}')) {
      problems.push({
        message: 'Unexpected empty block',
        severity: 'warning',
        line: lineNum,
      });
    }
  });

  return problems;
}

export function lintHtml(code: string): LintProblem[] {
  const problems: LintProblem[] = [];
  const lines = code.split('\n');

  // Check DOCTYPE
  if (code.trim().length > 0 && !code.toLowerCase().includes('<!doctype html>')) {
    problems.push({
      message: 'HTML document should start with <!DOCTYPE html>',
      severity: 'warning',
      line: 1,
      column: 1,
    });
  }

  // Check <img> without alt
  lines.forEach((line, idx) => {
    if (/<img\s+[^>]*>/i.test(line) && !/alt=["'][^"']*["']/i.test(line)) {
      problems.push({
        message: '<img> tag is missing an "alt" attribute',
        severity: 'warning',
        line: idx + 1,
      });
    }
  });

  return problems;
}

export function lintJson(code: string): LintProblem[] {
  const problems: LintProblem[] = [];
  if (!code.trim()) return problems;

  try {
    JSON.parse(code);
  } catch (err: any) {
    const msg = err.message || 'Invalid JSON format';
    const match = msg.match(/position\s+(\d+)/i);
    let line = 1;
    let column = 1;

    if (match && match[1]) {
      const pos = parseInt(match[1], 10);
      const textBefore = code.slice(0, pos);
      const linesBefore = textBefore.split('\n');
      line = linesBefore.length;
      column = linesBefore[linesBefore.length - 1].length + 1;
    }

    problems.push({
      message: `JSON syntax error: ${msg}`,
      severity: 'error',
      line,
      column,
    });
  }

  return problems;
}

export function lintMarkdown(code: string): LintProblem[] {
  const problems: LintProblem[] = [];
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    // Check multiple consecutive spaces at end of line (unwanted trailing spaces)
    if (/\s{3,}$/.test(line)) {
      problems.push({
        message: 'MD009: Trailing spaces at end of line',
        severity: 'warning',
        line: idx + 1,
      });
    }

    // Check heading without space e.g. #Heading
    if (/^#{1,6}[^#\s]/.test(line)) {
      problems.push({
        message: 'MD018: No space after hash on heading',
        severity: 'error',
        line: idx + 1,
      });
    }
  });

  return problems;
}
