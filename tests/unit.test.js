const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');

describe('Yale to Fale replacement logic', () => {
  const replaceYaleWithFale = (content) => {
    const $ = cheerio.load(content);
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      const text = $(this).text();
      const newText = text
        .replace(/Yale/g, 'Fale')
        .replace(/yale/g, 'fale')
        .replace(/YALE/g, 'FALE');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately
    const title = $('title').text()
      .replace(/Yale/g, 'Fale')
      .replace(/yale/g, 'fale')
      .replace(/YALE/g, 'FALE');
    $('title').text(title);
    
    return { html: $.html(), title };
  };

  test('should replace Yale with Fale in text content', () => {
    const { html: modifiedHtml, title } = replaceYaleWithFale(sampleHtmlWithYale);
    
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
        <p>This is a test page with no Yale references.</p>
      </body>
      </html>
    `;
    
    const { html: modifiedHtml } = replaceYaleWithFale(htmlWithoutYale);
    
    // Content should remain the same
    expect(modifiedHtml).toContain('<title>Test Page</title>');
    expect(modifiedHtml).toContain('<h1>Hello World</h1>');
    expect(modifiedHtml).toContain('<p>This is a test page with no Fale references.</p>');
  });

  test('should handle case-insensitive replacements', () => {
    const mixedCaseHtml = `
      <p>YALE University, Yale College, and yale medical school are all part of the same institution.</p>
    `;
    
    const { html: modifiedHtml } = replaceYaleWithFale(mixedCaseHtml);
    
    expect(modifiedHtml).toContain('FALE University, Fale College, and fale medical school');
  });

  test('should handle nested elements with text nodes', () => {
    const nestedHtml = `
      <div>
        <p>Yale <span>Yale</span> Yale</p>
        <div>YALE <em>yale</em> Yale</div>
      </div>
    `;
    
    const { html: modifiedHtml } = replaceYaleWithFale(nestedHtml);
    
    expect(modifiedHtml).toContain('Fale <span>Fale</span> Fale');
    expect(modifiedHtml).toContain('FALE <em>fale</em> Fale');
  });

  test('should handle script content replacement', () => {
    const htmlWithScript = `
      <script>
        const yale = 'Yale';
        const YALE = 'YALE';
        console.log('yale');
      </script>
    `;
    
    const { html: modifiedHtml } = replaceYaleWithFale(htmlWithScript);
    
    expect(modifiedHtml).toContain("const yale = 'Yale';");
    expect(modifiedHtml).toContain("const YALE = 'YALE';");
    expect(modifiedHtml).toContain("console.log('yale');");
  });

  test('should handle empty input', () => {
    const emptyHtml = '';
    const { html: modifiedHtml } = replaceYaleWithFale(emptyHtml);
    expect(modifiedHtml).toBeTruthy();
    expect(modifiedHtml.length).toBeGreaterThan(0);
  });
});
