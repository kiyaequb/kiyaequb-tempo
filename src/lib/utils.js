import mongoose from "mongoose";

const connection = {};

export const connectToDb = async () => {
  try {
    if (connection.isConnected) {
      console.log("Using existing connection");
      return;
    }
    const db = await mongoose.connect(process.env.MONGO);
    connection.isConnected = db.connections[0].readyState;
    console.log("✅ Connected to:", db.connection.name);
  } catch (error) {
    console.log(error);
    // throw new Error(error);
    return "Network problem error connecting to the database";
  }
};