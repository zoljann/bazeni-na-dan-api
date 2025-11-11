import app from './app';
import { ENV } from './config/env';

app.listen(ENV.PORT, () => {
  console.log(`API:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
  console.log(`Docs: http://localhost:${ENV.PORT}/docs`);
});
