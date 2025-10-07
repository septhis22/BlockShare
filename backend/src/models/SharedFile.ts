import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISharedFile extends Document {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  recordId: string;
  fileName: string;
  createdAt: Date;
  sharedAt: Date;
}

const sharedFileSchema = new Schema<ISharedFile>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    recordId: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true }
  }
);

// Rename createdAt to sharedAt
sharedFileSchema.virtual('sharedAt').get(function() {
  return this.createdAt;
});

// Index for better query performance
sharedFileSchema.index({ receiverId: 1, createdAt: -1 });
sharedFileSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model<ISharedFile>("SharedFile", sharedFileSchema);