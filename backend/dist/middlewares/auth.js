"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.get('authorization');
    const [scheme, token] = authHeader?.trim().split(/\s+/, 2) ?? [];
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'A Bearer access token is required'
        });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ success: false, message: 'Authentication is not configured' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (typeof decoded === 'string' || typeof decoded.userId !== 'string' || typeof decoded.email !== 'string') {
            return res.status(403).json({ success: false, message: 'Invalid token payload' });
        }
        req.user = { userId: decoded.userId, email: decoded.email };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(403).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Invalid token'
        });
    }
};
exports.authenticateToken = authenticateToken;
