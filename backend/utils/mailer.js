const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendLowStockEmail = async (productName, reorderQty) => {
    // Eğer .env dosyasında şifre yoksa hataya düşmesin, sadece konsola uyarı versin
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[UYARI] E-posta ayarları (.env) girilmediği için '${productName}' stok siparişi gönderilemedi.`);
        return;
    }

    const mailOptions = {
        from: `"SMarket Satın Alma Departmanı" <${process.env.EMAIL_USER}>`,
        to: 'salihakoglu91@gmail.com', // Gerçekte bu "Tedarikçinin E-postası" olmalı, şimdilik test için size geliyor
        subject: `[SİPARİŞ TALEBİ] SMarket Yeni Ürün Tedariği: ${productName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #3b82f6;">📦 Yeni Sipariş Talebi</h2>
                <p>Sayın İlgili Tedarikçi,</p>
                <p>Mağazamızın stoklarında <strong>${productName}</strong> adlı ürün tükenmek üzeredir. Sistemimizin otomatik satın alma protokolü gereği, aşağıda belirtilen miktarda yeni ürün tedariği talep edilmektedir.</p>
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; font-size: 18px; color: #16a34a; font-weight: bold; margin: 20px 0;">
                    Talep Edilen Miktar: ${reorderQty} adet
                </div>
                <p>Lütfen siparişi onayladığınızı bildiriniz ve teslimat takvimi hakkında bilgi veriniz.</p>
                <p>İyi çalışmalar dileriz,</p>
                <strong>SMarket Şube Yönetimi</strong>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Bu e-posta SMarket POS Otomasyon Sistemi tarafından tedarikçilere (Supplier) otomatik olarak gönderilmiştir.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL GÖNDERİLDİ] ${productName} için stok uyarısı atıldı.`);
    } catch (err) {
        console.error(`[MAIL HATASI] E-posta gönderilemedi: ${err.message}`);
    }
};

module.exports = { sendLowStockEmail };
