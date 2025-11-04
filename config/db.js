const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    try {
      poolPromise = await sql.connect(config);
      console.log('✅ Connected to Azure SQL Database');
    } catch (err) {
      console.error('❌ Database Connection Failed:', err.message);
      throw err;
    }
  }
  return poolPromise;
}

module.exports = { sql, getPool };