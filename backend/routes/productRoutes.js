const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.product_id, p.name, p.barcode, p.sale_price AS price, p.old_price, p.vat_rate, p.is_active,
                p.category, p.critical_level, p.reorder_qty,
                COALESCE(SUM(b.quantity), 0) AS quantity,
                MIN(b.expiry_date) AS expiry_date,
                CASE 
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE THEN 'expired'
                    WHEN MIN(b.expiry_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
                    ELSE 'fresh'
                END as status
            FROM products p
            LEFT JOIN batches b ON p.product_id = b.product_id
            GROUP BY p.product_id, p.name, p.barcode, p.sale_price, p.old_price, p.vat_rate, p.is_active, p.category, p.critical_level, p.reorder_qty
            ORDER BY status DESC, expiry_date ASC;
        `;
        const result = await db.query(query);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { name, barcode, sale_price, category, stock, expiryDate, cost_price, vat_rate, critical_level, reorder_qty } = req.body;
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const productRes = await client.query(
            'INSERT INTO products (name, barcode, sale_price, category, vat_rate, critical_level, reorder_qty) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING product_id',
            [name, barcode, sale_price, category, vat_rate || 10, critical_level || 10, reorder_qty || 50]
        );
        const productId = productRes.rows[0].product_id;

        if (stock && stock > 0) {
            await client.query(
                'INSERT INTO batches (product_id, quantity, expiry_date, arrival_date, cost_price) VALUES ($1, $2, $3, CURRENT_DATE, $4)',
                [productId, stock, expiryDate, cost_price]
            );
        }

        await client.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'YENI_URUN', 'products', JSON.stringify({ name, barcode, sale_price })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Ürün ve Maliyetli Stok Kaydedildi." });
    } catch (err) {
        await client.query('ROLLBACK');
        let msg = err.message;
        if (err.code === '23505') msg = "Bu barkodda zaten bir ürün var.";
        res.status(400).json({ status: "error", message: msg });
    } finally { client.release(); }
});

router.put('/:id/toggle-active', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE products SET is_active = NOT is_active WHERE barcode = $1 RETURNING is_active, name',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı." });

        await db.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'URUN_DURUM_DEGISTI', 'products', JSON.stringify({ name: result.rows[0].name, is_active: result.rows[0].is_active })]
        );

        res.json({ status: "success", is_active: result.rows[0].is_active });
    } catch(err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/:id/campaign', authenticateToken, async (req, res) => {
    const { discount_percent } = req.body;
    const barcode = req.params.id;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT sale_price, old_price FROM products WHERE barcode = $1 FOR UPDATE', [barcode]);
        if (productRes.rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı." });
        
        const p = productRes.rows[0];
        if (p.old_price) return res.status(400).json({ message: "Bu üründe zaten bir kampanya var!" });

        const currentPrice = p.sale_price;
        const newPrice = currentPrice - (currentPrice * (discount_percent / 100));
        
        await client.query('UPDATE products SET sale_price = $1, old_price = $2 WHERE barcode = $3', [newPrice, currentPrice, barcode]);

        await client.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'KAMPANYA_BASLATILDI', 'products', JSON.stringify({ barcode, old_price: currentPrice, new_price: newPrice, discount: discount_percent })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Kampanya başarıyla başlatıldı!" });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

router.delete('/:id/campaign', authenticateToken, async (req, res) => {
    const barcode = req.params.id;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT old_price, name FROM products WHERE barcode = $1 FOR UPDATE', [barcode]);
        if (productRes.rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı." });
        
        const p = productRes.rows[0];
        if (!p.old_price) return res.status(400).json({ message: "Bu üründe zaten aktif bir kampanya yok." });

        await client.query('UPDATE products SET sale_price = old_price, old_price = NULL WHERE barcode = $1', [barcode]);

        await client.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'KAMPANYA_BITIRILDI', 'products', JSON.stringify({ barcode, name: p.name, price_restored: p.old_price })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Kampanya bitirildi, eski fiyata dönüldü." });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

router.put('/:barcode', authenticateToken, async (req, res) => {
    const barcode = req.params.barcode;
    const { name, category, vat_rate, critical_level, reorder_qty } = req.body;
    
    if (req.user.role !== 'manager') return res.status(403).json({ message: "Sadece yöneticiler ürün düzenleyebilir." });

    try {
        await db.query(
            'UPDATE products SET name = $1, category = $2, vat_rate = $3, critical_level = $4, reorder_qty = $5 WHERE barcode = $6',
            [name, category, vat_rate || 10, critical_level || 10, reorder_qty || 50, barcode]
        );

        await db.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'URUN_DUZENLENDI', 'products', JSON.stringify({ barcode, name, category })]
        );

        res.json({ status: "success", message: "Ürün bilgileri başarıyla güncellendi!" });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/waste-expired', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ message: "Sadece yöneticiler imha işlemi yapabilir." });

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Find expired batches with stock
        const expiredRes = await client.query(`
            SELECT b.batch_id, b.quantity, b.product_id 
            FROM batches b 
            WHERE b.expiry_date < CURRENT_DATE AND b.quantity > 0 FOR UPDATE
        `);

        if (expiredRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.json({ status: "success", message: "Tarihi geçmiş ürün bulunamadı. Deponuz tertemiz!" });
        }

        // Fake bir satış oluştur (0 TL) - İstatistiklerde ciro artmasın ama stok dursa bile maliyet raporlarına 'Zarar' yansısın
        const saleInsert = await client.query(
            "INSERT INTO sales (cashier_id, total_amount, vat_amount, points_used) VALUES ($1, $2, $3, $4) RETURNING sale_id",
            [req.user.id, 0, 0, 0]
        );
        const saleId = saleInsert.rows[0].sale_id;

        // sale_items ekle ve batch stoklarını sıfırla
        let totalWasted = 0;
        for (const batch of expiredRes.rows) {
            await client.query(
                "INSERT INTO sale_items (sale_id, batch_id, quantity, unit_price, vat_rate) VALUES ($1, $2, $3, $4, $5)",
                [saleId, batch.batch_id, batch.quantity, 0, 0]
            );
            await client.query(
                "UPDATE batches SET quantity = 0 WHERE batch_id = $1",
                [batch.batch_id]
            );
            totalWasted += batch.quantity;
        }

        await client.query(
            "INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)",
            [req.user.id, 'ZAYI_IMHA_EDILDI', 'batches', JSON.stringify({ total_wasted_items: totalWasted, sale_id: saleId, info: "SKT'si geçmiş ürünler otomatik imha edildi." })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: `${totalWasted} adet tarihi geçmiş ürün otomatik imha edildi.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
