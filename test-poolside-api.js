import { getProviders } from './packages/cli/src/providers/index.js';
import { loadConfig } from './packages/cli/src/core/store.js';

async function testPoolside() {
  console.log('Loading providers...');
  const providers = await getProviders({ secrets: { POOLSIDE_API_KEY: 'sky_SDevkYgc.HROy8VoNyL13hXEPbKQrRc9zJyUBeg9N' } });
  const poolside = providers.find(p => p.id === 'poolside');
  if (!poolside) {
    console.error('Poolside provider not found!');
    return;
  }
  console.log('Testing key...');
  const isKeyValid = await poolside.testKey('sky_SDevkYgc.HROy8VoNyL13hXEPbKQrRc9zJyUBeg9N');
  console.log('Key valid?', isKeyValid);
  if (isKeyValid) {
    console.log('Listing models...');
    const models = await poolside.listModels();
    console.log('Available models:', models.map(m => m.id));
    console.log('Streaming a test chat...');
    try {
      const stream = await poolside.stream('poolside:laguna', {
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        temperature: 0.1
      });
      let full = '';
      for await (const chunk of stream) {
        full += chunk;
        process.stdout.write(chunk);
      }
      console.log('\nDone!', full);
    } catch (e) {
      console.error('\nStream error:', e);
    }
  }
}
testPoolside().catch(console.error);
