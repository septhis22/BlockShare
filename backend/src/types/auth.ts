import { Types } from "mongoose";

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  public_key: string;
  encrypted_private_key: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  _id: Types.ObjectId;
  name: string;
  email: string;
  public_key: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserResponse;
    token: string;
  };
  errors?: any[];
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}