import { get } from 'https';

const REGISTRY_URL = 'https://registry.npmjs.org/@paw/cli';
const TIMEOUT_MS = 10000;

export async function getLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = get(REGISTRY_URL, { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode === 404) {
        // Package not published yet
        resolve(null);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pkg = JSON.parse(data);
          resolve(pkg['dist-tags']?.latest || null);
        } catch {
          reject(new Error('Invalid response from registry'));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}
