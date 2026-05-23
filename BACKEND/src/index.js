const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('[backend] booting', {
  port: PORT,
  redisUrl: process.env.REDIS_URL,
  aiBaseUrl: process.env.AI_BASE_URL,
  corsOrigin: process.env.CORS_ORIGIN
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // 다른 도메인에서의 리소스 요청 허용
  })
);
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/media', express.static('/app/media'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/works', require('./routes/works'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'YourFactory Backend API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler (반드시 마지막)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Cron jobs
require('./cron/scheduler');
require('./cron/cleanupTask.js');

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});