export async function runSetUrl(url: string, append: (lines: string[]) => void) {
  append([`$ seturl('${url}')`]);
  try {
    const res = await fetch('/api/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.body) throw new Error('No response body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const chunks = buffered.split('\n');
      buffered = chunks.pop() || '';
      const toAppend: string[] = [];
      for (const line of chunks) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'info') toAppend.push(`[info] ${evt.message}`);
          else if (evt.type === 'error') toAppend.push(`[error] ${evt.message}`);
          else if (evt.type === 'done') toAppend.push('[done]');
        } catch {
          toAppend.push(`[raw] ${line}`);
        }
      }
      append(toAppend);
    }
    if (buffered) append([`[raw] ${buffered}`]);
  } catch (e) {
    append([`[error] ${(e as Error).message}`]);
  }
}

export default runSetUrl;
