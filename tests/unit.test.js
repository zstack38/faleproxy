const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');

describe('Yale to Fale replacement logic', () => {
  
  test('should replace Yale with Fale in text content', () => {
    const $ = cheerio.load(sampleHtmlWithYale);
    
    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text || !text.match(/\bYALE\b|\bYale\b|\byale\b/)) return text;
      return text.replace(/\bYALE\b/g, 'FALE')
                .replace(/\bYale\b/g, 'Fale')
                .replace(/\byale\b/g, 'fale');
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
    const title = $('title').text();
    $('title').text(replaceYaleWithFale(title));
    
    const modifiedHtml = $.html();
    
    // Check text replacements
    expect(modifiedHtml).toContain('Fale University Test Page');
    expect(modifiedHtml).toContain('Welcome to Fale University');
    expect(modifiedHtml).toContain('Fale University is a private Ivy League');
    expect(modifiedHtml).toContain('Fale was founded in 1701');
    
    // Check that URLs remain unchanged
    expect(modifiedHtml).toContain('https://www.yale.edu/about');
    expect(modifiedHtml).toContain('https://www.yale.edu/admissions');
    expect(modifiedHtml).toContain('https://www.yale.edu/images/logo.png');
    expect(modifiedHtml).toContain('mailto:info@yale.edu');
    
    // Check href attributes remain unchanged
    expect(modifiedHtml).toMatch(/href="https:\/\/www\.yale\.edu\/about"/);
    expect(modifiedHtml).toMatch(/href="https:\/\/www\.yale\.edu\/admissions"/);
    
    // Check that link text is replaced
    expect(modifiedHtml).toContain('>About Fale<');
    expect(modifiedHtml).toContain('>Fale Admissions<');
    
    // Check that alt attributes are not changed
    expect(modifiedHtml).toContain('alt="Yale Logo"');
  });

  test('should handle text that has no Yale references', () => {
    const htmlWithoutYale = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <h1>Hello World</h1>
        <p>This is a test page with no references to that university.</p>
      </body>
      </html>
    `;
    
    const $ = cheerio.load(htmlWithoutYale);
    
    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text || !text.match(/\bYALE\b|\bYale\b|\byale\b/)) return text;
      return text.replace(/\bYALE\b/g, 'FALE')
                .replace(/\bYale\b/g, 'Fale')
                .replace(/\byale\b/g, 'fale');
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
    
    const modifiedHtml = $.html();
    
    // The text should remain unchanged since it doesn't contain Yale
    expect($('p', modifiedHtml).text().trim()).toBe('This is a test page with no references to that university.');
    expect($('title', modifiedHtml).text().trim()).toBe('Test Page');
    expect($('h1', modifiedHtml).text().trim()).toBe('Hello World');
  });

  test('should handle case-insensitive replacements', () => {
    const mixedCaseHtml = `
      <p>YALE University, Yale College, and yale medical school are all part of the same institution.</p>
    `;
    
    const $ = cheerio.load(mixedCaseHtml);
    
    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text || !text.match(/\bYALE\b|\bYale\b|\byale\b/)) return text;
      return text.replace(/\bYALE\b/g, 'FALE')
                .replace(/\bYale\b/g, 'Fale')
                .replace(/\byale\b/g, 'fale');
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
    
    const modifiedHtml = $.html();
    
    expect($('p', modifiedHtml).text().trim()).toBe('FALE University, Fale College, and fale medical school are all part of the same institution.');
  });
});
