import express from 'express';
import {
  shareFile,
  getSharedFiles,
  getSentFiles,
  uploadEncryptedFile,
  downloadEncryptedFile
} from '../controllers/sharedController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

router.post('/upload', authenticateToken, express.raw({ type: 'application/octet-stream', limit: '100mb' }), uploadEncryptedFile);
router.get('/file/:recordId', authenticateToken, downloadEncryptedFile);
router.post('/share', authenticateToken, shareFile);
router.get('/shared', authenticateToken, getSharedFiles);
router.get('/sent', authenticateToken, getSentFiles);

export default router;