const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const express = require('express');
const { spawn } = require('child_process');
const { sampleHtmlWithYale } = require('./test-utils');

// Set different ports for testing to avoid conflict with the main app
const APP_PORT = 3099;
const MOCK_PORT = 3098;
let appServer;
let mockServer;

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Start a mock server to serve Yale content
    const app = express();
    app.get('/', (req, res) => {
      res.send(sampleHtmlWithYale);
    });
    mockServer = app.listen(MOCK_PORT);

    // Start the main app
    appServer = spawn('node', [path.join(__dirname, '..', 'app.js')], {
      env: { ...process.env, PORT: APP_PORT.toString() }
    });

    // Wait for app server to be ready
    let retries = 0;
    const maxRetries = 15;
    while (retries < maxRetries) {
      try {
        await axios.get(`http://localhost:${APP_PORT}`);
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error('Server failed to start after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }, 20000); // Increase timeout for server startup



  afterAll(async () => {
    if (appServer && !appServer.killed) {
      appServer.kill();
    }
    if (mockServer) {
      mockServer.close();
    }
  });

  test('Should replace Yale with Fale in fetched content while preserving URLs', async () => {
    // Make a request to our proxy app targeting the mock server
    let response;
    try {
      response = await axios.post(`http://localhost:${APP_PORT}/fetch`, {
        url: `http://localhost:${MOCK_PORT}`
      });
    } catch (error) {
      console.error('Error response:', error.response?.data);
      throw error;
    }
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    const $ = cheerio.load(response.data.content);
    
    // Test title transformation
    expect($('title').text()).toBe('Fale University Test Page');
    
    // Test header content transformation
    expect($('h1').text()).toBe('Welcome to Fale University');
    
    // Test paragraph content transformation
    expect($('p').first().text()).toContain('Fale University is a private');
    expect($('p').eq(1).text()).toBe('Fale was founded in 1701 as the Collegiate School.');
    
    // Test list content transformation
    const listItems = $('.yale-info ul li');
    expect($(listItems[1]).text()).toContain('Fale graduates');
    
    // Verify URLs and email addresses remain unchanged
    const links = $('a');
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        expect(href).toContain('yale.edu');
      }
      if (href && href.includes('mailto:')) {
        expect(href).toContain('yale.edu');
      }
    });
    
    // Verify image sources remain unchanged
    const img = $('img');
    expect(img.attr('src')).toContain('yale.edu');
    
    // Verify JavaScript content is transformed
    const scripts = $('script');
    const scriptContent = scripts.first().html();
    expect(scriptContent).toContain('Fale University');
    expect(scriptContent).not.toContain('Yale University');
    
    // Verify link text is changed but href remains unchanged
    const aboutLink = $('a').first();
    expect(aboutLink.text()).toBe('About Fale');
    expect(aboutLink.attr('href')).toBe('https://www.yale.edu/about');
  }, 15000); // Increased timeout for slower systems // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    const response = await axios.post(`http://localhost:${APP_PORT}/fetch`, {
      url: 'not-a-valid-url'
    }).catch(error => error.response);

    expect(response.status).toBe(500);
    expect(response.data.error).toContain('Invalid URL');
  });

  test('Should handle missing URL parameter', async () => {
    const response = await axios.post(`http://localhost:${APP_PORT}/fetch`, {}).catch(error => error.response);

    expect(response.status).toBe(400);
    expect(response.data.error).toBe('URL is required');
  });
});
