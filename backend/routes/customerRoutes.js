const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

// Müşteri listesi
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT customer_id, full_name, phone, loyalty_points FROM customers ORDER BY loyalty_points DESC');
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// SYS-F-042: Müşteri puan geçmişi
router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                s.sale_id,
                s.sale_time,
                s.total_amount,
                s.points_used,
                FLOOR(GREATEST(0, s.total_amount - (s.points_used / 100.0))) as points_earned
            FROM sales s
            WHERE s.customer_id = $1
            ORDER BY s.sale_time DESC
            LIMIT 20
        `, [req.params.id]);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { full_name, phone } = req.body;
    try {
        await db.query(
            'INSERT INTO customers (full_name, phone, loyalty_points) VALUES ($1, $2, 0)',
            [full_name, phone]
        );
        await db.query(
            'INSERT INTO audit_logs (user_id, action_type, table_affected, new_value) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'YENI_MUSTERI_EKLE', 'customers', JSON.stringify({ full_name, phone })]
        );
        res.json({ status: "success", message: "Müşteri başarıyla eklendi." });
    } catch (err) {
        let msg = err.message;
        if (err.code === '23505') msg = "Bu telefon numarasıyla zaten bir müşteri kayıtlı.";
        res.status(400).json({ status: "error", message: msg });
    }
});

module.exports = router;
