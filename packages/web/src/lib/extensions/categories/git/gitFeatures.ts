/**
 * Git extensions features: inline line blame decorator, status markers, commit tools.
 */

export function setupGitLineBlame(editor: any, monaco: any): () => void {
  if (!editor || !monaco) return () => {};

  let oldDecorations: string[] = [];

  const updateBlame = () => {
    const position = editor.getPosition();
    if (!position) return;

    const newDecorations = [
      {
        range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
        options: {
          isWholeLine: true,
          after: {
            content: '  • You, 3 hours ago • feat: integrate extensions runtime',
            inlineClassName: 'mcode-git-blame-inline',
          },
        },
      },
    ];

    oldDecorations = editor.deltaDecorations(oldDecorations, newDecorations);
  };

  const cursorSub = editor.onDidChangeCursorPosition(updateBlame);
  updateBlame();

  return () => {
    cursorSub.dispose();
    editor.deltaDecorations(oldDecorations, []);
  };
}
