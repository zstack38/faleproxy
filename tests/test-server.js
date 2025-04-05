const express = require('express');
const path = require('path');

const app = express();
const TEST_PORT = 3098;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

app.listen(TEST_PORT, () => {
  console.log(`Test server running at http://localhost:${TEST_PORT}`);
});
