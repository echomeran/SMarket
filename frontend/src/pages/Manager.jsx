import { useState, useEffect } from "react";

export default function Manager() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // MODAL VE FORM STATE'LERİ
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [formData, setFormData] = useState({
    name: "", barcode: "", category: "", stock: "", price: "", expiryDate: ""
  });

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === "success") setProducts(result.data);
    } catch (err) { console.error("Ürünler çekilemedi:", err); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const addToCart = (product) => {
    // KONTROL: Stok 0 veya daha az ise sepete ekletme
    if (product.quantity <= 0) {
      return alert("Bu ürünün stoğu kalmamış! Önce 'Stok Ekle' diyerek yeni bir parti girişi yapmalısın.");
    }

    const existingItem = cart.find(item => item.barcode === product.barcode);
    if (existingItem) {
      // Sepetteki miktar mevcut stoğu geçmesin kontrolü
      if (existingItem.qty + 1 > product.quantity) {
        return alert("Üzgünüm, elimizdeki tüm stoğu zaten sepete ekledin!");
      }
      setCart(cart.map(item =>
        item.barcode === product.barcode ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    if (cart.length === 0) return;

    try {
      const response = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items: cart })
      });

      const data = await response.json(); // Backend'den gelen cevabı oku

      if (response.ok) {
        alert("Satış Başarılı! Stoklar güncellendi.");
        setCart([]); setIsCartOpen(false); fetchProducts();
      } else {
        // BURASI ÖNEMLİ: Backend'den gelen "Stok yetersiz" hatasını ekrana basar
        alert("Satış Yapılamadı: " + data.message);
      }
    } catch (error) {
      alert("Bağlantı kesildi, sunucuyu kontrol et.");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name,
          barcode: formData.barcode,
          price: formData.price,
          category: formData.category,
          stock: formData.stock,
          expiryDate: formData.expiryDate,
          sale_price: formData.price,
          cost_price: formData.costPrice // Backend bunu bekliyor
        })
      });
      const resData = await response.json();
      if (response.ok) {
        alert("Ürün ve ilk stok başarıyla tanımlandı!");
        setIsProductModalOpen(false);
        setFormData({}); // Formu boşalt
        fetchProducts();
      } else {
        alert("Hata: " + resData.message);
      }
    } catch (err) { alert("Ekleme hatası!"); }
  };

  const [cashiers, setCashiers] = useState([]);

  const fetchCashiers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/users/cashiers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.status === "success") setCashiers(result.data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCashiers(); // Kasiyerleri de çek
  }, []);

  // UI Kısmı (Tablonun altına ekle)



  // Manager.jsx içindeki handleAddStock fonksiyonunu bununla değiştir:
  const handleAddStock = async (e) => {
    e.preventDefault();

    // Basit bir doğrulama: Değerler boş mu?
    if (!formData.stock || !formData.expiryDate) {
      return alert("Lütfen miktar ve tarih alanlarını doldurun!");
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          barcode: selectedBarcode,
          quantity: parseInt(formData.stock),
          expiry_date: formData.expiryDate,
          cost_price: formData.costPrice
        })
      });

      const resData = await response.json();
      if (response.ok) {
        alert("Stok başarıyla eklendi!");
        setIsStockModalOpen(false);
        setFormData({ name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "" }); // Formu sıfırla
        fetchProducts();
      } else {
        alert("Hata: " + resData.message);
      }
    } catch (err) {
      alert("Sunucuya bağlanılamadı!");
    }
  };

  const calculateTotal = () => cart.reduce((total, item) => total + (item.price * item.qty), 0);
  const getRowStyle = (status) => {
    if (status === 'expired') return { backgroundColor: '#ffebee' };
    if (status === 'warning') return { backgroundColor: '#fff8e1' };
    return {};
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>

      {/* ÜST PANEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>SMarket Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setFormData({}); setIsProductModalOpen(true); }} style={{ padding: '10px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ Yeni Ürün Tanımla</button>
          <button onClick={() => setIsCartOpen(true)} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>🛒 Sepetim ({cart.reduce((acc, item) => acc + item.qty, 0)})</button>
          <input placeholder="Ara..." onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
        </div>
      </div>

      {/* ÜRÜN TABLOSU */}
      <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#eee' }}>
          <tr>
            <th style={{ padding: '15px', textAlign: 'left' }}>Ürün</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Fiyat</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Stok</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <tr key={p.barcode} style={{ borderBottom: '1px solid #eee', ...getRowStyle(p.status) }}>
              <td style={{ padding: '15px' }}>{p.name}</td>
              <td style={{ padding: '15px' }}>{p.price} ₺</td>
              <td style={{ padding: '15px' }}>{p.quantity}</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                <button onClick={() => addToCart(p)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Ekle</button>
                <button onClick={() => { setSelectedBarcode(p.barcode); setIsStockModalOpen(true); }} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Stok Ekle</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '40px' }}>
        <h3>👥 Personel Yönetimi (Kasiyerler)</h3>
        <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tam Adı</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Kullanıcı Adı</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Maaş</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {cashiers.map(c => (
              <tr key={c.user_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{c.full_name}</td>
                <td style={{ padding: '12px' }}>{c.username}</td>
                <td style={{ padding: '12px' }}>{c.salary} ₺</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {c.is_active ? '🟢 Aktif' : '🔴 Pasif'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {isProductModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <h3>Yeni Ürün Tanımla</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Ürün Adı" required onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ padding: '10px' }} />
              <input placeholder="Barkod" required onChange={e => setFormData({ ...formData, barcode: e.target.value })} style={{ padding: '10px' }} />
              <input placeholder="Kategori" required onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ padding: '10px' }} />

              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Fiyat ve Stok Bilgileri:</label>
                <input type="number" step="0.01" placeholder="Müşteriye Satış Fiyatı (₺)" required onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ padding: '10px', marginTop: '5px' }} />
                <input type="number" step="0.01" placeholder="Bize Geliş Fiyatı / Maliyet (₺)" required onChange={e => setFormData({ ...formData, costPrice: e.target.value })} style={{ padding: '10px', marginTop: '5px' }} />
                <input type="number" placeholder="Başlangıç Stoğu (Adet)" required onChange={e => setFormData({ ...formData, stock: e.target.value })} style={{ padding: '10px', marginTop: '5px' }} />
                <input type="date" required onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} style={{ padding: '10px', marginTop: '5px' }} />
              </div>

              <button type="submit" style={{ padding: '10px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                Sisteme Kaydet
              </button>
              <button type="button" onClick={() => setIsProductModalOpen(false)} style={{ padding: '10px', backgroundColor: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                İptal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STOK EKLEME MODAL */}
      {isStockModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <h3>Yeni Stok Girişi (Barkod: {selectedBarcode})</h3>
            <form onSubmit={handleAddStock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="number" placeholder="Gelecek Miktar" required onChange={e => setFormData({ ...formData, stock: e.target.value })} style={{ padding: '10px' }} />

              <label style={{ fontSize: '12px' }}>Birim Maliyet (Geliş):</label>
              <input type="number" step="0.01" placeholder="Maliyet (₺)" required onChange={e => setFormData({ ...formData, costPrice: e.target.value })} style={{ padding: '10px' }} />

              <label style={{ fontSize: '12px' }}>Etiket Fiyatını Güncelle (Opsiyonel):</label>
              <input type="number" step="0.01" placeholder="Yeni Satış Fiyatı (₺)" onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ padding: '10px' }} />

              <label style={{ fontSize: '12px' }}>Son Kullanma Tarihi:</label>
              <input type="date" required onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} style={{ padding: '10px' }} />

              <button type="submit" style={{ padding: '10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '5px' }}>Stoku ve Fiyatı Onayla</button>
            </form>
          </div>
        </div>
      )}

      {/* SEPET MODAL (Aynen duruyor) */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '450px' }}>
            <h3>🛒 Güncel Sepet</h3>
            {cart.map(item => (
              <div key={item.barcode} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                <span>{item.name} (x{item.qty})</span>
                <span>{(item.price * item.qty).toFixed(2)} ₺</span>
              </div>
            ))}
            <div style={{ marginTop: '10px', fontWeight: 'bold', textAlign: 'right' }}>Toplam: {calculateTotal().toFixed(2)} ₺</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsCartOpen(false)} style={{ padding: '10px' }}>Kapat</button>
              <button onClick={handleCheckout} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px' }}>Satışı Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}