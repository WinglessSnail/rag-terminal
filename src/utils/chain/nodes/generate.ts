import geminiLLM from '@/providers/gemini';
import { MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

export async function generate(state: typeof MessagesAnnotation.State) {
  console.log('[chain] Enter generate');
  let recentToolMessages: ToolMessage[] = [] as any;
  for (let i = state['messages'].length - 1; i >= 0; i--) {
    let message = state['messages'][i];
    if (message instanceof ToolMessage) {
      recentToolMessages.push(message as ToolMessage);
    } else {
      break;
    }
  }
  let toolMessages = recentToolMessages.reverse();
  console.log('[chain] generate toolMessages count:', toolMessages.length);
  const docsContent = toolMessages.map(doc => (doc as any).content).join('\n');
  const systemMessageContent =
    'You are an assistant for question-answering tasks. ' +
    'Use the following pieces of retrieved context to answer ' +
    "the question. If you don't know the answer, say that you " +
    "don't know. Use three sentences maximum and keep the " +
    'answer concise.' +
    '\n\n' +
    `${docsContent}`;

  const conversationMessages = state.messages.filter(
    message =>
      message instanceof HumanMessage ||
      message instanceof SystemMessage ||
      (message instanceof AIMessage && (message as any).tool_calls?.length == 0)
  );
  const prompt = [new SystemMessage(systemMessageContent), ...conversationMessages];

  const response = await geminiLLM.invoke(prompt);
  console.log(
    '[chain] generate model response tokens length:',
    String((response as any)?.content ?? '').length
  );
  return { messages: [response] };
}

export default generate;
