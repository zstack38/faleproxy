const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Ensure URL has a protocol
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validUrl = 'https://' + url;
    }

    try {
      new URL(validUrl);
    } catch (error) {
      // Invalid URL detected
      return res.status(400).json({ success: false, error: 'Invalid URL' });
    }

    // Fetch the content from the provided URL
    let html;
    try {
      const response = await axios.get(validUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 Faleproxy/1.0'
        }
      });
      html = response.data;
      // Successfully fetched URL
    } catch (error) {
      // Failed to fetch URL
      return res.status(500).json({ success: false, error: `Failed to fetch content: ${error.message}` });
    }

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text) return text;
      // Only replace if Yale is found as a complete word
      const matches = text.match(/\b(YALE|Yale|yale)\b/g);
      if (!matches) return text;
      
      // Process each match in order
      let result = text;
      matches.forEach(match => {
        if (match === 'YALE') {
          result = result.replace(new RegExp(`\\b${match}\\b`, 'g'), 'FALE');
        } else if (match === 'Yale') {
          result = result.replace(new RegExp(`\\b${match}\\b`, 'g'), 'Fale');
        } else if (match === 'yale') {
          result = result.replace(new RegExp(`\\b${match}\\b`, 'g'), 'fale');
        }
      });
      return result;
    }

    // Process text nodes
    function processTextNodes(i, el) {
      if (el.nodeType === 3) { // Text node
        const newText = replaceYaleWithFale(el.data);
        if (newText !== el.data) {
          $(el).replaceWith(newText);
        }
      }
    }
    
    // Process all text nodes in the document
    $('*').contents().each(processTextNodes);
    
    // Process title separately to ensure it's captured
    const originalTitle = $('title').text();
    const modifiedTitle = replaceYaleWithFale(originalTitle);
    $('title').text(modifiedTitle);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: modifiedTitle,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  // Server started
});
