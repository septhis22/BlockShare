import express from 'express';
import { shareFile, getSharedFiles, getSentFiles } from '../controllers/sharedController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

router.post('/share', authenticateToken, shareFile);
router.get('/shared', authenticateToken, getSharedFiles);
router.get('/sent', authenticateToken, getSentFiles);

export default router;