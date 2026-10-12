const pdf = require('pdf-parse');

/**
 * Extracts text from a PDF buffer while preserving individual page numbers.
 * @param {Buffer} buffer - PDF binary data
 * @returns {Promise<{numPages: number, info: object, metadata: object, fullText: string, pages: Array<{pageNumber: number, text: string, charCount: number}>}>}
 */
async function extractTextWithPages(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid PDF buffer provided for extraction.');
  }

  const collectedPages = [];

  const options = {
    pagerender: function (pageData) {
      // pageData.pageIndex is 0-indexed in pdf.js
      const pageIndex = typeof pageData.pageIndex === 'number' ? pageData.pageIndex : collectedPages.length;
      const pageNumber = pageIndex + 1;

      return pageData.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false
      }).then(function (textContent) {
        let lastY;
        let text = '';

        for (const item of textContent.items) {
          if (!item || typeof item.str !== 'string') continue;

          // Check if item is on the same line or next line
          if (lastY === undefined || lastY === item.transform[5]) {
            text += (text.length > 0 && !text.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }

        const cleanedText = text
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        collectedPages.push({
          pageNumber,
          text: cleanedText,
          charCount: cleanedText.length
        });

        return text;
      });
    }
  };

  const parsed = await pdf(buffer, options);

  // Sort pages in ascending order by page number
  let pages = collectedPages.sort((a, b) => a.pageNumber - b.pageNumber);

  // Fallback: If custom pagerender didn't populate pages but parsed.text exists
  if (pages.length === 0 && parsed.text && parsed.text.trim().length > 0) {
    const rawText = parsed.text.replace(/\r\n/g, '\n').trim();
    pages = [{
      pageNumber: 1,
      text: rawText,
      charCount: rawText.length
    }];
  }

  // Filter out any completely blank pages if there are multiple pages
  const validPages = pages.filter(p => p.text.length > 0);
  const finalPages = validPages.length > 0 ? validPages : pages;

  return {
    numPages: parsed.numpages || finalPages.length || 1,
    info: parsed.info || {},
    metadata: parsed.metadata || {},
    fullText: parsed.text || finalPages.map(p => p.text).join('\n\n'),
    pages: finalPages
  };
}

module.exports = {
  extractTextWithPages
};
