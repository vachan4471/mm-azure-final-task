// Log immediately when script starts
console.log('📦 index.js loaded - Application starting...');
console.log('📦 Node.js version:', process.version);
console.log('📦 Current working directory:', process.cwd());
console.log('📦 Environment:', process.env.NODE_ENV || 'development');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, but log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const { initTable, getAllTodos, addTodo, deleteTodo } = require('./models/todo');
const { initializeKeyVault, loadSecrets } = require('./config/keyVault');

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
    initializeKeyVault();
    
    // Load all secrets from Key Vault (or fallback to environment variables)
    console.log('🔄 Loading secrets from Key Vault...');
    await loadSecrets();
    
    const PORT = process.env.PORT || 8080;
    console.log(`🔄 Port configured: ${PORT}`);

    // Initialize SQL table
    console.log('🔄 Initializing database connection...');
    await initTable();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Application started successfully`);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('❌ Error stack:', error.stack);
    process.exit(1);
  }
}

// Start the application
startApp();

// Routes
app.get('/', (req, res) => res.send('API is running with Azure SQL Database ✅'));

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