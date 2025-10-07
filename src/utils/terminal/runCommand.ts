export interface RunCommandDeps {
  append: (lines: string[]) => void;
}

export async function runCommand(cmd: string, { append }: RunCommandDeps) {
  const trimmed = cmd.trim();
  if (/^(help|info)\(\)$/i.test(trimmed)) {
    append([
      '$ ' + cmd,
      '[info] Available commands:',
      '- help() or info(): show this help',
      "- seturl('URL'): load, chunk, and index the URL with streaming logs",
      '- clearMemory(): reset in-memory chat state for the current process',
      '- cleardb(): delete all points in Qdrant (keeps collection)',
      "- cleardb('SOURCE'): delete only points whose metadata.source matches 'SOURCE'",
      '',
      '[tips] Shortcuts: Enter to send, Ctrl+C cancel, Ctrl+L clear.',
    ]);
    return true;
  }

  let action: string | null = null;
  let body: any = {};
  const clearDbMatch = trimmed.match(/^cleardb\((.*?)\)$/i);
  if (clearDbMatch) {
    const arg = clearDbMatch[1].trim();
    if (!arg) {
      action = 'clearQdrantPoints';
    } else {
      const source = arg.replace(/^['"]|['"]$/g, '');
      action = 'clearQdrantBySource';
      body.source = source;
    }
  }

  if (!action && /^clearmemory\(\)$/i.test(trimmed)) {
    action = 'resetMemory';
  }

  if (!action) return false;
  append([`$ ${cmd}`]);
  try {
    const res = await fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'Command failed');
    if (json.deleted != null) {
      append([`[ok] ${action} deleted=${json.deleted}`]);
    } else {
      append([`[ok] ${action}`]);
    }
  } catch (e) {
    append([`[error] ${(e as Error).message}`]);
  }
  return true;
}

export default runCommand;
