import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { healthRoute } from './routes/health.js';
import { chatRoute } from './routes/ai/chat.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Public routes (no auth required)
app.route('/health', healthRoute);

// Protected routes (Levelset Admin only)
app.use('/api/*', authMiddleware);
app.route('/api/ai/chat', chatRoute);

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Levelset Agent starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
