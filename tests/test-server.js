const express = require('express');
const path = require('path');

const app = express();
const TEST_PORT = 3098;
let server;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

function start() {
  return new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running at http://localhost:${TEST_PORT}`);
      resolve();
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Test server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = { start, stop };
