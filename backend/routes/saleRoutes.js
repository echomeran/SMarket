const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    const { items, customer_id, points_to_use } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        let saleTotalAmount = 0;
        let saleVatAmount = 0;
        const ptsUsed = parseInt(points_to_use) || 0;

        const saleRes = await client.query(
            'INSERT INTO sales (cashier_id, customer_id, total_amount, vat_amount, points_used) VALUES ($1, $2, 0, 0, $3) RETURNING sale_id',
            [req.user.id, customer_id || null, ptsUsed]
        );
        const saleId = saleRes.rows[0].sale_id;

        for (const item of items) {
            const productRes = await client.query('SELECT product_id, name, sale_price, vat_rate, reorder_qty FROM products WHERE barcode = $1', [item.barcode]);
            if (productRes.rows.length === 0) throw new Error(`${item.name} bulunamadı.`);
            const product = productRes.rows[0];

            let kalanMiktar = item.qty;
            const itemVat = (product.sale_price * (product.vat_rate / 100)) * item.qty;
            const itemTotal = product.sale_price * item.qty;

            saleVatAmount += itemVat;
            saleTotalAmount += itemTotal;

            const batchesRes = await client.query(`
                SELECT batch_id, quantity FROM batches 
                WHERE product_id = $1 AND quantity > 0
                ORDER BY expiry_date ASC FOR UPDATE`, [product.product_id]);

            if (batchesRes.rows.length === 0) throw new Error(`${item.name} için hiç stok yok!`);

            for (const batch of batchesRes.rows) {
                if (kalanMiktar <= 0) break;
                const dusulecekMiktar = Math.min(batch.quantity, kalanMiktar);

                await client.query('UPDATE batches SET quantity = quantity - $1 WHERE batch_id = $2', [dusulecekMiktar, batch.batch_id]);

                await client.query(`
                    INSERT INTO sale_items (sale_id, batch_id, quantity, unit_price, vat_rate)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [saleId, batch.batch_id, dusulecekMiktar, product.sale_price, product.vat_rate]
                );
                kalanMiktar -= dusulecekMiktar;
            }

            if (kalanMiktar > 0) throw new Error(`${item.name} için yeterli toplam stok yok! (Eksik: ${kalanMiktar})`);

            // --- STOK KONTROLÜ VE E-POSTA (SPRINT 4) ---
            const totalStockRes = await client.query('SELECT SUM(quantity) as total FROM batches WHERE product_id = $1', [product.product_id]);
            const currentTotalStock = totalStockRes.rows[0].total || 0;
            
            const criticalLevel = product.critical_level || 10;
            if (currentTotalStock < criticalLevel) {
                const { sendLowStockEmail } = require('../utils/mailer');
                const reorderQty = product.reorder_qty || 50;
                sendLowStockEmail(product.name, reorderQty, product.product_id).catch(e => console.log(e));
            }

            await client.query(`
                INSERT INTO audit_logs (user_id, action_type, table_affected, new_value)
                VALUES ($1, $2, $3, $4)`,
                [req.user.id, 'SATIŞ_ONAY', 'batches', JSON.stringify({ barcode: item.barcode, total_sold: item.qty })]
            );
        }

        await client.query(
            'UPDATE sales SET total_amount = $1, vat_amount = $2 WHERE sale_id = $3',
            [saleTotalAmount, saleVatAmount, saleId]
        );

        let earnedPoints = 0;
        if (customer_id) {
            const cashPaid = saleTotalAmount - (ptsUsed / 100);
            earnedPoints = Math.floor(Math.max(0, cashPaid));
            const pointDiff = earnedPoints - ptsUsed;
            await client.query(
                'UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE customer_id = $2',
                [pointDiff, customer_id]
            );
        }

        await client.query('COMMIT');
        res.json({
            status: "success",
            message: "Tüm sepet başarıyla satıldı.",
            sale_receipt: {
                sale_id: saleId,
                total_amount: saleTotalAmount,
                vat_amount: saleVatAmount,
                points_earned: earnedPoints
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

// Fiş Detayı Getir (İade Öncesi Kontrol İçin)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const saleRes = await db.query(`
            SELECT s.*, c.full_name as customer_name 
            FROM sales s 
            LEFT JOIN customers c ON s.customer_id = c.customer_id 
            WHERE s.sale_id = $1`, [req.params.id]);
            
        if (saleRes.rows.length === 0) return res.status(404).json({ message: "Fiş bulunamadı." });
        const sale = saleRes.rows[0];

        // Ürünleri getir
        const itemsRes = await db.query(`
            SELECT si.*, p.name, p.barcode, b.expiry_date
            FROM sale_items si
            JOIN batches b ON si.batch_id = b.batch_id
            JOIN products p ON b.product_id = p.product_id
            WHERE si.sale_id = $1 AND (si.is_returned IS FALSE OR si.is_returned IS NULL)`, [req.params.id]);

        res.json({ status: "success", sale, items: itemsRes.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// Ürün Bazlı İade
router.post('/refund-item', authenticateToken, async (req, res) => {
    const { sale_id, item_id } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        
        // 1. Fişi ve Puan Durumunu Kontrol Et
        const saleRes = await client.query('SELECT * FROM sales WHERE sale_id = $1 FOR UPDATE', [sale_id]);
        if (saleRes.rows.length === 0) throw new Error("Fiş bulunamadı.");
        const sale = saleRes.rows[0];

        if (sale.points_used > 0) throw new Error("Puan kullanılan alışverişlerde iade yapılamaz.");

        // 2. İade edilecek kalemi bul
        const itemRes = await client.query(`
            SELECT si.*, b.expiry_date, p.name 
            FROM sale_items si 
            JOIN batches b ON si.batch_id = b.batch_id 
            JOIN products p ON b.product_id = p.product_id
            WHERE si.item_id = $1 AND si.sale_id = $2 AND (si.is_returned IS FALSE OR si.is_returned IS NULL)`, [item_id, sale_id]);
        
        if (itemRes.rows.length === 0) throw new Error("İade edilecek ürün kaydı bulunamadı veya zaten iade edilmiş.");
        const item = itemRes.rows[0];

        // 3. SKT Kontrolü (Bugünden önceyse iade alma)
        const today = new Date();
        const expiry = new Date(item.expiry_date);
        if (expiry < today) throw new Error(`Bu ürünün SKT'si (${item.expiry_date}) geçmiş, iade alınamaz!`);

        // 4. Stoku geri yükle
        await client.query('UPDATE batches SET quantity = quantity + $1 WHERE batch_id = $2', [item.quantity, item.batch_id]);

        // 5. Fiş toplamını ve KDV'sini düş
        const itemTotal = parseFloat(item.unit_price) * item.quantity;
        const itemVat = itemTotal * (item.vat_rate / 100);
        
        await client.query(
            'UPDATE sales SET total_amount = total_amount - $1, vat_amount = vat_amount - $2 WHERE sale_id = $3',
            [itemTotal, itemVat, sale_id]
        );

        // 6. Eğer müşteri varsa kazandığı puanı geri al
        if (sale.customer_id) {
            const pointsToReduce = Math.floor(itemTotal);
            await client.query('UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE customer_id = $2', [pointsToReduce, sale.customer_id]);
        }

        // 7. Kalemi "iade edildi" olarak işaretle (Silmek yerine daha güvenli)
        await client.query('UPDATE sale_items SET is_returned = true WHERE item_id = $1', [item_id]);

        await client.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'URUN_IADE_EDILDI', 'sale_items', JSON.stringify({ sale_id, product: item.name, qty: item.quantity })]
        );

        await client.query('COMMIT');
        res.json({ status: "success", message: "Ürün iadesi başarıyla yapıldı, stok güncellendi." });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ status: "error", message: err.message });
    } finally {
        client.release();
    }
});

