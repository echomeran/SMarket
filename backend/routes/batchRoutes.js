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

        await client.query('COMMIT');
        res.json({ status: "success", message: "Stok eklendi ve fiyat güncellendi." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally { client.release(); }
});

module.exports = router;
