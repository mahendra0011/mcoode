/**
 * Productivity features: Auto-close tags, color highlight, TODO tree highlight, Turbo Console Log, etc.
 */

export function setupAutoCloseTag(editor: any, monaco: any): () => void {
  if (!editor || !monaco) return () => {};

  const disposable = editor.onDidChangeModelContent((event: any) => {
    for (const change of event.changes) {
      if (change.text === '>') {
        const model = editor.getModel();
        const pos = editor.getPosition();
        if (!model || !pos) continue;

        const line = model.getLineContent(pos.lineNumber);
        const textBefore = line.substring(0, pos.column - 1);
        const match = textBefore.match(/<([a-zA-Z0-9_\-]+)(?:\s+[^>]*)?$/);

        if (match && !textBefore.endsWith('/>')) {
          const tagName = match[1];
          const voidTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];
          if (!voidTags.includes(tagName.toLowerCase())) {
            const closingTag = `</${tagName}>`;
            editor.executeEdits('auto-close-tag', [
              {
                range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                text: closingTag,
                forceMoveMarkers: true,
              },
            ]);
            editor.setPosition(pos);
          }
        }
      }
    }
  });

  return () => disposable.dispose();
}

export function setupColorHighlight(editor: any, monaco: any): () => void {
  if (!editor || !monaco) return () => {};

  let oldDecorations: string[] = [];

  const updateDecorations = () => {
    const model = editor.getModel();
    if (!model) return;

    const text = model.getValue();
    const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
    const newDecorations: any[] = [];

    let match;
    while ((match = colorRegex.exec(text)) !== null) {
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);

      newDecorations.push({
        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        options: {
          inlineClassName: 'mcode-color-preview-underline',
          hoverMessage: { value: `**Color Preview:** \`${match[0]}\`` },
        },
      });
    }

    oldDecorations = editor.deltaDecorations(oldDecorations, newDecorations);
  };

  updateDecorations();
  const sub = editor.onDidChangeModelContent(updateDecorations);

  return () => {
    sub.dispose();
    editor.deltaDecorations(oldDecorations, []);
  };
}

export function setupTodoHighlight(editor: any, monaco: any): () => void {
  if (!editor || !monaco) return () => {};

  let oldDecorations: string[] = [];

  const updateDecorations = () => {
    const model = editor.getModel();
    if (!model) return;

    const text = model.getValue();
    const todoRegex = /\b(TODO|FIXME|BUG|NOTE|HACK):/g;
    const newDecorations: any[] = [];

    let match;
    while ((match = todoRegex.exec(text)) !== null) {
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);
      const type = match[1];

      newDecorations.push({
        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        options: {
          inlineClassName: type === 'BUG' || type === 'FIXME' ? 'mcode-badge-danger' : 'mcode-badge-warning',
          hoverMessage: { value: `**${type} Highlighted Task**` },
        },
      });
    }

    oldDecorations = editor.deltaDecorations(oldDecorations, newDecorations);
  };

  updateDecorations();
  const sub = editor.onDidChangeModelContent(updateDecorations);

  return () => {
    sub.dispose();
    editor.deltaDecorations(oldDecorations, []);
  };
}
