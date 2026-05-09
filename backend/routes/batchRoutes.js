const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    const { barcode, quantity, expiry_date, cost_price, new_sale_price } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const productRes = await client.query('SELECT product_id FROM products WHERE barcode = $1', [barcode]);
        if (productRes.rows.length === 0) throw new Error("Ürün bulunamadı.");
        const productId = productRes.rows[0].product_id;

        await client.query(
            'INSERT INTO batches (product_id, quantity, expiry_date, arrival_date, cost_price) VALUES ($1, $2, $3, CURRENT_DATE, $4)',
            [productId, quantity, expiry_date, cost_price]
        );

        if (new_sale_price && new_sale_price > 0) {
            await client.query(
                'UPDATE products SET sale_price = $1 WHERE product_id = $2',
                [new_sale_price, productId]
            );
        }

        await client.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'STOK_EKLEME', 'batches', JSON.stringify({ barcode, quantity, cost_price, new_sale_price })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Stok eklendi ve fiyat güncellendi." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally { client.release(); }
});

router.get('/product/:barcode', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT b.batch_id, b.quantity, b.cost_price, b.arrival_date, b.expiry_date
            FROM batches b
            JOIN products p ON b.product_id = p.product_id
            WHERE p.barcode = $1 AND b.quantity > 0
            ORDER BY b.arrival_date ASC
        `;
        const result = await db.query(query, [req.params.barcode]);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
