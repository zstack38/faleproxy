const request = require('supertest');
const nock = require('nock');
const cheerio = require('cheerio');
const express = require('express');
const path = require('path');

// Import the app directly to ensure it's covered in tests
const app = require('../app');

describe('App Tests', () => {
  // Save the original console.error
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Mock console.error to suppress error messages during tests
    console.error = jest.fn();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });
  
  afterAll(() => {
    // Restore the original console.error after tests
    console.error = originalConsoleError;
  });

  test('GET / should serve the index.html file', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
    expect(response.text).toContain('<title>Faleproxy - Replace Yale with Fale</title>');
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'URL is required' });
  });

  test('POST /fetch should replace Yale with Fale in HTML content', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Yale University</title>
        </head>
        <body>
          <h1>Welcome to Yale</h1>
          <p>Yale is a prestigious university.</p>
        </body>
      </html>
    `;

    nock('https://example.com')
      .get('/')
      .reply(200, mockHtml);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com' });
    
    expect(response.status).toBe(200);
    
    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University');
    expect($('h1').text()).toBe('Welcome to Fale');
    expect($('p').text()).toBe('Fale is a prestigious university.');
  });

  test('POST /fetch should handle non-HTML responses', async () => {
    nock('https://example.com')
      .get('/data.json')
      .reply(200, JSON.stringify({ data: 'Yale University' }), { 'Content-Type': 'application/json' });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/data.json' });
    
    expect(response.status).toBe(200);
    // For JSON responses, we just check that the response is successful
    // since the HTML replacement doesn't apply to JSON data in the same way
    expect(response.body.success).toBe(true);
  });

  test('POST /fetch should handle error responses', async () => {
    nock('https://example.com')
      .get('/error')
      .replyWithError('Connection refused');

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/error' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle 404 responses', async () => {
    nock('https://example.com')
      .get('/notfound')
      .reply(404, 'Not Found');

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/notfound' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle invalid URLs', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'invalid-url' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });
});
