import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sign, SignOptions, Secret } from 'jsonwebtoken';
import { z } from 'zod';
import User, { IUser } from '../models/User';
import {
  SignupRequest,
  LoginRequest,
  AuthResponse,
  UserResponse,
  JwtPayload
} from '../types/auth';

// Zod validation schemas
const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  public_key: z.string()
    .min(10, 'Public key must be at least 10 characters long')
    .trim(),
  encrypted_private_key: z.string()
    .min(1, 'Encrypted private key is required')
    .trim(),
  salt: z.string() // <-- FIX: Added salt to signup schema
    .min(1, 'Salt is required')
    .trim()
});

const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
});

// Schema for key regeneration request
const regenerateSchema = z.object({
    password: z.string().min(1, 'Password is required'),
    new_public_key: z.string().min(10, 'New public key is required').trim(),
    new_encrypted_private_key: z.string().min(1, 'New encrypted private key is required').trim(),
    new_salt: z.string().min(1, 'New salt is required').trim(),
});

// Generate JWT Token
const generateToken = (userId: string, email: string): string => {
  const secret: Secret = process.env.JWT_SECRET as string;
  return sign({ userId, email }, secret);
};


// Convert user document to response object
const userToResponse = (user: IUser): UserResponse => {
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
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
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

export const signup = [
  validateRequest(signupSchema),
  async (req: Request<{}, {}, SignupRequest & { salt: string }>, res: Response<AuthResponse>) => {
    try {
      const { name, email, password, public_key, encrypted_private_key, salt } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        public_key: public_key.trim(),
        encrypted_private_key: encrypted_private_key.trim(),
        salt: salt.trim() // <-- FIX: Save the salt during signup
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

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during signup'
      });
    }
  }
];

export const login = [
  validateRequest(loginSchema),
  async (req: Request<{}, {}, LoginRequest>, res: Response<AuthResponse>) => {
    try {
      const { email, password } = req.body;

      // Find user by email and include the password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }
];

export const revokeAndRegenerateKeys = [
    validateRequest(regenerateSchema),
    async (req: Request, res: Response) => {
        try {
            // Get user ID from authenticated middleware (set by authenticateToken)
            const userPayload = req.user as JwtPayload;
            
            if (!userPayload || !userPayload.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not authenticated' 
                });
            }

            const { 
                password, 
                new_public_key, 
                new_encrypted_private_key, 
                new_salt 
            } = req.body;

            // 1. Find the user and explicitly select the password hash
            const user = await User.findById(userPayload.userId).select('+password');
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            // 2. Verify current password
            if (!user.password) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Password hash missing from user record.' 
                });
            }
            
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Incorrect current password provided' 
                });
            }

            // 3. Update keys and salt
            user.public_key = new_public_key.trim();
            user.encrypted_private_key = new_encrypted_private_key.trim();
            user.salt = new_salt.trim();
            
            await user.save();

            // 4. Return success response
            res.status(200).json({
                success: true,
                message: 'Key pair successfully revoked and regenerated.',
                data: {
                    user: userToResponse(user),
                    new_public_key: user.public_key, 
                    new_salt: user.salt
                }
            });

        } catch (error) {
            console.error('Key regeneration error:', error);
            
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error during key regeneration'
            });
        }
    }
];

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (!userPayload) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find the user
    const user = await User.findById(userPayload.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return the response, including the salt
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          ...userToResponse(user),
          encrypted_private_key: user.encrypted_private_key,
          salt: user.salt // <-- FIX: Return the salt to the client
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });

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

  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
