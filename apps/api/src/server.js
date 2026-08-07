import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`AisenLens API listening at http://127.0.0.1:${port}`);
});

function stopServer() {
  server.close(() => process.exit(0));
}

process.once('SIGINT', stopServer);
process.once('SIGTERM', stopServer);
