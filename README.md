# DocuMind AI — RAG-Based Document Assistant
> **Software Development Internship Portfolio Project**  
> A production-ready, full-stack Retrieval-Augmented Generation (RAG) document assistant built with React, Vite, Node.js, Express, and modern vector similarity search.

---

## 📌 Executive Summary

**DocuMind AI** is an intelligent document assistant that enables conversational question answering over PDF documents with strict grounding and page-level source attribution. Unlike naive LLM wrappers that pass entire files or hallucinate unsupported answers, DocuMind AI implements an end-to-end **Retrieval-Augmented Generation (RAG)** pipeline entirely in JavaScript (Node.js + React), preserving page metadata, calculating vector cosine similarity, and citing exact document excerpts.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend (React + Vite)"]
        UI[Document Upload & Chat Interface]
        Settings[Settings & API Key Modal]
        Inspector[Chunk & Page Inspector]
    end

    subgraph Backend["Backend (Node.js + Express)"]
        UploadMW[Multer Upload & Validation Middleware]
        PDFService[PDF Parser Service (pdf-parse)]
        Chunker[Recursive Text Chunker with Overlap]
        EmbedService[Embedding Service (Gemini / OpenAI API)]
        VectorDB[(In-Memory Vector Store & Cosine Similarity)]
        RAGPipeline[Grounded RAG Pipeline & Prompt Engineering]
    end

    subgraph ExternalAPIs["AI Model APIs"]
        Gemini[Google Gemini API / text-embedding-004 / gemini-1.5-flash]
        OpenAI[OpenAI API / text-embedding-3-small / gpt-4o-mini]
    end

    UI -->|Upload PDF| UploadMW
    UploadMW --> PDFService
    PDFService -->|Page-Aware Text| Chunker
    Chunker -->|Text Chunks + Page #| EmbedService
    EmbedService <-->|Batch Embeddings| ExternalAPIs
    EmbedService -->|Vectors + Metadata| VectorDB

    UI -->|User Question| RAGPipeline
    RAGPipeline -->|Embed Query| EmbedService
    RAGPipeline -->|Top-K Vector Search| VectorDB
    VectorDB -->|Ranked Excerpts + Page #| RAGPipeline
    RAGPipeline <-->|Context-Grounded Inference| ExternalAPIs
    RAGPipeline -->|Answer + Citations| UI
