import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'levelset-agent',
    timestamp: new Date().toISOString(),
  });
});
