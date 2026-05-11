import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Manager() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // MODAL VE FORM STATE'LERİ
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [campaignDiscount, setCampaignDiscount] = useState("");
  const [formData, setFormData] = useState({
    name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "", vat_rate: "", cost_price: "", critical_level: 10, reorder_qty: 50
  });
  const [employeeFormData, setEmployeeFormData] = useState({
    full_name: "", username: "", password: "", role: "cashier", salary: "", shift: ""
  });
  const [editEmployeeData, setEditEmployeeData] = useState({
    full_name: "", username: "", salary: "", shift: ""
  });
  const [editProductData, setEditProductData] = useState({
    name: "", category: "", vat_rate: "", critical_level: 10, reorder_qty: 50
  });

  const handleShiftFormat = (val) => {
    let raw = val.replace(/[^0-9]/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    if (raw.length >= 5) return `${raw.slice(0, 2)}:${raw.slice(2, 4)} - ${raw.slice(4, 6)}:${raw.slice(6, 8)}`;
    if (raw.length >= 3) return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
    return raw;
  };

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
        fetchLogs();
      } else {
        toast.error("Hata: " + resData.message);
      }
    } catch (err) { toast.error("Ekleme hatası!"); }
  };

  const [cashiers, setCashiers] = useState([]);
  const [reports, setReports] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);

  const fetchReports = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/reports/profit', { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await res.json();
    if (result.status === "success") setReports(result.data);

    const resMonthly = await fetch('http://localhost:5000/api/reports/weekly', { headers: { 'Authorization': `Bearer ${token}` } });
    const resultMonthly = await resMonthly.json();
    if (resultMonthly.status === "success") setWeeklyReports(resultMonthly.data);
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

    // Otomatik İmha İşlemi (Sessizce Arka Planda Çalışır)
    const autoDispose = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:5000/api/products/waste-expired', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.message && data.message.includes("imha edildi")) {
          // Eğer çöpe giden ürün varsa anlık olarak tabloyu yenile ve bildirim ver
          toast.error("Bazı tarihi geçmiş ürünler sistem tarafından otomatik olarak imha edilip zarar olarak işlendi.", { icon: '⚠️' });
          fetchProducts();
          fetchReports();
          fetchLogs();
        }
      } catch (err) {
        // Hata durumunda kullanıcıyı rahatsız etmeden yut (arka plan işlemi)
      }
    };
    autoDispose();
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
        fetchLogs(); // Logları anında güncelle
      } else {
        toast.error("Hata: " + resData.message);
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı!");
    }
  };

  const fetchBatches = async (barcode) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/batches/product/${barcode}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setSelectedBatches(data.data);
        setIsBatchModalOpen(true);
      } else {
        toast.error(data.message);
      }
    } catch (err) { toast.error("Partiler yüklenemedi."); }
  };


  const toggleProductStatus = async (barcode) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${barcode}/toggle-active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProducts();
        fetchLogs();
      }
    } catch (err) {
      toast.error("Hata oluştu.");
    }
  };

  const openCampaignModal = (barcode) => {
    setSelectedBarcode(barcode);
    setCampaignDiscount("");
    setIsCampaignModalOpen(true);
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    const discount = campaignDiscount;
    if (!discount || isNaN(discount) || discount <= 0 || discount > 100) return toast.error("Geçerli bir indirim yüzdesi girin (1-100 arası).");

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${selectedBarcode}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ discount_percent: parseFloat(discount) })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsCampaignModalOpen(false);
        fetchProducts();
        fetchLogs();
      } else {
        toast.error(data.message);
      }
    } catch (err) { toast.error("Bağlantı hatası"); }
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${selectedBarcode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editProductData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsEditProductModalOpen(false);
        fetchProducts();
        fetchLogs();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Bağlantı hatası");
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(employeeFormData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsEmployeeModalOpen(false);
        setEmployeeFormData({ full_name: "", username: "", password: "", role: "cashier", salary: "", shift: "" });
        fetchCashiers();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Personel eklenemedi, bağlantı hatası.");
    }
  };

  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/users/${selectedEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editEmployeeData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsEditEmployeeModalOpen(false);
        fetchCashiers();
        fetchReports(); // Maaş güncellenirse maliyet güncellenebilir
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Personel düzenlenemedi, bağlantı hatası.");
    }
  };

  const toggleCashierStatus = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchCashiers();
        fetchLogs(); // Logları anında güncelle
      } else {
        toast.error(data.message);
      }
    } catch (err) { toast.error("Hata oluştu."); }
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
              <td style={{ padding: '15px', textAlign: 'center' }}>
                <button onClick={() => {
                  setSelectedBarcode(p.barcode);
                  setEditProductData({ 
                    name: p.name, 
                    category: p.category || "Temel Gıda", 
                    vat_rate: p.vat_rate || 1, 
                    critical_level: p.critical_level || 10, 
                    reorder_qty: p.reorder_qty || 50 
                  });
                  setIsEditProductModalOpen(true);
                }} style={{ backgroundColor: '#64748b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>✏️ Düzenle</button>
                <button onClick={() => { setSelectedBarcode(p.barcode); setIsStockModalOpen(true); }} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Stok Ekle</button>
                <button onClick={() => fetchBatches(p.barcode)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>📦 Partiler</button>
                {!p.old_price && (
                  <button onClick={() => openCampaignModal(p.barcode)} style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🎁 Kampanya</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Personel Yönetimi</h3>
          <button onClick={() => setIsEmployeeModalOpen(true)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Yeni Personel Ekle
          </button>
        </div>
        <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tam Adı</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Kullanıcı Adı</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Maaş</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Vardiya</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Durum</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {cashiers.map(c => (
              <tr key={c.user_id} style={{ borderBottom: '1px solid #eee', backgroundColor: c.is_active ? 'white' : '#f3f4f6', opacity: c.is_active ? 1 : 0.7 }}>
                <td style={{ padding: '12px' }}>{c.full_name}</td>
                <td style={{ padding: '12px' }}>{c.username}</td>
                <td style={{ padding: '12px' }}>{c.salary} ₺</td>
                <td style={{ padding: '12px' }}><span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>{c.shift || '08:00 - 16:00'}</span></td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {c.is_active ? '🟢 Aktif' : '🔴 Pasif'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => {
                    setSelectedEmployeeId(c.user_id);
                    setEditEmployeeData({ full_name: c.full_name, username: c.username, salary: c.salary, shift: c.shift || "" });
                    setIsEditEmployeeModalOpen(true);
                  }} style={{ backgroundColor: '#64748b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginRight: '5px' }}>
                    ✏️ Düzenle
                  </button>
                  <button
                    onClick={() => toggleCashierStatus(c.user_id)}
                    style={{ backgroundColor: c.is_active ? '#ef4444' : '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {c.is_active ? 'Pasife Al' : 'Aktifleştir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Geçmiş İşlemler</h3>
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
                if (val === "Temel Gıda") vr = 1;
                else if (val === "Temizlik & Kozmetik") vr = 10;
                setFormData({ ...formData, category: val, vat_rate: vr });
              }} style={{ padding: '10px' }}>
                <option value="">-- Kategori ve KDV Sınıfı Seç --</option>
                <option value="Temel Gıda">Temel Gıda (%1 KDV)</option>
                <option value="Temizlik & Kozmetik">Temizlik & Kozmetik (%10 KDV)</option>
                <option value="Diğer / Teknoloji">Diğer / Teknoloji (%20 KDV)</option>
              </select>

              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Fiyat ve Stok Bilgileri:</label>
                <input type="number" step="0.01" placeholder="Satış Fiyatı (₺)" required onChange={e => setFormData({ ...formData, price: e.target.value })} style={{ padding: '10px', marginTop: '5px', width: '100%' }} />
                <input type="number" step="0.01" placeholder="Maliyet (₺)" required onChange={e => setFormData({ ...formData, costPrice: e.target.value })} style={{ padding: '10px', marginTop: '5px', width: '100%' }} />
                <input type="number" placeholder="Başlangıç Stoğu (Adet)" required onChange={e => setFormData({ ...formData, stock: e.target.value })} style={{ padding: '10px', marginTop: '5px', width: '100%' }} />
                <input type="date" required onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} style={{ padding: '10px', marginTop: '5px', width: '100%' }} />
              </div>

              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Otomatik Sipariş Ayarları:</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <input type="number" placeholder="Kritik Uyarı Seviyesi (Örn: 10)" required value={formData.critical_level} onChange={e => setFormData({ ...formData, critical_level: e.target.value })} style={{ padding: '10px', width: '50%' }} />
                  <input type="number" placeholder="Otomatik Sipariş Miktarı (Örn: 50)" required value={formData.reorder_qty} onChange={e => setFormData({ ...formData, reorder_qty: e.target.value })} style={{ padding: '10px', width: '50%' }} />
                </div>
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

      {/* KAMPANYA MODAL */}
      {isCampaignModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>🎁 İndirim Uygula</h3>
              <button onClick={() => setIsCampaignModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Barkod: {selectedBarcode}</div>
            <form onSubmit={handleCampaignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px' }}>Yüzde kaç indirim uygulamak istersiniz? (Örn: 20)</label>
              <input type="number" placeholder="İndirim %" required value={campaignDiscount} onChange={e => setCampaignDiscount(e.target.value)} style={{ padding: '10px' }} />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Kampanyayı Başlat</button>
            </form>
          </div>
        </div>
      )}

      {/* YENİ PERSONEL MODAL */}
      {isEmployeeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Yeni Personel Ekle</h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Ad Soyad" required value={employeeFormData.full_name} onChange={e => setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })} style={{ padding: '10px', width: '100%' }} />
              <input placeholder="Kullanıcı Adı" required value={employeeFormData.username} onChange={e => setEmployeeFormData({ ...employeeFormData, username: e.target.value })} style={{ padding: '10px', width: '100%' }} />
              <input type="password" placeholder="Şifre" required value={employeeFormData.password} onChange={e => setEmployeeFormData({ ...employeeFormData, password: e.target.value })} style={{ padding: '10px', width: '100%' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <select required value={employeeFormData.role} onChange={e => setEmployeeFormData({ ...employeeFormData, role: e.target.value })} style={{ padding: '10px', width: '50%' }}>
                  <option value="cashier">Kasiyer</option>
                  <option value="manager">Yönetici</option>
                </select>
                <input type="number" placeholder="Maaş (₺)" required value={employeeFormData.salary} onChange={e => setEmployeeFormData({ ...employeeFormData, salary: e.target.value })} style={{ padding: '10px', width: '50%' }} />
              </div>
              <input placeholder="Vardiya (Sayı girin: 08001600)" required value={employeeFormData.shift} onChange={e => setEmployeeFormData({ ...employeeFormData, shift: handleShiftFormat(e.target.value) })} style={{ padding: '10px', width: '100%' }} />

              <button type="submit" style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Sisteme Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* PERSONEL DÜZENLE MODAL */}
      {isEditEmployeeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Personel Düzenle</h3>
              <button onClick={() => setIsEditEmployeeModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>
            <form onSubmit={handleEditEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px' }}>Ad Soyad:</label>
              <input placeholder="Ad Soyad" required value={editEmployeeData.full_name} onChange={e => setEditEmployeeData({ ...editEmployeeData, full_name: e.target.value })} style={{ padding: '10px', width: '100%' }} />
              <label style={{ fontSize: '12px' }}>Kullanıcı Adı:</label>
              <input placeholder="Kullanıcı Adı" required value={editEmployeeData.username} onChange={e => setEditEmployeeData({ ...editEmployeeData, username: e.target.value })} style={{ padding: '10px', width: '100%' }} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '50%' }}>
                  <label style={{ fontSize: '12px' }}>Maaş (₺):</label>
                  <input type="number" required value={editEmployeeData.salary} onChange={e => setEditEmployeeData({ ...editEmployeeData, salary: e.target.value })} style={{ padding: '10px', width: '100%' }} />
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ fontSize: '12px' }}>Vardiya (08001600):</label>
                  <input placeholder="08:00 - 16:00" required value={editEmployeeData.shift} onChange={e => setEditEmployeeData({ ...editEmployeeData, shift: handleShiftFormat(e.target.value) })} style={{ padding: '10px', width: '100%' }} />
                </div>
              </div>
              <button type="submit" style={{ padding: '10px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Değişiklikleri Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* ÜRÜN DÜZENLE MODAL */}
      {isEditProductModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Ürün Düzenle</h3>
              <button onClick={() => setIsEditProductModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✖</button>
            </div>
            <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px' }}>Ürün Adı:</label>
              <input placeholder="Ürün Adı" required value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} style={{ padding: '10px' }} />
              
              <label style={{ fontSize: '12px' }}>Kategori:</label>
              <select required value={editProductData.category} onChange={e => {
                const val = e.target.value;
                let vr = 20;
                if (val === "Temel Gıda") vr = 1;
                else if (val === "Temizlik & Kozmetik") vr = 10;
                setEditProductData({ ...editProductData, category: val, vat_rate: vr });
              }} style={{ padding: '10px' }}>
                <option value="Temel Gıda">Temel Gıda (%1 KDV)</option>
                <option value="Temizlik & Kozmetik">Temizlik & Kozmetik (%10 KDV)</option>
                <option value="Diğer / Teknoloji">Diğer / Teknoloji (%20 KDV)</option>
              </select>

              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Otomatik Sipariş Ayarları:</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <input type="number" placeholder="Kritik Uyarı Seviyesi" required value={editProductData.critical_level} onChange={e => setEditProductData({ ...editProductData, critical_level: e.target.value })} style={{ padding: '10px', width: '50%' }} />
                  <input type="number" placeholder="Otomatik Sipariş Miktarı" required value={editProductData.reorder_qty} onChange={e => setEditProductData({ ...editProductData, reorder_qty: e.target.value })} style={{ padding: '10px', width: '50%' }} />
                </div>
              </div>

              <button type="submit" style={{ padding: '10px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Değişiklikleri Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* HAFTALIK FİNANSAL GRAFİK (Sprint 5) */}
      <div style={{ marginTop: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3>Finans Tablosu</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          * Gider tablosuna Ürün Maliyetleri, KDV ve aktif kasiyerlerin Haftalık Maaşları (Total) dahildir.
        </p>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ComposedChart data={weeklyReports} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={([dataMin, dataMax]) => {
                const maxAbs = Math.max(Math.abs(dataMin || 0), Math.abs(dataMax || 0));
                let limit = maxAbs === 0 ? 10000 : Math.ceil(maxAbs * 1.2);
                limit = Math.ceil(limit / 100) * 100; // 100'ün katına yuvarla
                return [-limit, limit];
              }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ backgroundColor: 'white', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px' }}>{label}</p>
                        <p style={{ margin: '5px 0', color: '#10b981', fontSize: '13px' }}>Brüt Ciro (Gelir): {data.revenue.toLocaleString('tr-TR')} ₺</p>
                        <p style={{ margin: '5px 0', color: '#ef4444', fontSize: '13px' }}>Toplam Giderler: {data.expenses.toLocaleString('tr-TR')} ₺</p>
                        <div style={{ borderTop: '1px solid #eee', margin: '10px 0' }}></div>
                        <p style={{ margin: '0', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>Gerçek Net Kâr: {data.net_profit.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="net_profit" stroke="#3b82f6" strokeWidth={3} name="Gerçek Net Kâr" activeDot={{ r: 8 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
        {/* KÂR RAPORLARI */}
        <div style={{ flex: 1 }}>
          <h3>Finansal Raporlar</h3>
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
          <h3>Müşteriler</h3>
          <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Müşteri Adı</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Telefon</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Puan</th>
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

      {isBatchModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>📦 Parti Bilgileri (Batches)</h2>
              <button onClick={() => setIsBatchModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✖</button>
            </div>

            {selectedBatches.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Parti No</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Miktar</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Maliyet</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Geliş T.</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>SKT</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatches.map(b => (
                    <tr key={b.batch_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>#{b.batch_id}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{b.quantity}</td>
                      <td style={{ padding: '10px' }}>{b.cost_price} ₺</td>
                      <td style={{ padding: '10px' }}>{new Date(b.arrival_date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '10px', color: new Date(b.expiry_date) < new Date(new Date().setDate(new Date().getDate() + 7)) ? '#ef4444' : 'inherit' }}>
                        {new Date(b.expiry_date).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Bu ürüne ait aktif stok (parti) bulunmuyor.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}