// Eski refund endpoint'ini de (Tam İade) güncelleyelim
router.post('/refund', authenticateToken, async (req, res) => {
    const { sale_id } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        const saleRes = await client.query('SELECT * FROM sales WHERE sale_id = $1 FOR UPDATE', [sale_id]);
        if (saleRes.rows.length === 0) throw new Error("Fatura bulunamadı.");
        const sale = saleRes.rows[0];

        if (sale.points_used > 0) throw new Error("Puan kullanılan alışverişlerde iade yapılamaz.");
        
        const itemsRes = await client.query(`
            SELECT si.*, b.expiry_date FROM sale_items si 
            JOIN batches b ON si.batch_id = b.batch_id 
            WHERE si.sale_id = $1 AND (si.is_returned IS FALSE OR si.is_returned IS NULL)`, [sale_id]);
        
        for (const item of itemsRes.rows) {
            await client.query('UPDATE batches SET quantity = quantity + $1 WHERE batch_id = $2', [item.quantity, item.batch_id]);
            await client.query('UPDATE sale_items SET is_returned = true WHERE item_id = $1', [item.item_id]);
        }

        if (sale.customer_id) {
            const cashPaid = sale.total_amount - (sale.points_used / 100);
            const earned = Math.floor(Math.max(0, cashPaid));
            const diff = sale.points_used - earned; 
            await client.query('UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE customer_id = $2', [diff, sale.customer_id]);
        }

        // Fişin kendisini tamamen siliyoruz (veya tutmak istersen tutabiliriz)
        await client.query('DELETE FROM sale_items WHERE sale_id = $1', [sale_id]);
        await client.query('DELETE FROM sales WHERE sale_id = $1', [sale_id]);

        await client.query('COMMIT');
        res.json({ status: "success", message: "Tüm fiş başarıyla iade edildi." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ status: "error", message: err.message });
    } finally { client.release(); }
});

module.exports = router;
