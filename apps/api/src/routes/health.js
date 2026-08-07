export function registerHealthRoutes(app) {
  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok' });
  });
}
