"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authcontroller_1 = require("../controllers/authcontroller");
const auth_1 = require("../middlewares/auth"); // Import your real middleware
const router = (0, express_1.Router)();
// Public routes
router.post('/signup', authcontroller_1.signup);
router.post('/login', authcontroller_1.login);
// Protected routes - using REAL authenticateToken middleware
router.get('/profile', auth_1.authenticateToken, authcontroller_1.getProfile);
router.get('/user', auth_1.authenticateToken, authcontroller_1.getUserByEmail);
router.get('/key-phrase', auth_1.authenticateToken, authcontroller_1.getKeyPhrase);
router.post('/encryption-key', auth_1.authenticateToken, authcontroller_1.registerEncryptionKey);
router.post('/rotate-key-phrase', auth_1.authenticateToken, authcontroller_1.rotateKeyPhrase);
router.post('/regenerate-keys', auth_1.authenticateToken, authcontroller_1.revokeAndRegenerateKeys);
exports.default = router;
