"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const migrateEncryptionKeyField = async () => {
    const mongoUri = process.env.MONGO_URI?.trim();
    if (!mongoUri) {
        throw new Error('MONGO_URI must be configured before running this migration.');
    }
    await mongoose_1.default.connect(mongoUri, {
        dbName: process.env.MONGO_DB_NAME?.trim() || 'BlockShare'
    });
    try {
        const result = await mongoose_1.default.connection.collection('User').updateMany({ wallet_public_key: { $exists: true } }, [
            { $set: { public_key: { $ifNull: ['$public_key', '$wallet_public_key'] } } },
            { $unset: 'wallet_public_key' }
        ]);
        console.log(`Removed the duplicate key field from ${result.modifiedCount} user document(s).`);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
};
migrateEncryptionKeyField().catch(error => {
    console.error('Encryption key field migration failed:', error);
    process.exitCode = 1;
});
