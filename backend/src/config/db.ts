import mongoose  from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI?.trim();
    if (!mongoUri) throw new Error('MONGO_URI is not configured');
    if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
      throw new Error('MONGO_URI must start with mongodb:// or mongodb+srv://');
    }

    const dbName = process.env.MONGO_DB_NAME?.trim() || 'BlockShare';
    await mongoose.connect(mongoUri, { dbName });
    console.log(`MongoDB connected to database "${mongoose.connection.name}"`);
  } catch (error) {
    console.error("DB connection failed:", (error as Error).message);
    process.exit(1);
  }
};

export default connectDB;
