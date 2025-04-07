const express = require('express');
const path = require('path');

const app = express();
const TEST_PORT = 3098;
let server;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

function start() {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(TEST_PORT, () => resolve());
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${TEST_PORT} is already in use`));
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function stop() {
  return new Promise((resolve) => {
    if (server) {
      // Force close all connections
      server.getConnections((err, count) => {
        if (!err && count > 0) {
          server.closeAllConnections();
        }
      });

      const timeout = setTimeout(() => {
        if (server) {
          server.close();
          server = null;
          resolve();
        }
      }, 1000);
      timeout.unref();

      server.close(() => {
        clearTimeout(timeout);
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = { start, stop };
