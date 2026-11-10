const app = require('./app');
const config = require('./config');

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log('DocuMind AI backend server started.');
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Default provider: ${config.DEFAULT_PROVIDER}`);
});
