import React from 'react';

const ManagerPage = () => {

  const handleQuickSale = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          barcode: '869001', // Veritabanına eklediğimiz sütün barkodu
          quantity_to_sell: 1
        })
      });
      const data = await response.json();
      if (response.ok) { // response.status 200-299 arasındaysa
        alert("Başarılı: " + data.message);
      } else {
        // 401 veya 403 hatası geldiyse burada yakalarız
        alert("Yetki Hatası: " + (data.message || "Giriş yapmanız gerekiyor."));
      }
    } catch (error) {
      console.error("Satış hatası:", error);
      alert("Sunucuya ulaşılamadı!");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Manager Sayfası</h1> {/* Şu an gördüğün yazı buydu */}

      {/* 2. BU BUTONU EKLE */}
      <button onClick={handleQuickSale} style={{ backgroundColor: 'green', color: 'white', padding: '10px' }}>
        Hızlı Satış Yap (FIFO Test)
      </button>
    </div>
  );
};

export default ManagerPage;