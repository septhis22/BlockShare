"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sharedController_1 = require("../controllers/sharedController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/upload', auth_1.authenticateToken, express_1.default.raw({ type: 'application/octet-stream', limit: '100mb' }), sharedController_1.uploadEncryptedFile);
router.get('/file/:recordId', auth_1.authenticateToken, sharedController_1.downloadEncryptedFile);
router.post('/share', auth_1.authenticateToken, sharedController_1.shareFile);
router.get('/shared', auth_1.authenticateToken, sharedController_1.getSharedFiles);
router.get('/sent', auth_1.authenticateToken, sharedController_1.getSentFiles);
exports.default = router;
