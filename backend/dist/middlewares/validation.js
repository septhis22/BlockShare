"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLogin = exports.validateSignup = void 0;
const zod_1 = require("zod");
// Signup validation schema
const signupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, { message: 'Name must be at least 2 characters' })
        .max(50, { message: 'Name must be at most 50 characters' }),
    email: zod_1.z.string().email({ message: 'Please enter a valid email' }),
    password: zod_1.z
        .string()
        .min(6, { message: 'Password must be at least 6 characters long' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    }),
    public_key: zod_1.z
        .string()
        .min(10, { message: 'Public key must be at least 10 characters long' }),
});
// Login validation schema
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: 'Please enter a valid email' }),
    password: zod_1.z.string().min(1, { message: 'Password is required' }),
});
// Middleware for signup validation
const validateSignup = (req, res, next) => {
    try {
        signupSchema.parse(req.body); // Throws if validation fails
        next();
    }
    catch (err) {
        return res.status(400).json({ error: err.issues[0].message });
    }
};
exports.validateSignup = validateSignup;
// Middleware for login validation
const validateLogin = (req, res, next) => {
    try {
        loginSchema.parse(req.body);
        next();
    }
    catch (err) {
        return res.status(400).json({ error: err.issues[0].message });
    }
};
exports.validateLogin = validateLogin;
