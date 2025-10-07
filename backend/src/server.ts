import express, { Request, Response } from 'express';
import connectDB from './config/db';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();

app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

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