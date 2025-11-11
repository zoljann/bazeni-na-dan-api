import express from 'express';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { ENV } from './config/env';

const app = express();
app.use(express.json());
app.use(ENV.API_PREFIX, routes);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;
