const { Pool } = require('pg');
require('dotenv').config();

// Tek bir URL (DATABASE_URL) üzerinden bağlantı kuruyoruz
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Neon gibi bulut servisleri için bu ayar şart!
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};