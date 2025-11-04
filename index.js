// Log immediately when script starts - use both console.log and console.error to ensure visibility
console.log('📦 index.js loaded - Application starting...');
console.error('📦 index.js loaded - Application starting...'); // Also log to stderr
console.log('📦 Node.js version:', process.version);
console.log('📦 Current working directory:', process.cwd());
console.log('📦 Environment:', process.env.NODE_ENV || 'development');
console.log('📦 PORT environment variable:', process.env.PORT || 'not set');

// Ensure logs are flushed immediately
process.stdout.write('📦 STDOUT: Application starting...\n');
process.stderr.write('📦 STDERR: Application starting...\n');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('❌ Error details:', reason);
  if (reason && reason.stack) {
    console.error('❌ Stack trace:', reason.stack);
  }
  // Log but don't exit in production (Azure App Service will restart if needed)
  console.error('❌ Application will continue but may be in an unstable state');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Load modules with error handling
let express, cors, initTable, getAllTodos, addTodo, deleteTodo, initializeKeyVault, loadSecrets;

try {
  console.log('📦 Loading express...');
  express = require('express');
  console.log('📦 Loading cors...');
  cors = require('cors');
  console.log('📦 Loading todo model...');
  const todoModule = require('./models/todo');
  initTable = todoModule.initTable;
  getAllTodos = todoModule.getAllTodos;
  addTodo = todoModule.addTodo;
  deleteTodo = todoModule.deleteTodo;
  console.log('📦 Loading keyVault config...');
  const keyVaultModule = require('./config/keyVault');
  initializeKeyVault = keyVaultModule.initializeKeyVault;
  loadSecrets = keyVaultModule.loadSecrets;
  console.log('✅ All modules loaded successfully');
} catch (moduleError) {
  console.error('❌ Failed to load modules:', moduleError);
  console.error('❌ Module error stack:', moduleError.stack);
  process.exit(1);
}

const app = express();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// Initialize Azure Key Vault and load secrets before starting the app
async function startApp() {
  try {
    console.log('🔄 Starting application initialization...');
    
    // Initialize Key Vault client
    console.log('🔄 Checking Key Vault configuration...');
    console.log('🔄 AZURE_KEY_VAULT_URL:', process.env.AZURE_KEY_VAULT_URL ? 'Set' : 'Not set');
    initializeKeyVault();
    
    // Load all secrets from Key Vault (or fallback to environment variables)
    console.log('🔄 Loading secrets from Key Vault...');
    try {
      await loadSecrets();
    } catch (secretError) {
      console.error('❌ Failed to load secrets:', secretError.message);
      console.error('❌ Secret error details:', secretError);
      // Check if we have fallback environment variables
      const hasFallback = process.env.SQL_SERVER && process.env.SQL_DATABASE && 
                          process.env.SQL_USER && process.env.SQL_PASSWORD;
      if (!hasFallback) {
        console.error('❌ No Key Vault access and no fallback environment variables found!');
        console.error('❌ Required: SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD');
        throw secretError;
      } else {
        console.warn('⚠️  Using fallback environment variables for database connection');
      }
    }
    
    const PORT = process.env.PORT || 8080;
    console.log(`🔄 Port configured: ${PORT}`);
    console.log(`🔄 Database config - Server: ${process.env.SQL_SERVER ? 'Set' : 'Missing'}, Database: ${process.env.SQL_DATABASE ? 'Set' : 'Missing'}, User: ${process.env.SQL_USER ? 'Set' : 'Missing'}`);

    // Initialize SQL table (try but don't fail if it doesn't work)
    console.log('🔄 Initializing database connection...');
    try {
      await initTable();
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      console.error('❌ Database error details:', dbError);
      console.warn('⚠️  Server will start but database operations may fail');
    }

    // Start the server (always try to start, even if DB failed)
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Application started successfully`);
      console.log(`✅ Health check endpoint: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    // Log to stderr as well
    process.stderr.write(`❌ Failed to start application: ${error.message}\n`);
    if (error.stack) {
      process.stderr.write(`❌ Stack: ${error.stack}\n`);
    }
    // Keep the process alive for a bit to ensure logs are written
    setTimeout(() => {
      console.error('❌ Exiting with code 1 after error');
      process.exit(1);
    }, 10000); // Increased to 10 seconds to ensure logs are written
  }
}

// Start the application
startApp();

// Routes
// Root route - serve the HTML page from public folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API health check endpoint
app.get('/api/health', (req, res) => res.send('API is running with Azure SQL Database ✅'));

app.get('/todos', async (req, res) => {
  try {
    const todos = await getAllTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/todos', async (req, res) => {
  try {
    const { title } = req.body;
    await addTodo(title);
    res.status(201).send('Todo added');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    await deleteTodo(req.params.id);
    res.send('Todo deleted');
  } catch (err) {
    res.status(500).send(err.message);
  }
});