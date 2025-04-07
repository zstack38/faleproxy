const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let server;

describe('Integration Tests', () => {
  // Modify the app to use a test port
  beforeAll(async () => {
    // Mock external HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');
    
    // Create a temporary test app file
    await execAsync('cp app.js app.test.js');
    await execAsync(`sed -i '' 's/const PORT = 3001/const PORT = ${TEST_PORT}/' app.test.js`);
    
    // Start the test server with output
    server = require('child_process').spawn('node', ['app.test.js'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      try {
        await axios.get(`http://localhost:${TEST_PORT}`);
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error('Server failed to start');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    if (server && server.pid) {
      process.kill(-server.pid);
    }
    await execAsync('rm app.test.js');
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Setup a mock server
    const mockServer = require('http').createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(sampleHtmlWithYale);
    }).listen(3100);

    // Make a request to our proxy app
    let response;
    try {
      response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'http://localhost:3100'
      });

    } catch (error) {

      throw error;
    } finally {
      // Clean up mock server
      mockServer.close();
    }
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.data.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
    
    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
      url: 'not-a-valid-url'
    }).catch(error => error.response);

    expect(response.status).toBe(500);
    expect(response.data.error).toContain('Invalid URL');
  });

  test('Should handle missing URL parameter', async () => {
    const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {}).catch(error => error.response);

    expect(response.status).toBe(400);
    expect(response.data.error).toBe('URL is required');
  });
});
