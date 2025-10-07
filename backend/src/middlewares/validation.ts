import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Signup validation schema
const signupSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(50, { message: 'Name must be at most 50 characters' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message:
        'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    }),
  public_key: z
    .string()
    .min(10, { message: 'Public key must be at least 10 characters long' }),
});

// Login validation schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Middleware for signup validation
export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  try {
    signupSchema.parse(req.body); // Throws if validation fails
    next();
  } catch (err: any) {
    return res.status(400).json({ error: err.errors[0].message });
  }
};

// Middleware for login validation
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (err: any) {
    return res.status(400).json({ error: err.errors[0].message });
  }
};