```

---

## 🚀 Core Features

1. **Page-Aware PDF Parsing**:
   - Uses `pdf-parse` with custom page render hooks to extract text on a per-page basis, ensuring every chunk retains its exact physical document page number (`pageNumber: 1, 2, ...`).
2. **Recursive Character Chunking**:
   - Splits extracted pages into semantically coherent segments using natural break boundaries (`\n\n`, `\n`, sentence endings, commas, spaces).
   - Configurable chunk size (default: `600` chars) and overlap (default: `120` chars) to eliminate context loss across chunk boundaries.
3. **API-Based Vector Embeddings**:
   - Integrates **Google Gemini** (`text-embedding-004` - 768 dimensions) with fallback/alternative support for **OpenAI** (`text-embedding-3-small` - 1536 dimensions).
   - Efficient batch embedding execution to respect rate limits.
4. **Cosine Similarity Vector Search**:
   - Fast, zero-dependency in-memory vector store computing exact cosine similarity:
     $$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
   - Retrieves the top-$k$ most relevant chunks with match confidence percentages.
5. **Strict Grounding & Hallucination Defense**:
   - The RAG system prompt explicitly forces the LLM to rely **strictly** on retrieved context excerpts.
   - If the uploaded document lacks sufficient information to answer the question, the assistant explicitly states:
     `"Insufficient information was found in the uploaded document to answer this question."`
6. **Detailed Source Citations**:
   - Every generated answer includes clickable citation cards with exact page numbers, chunk IDs, similarity scores, and expandable text excerpts.
7. **Chunk Inspector Modal**:
   - Built-in transparency tool that allows evaluators to inspect every indexed chunk, filter by page, and search chunk text in real time.
8. **1-Click Sample Document Demo**:
   - Includes a generated 3-page technical report (`DocuMind_AI_Internship_Report.pdf`) so anyone can test the full pipeline in seconds with zero friction.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale / Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | Fast HMR, component reusability, optimized bundle size |
| **Styling** | Vanilla CSS (Variables & Glassmorphism) | High-performance, obsidian dark theme, zero CSS framework bloat |
| **Icons** | Lucide React | Modern, crisp UI icons for portfolio polish |
| **Backend** | Node.js (v20+) + Express | Scalable REST API with structured service architecture |
| **PDF Extraction** | `pdf-parse` | Pure JavaScript PDF text extraction with custom page callbacks |
| **File Handling** | `multer` | In-memory buffer upload with MIME type and size validation |
| **Vector Engine** | In-Memory Cosine Similarity | Deterministic, ultra-fast vector retrieval with metadata tracking |
| **Embedding Model** | Google Gemini (`text-embedding-004`) / OpenAI (`text-embedding-3-small`) | High-dimensional semantic vectors |
| **LLM Inference** | Gemini 1.5 Flash / GPT-4o Mini | Grounded context reasoning and concise markdown answers |

---

## 📂 Project Structure

```
RAG/
├── backend/
│   ├── config/
│   │   └── index.js              # Centralized environment configuration
│   ├── middleware/
│   │   ├── upload.js             # Multer upload & PDF validation (15MB limit)
│   │   └── errorHandler.js       # Global error handler with clean status codes
│   ├── routes/
│   │   └── api.js                # REST API endpoints (upload, query, chunks, health)
│   ├── services/
│   │   ├── pdfService.js         # Page-aware PDF parsing
│   │   ├── chunkerService.js     # Recursive character text splitting
│   │   ├── embeddingService.js   # Gemini and OpenAI embedding generator
│   │   ├── vectorStore.js        # Cosine similarity index & session store
│   │   └── ragService.js         # RAG pipeline with grounding prompt
│   ├── scripts/
│   │   └── generateSamplePdf.js  # Generator for demo 3-page PDF
│   ├── .env.example              # Environment variables template
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Express server bootstrap
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx                # Brand title, status pills, navigation
│   │   │   ├── UploadZone.jsx            # Drag & drop upload, sample doc button
│   │   │   ├── ProcessingProgress.jsx    # Real-time multi-stage pipeline status
│   │   │   ├── DocumentInfoBar.jsx       # Active document badges and actions
│   │   │   ├── ChatInterface.jsx         # Conversation stream, suggested queries
│   │   │   ├── MessageItem.jsx           # Markdown message & citations viewer
│   │   │   ├── SourceCard.jsx            # Page number & similarity confidence card
│   │   │   ├── SettingsModal.jsx         # API key, provider & parameter settings
│   │   │   └── ChunkInspectorModal.jsx   # Chunks & page inspector modal
│   │   ├── services/
│   │   │   └── api.js                    # Frontend HTTP client
│   │   ├── App.jsx                       # Main application state orchestrator
│   │   ├── index.css                     # Design system tokens and styles
│   │   └── main.jsx                      # React DOM mounting
│   ├── index.html                        # HTML entry with Google Fonts
│   ├── vite.config.js                    # Vite configuration with API proxy
│   └── package.json                      # Frontend dependencies
│
├── sample_documents/
│   └── DocuMind_AI_Internship_Report.pdf # Built-in 3-page sample PDF
├── .gitignore                            # Root ignore file (.env, node_modules, dist)
└── README.md                             # Comprehensive project documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- Free Google Gemini API Key (recommended, from [Google AI Studio](https://aistudio.google.com/app/apikey)) or OpenAI API Key

### 1. Clone or Open the Repository
```bash
cd RAG
```

### 2. Configure Backend Environment
Navigate to the `backend/` folder and copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```
Edit `.env` and add your Gemini API key:
```ini
PORT=5000
DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Install Backend Dependencies & Start Server
```bash
npm install
npm start
```
The backend server runs on `http://localhost:5000`.

### 4. Install Frontend Dependencies & Start App
In a separate terminal window:
```bash
cd ../frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Testing the Pipeline (1-Click Demo)

1. Open `http://localhost:5173`.
2. Click **"Load Sample Internship Report (Demo)"** in the left sidebar.
3. The system will:
   - Extract text from all 3 pages of the sample report.
   - Generate semantic chunks.
   - Compute embeddings.
   - Index chunks into the vector store.
