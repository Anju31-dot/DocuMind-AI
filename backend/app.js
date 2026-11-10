const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    project: 'DocuMind AI — RAG-Based Document Assistant',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found.'
  });
});

app.use(errorHandler);

module.exports = app;
