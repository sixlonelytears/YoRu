const http = require('http');

async function main() {
  console.log('Starting server in-process...');
  // Require and start server
  require('./server');

  // Wait 1.5s for server to be fully listening
  await new Promise(r => setTimeout(r, 1500));

  console.log('Server is running. Starting test-suite...');
  require('./test-suite');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
