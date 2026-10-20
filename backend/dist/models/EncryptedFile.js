"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const encryptedFileSchema = new mongoose_1.Schema({
    fileId: { type: String, required: true },
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    gridFsId: { type: mongoose_1.Schema.Types.ObjectId },
    cid: { type: String },
    recordId: { type: String },
    fileName: { type: String, required: true },
    encryptedAesKey: { type: String, required: true },
    recipientPublicKey: { type: String, required: true },
    sharedAt: { type: Date }
}, { timestamps: { createdAt: true, updatedAt: false } });
encryptedFileSchema.index({ fileId: 1 }, { unique: true, partialFilterExpression: { fileId: { $type: "string" } } });
encryptedFileSchema.index({ recordId: 1 }, { unique: true, partialFilterExpression: { recordId: { $type: "string" } } });
encryptedFileSchema.index({ receiverId: 1, sharedAt: -1 });
encryptedFileSchema.index({ senderId: 1, sharedAt: -1 });
exports.default = mongoose_1.default.model("EncryptedFile", encryptedFileSchema, "Files");
