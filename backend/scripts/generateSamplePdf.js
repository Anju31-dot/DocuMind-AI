const fs = require('fs');
const path = require('path');

/**
 * Creates a valid 3-page PDF file with text content for testing DocuMind AI.
 */
function createSamplePdf() {
  const pagesData = [
    {
      title: "DocuMind AI - Technical Architecture Report",
      subtitle: "Page 1: System Overview and Core Design",
      paragraphs: [
        "Project Name: DocuMind AI - RAG-Based Document Assistant.",
        "Author: Software Development Engineering Intern Portfolio.",
        "System Goal: Enable conversational question answering over private PDF documents using Retrieval-Augmented Generation (RAG).",
        "Architecture Overview: The system consists of a React Vite frontend and an Express Node.js backend. When a PDF is uploaded, text is extracted while preserving exact page numbers.",
        "Document Chunking: The extracted text is split into semantic chunks with a configurable chunk size of 600 characters and an overlap of 120 characters to prevent loss of context across boundaries.",
        "Vector Embeddings: Each chunk is converted into high-dimensional vector representations using embedding model APIs such as Google Gemini text-embedding-004 or OpenAI text-embedding-3-small."
      ]
    },
    {
      title: "DocuMind AI - Technical Architecture Report",
      subtitle: "Page 2: Vector Search and Similarity Metric",
      paragraphs: [
        "Vector Storage: Embeddings are indexed in an in-memory vector store equipped with metadata tracking.",
        "Similarity Calculation: The vector store calculates Cosine Similarity between the user question vector and all document chunk vectors.",
        "Cosine Formula: Cosine similarity measures the cosine of the angle between two multi-dimensional vectors, yielding a score between 0.0 and 1.0.",
        "Retrieval Strategy: The top 4 most relevant chunks with highest cosine similarity are retrieved as context for the language model.",
        "Grounding Constraint: The prompt instructs the LLM to strictly base answers on retrieved excerpts and cite specific page numbers."
      ]
    },
    {
      title: "DocuMind AI - Technical Architecture Report",
      subtitle: "Page 3: Evaluation, Guardrails, and Performance",
      paragraphs: [
        "Hallucination Guardrails: If retrieved chunks do not contain enough facts to answer a question, the assistant explicitly states: Insufficient information was found in the uploaded document.",
        "Source Citation: Each response includes clickable citation cards with exact page numbers and similarity confidence scores.",
        "API Key Handling: Keys entered in Settings remain in browser memory for the session and are sent to the backend and selected AI provider. Backend environment keys remain server-side.",
        "Performance Benchmarks: Average document processing time is under 1.5 seconds for typical 10-page documents.",
        "Internship Conclusion: The project demonstrates full-stack proficiency, prompt engineering, vector search implementation, and clean architectural design."
      ]
    }
  ];

  // Build PDF stream objects
  const objects = [];

  // Helper to add object
  function addObject(content) {
    objects.push(content);
    return objects.length; // 1-based index
  }

  // Obj 1: Catalog (will be linked to Pages)
  // We'll build objects sequentially
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;

  // Obj 3: Font
  const fontContent = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  const pageObjNums = [];
  const contentObjNums = [];

  let nextObjNum = 4;
  for (let i = 0; i < pagesData.length; i++) {
    pageObjNums.push(nextObjNum++);
    contentObjNums.push(nextObjNum++);
  }

  const allObjects = [];

  // 1: Catalog
  allObjects[1] = `<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`;

  // 2: Pages
  allObjects[2] = `<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pagesData.length} >>`;

  // 3: Font
  allObjects[3] = fontContent;

  // Pages & Contents
  for (let i = 0; i < pagesData.length; i++) {
    const p = pagesData[i];
    const pageNum = pageObjNums[i];
    const contentNum = contentObjNums[i];

    allObjects[pageNum] = `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>`;

    // Stream content
    let streamText = "BT\n";
    // Title
    streamText += "/F1 18 Tf\n";
    streamText += `50 730 Td\n`;
    streamText += `(${escapePdf(p.title)}) Tj\n`;

    // Subtitle
    streamText += "/F1 13 Tf\n";
    streamText += `0 -28 Td\n`;
    streamText += `(${escapePdf(p.subtitle)}) Tj\n`;

    // Paragraphs
    streamText += "/F1 11 Tf\n";
    let yDelta = -32;

    for (const para of p.paragraphs) {
      streamText += `0 ${yDelta} Td\n`;
      // Break paragraph into lines under 80 chars
      const lines = wrapLine(para, 75);
      for (let l = 0; l < lines.length; l++) {
        if (l > 0) {
          streamText += `0 -16 Td\n`;
        }
        streamText += `(${escapePdf(lines[l])}) Tj\n`;
      }
      yDelta = -24;
    }

    streamText += "ET";

    const streamLen = Buffer.byteLength(streamText, 'utf-8');
    allObjects[contentNum] = `<< /Length ${streamLen} >>\nstream\n${streamText}\nendstream`;
  }

  function escapePdf(text) {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function wrapLine(text, maxLen) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).trim().length <= maxLen) {
        currentLine = (currentLine + ' ' + w).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Assemble full PDF
  let pdf = "%PDF-1.4\n";
  const offsets = [];

  for (let i = 1; i < allObjects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'utf-8');
    pdf += `${i} 0 obj\n${allObjects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += "xref\n";
  pdf += `0 ${allObjects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < allObjects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdf += `${offStr} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${allObjects.length} /Root ${catalogObjNum} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  const outputDir = path.join(__dirname, '..', '..', 'sample_documents');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'DocuMind_AI_Internship_Report.pdf');
  fs.writeFileSync(outputPath, Buffer.from(pdf, 'utf-8'));
  console.log(`[Success] Sample PDF written to: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  createSamplePdf();
}

module.exports = { createSamplePdf };
