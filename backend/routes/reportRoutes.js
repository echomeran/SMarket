const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/profit', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                DATE(s.sale_time) as date,
                COUNT(DISTINCT s.sale_id) as total_receipts,
                SUM(si.quantity * si.unit_price) as total_revenue,
                SUM(si.quantity * b.cost_price) as total_cost,
                SUM(si.quantity * si.unit_price * (si.vat_rate / 100)) as total_vat,
                SUM((si.quantity * si.unit_price) - (si.quantity * b.cost_price) - (si.quantity * si.unit_price * (si.vat_rate / 100))) as net_profit
            FROM sales s
            JOIN sale_items si ON s.sale_id = si.sale_id
            JOIN batches b ON si.batch_id = b.batch_id
            GROUP BY DATE(s.sale_time)
            ORDER BY date DESC
            LIMIT 30;
        `;
        const result = await db.query(query);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
