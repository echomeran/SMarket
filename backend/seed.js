const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log("📦 Tablolar oluşturuluyor...");

        // Tabloları oluştur (yoksa)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'cashier')),
                salary NUMERIC(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                product_id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                barcode VARCHAR(50) UNIQUE NOT NULL,
                sale_price NUMERIC(10,2) NOT NULL,
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS batches (
                batch_id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(product_id),
                quantity INTEGER NOT NULL DEFAULT 0,
                expiry_date DATE,
                arrival_date DATE DEFAULT CURRENT_DATE,
                cost_price NUMERIC(10,2) DEFAULT 0
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                action_type VARCHAR(50),
                table_affected VARCHAR(50),
                new_value TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS supply_notifications (
                notification_id SERIAL PRIMARY KEY,
                product_id UUID REFERENCES products(product_id),
                triggered_at TIMESTAMP DEFAULT NOW(),
                current_stock INTEGER NOT NULL DEFAULT 0,
                ordered_qty INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
                retry_count SMALLINT DEFAULT 0,
                error_message TEXT
            );
        `);

        console.log("✅ Tablolar hazır.");

        // Şifreleri hashle
        const managerHash = await bcrypt.hash('manager123', 10);
        const cashierHash = await bcrypt.hash('cashier123', 10);

        // Manager ekle
        await client.query(`
            INSERT INTO users (username, password_hash, full_name, role, salary)
            VALUES ('manager', $1, 'Mağaza Müdürü', 'manager', 15000)
            ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
        `, [managerHash]);

        // Kasiyer ekle
        await client.query(`
            INSERT INTO users (username, password_hash, full_name, role, salary)
            VALUES ('kasiyer1', $1, 'Ahmet Yılmaz', 'cashier', 8000)
            ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
        `, [cashierHash]);

        console.log("\n🎉 Kullanıcılar başarıyla oluşturuldu!\n");
        console.log("┌─────────────────────────────────────────┐");
        console.log("│         KULLANICI BİLGİLERİ             │");
        console.log("├──────────────┬──────────────┬───────────┤");
        console.log("│ Kullanıcı    │ Şifre        │ Rol       │");
        console.log("├──────────────┼──────────────┼───────────┤");
        console.log("│ manager      │ manager123   │ Yönetici  │");
        console.log("│ kasiyer1     │ cashier123   │ Kasiyer   │");
        console.log("└──────────────┴──────────────┴───────────┘");

    } catch (err) {
        console.error("❌ Hata:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
