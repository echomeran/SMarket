const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/cashiers', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT user_id, username, full_name, salary, is_active FROM users WHERE role = $1',
            ['cashier']
        );
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
