// Browser environment configuration (ESM compatible)
// Load this BEFORE app startup

if (typeof window !== 'undefined' && !window.process) {
  window.process = {
    env: {
      API_KEY: 'YOUR_API_KEY_HERE',
      HUGGINGFACE_TOKEN: ''
    }
  };
}

window.APP_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE',
  huggingfaceToken: ''
};

console.log('[ETER-1] Browser configuration loaded');
