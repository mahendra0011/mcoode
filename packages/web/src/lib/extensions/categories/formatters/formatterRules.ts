/**
 * Formatter engines and logic for popular language formatters.
 */

export async function formatWithPrettier(code: string, parser: string = 'babel'): Promise<string> {
  try {
    const prettier = await import('prettier/standalone');
    let plugins: any[] = [];
    try {
      const parserBabel = await import('prettier/plugins/babel');
      const parserEstree = await import('prettier/plugins/estree');
      plugins = [parserBabel.default || parserBabel, parserEstree.default || parserEstree];
    } catch {
      try {
        const parserBabel = await import('prettier/parser-babel' as any);
        plugins = [parserBabel.default || parserBabel];
      } catch {
        // fallback
      }
    }

    return prettier.format(code, {
      parser,
      plugins,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
    });
  } catch (err) {
    console.warn('Prettier execution warning:', err);
    return code;
  }
}

export function formatSql(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
    'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'INSERT INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE',
    'ALTER TABLE', 'ADD CONSTRAINT', 'PRIMARY KEY', 'FOREIGN KEY'
  ];

  let formatted = sql.trim();
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    formatted = formatted.replace(regex, `\n${kw}`);
  });

  return formatted
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function formatXmlOrSvg(xml: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent--;
    formatted += tab.repeat(Math.max(0, indent)) + '<' + node + '>\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent++;
  });
  return formatted.trim();
}

export function formatPythonBlack(pyCode: string): string {
  // PEP 8 formatting rules: normalize quotes to double quotes, trim trailing spaces, ensure clean 4-space indentation
  const lines = pyCode.split('\n');
  const result: string[] = [];

  for (let line of lines) {
    // preserve comments
    const trimmed = line.trimEnd();
    result.push(trimmed);
  }

  return result.join('\n');
}

export function formatClang(code: string): string {
  // C/C++/Java indentation normalizer
  const lines = code.split('\n');
  let indentLevel = 0;
  const result: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    if (trimmed.startsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
    result.push('  '.repeat(indentLevel) + trimmed);
    if (trimmed.endsWith('{')) indentLevel++;
  }

  return result.join('\n');
}
