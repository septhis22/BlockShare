import express, { Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import sharedRoutes from './routes/sharedRoutes';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Shared files routes
app.use('/api/shared', sharedRoutes);

// Basic test route
app.get('/', (req: Request, res: Response) => {
  res.send('Backend is running');
});

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();