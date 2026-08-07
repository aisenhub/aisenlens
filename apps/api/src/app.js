import express from 'express';
import { registerHealthRoutes } from './routes/health.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

registerHealthRoutes(app);

app.use((request, response) => {
  response.status(404).json({ error: 'Not found' });
});
