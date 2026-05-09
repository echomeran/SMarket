const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

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

module.exports = router;
