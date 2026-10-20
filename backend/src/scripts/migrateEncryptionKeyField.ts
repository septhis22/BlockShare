import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const migrateEncryptionKeyField = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGO_URI must be configured before running this migration.');
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGO_DB_NAME?.trim() || 'BlockShare'
  });

  try {
    const result = await mongoose.connection.collection('User').updateMany(
      { wallet_public_key: { $exists: true } },
      [
        { $set: { public_key: { $ifNull: ['$public_key', '$wallet_public_key'] } } },
        { $unset: 'wallet_public_key' }
      ]
    );

    console.log(`Removed the duplicate key field from ${result.modifiedCount} user document(s).`);
  } finally {
    await mongoose.disconnect();
  }
};

migrateEncryptionKeyField().catch(error => {
  console.error('Encryption key field migration failed:', error);
  process.exitCode = 1;
});
