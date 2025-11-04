const sql = require('mssql');
require('dotenv').config();

// Database configuration now uses secrets loaded from Azure Key Vault
// The secrets are loaded into process.env by config/keyVault.js
// We create the config lazily when getPool() is called to ensure secrets are loaded
function getConfig() {
  return {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true'
    }
  };
}

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    try {
      const config = getConfig();
      
      // Validate config before attempting connection
      if (!config.server || !config.database || !config.user || !config.password) {
        throw new Error('Missing required database configuration. Please ensure SQL_SERVER, SQL_DATABASE, SQL_USER, and SQL_PASSWORD are set.');
      }
      
      console.log('🔄 Connecting to Azure SQL Database...');
      console.log(`🔄 Server: ${config.server}, Database: ${config.database}, User: ${config.user}`);
      poolPromise = sql.connect(config);
      await poolPromise;
      console.log('✅ Connected to Azure SQL Database');
    } catch (err) {
      console.error('❌ Database Connection Failed:', err.message);
      console.error('❌ Error details:', err);
      poolPromise = null; // Reset so we can retry
      throw err;
    }
  }
  return poolPromise;
}

module.exports = { sql, getPool };