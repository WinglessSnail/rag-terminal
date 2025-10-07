import { NextResponse } from 'next/server';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import qdrantvectorStore from '@/providers/qdrant';

export async function POST(req: Request) {
  let url: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.url === 'string' && body.url.trim()) url = body.url.trim();
  } catch {}

  const encoder = new TextEncoder();
  const encode = (s: string) => encoder.encode(s);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: unknown) => controller.enqueue(encode(JSON.stringify(obj) + '\n'));
      (async () => {
        try {
          if (!url) {
            send({ type: 'error', messahge: 'Missing url' });
            return;
          }

          send({ type: 'info', message: `Starting indexing for ${url}` });

          const loader = new CheerioWebBaseLoader(url, { selector: 'p' });
          const docs = await loader.load();
          send({ type: 'info', message: `Loaded ${docs.length} doc(s)` });

          // Ensure source metadata present
          for (const d of docs) {
            d.metadata = { ...(d.metadata || {}), source: d.metadata?.source || url } as any;
          }

          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          const splits = await splitter.splitDocuments(docs);
          send({ type: 'info', message: `Created ${splits.length} chunk(s)` });

          await qdrantvectorStore.addDocuments(splits);
          send({ type: 'info', message: `Indexed ${splits.length} chunk(s) into Qdrant` });
        } catch (e: any) {
          send({ type: 'error', message: e?.message || 'Indexing failed' });
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
