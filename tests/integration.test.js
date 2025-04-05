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
    // Allow localhost connections
    nock.enableNetConnect(/localhost|127.0.0.1/);
    
    // Create a temporary test app file
    await execAsync('cp app.js app.test.js');
    await execAsync(`sed -i '' 's/const PORT = 3001/const PORT = ${TEST_PORT}/' app.test.js`);
    
    // Start the test server
    server = require('child_process').spawn('node', ['app.test.js'], {
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      server.stdout.on('data', (data) => {
        if (data.toString().includes('Faleproxy server running')) {
          resolve();
        }
      });
    });
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    if (server) {
      server.kill();
      await new Promise(resolve => server.on('exit', resolve));
    }
    await execAsync('rm app.test.js');
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Ensure nock intercepts all requests except localhost
    nock.disableNetConnect();
    nock.enableNetConnect(/localhost|127.0.0.1/);

    // Mock the response from example.com
    const mockHtml = '<html><head><title>Yale University Test Page</title></head><body><h1>Welcome to Yale University</h1><p>Yale University is a private Ivy League research university.</p><a href="https://yale.edu/about">About Yale</a></body></html>';
    
    nock('https://example.com')
      .get('/')
      .reply(200, mockHtml);

    // Make a request to our proxy app
    const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
      url: 'https://example.com'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.data.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').text()).toContain('Fale University is a private');
    
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
    expect($('a').text()).toBe('About Fale');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'not-a-valid-url'
      });
      // Should not reach here
      fail('Expected request to fail');
    } catch (error) {
      expect(error.response.status).toBe(500);
      expect(error.response.data.error).toBe('Failed to fetch content: Invalid URL');
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
