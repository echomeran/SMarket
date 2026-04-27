import { useState, useEffect } from "react";
import toast from 'react-hot-toast';

export default function Manager() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // MODAL VE FORM STATE'LERİ
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [formData, setFormData] = useState({
    name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "", vat_rate: ""
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
          vat_rate: formData.vat_rate,
          stock: formData.stock,
          expiryDate: formData.expiryDate,
          sale_price: formData.price,
          cost_price: formData.costPrice // Backend bunu bekliyor
        })
      });
      const resData = await response.json();
      if (response.ok) {
        toast.success("Ürün ve ilk stok başarıyla tanımlandı!");
        setIsProductModalOpen(false);
        setFormData({}); // Formu boşalt
        fetchProducts();
      } else {
        toast.error("Hata: " + resData.message);
      }
    } catch (err) { toast.error("Ekleme hatası!"); }
  };

  const [cashiers, setCashiers] = useState([]);
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);

  const fetchReports = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/reports/profit', { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.status === "success") setReports(result.data);
  };

  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/customers', { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.status === "success") setCustomers(result.data);
  };

  const fetchCashiers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/users/cashiers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.status === "success") setCashiers(result.data);
  };

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/logs', { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.status === "success") setLogs(result.data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCashiers(); // Kasiyerleri de çek
    fetchReports();
    fetchCustomers();
    fetchLogs();
  }, []);

  // UI Kısmı (Tablonun altına ekle)



  // Manager.jsx içindeki handleAddStock fonksiyonunu bununla değiştir:
  const handleAddStock = async (e) => {
    e.preventDefault();

    // Basit bir doğrulama: Değerler boş mu?
    if (!formData.stock || !formData.expiryDate) {
      return toast.error("Lütfen miktar ve tarih alanlarını doldurun!");
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
        toast.success("Stok başarıyla eklendi!");
        setIsStockModalOpen(false);
        setFormData({ name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "" }); // Formu sıfırla
        fetchProducts();
      } else {
        toast.error("Hata: " + resData.message);
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı!");
    }
  };


  const toggleProductStatus = async (barcode) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${barcode}/toggle-active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      toast.error("Hata oluştu.");
    }
  };

  const handleCampaign = async (barcode) => {
    const discount = prompt("Yüzde kaç indirim uygulamak istersiniz? (Örn: 20)");
    if (!discount || isNaN(discount) || discount <= 0 || discount > 100) return toast.error("Geçerli bir indirim yüzdesi girin (1-100 arası).");
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${barcode}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ discount_percent: parseFloat(discount) })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchProducts();
      } else {
        toast.error(data.message);
      }
    } catch(err) { toast.error("Bağlantı hatası"); }
  };

  const getRowStyle = (status, isActive) => {
    if (isActive === false) return { backgroundColor: '#f3f4f6', color: '#9ca3af', opacity: 0.6 };
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
            <th style={{ padding: '15px', textAlign: 'center' }}>Durum</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <tr key={p.barcode} style={{ borderBottom: '1px solid #eee', ...getRowStyle(p.status, p.is_active !== false) }}>
              <td style={{ padding: '15px' }}>
                {p.name} 
                {p.is_active === false && <span style={{ marginLeft: '10px', fontSize: '12px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Pasif</span>}
              </td>
              <td style={{ padding: '15px' }}>
                {p.old_price && <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: '8px', fontSize: '13px' }}>{p.old_price} ₺</span>}
                <span style={{ fontWeight: p.old_price ? 'bold' : 'normal', color: p.old_price ? '#10b981' : 'inherit' }}>{p.price} ₺</span>
              </td>
              <td style={{ padding: '15px' }}>{p.quantity}</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                <button 
                  onClick={() => toggleProductStatus(p.barcode)}
                  style={{ backgroundColor: p.is_active === false ? '#10b981' : '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {p.is_active === false ? 'Aktifleştir' : 'Pasife Al'}
                </button>
              </td>
              <td style={{ padding: '15px', textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button onClick={() => { setSelectedBarcode(p.barcode); setIsStockModalOpen(true); }} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Stok Ekle</button>
                {p.status === 'warning' && !p.old_price && (
                  <button onClick={() => handleCampaign(p.barcode)} style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🎁 Kampanya</button>
                )}
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

      <div style={{ marginTop: '40px' }}>
        <h3>🕵️ Geçmiş İşlemler (Audit Logs)</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Tarih</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Kullanıcı</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>İşlem Tipi</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.log_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.timestamp).toLocaleString('tr-TR')}</td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{log.full_name || log.username}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                      backgroundColor: log.action_type === 'IADE_ISLEMI' ? '#fee2e2' : '#dcfce7',
                      color: log.action_type === 'IADE_ISLEMI' ? '#ef4444' : '#16a34a'
                    }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                    {typeof log.new_value === 'object' ? JSON.stringify(log.new_value) : log.new_value}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Henüz kayıt bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {isProductModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Yeni Ürün Tanımla</h3>
              <button onClick={() => setIsProductModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✖</button>
            </div>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Ürün Adı" required onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ padding: '10px' }} />
              <input placeholder="Barkod" required onChange={e => setFormData({ ...formData, barcode: e.target.value })} style={{ padding: '10px' }} />
              <select required onChange={e => {
                  const val = e.target.value;
                  let vr = 20;
                  if(val === "Temel Gıda") vr = 1;
                  else if(val === "Temizlik & Kozmetik") vr = 10;
                  setFormData({ ...formData, category: val, vat_rate: vr });
                }} style={{ padding: '10px' }}>
                <option value="">-- Kategori ve KDV Sınıfı Seç --</option>
                <option value="Temel Gıda">Temel Gıda (%1 KDV)</option>
                <option value="Temizlik & Kozmetik">Temizlik & Kozmetik (%10 KDV)</option>
                <option value="Diğer / Teknoloji">Diğer / Teknoloji (%20 KDV)</option>
              </select>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Yeni Stok Girişi</h3>
              <button onClick={() => setIsStockModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✖</button>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Barkod: {selectedBarcode}</div>
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

      <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
        {/* KÂR RAPORLARI */}
        <div style={{ flex: 1 }}>
          <h3>📈 Finansal Raporlar (Günlük Kâr/Zarar)</h3>
          <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Tarih</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fiş Sayısı</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Ciro (Satış)</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Maliyet</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Ödenecek KDV</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Net Kâr</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{new Date(r.date).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.total_receipts} Fiş</td>
                  <td style={{ padding: '12px', color: '#3b82f6' }}>{parseFloat(r.total_revenue).toFixed(2)} ₺</td>
                  <td style={{ padding: '12px', color: '#ef4444' }}>-{parseFloat(r.total_cost).toFixed(2)} ₺</td>
                  <td style={{ padding: '12px', color: '#ef4444' }}>-{parseFloat(r.total_vat).toFixed(2)} ₺</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: parseFloat(r.net_profit) >= 0 ? '#10b981' : '#ef4444' }}>
                    {parseFloat(r.net_profit).toFixed(2)} ₺
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Henüz satış/kâr verisi yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MÜŞTERİLER VE PUANLAR */}
        <div style={{ flex: 1 }}>
          <h3>🎁 Müşteri Sadakat Programı</h3>
          <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Müşteri Adı</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Telefon</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Sadakat Puanı</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.customer_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{c.full_name}</td>
                  <td style={{ padding: '12px' }}>{c.phone}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                    {c.loyalty_points} Puan
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Sistemde kayıtlı müşteri bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}