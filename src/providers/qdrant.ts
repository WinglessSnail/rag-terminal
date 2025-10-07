import { QdrantVectorStore } from '@langchain/qdrant';
import mistralEmbedding from './mistral';

const qdrantvectorStore = await QdrantVectorStore.fromExistingCollection(mistralEmbedding, {
  url: process.env.QDRANT_URL,
  collectionName: 'langchain',
});

export default qdrantvectorStore;




mkdir -p docs/images
cp /home/winglesssnail/Pictures/screenshot.png docs/images/
git add docs/images/photo.png

