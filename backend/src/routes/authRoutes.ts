import { Router } from 'express';
import { 
  signup, 
  login, 
  getProfile, 
  getUserByEmail, 
  revokeAndRegenerateKeys 
} from '../controllers/authcontroller';
import { authenticateToken } from '../middlewares/auth'; // Import your real middleware

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes - using REAL authenticateToken middleware
router.get('/profile', authenticateToken, getProfile);
router.get('/user', authenticateToken, getUserByEmail);
router.post('/regenerate-keys', authenticateToken, revokeAndRegenerateKeys);

export default router;