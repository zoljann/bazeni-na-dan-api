import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import { ENV } from './env';

const options: Options = {
  definition: {
    openapi: '3.0.3',
    info: { title: 'Bazeni-na-dan API', version: '1.0.0' },
    servers: [{ url: ENV.API_PREFIX }]
  },
  apis: ['src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
