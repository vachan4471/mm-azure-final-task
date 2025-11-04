const { getPool, sql } = require('../config/db');

// Create table if not exists (optional)
async function initTable() {
  const pool = await getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Todos' AND xtype='U')
    CREATE TABLE Todos (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(255),
      completed BIT DEFAULT 0
    )
  `);
  console.log('✅ Todos table checked/created');
}

async function getAllTodos() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Todos');
  return result.recordset;
}

async function addTodo(title) {
  const pool = await getPool();
  await pool.request()
    .input('title', sql.NVarChar, title)
    .query('INSERT INTO Todos (title) VALUES (@title)');
}

async function deleteTodo(id) {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM Todos WHERE id = @id');
}

module.exports = { initTable, getAllTodos, addTodo, deleteTodo };