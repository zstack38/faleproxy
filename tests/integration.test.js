const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');
const path = require('path');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let server;

describe('Integration Tests', () => {
  jest.setTimeout(30000); // Increase global timeout

  // Modify the app to use a test port
  beforeAll(async () => {
    // Allow localhost connections
    nock.enableNetConnect(/localhost|127.0.0.1/);
    
    // Create a temporary test app file
    await execAsync('cp app.js app.test.js');
    
    // Use different sed syntax based on OS
    const isMac = process.platform === 'darwin';
    const sedCommand = isMac
      ? `sed -i '' 's/const PORT = 3001/const PORT = ${TEST_PORT}/' app.test.js`
      : `sed -i 's/const PORT = 3001/const PORT = ${TEST_PORT}/' app.test.js`;
    await execAsync(sedCommand);
    
    // Start the test server
    server = require('child_process').spawn('node', ['app.test.js'], {
      stdio: 'pipe'
    });

    // Log server output
    server.stdout.on('data', () => {});
    server.stderr.on('data', () => {});
    
    // Wait for server to start (with timeout)
    let checkInterval;
    await Promise.race([
      new Promise((resolve) => {
        const checkServer = async () => {
          try {
            await axios.get(`http://localhost:${TEST_PORT}`);
            clearInterval(checkInterval);
            resolve();
          } catch (error) {
            // Continue checking
          }
        };
        checkInterval = setInterval(checkServer, 100);
        checkServer(); // Initial check
      }),
      new Promise((_, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Server start timeout'));
        }, 5000);
        timeout.unref();
      })
    ]).finally(() => {
      clearInterval(checkInterval);
    });
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    try {
      if (server) {
        server.kill();
        await Promise.race([
          new Promise(resolve => server.on('exit', resolve)),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      }
      await execAsync('rm app.test.js');
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      nock.cleanAll();
      nock.enableNetConnect();
    }
  }, 5000);

  test('Should replace Yale with Fale in fetched content', async () => {
    // Start test server
    const testServer = require('./test-server');
    await testServer.start();

    try {
      // Make a request to our proxy app
      const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'http://localhost:3098'
      });

      // Verify response structure
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('title');
      expect(response.data).toHaveProperty('originalUrl');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      // Verify Yale has been replaced with Fale in text
      const $ = cheerio.load(response.data.content);
      expect($('title').text().trim()).toBe('Fale Test Page');
      expect($('h1').text().trim()).toBe('Fale Test');
      expect($('p').text().trim()).toBe('This is a test page about Fale.');
    } finally {
      await testServer.stop();
    }
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'not:a:valid:url'
      });
      // Should not reach here
      fail('Expected request to fail');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('Invalid URL');
    }
  });

  test('Should handle missing URL parameter', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {});
      // Should not reach here
      fail('Expected request to fail');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('URL is required');
    }
  });
});
