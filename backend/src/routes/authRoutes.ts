import express from 'express';
import { signup, login, getProfile, getUserByEmail } from '../controllers/authcontroller';
import { validateSignup, validateLogin } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/profile', authenticateToken, getProfile);
router.get('/user', authenticateToken, getUserByEmail);

export default router;