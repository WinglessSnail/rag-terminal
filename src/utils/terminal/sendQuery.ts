export interface StreamAppend {
  (lines: string[]): void;
}

export async function sendQuery(
  query: string,
  threadId: string | null,
  controller: AbortController,
  append: StreamAppend,
  setIsSending: (v: boolean) => void
) {
  setIsSending(true);
  append([`> ${query}`]);
  try {
    const res = await fetch('/api/chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        thread_id: threadId || undefined,
      }),
      signal: controller.signal,
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
          if (evt.type === 'info') {
            toAppend.push(`[info] ${evt.message}`);
          } else if (evt.type === 'step') {
            const role = evt.role || 'model';
            const content =
              typeof evt.content === 'string' ? evt.content : JSON.stringify(evt.content);
            const timing = evt.durationMs ? ` +${evt.durationMs}ms` : '';
            const tokens = evt.tokenUsage
              ? ` tokens(i/o/t)=${evt.tokenUsage.input || 0}/${evt.tokenUsage.output || 0}/${
                  evt.tokenUsage.total || 0
                }`
              : '';
            toAppend.push(`[step ${evt.step}] (${role}) ${content}${timing}${tokens}`);
          } else if (evt.type === 'tool_call') {
            const name = evt.name || 'tool';
            const args = typeof evt.args === 'string' ? evt.args : JSON.stringify(evt.args);
            const time = evt.durationMs ? ` +${evt.durationMs}ms` : '';
            toAppend.push(`[tool-call ${evt.step}] ${name} ${args}${time}`);
          } else if (evt.type === 'refined_query') {
            const q = typeof evt.query === 'string' ? evt.query : JSON.stringify(evt.query);
            toAppend.push(`[refined-query ${evt.step}] ${q}`);
          } else if (evt.type === 'tool_result') {
            const time = evt.durationMs ? ` +${evt.durationMs}ms` : '';
            const sources: string[] = Array.isArray(evt.sources)
              ? evt.sources.map((s: any) => s.source)
              : [];
            const preview = typeof evt.preview === 'string' ? evt.preview : '';
            toAppend.push(`[tool-result ${evt.step}] sources=${sources.join(', ')}${time}`);
            if (preview) toAppend.push(preview);
          } else if (evt.type === 'final') {
            const role = evt.role || 'assistant';
            const content =
              typeof evt.content === 'string' ? evt.content : JSON.stringify(evt.content);
            toAppend.push(`[final] (${role}) ${content}`);
            const citations: string[] = Array.isArray(evt.citations)
              ? evt.citations.map((c: any) => c.source)
              : [];
            if (citations.length) {
              toAppend.push(`[citations] ${citations.join(', ')}`);
            }
          } else if (evt.type === 'error') {
            toAppend.push(`[error] ${evt.message}`);
          } else if (evt.type === 'done') {
            toAppend.push(`[done]`);
          }
        } catch {
          toAppend.push(`[raw] ${line}`);
        }
      }
      append(toAppend);
    }
    if (buffered) append([`[raw] ${buffered}`]);
  } catch (e) {
    append([`[error] ${(e as Error).message}`]);
  } finally {
    setIsSending(false);
  }
}

export default sendQuery;
