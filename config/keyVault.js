const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

let secretClient = null;
let secretsCache = {};

/**
 * Initialize Azure Key Vault client
 */
function initializeKeyVault() {
  const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
  
  if (!keyVaultUrl) {
    console.warn('⚠️  AZURE_KEY_VAULT_URL not set. Falling back to environment variables.');
    return null;
  }

  try {
    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(keyVaultUrl, credential);
    console.log('✅ Azure Key Vault client initialized');
    return secretClient;
  } catch (error) {
    console.error('❌ Failed to initialize Key Vault client:', error.message);
    console.warn('⚠️  Falling back to environment variables.');
    return null;
  }
}

/**
 * Get a secret from Azure Key Vault or fallback to environment variable
 * @param {string} secretName - Name of the secret in Key Vault
 * @param {string} envVarName - Fallback environment variable name
 * @returns {Promise<string>} Secret value
 */
async function getSecret(secretName, envVarName) {
  // If Key Vault is not configured, use environment variable
  if (!secretClient) {
    const value = process.env[envVarName];
    if (!value) {
      throw new Error(`Secret ${secretName} not found in Key Vault and ${envVarName} not set in environment`);
    }
    return value;
  }

  // Check cache first
  if (secretsCache[secretName]) {
    return secretsCache[secretName];
  }

  try {
    // Get secret from Key Vault
    const secret = await secretClient.getSecret(secretName);
    const value = secret.value;
    
    if (!value) {
      throw new Error(`Secret ${secretName} has no value in Key Vault`);
    }

    // Cache the secret
    secretsCache[secretName] = value;
    return value;
  } catch (error) {
    // Fallback to environment variable if Key Vault fetch fails
    console.warn(`⚠️  Failed to get secret ${secretName} from Key Vault: ${error.message}`);
    console.warn(`⚠️  Falling back to environment variable ${envVarName}`);
    
    const value = process.env[envVarName];
    if (!value) {
      throw new Error(`Secret ${secretName} not found in Key Vault and ${envVarName} not set in environment`);
    }
    return value;
  }
}

/**
 * Load all required secrets from Key Vault
 * This should be called once at application startup
 */
async function loadSecrets() {
  try {
    const secrets = {
      PORT: process.env.PORT || '8080',
      SQL_SERVER: await getSecret('SQL-SERVER', 'SQL_SERVER'),
      SQL_DATABASE: await getSecret('SQL-DATABASE', 'SQL_DATABASE'),
      SQL_USER: await getSecret('SQL-USER', 'SQL_USER'),
      SQL_PASSWORD: await getSecret('SQL-PASSWORD', 'SQL_PASSWORD'),
      SQL_ENCRYPT: await getSecret('SQL-ENCRYPT', 'SQL_ENCRYPT') || 'true',
      SQL_TRUST_SERVER_CERTIFICATE: await getSecret('SQL-TRUST-SERVER-CERTIFICATE', 'SQL_TRUST_SERVER_CERTIFICATE') || 'false'
    };

    // Set environment variables for backward compatibility
    Object.assign(process.env, secrets);
    
    console.log('✅ Secrets loaded successfully');
    return secrets;
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
    throw error;
  }
}

module.exports = {
  initializeKeyVault,
  getSecret,
  loadSecrets
};

