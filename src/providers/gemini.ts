import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const geminiLLM = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  temperature: 0.2,
});

export default geminiLLM;
