const express = require('express');
const cors = require('cors');
const { initTable, getAllTodos, addTodo, deleteTodo } = require('./models/todo');

const app = express();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Initialize SQL table
initTable().catch(console.error);

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});