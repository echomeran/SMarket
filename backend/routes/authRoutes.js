const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "smarket_2026_gizli_anahtar";

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ message: "Kullanıcı yok." });

        const user = result.rows[0];
        
        // --- SPRINT 4.5: AKTİF/PASİF KONTROLÜ ---
        if (user.is_active === false) {
            return res.status(401).json({ status: "error", message: "Hesabınız pasife alınmıştır. Lütfen yönetici ile iletişime geçin." });
        }

        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ status: "error", message: "Şifre hatalı." });
        }

        const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ status: "success", token, user: { username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

router.post('/register', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ status: "error", message: "Bu işlem için yönetici yetkisi gereklidir." });
    }

    const { full_name, username, password, role, salary, shift } = req.body;
    try {
        const checkUser = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (checkUser.rows.length > 0) return res.status(400).json({ status: "error", message: "Bu kullanıcı adı zaten alınmış." });

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (full_name, username, password_hash, role, salary, shift) VALUES ($1, $2, $3, $4, $5, $6)',
            [full_name, username, hashedPassword, role || 'cashier', salary || 17002, shift || '09:00 - 17:00']
        );
        res.json({ status: "success", message: "Personel başarıyla sisteme eklendi." });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

module.exports = router;
