/* eslint-disable no-control-regex */
import { execSync } from 'node:child_process';

/**
 * Read text from the system clipboard across platforms.
 * Fails safely and returns '' on any error or timeout.
 */
export function getClipboardText() {
  try {
    if (process.platform === 'win32') {
      return execSync('powershell.exe -NoLogo -NoProfile -NonInteractive -Command Get-Clipboard', {
        timeout: 3000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
    }
    if (process.platform === 'darwin') {
      return execSync('pbpaste', {
        timeout: 1500,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
    }
    return execSync('xclip -selection clipboard -o 2>/dev/null || wl-paste 2>/dev/null', {
      timeout: 1500,
      encoding: 'utf8',
      shell: true,
      stdio: ['pipe', 'pipe', 'ignore']
    }).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  } catch {
    return '';
  }
}

/**
 * Clean pasted input strings by removing ANSI sequences, bracketed paste tags, and control characters.
 */
export function sanitizePasteText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Strip bracketed paste markers
  let clean = raw.replace(/\x1b\[200~/g, '').replace(/\x1b\[201~/g, '');
  // Strip ANSI sequences
  clean = clean.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  // Normalize line endings
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip non-printable control chars except \n and \t
  clean = clean.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  return clean;
}
