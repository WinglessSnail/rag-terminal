import { MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import geminiLLM from '@/providers/gemini';
import { retrieve } from '../tools/retrieve';

export async function queryOrRespond(state: typeof MessagesAnnotation.State) {
  console.log('[chain] Enter queryOrRespond with messages:', state.messages.length);
  const llmWithTools = geminiLLM.bindTools([retrieve]);
  const response = (await llmWithTools.invoke(state.messages)) as AIMessage;
  console.log(
    '[chain] queryOrRespond produced message with tool_calls:',
    (response as any).tool_calls?.length || 0
  );
  return { messages: [response] };
}

export default queryOrRespond;
