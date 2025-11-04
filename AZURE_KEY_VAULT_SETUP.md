# Azure Key Vault Integration Guide

This application is now configured to use Azure Key Vault for secure secret management. The application will automatically fall back to environment variables if Key Vault is not configured.

## Prerequisites

1. An Azure subscription
2. Azure Key Vault instance
3. Azure CLI installed (for local development)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@azure/keyvault-secrets` - For accessing secrets from Key Vault
- `@azure/identity` - For Azure authentication

### 2. Create Azure Key Vault

If you haven't already, create a Key Vault in Azure:

```bash
# Login to Azure
az login

# Create a resource group (if needed)
az group create --name myResourceGroup --location eastus

# Create Key Vault
az keyvault create --name your-keyvault-name --resource-group myResourceGroup --location eastus
```

### 3. Add Secrets to Key Vault

Add your database secrets to Key Vault with the following names:

```bash
az keyvault secret set --vault-name your-keyvault-name --name "SQL-SERVER" --value "db-server-mm-node.database.windows.net"
az keyvault secret set --vault-name your-keyvault-name --name "SQL-DATABASE" --value "db-mm-node"
az keyvault secret set --vault-name your-keyvault-name --name "SQL-USER" --value "sqladmin"
az keyvault secret set --vault-name your-keyvault-name --name "SQL-PASSWORD" --value "Admin123!"
az keyvault secret set --vault-name your-keyvault-name --name "SQL-ENCRYPT" --value "true"
az keyvault secret set --vault-name your-keyvault-name --name "SQL-TRUST-SERVER-CERTIFICATE" --value "false"
```

### 4. Configure Access

#### For Local Development:

The application uses `DefaultAzureCredential`, which will try multiple authentication methods:

1. **Azure CLI** (recommended for local dev):
   ```bash
   az login
   ```

2. **Environment Variables** (for service principals):
   ```bash
   export AZURE_CLIENT_ID="your-client-id"
   export AZURE_CLIENT_SECRET="your-client-secret"
   export AZURE_TENANT_ID="your-tenant-id"
   ```

3. **Managed Identity** (for Azure-hosted services)

#### For Azure App Service / Container Instances:

1. Enable **Managed Identity** on your App Service:
   - Go to your App Service → Identity → System assigned → On

2. Grant the Managed Identity access to Key Vault:
   ```bash
   # Get the principal ID from the App Service Identity
   PRINCIPAL_ID=$(az webapp identity show --name your-app-name --resource-group myResourceGroup --query principalId -o tsv)
   
   # Grant access
   az keyvault set-policy --name your-keyvault-name --object-id $PRINCIPAL_ID --secret-permissions get list
   ```

### 5. Configure Environment Variables

#### For Local Development:

Create a `.env` file in your project root:

```env
# Azure Key Vault URL (required for Key Vault integration)
AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/

# Server Configuration
PORT=8084

# Database Configuration (Fallback - only used if Key Vault is not available)
SQL_SERVER=db-server-mm-node.database.windows.net
SQL_DATABASE=db-mm-node
SQL_USER=sqladmin
SQL_PASSWORD=Admin123!
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=false
```

#### For Azure App Service:

**You need to set environment variables in Azure App Service Configuration**, not in a `.env` file.

1. **Via Azure Portal:**
   - Go to your App Service → Configuration → Application settings
   - Click "+ New application setting"
   - Add: `AZURE_KEY_VAULT_URL` = `https://kv-mm-node.vault.azure.net/`
   - Click "Save"

2. **Via Azure CLI:**
   ```bash
   az webapp config appsettings set \
     --name your-app-name \
     --resource-group rg-mm-node-app \
     --settings AZURE_KEY_VAULT_URL=https://kv-mm-node.vault.azure.net/
   ```

**Note:** If `AZURE_KEY_VAULT_URL` is not set, the application will automatically use the environment variables as fallback.

## How It Works

1. **Application Startup**: When the app starts, it initializes the Azure Key Vault client
2. **Secret Loading**: All secrets are loaded from Key Vault (or environment variables as fallback)
3. **Caching**: Secrets are cached in memory for performance
4. **Fallback**: If Key Vault is unavailable or not configured, the app uses environment variables

## Secret Names in Key Vault

The following secret names are expected in Azure Key Vault:

- `SQL-SERVER` - SQL Server hostname
- `SQL-DATABASE` - Database name
- `SQL-USER` - Database username
- `SQL-PASSWORD` - Database password
- `SQL-ENCRYPT` - Encryption setting (true/false)
- `SQL-TRUST-SERVER-CERTIFICATE` - Trust server certificate (true/false)

## Testing

1. **Test with Key Vault**:
   ```bash
   # Set the Key Vault URL
   export AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/
   
   # Login to Azure
   az login
   
   # Run the app
   npm start
   ```

2. **Test with Environment Variables** (fallback):
   ```bash
   # Don't set AZURE_KEY_VAULT_URL
   # Ensure all SQL_* variables are set
   npm start
   ```

## Troubleshooting

### Error: "Failed to initialize Key Vault client"
- Ensure `AZURE_KEY_VAULT_URL` is correctly set
- Verify you're authenticated with Azure CLI (`az login`)
- Check that the Key Vault exists and is accessible

### Error: "Secret not found in Key Vault"
- Verify the secret exists in Key Vault with the correct name
- Check that your identity has "Get" permission on secrets
- Ensure the secret name matches exactly (case-sensitive)

### Error: "DefaultAzureCredential failed"
- For local dev: Run `az login`
- For Azure services: Ensure Managed Identity is enabled
- Check that the identity has proper permissions

## Security Best Practices

1. ✅ **Never commit secrets** to version control
2. ✅ **Use Key Vault** for production environments
3. ✅ **Use Managed Identity** for Azure-hosted services
4. ✅ **Limit access** to Key Vault using RBAC
5. ✅ **Enable logging** and monitoring on Key Vault
6. ✅ **Rotate secrets** regularly

