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


app.post('/api/sales', authenticateToken, async (req, res) => {
    const { items } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        for (const item of items) {
            const productRes = await client.query('SELECT product_id FROM products WHERE barcode = $1', [item.barcode]);
            if (productRes.rows.length === 0) throw new Error(`${item.name} bulunamadı.`);
            const productId = productRes.rows[0].product_id;

            let kalanMiktar = item.qty;

            // Elimizdeki tüm uygun partileri en eskiden en yeniye getir
            const batchesRes = await client.query(`
                SELECT batch_id, quantity FROM batches 
                WHERE product_id = $1 AND quantity > 0
                ORDER BY expiry_date ASC FOR UPDATE`, [productId]);

            if (batchesRes.rows.length === 0) throw new Error(`${item.name} için hiç stok yok!`);

            for (const batch of batchesRes.rows) {
                if (kalanMiktar <= 0) break;

                const dusulecekMiktar = Math.min(batch.quantity, kalanMiktar);

                // Stoktan düş
                await client.query('UPDATE batches SET quantity = quantity - $1 WHERE batch_id = $2',
                    [dusulecekMiktar, batch.batch_id]);

                kalanMiktar -= dusulecekMiktar;
            }

            if (kalanMiktar > 0) {
                throw new Error(`${item.name} için yeterli toplam stok yok! (Eksik: ${kalanMiktar})`);
            }

            // Audit Log
            await client.query(`
                INSERT INTO audit_logs (user_id, action_type, table_affected, new_value)
                VALUES ($1, $2, $3, $4)`,
                [req.user.id, 'SATIŞ_ONAY', 'batches', JSON.stringify({ barcode: item.barcode, total_sold: item.qty })]
            );
        }

        await client.query('COMMIT');
        res.json({ status: "success", message: "Tüm sepet başarıyla satıldı." });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.name, p.barcode, p.sale_price AS price,
                COALESCE(SUM(b.quantity), 0) AS quantity,
                MIN(b.expiry_date) AS expiry_date,
                CASE 
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE THEN 'expired'
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
                    ELSE 'fresh'
                END as status
            FROM products p
            LEFT JOIN batches b ON p.product_id = b.product_id
            GROUP BY p.product_id, p.name, p.barcode, p.sale_price
            ORDER BY status DESC, expiry_date ASC;
        `;
        const result = await db.query(query);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    const { name, barcode, sale_price, category, stock, expiryDate, cost_price } = req.body;
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const productRes = await client.query(
            'INSERT INTO products (name, barcode, sale_price, category) VALUES ($1, $2, $3, $4) RETURNING product_id',
            [name, barcode, sale_price, category]
        );
        const productId = productRes.rows[0].product_id;

        if (stock && stock > 0) {
            await client.query(
                'INSERT INTO batches (product_id, quantity, expiry_date, arrival_date, cost_price) VALUES ($1, $2, $3, CURRENT_DATE, $4)',
                [productId, stock, expiryDate, cost_price]
            );
        }
        await client.query('COMMIT');
        res.json({ status: "success", message: "Ürün ve Maliyetli Stok Kaydedildi." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally { client.release(); }
});

app.get('/api/users/cashiers', authenticateToken, async (req, res) => {
    try {
        // Sadece kasiyer rolündekileri getir
        const result = await db.query(
            'SELECT user_id, username, full_name, salary, is_active FROM users WHERE role = $1',
            ['cashier']
        );
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/api/batches', authenticateToken, async (req, res) => {
    const { barcode, quantity, expiry_date, cost_price, new_sale_price } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Ürünü bul
        const productRes = await client.query('SELECT product_id FROM products WHERE barcode = $1', [barcode]);
        if (productRes.rows.length === 0) throw new Error("Ürün bulunamadı.");
        const productId = productRes.rows[0].product_id;

        // 2. Yeni partiyi (maliyetle) ekle
        await client.query(
            'INSERT INTO batches (product_id, quantity, expiry_date, arrival_date, cost_price) VALUES ($1, $2, $3, CURRENT_DATE, $4)',
            [productId, quantity, expiry_date, cost_price]
        );

        // 3. EĞER yeni satış fiyatı girilmişse, etiketi de güncelle
        if (new_sale_price && new_sale_price > 0) {
            await client.query(
                'UPDATE products SET sale_price = $1 WHERE product_id = $2',
                [new_sale_price, productId]
            );
        }

        await client.query('COMMIT');
        res.json({ status: "success", message: "Stok eklendi ve fiyat güncellendi." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally { client.release(); }
});


app.listen(PORT, () => console.log(`🚀 SMarket Backend ${PORT} portunda aktif.`));