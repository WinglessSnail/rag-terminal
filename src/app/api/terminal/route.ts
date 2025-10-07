import { NextResponse } from 'next/server';
import qdrantvectorStore from '@/providers/qdrant';
import { resetMemory } from '@/utils/chain';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action as string;
    const source: string | undefined = body?.source;

    if (action === 'resetMemory') {
      resetMemory();
      return NextResponse.json({ ok: true, action });
    }

    if (action === 'clearQdrant') {
      // Back-compat: still supported but discouraged (drops collection)
      await (qdrantvectorStore as any).client.deleteCollection('langchain');
      return NextResponse.json({ ok: true, action });
    }

    if (action === 'clearQdrantPoints' || action === 'clearQdrantBySource') {
      const client = (qdrantvectorStore as any).client;
      const collection = 'langchain';

      const filter =
        action === 'clearQdrantBySource' && source
          ? {
              must: [
                {
                  key: 'metadata.source',
                  match: { value: source },
                },
              ],
            }
          : undefined;

      // Scroll and collect point IDs in batches
      let next: any = undefined;
      let total = 0;
      for (;;) {
        const res = await client.scroll(collection, {
          with_payload: true,
          with_vector: false,
          limit: 1000,
          offset: next,
          filter,
        });
        const ids = (res?.points || []).map((p: any) => p.id);
        if (ids.length === 0) break;
        // Delete in chunks of 1000
        for (let i = 0; i < ids.length; i += 1000) {
          const chunk = ids.slice(i, i + 1000);
          await client.deletePoints(collection, { points: chunk }, { wait: true });
          total += chunk.length;
        }
        next = res?.next_page_offset;
        if (!next) break;
      }
      return NextResponse.json({ ok: true, action, deleted: total, filter });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Bad request' }, { status: 400 });
  }
}
