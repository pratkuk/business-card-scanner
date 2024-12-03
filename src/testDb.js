const pool = require('./database');

async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0]);
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        pool.end();
    }
}

testConnection();