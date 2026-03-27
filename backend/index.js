const express = require('express'); // Web sunucu çerçevesi
const cors = require('cors'); // Frontend erişim izinlerini yönetir
const db = require('./db'); // Veritabanı bağlantı dosyamız
require('dotenv').config();

const app = express();

// --- Ara Yazılımlar (Middleware) ---
app.use(cors()); // Farklı portlardan (Örn: React 3000) gelen isteklere izin ver
app.use(express.json()); // Gelen JSON verilerini okunabilir formata çevir

// --- Rotalar (Routes) ---

// Sağlık Kontrolü: Veritabanı ve server çalışıyor mu?
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()'); // DB'ye anlık saati sor
        res.json({
            status: 'success',
            message: 'SMarket Backend Aktif!',
            time: result.rows[0].now
        });
    } catch (err) {
        console.error('Bağlantı Hatası:', err);
        res.status(500).json({ status: 'error', message: 'Veritabanına ulaşılamıyor!' });
    }
});

// --- Sunucu Başlatma ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla uyandı!`);
});

// Tüm kullanıcıları getiren test rotası
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, role FROM users'); // Şifreleri çekmiyoruz, güvenlik!
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});