const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.product_id, p.name, p.barcode, p.sale_price AS price, p.old_price, p.vat_rate, p.is_active,
                COALESCE(SUM(b.quantity), 0) AS quantity,
                MIN(b.expiry_date) AS expiry_date,
                CASE 
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE THEN 'expired'
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
                    ELSE 'fresh'
                END as status
            FROM products p
            LEFT JOIN batches b ON p.product_id = b.product_id
            GROUP BY p.product_id, p.name, p.barcode, p.sale_price, p.old_price, p.vat_rate, p.is_active
            ORDER BY status DESC, expiry_date ASC;
        `;
        const result = await db.query(query);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { name, barcode, sale_price, category, stock, expiryDate, cost_price, vat_rate } = req.body;
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const productRes = await client.query(
            'INSERT INTO products (name, barcode, sale_price, category, vat_rate) VALUES ($1, $2, $3, $4, $5) RETURNING product_id',
            [name, barcode, sale_price, category, vat_rate || 10]
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

router.put('/:id/toggle-active', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE products SET is_active = NOT is_active WHERE barcode = $1 RETURNING is_active',
            [req.params.id]
        );
        res.json({ status: "success", is_active: result.rows[0].is_active });
    } catch(err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/:id/campaign', authenticateToken, async (req, res) => {
    const { discount_percent } = req.body;
    const barcode = req.params.id;
    try {
        const productRes = await db.query('SELECT sale_price, old_price FROM products WHERE barcode = $1', [barcode]);
        if (productRes.rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı." });
        
        const p = productRes.rows[0];
        if (p.old_price) return res.status(400).json({ message: "Bu üründe zaten bir kampanya var!" });

        const newPrice = p.sale_price - (p.sale_price * (discount_percent / 100));
        
        await db.query(
            'UPDATE products SET old_price = sale_price, sale_price = $1 WHERE barcode = $2',
            [newPrice, barcode]
        );
        res.json({ status: "success", message: "Kampanya başarıyla başlatıldı!" });
    } catch(err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
