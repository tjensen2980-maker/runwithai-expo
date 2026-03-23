// Delete user script - run with: node delete-user.js
// First run: npm install pg

const { Pool } = require('pg');

// Railway PostgreSQL connection string (from Railway Variables)
const DATABASE_URL = 'postgresql://postgres:KeCvpoPqlOwkhjnjWAHQvufyxqSwVvTm@interchange.proxy.rlwy.net:41785/railway';

// IMPORTANT: Replace PASSWORD above with your actual password from Railway!
// Go to Railway > Postgres > Connect > Public Network > click "show" on Connection URL

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteUser() {
  try {
    console.log('Connecting to database...');
    
    // First, check user exists
    const checkResult = await pool.query(
      "SELECT id, email FROM users WHERE email = 'tjensen2970@outlook.com'"
    );
    
    if (checkResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    console.log('Found user:', checkResult.rows[0]);
    
    const userId = checkResult.rows[0].id;
    
    // Delete related data first (foreign key constraints)
    console.log('Deleting related data...');
    await pool.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM runs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM training_plan WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM week_plan WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM profile WHERE user_id = $1', [userId]);
    
    // Delete user
    console.log('Deleting user...');
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    console.log('✅ User tjensen2970@outlook.com deleted successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

deleteUser();
