import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  public_key: string;
  encrypted_private_key: string;
  salt: string; // <-- CRITICAL FIX: Added salt to interface
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"]
    },
    email: { 
      type: String, 
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false  // <-- ADD THIS LINE
  },
    public_key: {
      type: String,
      required: [true, "Public key is required"],
      trim: true
    },
    encrypted_private_key: {
      type: String,
      required: [true, "Encrypted private key is required"],
      trim: true
    },
    salt: { // <-- CRITICAL FIX: Added salt to schema definition
      type: String,
      required: [true, "Salt is required"],
      trim: true
    }
  },
  { 
    timestamps: true 
  }
);

// Index for better query performance
userSchema.index({ email: 1 });

export default mongoose.model<IUser>("User", userSchema);
