const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "smarket_2026_gizli_anahtar";

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Token bulunamadı!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token geçersiz!" });
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
