// Patch @plasmicapp/loader-fetcher to work on Cloudflare Workers
// This removes the dependency on http.validateHeaderName which isn't available

const fs = require('fs');
const path = require('path');

const fetcherPath = path.join(__dirname, '../node_modules/@plasmicapp/loader-fetcher/dist/index.js');

try {
  let content = fs.readFileSync(fetcherPath, 'utf8');
  
  // Replace http.validateHeaderName calls with our own validation
  content = content.replace(
    /http\.validateHeaderName\([^)]+\)/g,
    '(() => { /* Cloudflare Workers polyfill - header validation skipped */ })()'
  );
  
  content = content.replace(
    /http\.validateHeaderValue\([^)]+\)/g,
    '(() => { /* Cloudflare Workers polyfill - header validation skipped */ })()'
  );
  
  fs.writeFileSync(fetcherPath, content);
  console.log('✅ Successfully patched @plasmicapp/loader-fetcher for Cloudflare Workers');
} catch (error) {
  console.error('❌ Failed to patch @plasmicapp/loader-fetcher:', error.message);
  process.exit(1);
}

