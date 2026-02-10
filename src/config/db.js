import mysql from "mysql2";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Read the CA certificate
const ca = fs.readFileSync(process.env.DB_CA_PATH);


// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: ca,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export the pool for use in other files
export default pool.promise();
