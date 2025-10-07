import { StateGraph } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
import { toolsCondition } from '@langchain/langgraph/prebuilt';
import { toolsNode } from './tools/retrieve';
import queryOrRespond from './nodes/queryOrRespond';
import generate from './nodes/generate';
import { MemorySaver } from '@langchain/langgraph';

const graphBuilder = new StateGraph(MessagesAnnotation)
  .addNode('queryOrRespond', queryOrRespond)
  .addNode('tools', toolsNode)
  .addNode('generate', generate)
  .addEdge('__start__', 'queryOrRespond')
  .addConditionalEdges('queryOrRespond', toolsCondition, {
    __end__: '__end__',
    tools: 'tools',
  })
  .addEdge('tools', 'generate')
  .addEdge('generate', '__end__');

export const graph = graphBuilder.compile();

let checkpointer = new MemorySaver();
export let graphWithMemory = graphBuilder.compile({ checkpointer });

export const threadConfig = {
  configurable: { thread_id: 'abc123' },
  streamMode: 'values' as const,
};

export function resetMemory() {
  checkpointer = new MemorySaver();
  graphWithMemory = graphBuilder.compile({ checkpointer });
}
