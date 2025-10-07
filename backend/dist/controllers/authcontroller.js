"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = exports.getProfile = exports.login = exports.signup = exports.validateRequest = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = require("jsonwebtoken");
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
// Zod validation schemas
const signupSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters')
        .trim(),
    email: zod_1.z.string()
        .email('Please enter a valid email')
        .toLowerCase()
        .trim(),
    password: zod_1.z.string()
        .min(6, 'Password must be at least 6 characters long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    public_key: zod_1.z.string()
        .min(10, 'Public key must be at least 10 characters long')
        .trim(),
    encrypted_private_key: zod_1.z.string()
        .min(1, 'Encrypted private key is required')
        .trim()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Please enter a valid email')
        .toLowerCase()
        .trim(),
    password: zod_1.z.string()
        .min(1, 'Password is required')
});
// Generate JWT Token
const generateToken = (userId, email) => {
    const secret = process.env.JWT_SECRET;
    return (0, jsonwebtoken_1.sign)({ userId, email }, secret);
};
// Convert user document to response object
const userToResponse = (user) => {
    return {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        public_key: user.public_key,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};
// Validation middleware function
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            req.body = validatedData; // Replace with validated data
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
exports.signup = [
    (0, exports.validateRequest)(signupSchema),
    async (req, res) => {
        try {
            const { name, email, password, public_key, encrypted_private_key } = req.body;
            // Check if user already exists
            const existingUser = await User_1.default.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
            // Create new user
            const newUser = new User_1.default({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                public_key: public_key.trim(),
                encrypted_private_key: encrypted_private_key.trim()
            });
            await newUser.save();
            // Generate JWT token
            const token = generateToken(newUser._id.toString(), newUser.email);
            // Return response
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    user: userToResponse(newUser),
                    token
                }
            });
        }
        catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during signup'
            });
        }
    }
];
exports.login = [
    (0, exports.validateRequest)(loginSchema),
    async (req, res) => {
        try {
            const { email, password } = req.body;
            // Find user by email
            const user = await User_1.default.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            // Check password
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            // Generate JWT token
            const token = generateToken(user._id.toString(), user.email);
            // Return response
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userToResponse(user),
                    token
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        }
    }
];
const getProfile = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const user = await User_1.default.findById(userPayload.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: {
                user: {
                    ...userToResponse(user),
                    encrypted_private_key: user.encrypted_private_key
                }
            }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getProfile = getProfile;
const getUserByEmail = async (req, res) => {
    try {
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const { email } = req.query;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email query parameter is required'
            });
        }
        const user = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'User retrieved successfully',
            data: {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    public_key: user.public_key
                }
            }
        });
    }
    catch (error) {
        console.error('Get user by email error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getUserByEmail = getUserByEmail;
