import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'html-proxy',
        configureServer(server) {
          server.middlewares.use('/api/proxy', async (req, res, next) => {
            try {
              // req.url is typically just the path+query, e.g. "/?url=..." because the middleware is mounted at /api/proxy
              // Construct full URL to parse params
              const reqUrl = `http://localhost${req.url}`;
              const urlParam = new URL(reqUrl).searchParams.get('url');

              if (!urlParam) {
                res.statusCode = 400;
                res.end('Missing url param');
                return;
              }

              console.log(`[Proxy] Fetching: ${urlParam}`);
              const response = await fetch(urlParam, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                signal: AbortSignal.timeout(15000)
              });

              if (!response.ok) {
                // Even if 404/500, we might want to return the body for debugging, or throw.
                // Let's forward the status.
                res.statusCode = response.status;
              }

              const text = await response.text();
              res.setHeader('Content-Type', 'text/plain');
              // Allow simple CORS for local dev
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(text);
            } catch (e: any) {
              console.error('[Proxy Error]', e);
              res.statusCode = 500;
              res.end(e.message);
            }
          });
        }
      }
    ],
    // define block removed for security

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
