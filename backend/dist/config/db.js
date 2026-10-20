"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI?.trim();
        if (!mongoUri)
            throw new Error('MONGO_URI is not configured');
        if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
            throw new Error('MONGO_URI must start with mongodb:// or mongodb+srv://');
        }
        const dbName = process.env.MONGO_DB_NAME?.trim() || 'BlockShare';
        await mongoose_1.default.connect(mongoUri, { dbName });
        console.log(`MongoDB connected to database "${mongoose_1.default.connection.name}"`);
    }
    catch (error) {
        console.error("DB connection failed:", error.message);
        process.exit(1);
    }
};
exports.default = connectDB;
