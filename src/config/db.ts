import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  await mongoose.connect(uri);
  console.log('✅ Mongo connected');
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('🛑 Mongo disconnected');
}

export function mongoReadyState() {
  return mongoose.connection.readyState;
}

export async function pingMongo() {
  await mongoose.connection.db?.admin().command({ ping: 1 });
}
