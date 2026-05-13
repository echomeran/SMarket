const nodemailer = require('nodemailer');
const db = require('../db');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * SYS-F-030 / SYS-F-031: Stok uyarısı e-postası gönderir.
 * Başarısız olursa en fazla 3 kez yeniden dener (5dk, 15dk aralıklarla).
 * Sonucu supply_notifications tablosuna kaydeder.
 */
const sendLowStockEmail = async (productName, reorderQty, productId) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[UYARI] E-posta ayarları (.env) girilmediği için '${productName}' stok siparişi gönderilemedi.`);
        // supply_notifications tablosuna pending olarak kaydet
        try {
            await db.query(
                `INSERT INTO supply_notifications (product_id, current_stock, ordered_qty, status, error_message)
                 VALUES ($1, 0, $2, 'pending', 'E-posta ayarları girilmemiş')`,
                [productId, reorderQty]
            );
        } catch (e) { console.error('[NOTIFY LOG HATA]', e.message); }
        return;
    }

    const mailOptions = {
        from: `"SMarket Satın Alma Departmanı" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `[SİPARİŞ TALEBİ] SMarket Yeni Ürün Tedariği: ${productName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #3b82f6;">📦 Yeni Sipariş Talebi</h2>
                <p>Sayın İlgili Tedarikçi,</p>
                <p>Mağazamızın stoklarında <strong>${productName}</strong> adlı ürün tükenmek üzeredir.</p>
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; font-size: 18px; color: #16a34a; font-weight: bold; margin: 20px 0;">
                    Talep Edilen Miktar: ${reorderQty} adet
                </div>
                <p>Lütfen siparişi onayladığınızı bildiriniz.</p>
                <strong>SMarket Şube Yönetimi</strong>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Bu e-posta SMarket POS Otomasyon Sistemi tarafından otomatik gönderilmiştir.</p>
            </div>
        `
    };

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [0, 5 * 60 * 1000, 15 * 60 * 1000]; // 0, 5dk, 15dk

    let notificationId = null;

    // İlk kaydı pending olarak oluştur
    try {
        const res = await db.query(
            `INSERT INTO supply_notifications (product_id, current_stock, ordered_qty, status)
             VALUES ($1, 0, $2, 'pending') RETURNING notification_id`,
            [productId, reorderQty]
        );
        notificationId = res.rows[0].notification_id;
    } catch (e) { console.error('[NOTIFY LOG HATA]', e.message); }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
        try {
            await transporter.sendMail(mailOptions);
            console.log(`[MAIL GÖNDERİLDİ] ${productName} için stok uyarısı atıldı. (Deneme: ${attempt + 1})`);
            // Başarılı: güncelle
            if (notificationId) {
                await db.query(
                    `UPDATE supply_notifications SET status = 'sent', retry_count = $1 WHERE notification_id = $2`,
                    [attempt, notificationId]
                );
            }
            return;
        } catch (err) {
            console.error(`[MAIL HATASI] Deneme ${attempt + 1}/${MAX_RETRIES}: ${err.message}`);
            if (notificationId) {
                await db.query(
                    `UPDATE supply_notifications SET retry_count = $1, error_message = $2 WHERE notification_id = $3`,
                    [attempt + 1, err.message, notificationId]
                );
            }
        }
    }

    // 3 deneme de başarısız
    console.error(`[MAIL BAŞARISIZ] ${productName} için tüm denemeler başarısız.`);
    if (notificationId) {
        await db.query(
            `UPDATE supply_notifications SET status = 'failed' WHERE notification_id = $1`,
            [notificationId]
        );
    }
};

module.exports = { sendLowStockEmail };
