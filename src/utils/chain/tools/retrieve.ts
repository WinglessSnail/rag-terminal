import 'cheerio';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import qdrantvectorStore from '@/providers/qdrant';

export const retrieveSchema = z.object({ query: z.string() });

export const retrieve = tool(
  async ({ query }) => {
    console.log('[chain] Tool retrieve called with query:', query);
    const retrievedDocs = await qdrantvectorStore.similaritySearch(query, 2);
    const serialized = retrievedDocs
      .map(doc => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`)
      .join('\n');
    console.log('[chain] Tool retrieve returning documents:', retrievedDocs.length);
    return [serialized, retrievedDocs];
  },
  {
    name: 'retrieve',
    description: 'Retrieve information related to a query.',
    schema: retrieveSchema,
    responseFormat: 'content_and_artifact',
  }
);

export const toolsNode = new ToolNode([retrieve]);

export default retrieve;
