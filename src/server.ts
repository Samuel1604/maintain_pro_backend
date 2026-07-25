import app from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "@/config/database.js";
import { checkRedis } from "@/config/checkRedis.js";

dotenv.config();

const PORT = process.env.PORT!;

const startServer = async () => {
  await connectDB();
  await checkRedis();
  app.listen(PORT, () => {
    console.log(`✅Server started...\n✅Server running on port: ${PORT}`);
  });
};

startServer();
