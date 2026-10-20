import mongoose, { Document, Schema, Types } from "mongoose";

export interface IEncryptedFile extends Document {
  _id: Types.ObjectId;
  fileId: string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  gridFsId?: Types.ObjectId;
  cid?: string;
  recordId?: string;
  fileName: string;
  encryptedAesKey: string;
  recipientPublicKey: string;
  sharedAt?: Date;
  createdAt: Date;
}

const encryptedFileSchema = new Schema<IEncryptedFile>(
  {
    fileId: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gridFsId: { type: Schema.Types.ObjectId },
    cid: { type: String },
    recordId: { type: String },
    fileName: { type: String, required: true },
    encryptedAesKey: { type: String, required: true },
    recipientPublicKey: { type: String, required: true },
    sharedAt: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

encryptedFileSchema.index(
  { fileId: 1 },
  { unique: true, partialFilterExpression: { fileId: { $type: "string" } } }
);
encryptedFileSchema.index(
  { recordId: 1 },
  { unique: true, partialFilterExpression: { recordId: { $type: "string" } } }
);
encryptedFileSchema.index({ receiverId: 1, sharedAt: -1 });
encryptedFileSchema.index({ senderId: 1, sharedAt: -1 });

export default mongoose.model<IEncryptedFile>("EncryptedFile", encryptedFileSchema, "Files");
