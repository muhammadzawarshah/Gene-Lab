// src/utils/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Distribution API Documentation',
      version: '1.0.0',
      description: 'End-to-end Backend for Distribution Module',
    },
    servers: [{ url: 'http://localhost:3000/api/v1' }],
  },
  apis: ['./src/routes/*.ts'], // Routes file se docs uthayega
};

export const specs = swaggerJsdoc(options);