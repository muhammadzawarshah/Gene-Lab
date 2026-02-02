import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import v1Router from './Routes/index.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

const app = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1', v1Router);

// Documentation (Swagger)
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global Error Handler (Hamesha end mein)
app.use(globalErrorHandler);

export default app;