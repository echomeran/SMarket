const express = require('express');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/cashiers', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT user_id, username, full_name, salary, is_active, shift FROM users WHERE role = $1',
            ['cashier']
        );
        res.json({ status: "success", data: result.rows });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// --- SPRINT 4.5: Kasiyer Aktif/Pasif Yapma ---
router.put('/:id/toggle', authenticateToken, async (req, res) => {
    // Sadece manager değiştirebilmeli (authenticateToken bunu id üzerinden değil, role üzerinden yapmalı ama şimdilik auth var)
    const userId = req.params.id;
    try {
        const userRes = await db.query('SELECT is_active FROM users WHERE user_id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ status: "error", message: "Kullanıcı bulunamadı." });

        const newStatus = userRes.rows[0].is_active === false ? true : false;
        
        await db.query('UPDATE users SET is_active = $1 WHERE user_id = $2', [newStatus, userId]);
        res.json({ status: "success", message: newStatus ? "Kasiyer aktifleştirildi." : "Kasiyer pasife alındı." });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
