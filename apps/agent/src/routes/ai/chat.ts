import { Hono } from 'hono';

export const chatRoute = new Hono();

chatRoute.post('/', (c) => {
  return c.json(
    {
      error: 'Not implemented',
      message: 'AI chat is not yet implemented. This endpoint is a placeholder.',
    },
    501
  );
});
