const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "smarket_2026_gizli_anahtar";

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE: Token Kontrolü (Audit Log için şart!) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Token bulunamadı!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token geçersiz!" });
        req.user = user; // Artık req.user.id dolu gelecek
        next();
    });
};

/**
 * 1. LOGIN API (Sprint 1 Borcu: Bcrypt eklendi)
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ message: "Kullanıcı yok." });

        const user = result.rows[0];

        console.log("Girilen Şifre:", password);
        console.log("DB'deki Hash:", user.password_hash);

        const match = await bcrypt.compare(password, user.password_hash);
        console.log("Eşleşme Sonucu:", match);

        if (!match) {
            return res.status(401).json({ status: "error", message: "Şifre hatalı." });

        }


        const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ status: "success", token, user: { username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

/**
 * 3. FIFO SATIŞ MOTORU (Sprint 2 - Onarılmış Versiyon)
 */
app.post('/api/sales', authenticateToken, async (req, res) => { // authenticateToken eklendi!
    const { barcode, quantity_to_sell } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // A. Ürünü bul
        const productRes = await client.query('SELECT product_id FROM products WHERE barcode = $1', [barcode]);
        if (productRes.rows.length === 0) throw new Error("Ürün bulunamadı.");
        const productId = productRes.rows[0].product_id;

        // B. FIFO Sorgusu (Row-level locking)
        const batchRes = await client.query(`
            SELECT batch_id, quantity FROM batches 
            WHERE product_id = $1 AND quantity > 0 
            ORDER BY arrival_date ASC 
            LIMIT 1 FOR UPDATE`, [productId]);

        if (batchRes.rows.length === 0) throw new Error("Stok yetersiz!");

        const oldestBatch = batchRes.rows[0];

        // HATA FIX: yeniMiktar burada tanımlanmalı
        const yeniMiktar = oldestBatch.quantity - quantity_to_sell;

        if (yeniMiktar < 0) throw new Error("Bu partide yeterli ürün yok!");

        // C. Stoktan Düş
        await client.query(
            'UPDATE batches SET quantity = $1 WHERE batch_id = $2',
            [yeniMiktar, oldestBatch.batch_id]
        );

        // D. Audit Log (SRS 1.2.7) - user_id artık req.user.id'den geliyor
        await client.query(`
            INSERT INTO audit_logs (user_id, action_type, table_affected, old_value, new_value)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user.id,
                'SATIŞ_FIFO',
                'batches',
                JSON.stringify({ quantity: oldestBatch.quantity }),
                JSON.stringify({ quantity: yeniMiktar, batch_id: oldestBatch.batch_id })
            ]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Satış ve Log kaydı tamamlandı." });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

bcrypt.hash("123456", 10).then(hash => {
    console.log("SENİN GÜVENLİ HASH'İN:", hash);
});

app.listen(PORT, () => console.log(`🚀 SMarket Backend ${PORT} portunda aktif.`));