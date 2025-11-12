import app from './app';
import { ENV } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import http from 'http';

(async () => {
  try {
    if (!ENV.MONGO_URI) throw new Error('Missing MONGO_URI in .env');
    await connectDB(ENV.MONGO_URI);

    const server = http.createServer(app);

    server.keepAliveTimeout = 70_000;
    server.headersTimeout = 75_000;
    server.requestTimeout = 60_000;

    server.listen(ENV.PORT, () => {
      console.log(`API:  http://localhost:${ENV.PORT}/health`);
      console.log(`DB:   http://localhost:${ENV.PORT}/health/db`);
      console.log(`Docs: http://localhost:${ENV.PORT}/docs`);
    });

    const shutdown = async (reason = 'shutdown') => {
      console.log(`↘︎ Graceful ${reason}...`);
      server.close(async () => {
        try {
          await disconnectDB();
        } finally {
          process.exit(0);
        }
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (err) => {
      console.error('unhandledRejection:', err);
      shutdown('unhandledRejection');
    });
    process.on('uncaughtException', (err) => {
      console.error('uncaughtException:', err);
      shutdown('uncaughtException');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
