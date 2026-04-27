const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                al.log_id, 
                al.action_type, 
                al.table_affected, 
                al.new_value, 
                al.timestamp,
                u.username,
                u.full_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.user_id
            ORDER BY al.timestamp DESC
            LIMIT 100;
        `;
        const result = await db.query(query);
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
