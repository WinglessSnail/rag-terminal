import { MistralAIEmbeddings } from '@langchain/mistralai';

const mistralEmbedding = new MistralAIEmbeddings({
  model: 'mistral-embed',
});

export default mistralEmbedding;