4. Click on any of the suggested prompts:
   - *"What is the core objective of this project?"*
   - *"Explain the vector search methodology and similarity metric used."*
   - *"What hallucination guardrails are implemented?"*
5. Inspect the generated answer:
   - Notice the green **"Answer grounded in document excerpts"** badge.
   - Click **"Source References"** to expand the exact page numbers (`Page 1`, `Page 2`, `Page 3`) and see similarity scores!
6. Test hallucination defense:
   - Ask an off-topic question: *"What is the recipe for chocolate cake?"*
   - Notice the amber badge and clear response:  
     `"Insufficient information was found in the uploaded document to answer this question."`

---

## 📡 REST API Reference

### 1. `GET /api/health`
Checks server status and configured provider keys.
- **Response**:
```json
{
  "status": "healthy",
  "configuredProviders": { "gemini": true, "openai": false, "default": "gemini" },
  "activeDocument": { "filename": "report.pdf", "pageCount": 3, "chunkCount": 6 }
}
```

### 2. `POST /api/test-connection`
Validates an API key against the provider.
- **Body**: `{ "provider": "gemini", "apiKey": "..." }`
- **Response**: `{ "success": true, "dimensions": 768, "message": "Successfully connected..." }`

### 3. `POST /api/upload`
Uploads and indexes a PDF document.
- **Form Data**:
  - `file`: PDF binary file
  - `provider`: `"gemini"` or `"openai"`
  - `chunkSize`: `600`
  - `chunkOverlap`: `120`
- **Response**:
```json
{
  "success": true,
  "message": "Document successfully parsed, chunked, and indexed in vector store.",
  "document": {
    "docId": "doc_1728751234567",
    "filename": "DocuMind_AI_Internship_Report.pdf",
    "pageCount": 3,
    "chunkCount": 6,
    "provider": "gemini"
  }
}
```

### 4. `POST /api/query`
Executes vector retrieval and context-grounded LLM generation.
- **Body**:
```json
{
  "question": "What similarity metric is used for vector retrieval?",
  "provider": "gemini",
  "topK": 4
}
```
- **Response**:
```json
{
  "success": true,
  "answer": "The vector store calculates **Cosine Similarity** between the user question vector and all document chunk vectors [Page 2].",
  "isSupported": true,
  "sources": [
    {
      "chunkId": "doc_1_p2_c1",
      "pageNumber": 2,
      "similarity": 0.892,
      "relevancePercent": 89,
      "text": "Vector Storage: Embeddings are indexed in an in-memory vector store..."
    }
  ],
  "timingMs": 412
}
```

### 5. `GET /api/chunks`
Returns all indexed chunks for transparency inspection.

### 6. `DELETE /api/document`
Clears the active document and resets the vector store.

---

## 🔒 Security & Code Quality Standards

- **Zero Secret Exposure**: Secret API keys are handled securely via backend environment variables (`.env`) and never embedded in frontend code.
- **Safe File Uploads**: `multer` validates MIME types (`application/pdf`) and enforces a strict 15MB file size limit to prevent Denial-of-Service attacks.
- **Strict Separation of Concerns**: Clean modular architecture dividing business logic (`services/`), HTTP routing (`routes/`), middleware (`middleware/`), and presentation (`components/`).
- **Real RAG Implementation**: No fake or mocked responses; the pipeline computes real vector embeddings, performs mathematical cosine similarity scoring, and queries the LLM API with strict grounding constraints.
- **Git Hygiene**: Comprehensive `.gitignore` protecting `.env`, `node_modules`, `dist`, logs, and temporary files.

---

## 💡 Internship Portfolio Highlights

1. **Full-Stack Competency**: Demonstrates seamless integration between a modern React/Vite frontend and an Express REST API.
2. **AI Engineering Principles**: Highlights hands-on experience with Retrieval-Augmented Generation, chunking tradeoffs (chunk size vs overlap), high-dimensional vector embeddings, and prompt defense against hallucination.
3. **UI/UX Attention to Detail**: Modern dark glassmorphism aesthetic, responsive design, citation drawer, chunk inspection tools, and instant 1-click testability.
