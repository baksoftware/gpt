import express from 'express';
import cors from 'cors';
import { router as aiRouter } from './routes/ai.ts';

const app = express();
const port = 3001; // Different from your frontend port

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', aiRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 