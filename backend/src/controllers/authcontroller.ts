import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
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
  wallet_address: z.string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'A valid MetaMask wallet address is required')
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

const encryptionKeySchema = z.object({
  public_key: z.string().regex(/^[0-9a-fA-F]{128}$/, 'A 128-character uncompressed public key is required'),
  wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'A valid wallet address is required')
});

const rotatePhraseSchema = z.object({
  password: z.string().min(1, 'Password is required')
});

// Generate JWT Token
const generateToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const options: SignOptions = { expiresIn: '24h' };
  return sign({ userId, email }, secret as Secret, options);
};


// Convert user document to response object
const userToResponse = (user: IUser): UserResponse => {
  return {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    public_key: user.public_key || '',
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
  async (req: Request<{}, {}, SignupRequest>, res: Response<AuthResponse>) => {
    try {
      const { name, email, password, wallet_address } = req.body;

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
        wallet_address: wallet_address.toLowerCase(),
        key_phrase: randomBytes(32).toString('hex')
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
      if ((error as { code?: number }).code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }
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

export const getKeyPhrase = async (req: Request, res: Response) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (!userPayload?.userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const user = await User.findById(userPayload.userId).select('+key_phrase');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.key_phrase) {
      user.key_phrase = randomBytes(32).toString('hex');
      await user.save();
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.status(200).json({
      success: true,
      data: { key_phrase: user.key_phrase }
    });
  } catch (error) {
    console.error('Get key phrase error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve key phrase' });
  }
};

export const registerEncryptionKey = [
  validateRequest(encryptionKeySchema),
  async (req: Request, res: Response) => {
    try {
      const userPayload = req.user as JwtPayload;
      if (!userPayload?.userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const { public_key, wallet_address } = req.body;
      const user = await User.findById(userPayload.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const normalizedAddress = wallet_address.toLowerCase();
      if (user.wallet_address && user.wallet_address !== normalizedAddress) {
        return res.status(409).json({
          success: false,
          message: 'A different wallet is already linked. Rotate the key phrase before changing wallets.'
        });
      }

      if (user.public_key && user.public_key.toLowerCase() !== public_key.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'The derived key does not match the registered key. Check MetaMask and sign the same phrase, or rotate the key phrase.'
        });
      }

      user.wallet_address = normalizedAddress;
      user.public_key = public_key.toLowerCase();
      await user.save();

      res.status(200).json({
        success: true,
        data: { public_key: user.public_key, wallet_address: user.wallet_address }
      });
    } catch (error) {
      console.error('Register encryption key error:', error);
      res.status(500).json({ success: false, message: 'Failed to register encryption key' });
    }
  }
];

export const rotateKeyPhrase = [
  validateRequest(rotatePhraseSchema),
  async (req: Request, res: Response) => {
    try {
      const userPayload = req.user as JwtPayload;
      if (!userPayload?.userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const user = await User.findById(userPayload.userId).select('+password +key_phrase');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!user.password || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ success: false, message: 'Incorrect current password' });
      }

      user.key_phrase = randomBytes(32).toString('hex');
      user.wallet_address = undefined;
      user.public_key = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Key phrase rotated. Sign in with MetaMask to register the new encryption key.'
      });
    } catch (error) {
      console.error('Rotate key phrase error:', error);
      res.status(500).json({ success: false, message: 'Failed to rotate key phrase' });
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

    if (!user.public_key) {
      return res.status(409).json({
        success: false,
        message: 'This user has not connected MetaMask and activated file encryption yet.'
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
          public_key: user.public_key,
          wallet_address: user.wallet_address
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
