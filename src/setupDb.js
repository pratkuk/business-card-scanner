const pool = require('./database');
const fs = require('fs').promises;

async function setupDatabase() {
    try {
        // Read SQL file
        const sql = await fs.readFile('createTable.sql', 'utf8');
        
        // Execute SQL
        await pool.query(sql);
        console.log('Contacts table created successfully');
        
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        pool.end();
    }
}

setupDatabase();