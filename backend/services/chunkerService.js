/**
 * Chunker Service - Splits extracted document text into coherent chunks
 * while strictly preserving original page numbers and metadata.
 */

/**
 * Splits text into chunks of roughly `chunkSize` characters with `overlap`.
 * Uses recursive separators to avoid splitting words or sentences unnaturally.
 * 
 * @param {string} text - Raw page text
 * @param {number} chunkSize - Target characters per chunk
 * @param {number} overlap - Overlapping characters between consecutive chunks
 * @returns {Array<string>} - Array of chunk text strings
 */
function splitTextIntoSegments(text, chunkSize = 600, overlap = 120) {
  if (!text || text.trim().length === 0) return [];

  const cleanText = text.trim();
  if (cleanText.length <= chunkSize) {
    return [cleanText];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      const lastChunk = cleanText.substring(startIndex).trim();
      if (lastChunk.length > 0) {
        chunks.push(lastChunk);
      }
      break;
    }

    // Look for natural break points near endIndex
    const windowSlice = cleanText.substring(startIndex, endIndex);
    let splitPoint = -1;

    // Ordered preference for break characters
    const naturalBreaks = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];

    for (const sep of naturalBreaks) {
      const idx = windowSlice.lastIndexOf(sep);
      // Ensure the break is in the latter half of the window
      if (idx !== -1 && idx > chunkSize * 0.4) {
        splitPoint = idx + sep.length;
        break;
      }
    }

    if (splitPoint === -1) {
      // No natural break found, cut at exact length
      splitPoint = chunkSize;
    }

    const chunkContent = cleanText.substring(startIndex, startIndex + splitPoint).trim();
    if (chunkContent.length > 0) {
      chunks.push(chunkContent);
    }

    // Advance startIndex by chunk length minus overlap
    const step = Math.max(1, splitPoint - overlap);
    startIndex += step;
  }

  return chunks;
}

/**
 * Chunks a list of pages while preserving page numbers and assigning IDs.
 * 
 * @param {Array<{pageNumber: number, text: string}>} pages
 * @param {string} docId - Document identifier
 * @param {object} options - { chunkSize, overlap }
 * @returns {Array<{chunkId: string, docId: string, pageNumber: number, chunkIndex: number, text: string, charCount: number, tokenEstimate: number}>}
 */
function chunkDocumentPages(pages, docId, options = {}) {
  const chunkSize = options.chunkSize || 600;
  const overlap = options.overlap || 120;

  const allChunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text || '';
    if (!pageText.trim()) continue;

    const segments = splitTextIntoSegments(pageText, chunkSize, overlap);

    for (let i = 0; i < segments.length; i++) {
      const segmentText = segments[i];
      globalChunkIndex++;

      allChunks.push({
        chunkId: `${docId}_p${page.pageNumber}_c${i + 1}`,
        docId: docId,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex,
        text: segmentText,
        charCount: segmentText.length,
        tokenEstimate: Math.ceil(segmentText.length / 4)
      });
    }
  }

  return allChunks;
}

module.exports = {
  splitTextIntoSegments,
  chunkDocumentPages
};
