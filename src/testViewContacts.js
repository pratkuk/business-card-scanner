const pool = require('./database');

async function viewContacts() {
    try {
        const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        console.log('Saved contacts:', result.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

viewContacts();