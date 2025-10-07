import { graphWithMemory, threadConfig } from '@/utils/chain';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let inputs: { messages: Array<{ role: string; content: string }> } = {
    messages: [{ role: 'user', content: 'Can you look up some common ways of doing it?' }],
  };
  let threadId: string | undefined;

  try {
    const body = await req.json();
    if (body && Array.isArray(body.messages)) {
      inputs = { messages: body.messages };
    }
    if (body && typeof body.thread_id === 'string' && body.thread_id.trim()) {
      threadId = body.thread_id.trim();
    }
  } catch {}

  const encoder = new TextEncoder();
  const encode = (s: string) => encoder.encode(s);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      (async () => {
        const send = (obj: unknown) => controller.enqueue(encode(JSON.stringify(obj) + '\n'));

        send({ type: 'info', message: 'Starting chain...' });

        try {
          let stepIndex = 0;
          let finalMessage: unknown = null;
          const cfg = threadId
            ? { configurable: { thread_id: threadId }, streamMode: 'values' as const }
            : threadConfig;
          let lastEventTime = Date.now();
          let lastCitations: Array<{ source: string }> = [];
          for await (const step of await graphWithMemory.stream(inputs, cfg)) {
            stepIndex++;
            const lastMessage = step.messages[step.messages.length - 1] as any;
            finalMessage = lastMessage;

            const role = lastMessage?._getType?.() || lastMessage?.role || 'unknown';
            let content: string = '';
            if (typeof lastMessage?.content === 'string') {
              content = lastMessage.content;
            } else if (Array.isArray(lastMessage?.content)) {
              content = lastMessage.content
                .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
                .join('');
            } else {
              content = JSON.stringify(lastMessage?.content ?? '');
            }

            const now = Date.now();
            const durationMs = now - lastEventTime;
            lastEventTime = now;

            // If AI issued tool calls, emit explicit tool_call events with args
            if (
              role === 'ai' &&
              Array.isArray((lastMessage as any)?.tool_calls) &&
              (lastMessage as any).tool_calls.length > 0
            ) {
              for (const tc of (lastMessage as any).tool_calls) {
                const name = tc?.name || tc?.function?.name || 'tool';
                const args = tc?.args || tc?.function?.arguments;
                send({ type: 'tool_call', step: stepIndex, name, args, durationMs });
                const refinedQuery = args?.query ?? args;
                if (refinedQuery) {
                  send({ type: 'refined_query', step: stepIndex, query: refinedQuery });
                }
              }
              continue;
            }

            // Tool result: dedupe sources for citations
            if (role === 'tool' || lastMessage?._getType?.() === 'tool') {
              let sources: Array<{ source: string }> = [];
              const artifact = (lastMessage as any)?.artifact;
              if (Array.isArray(artifact)) {
                const seen = new Set<string>();
                for (const d of artifact) {
                  const src = d?.metadata?.source || d?.source;
                  if (src && !seen.has(src)) {
                    seen.add(src);
                    sources.push({ source: src });
                  }
                }
              }
              if (sources.length === 0 && typeof content === 'string') {
                const srcMatches = Array.from(content.matchAll(/Source:\s*(\S+)/g)).map(m => m[1]);
                const dedup = Array.from(new Set(srcMatches));
                sources = dedup.map(s => ({ source: s }));
              }
              lastCitations = sources;
              send({
                type: 'tool_result',
                step: stepIndex,
                durationMs,
                sources,
                preview: content.slice(0, 300),
              });
              continue;
            }

            const usage =
              (lastMessage as any)?.usage_metadata ||
              (lastMessage as any)?.response_metadata?.tokenUsage;
            const tokenUsage = usage
              ? {
                  input: usage.input_tokens ?? usage.promptTokens,
                  output: usage.output_tokens ?? usage.completionTokens,
                  total: usage.total_tokens ?? usage.totalTokens,
                }
              : undefined;
            send({ type: 'step', step: stepIndex, role, content, durationMs, tokenUsage });
          }

          if (!finalMessage) {
            send({ type: 'error', message: 'No response generated' });
          } else {
            let content: string = '';
            const fm: any = finalMessage;
            if (typeof fm?.content === 'string') {
              content = fm.content;
            } else if (Array.isArray(fm?.content)) {
              content = fm.content
                .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
                .join('');
            } else {
              content = JSON.stringify(fm?.content ?? '');
            }
            const role = fm?._getType?.() || fm?.role || 'assistant';
            send({ type: 'final', role, content, citations: lastCitations });
          }
        } catch (err: any) {
          send({ type: 'error', message: err?.message ?? 'Unknown error' });
        } finally {
          send({ type: 'done' });
          controller.close();
        }
      })();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
