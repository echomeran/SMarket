import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./Manager.css";

export default function Manager() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [reports, setReports] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState("");
  const [campaignDiscount, setCampaignDiscount] = useState("");
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [formData, setFormData] = useState({ name:"",barcode:"",category:"",stock:"",price:"",expiryDate:"",vat_rate:"",cost_price:"",critical_level:10,reorder_qty:50 });

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'Authorization': `Bearer ${token()}` });
  const jsonHeaders = () => ({ 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` });

  const fetchProducts = async () => {
    const r = await fetch('http://localhost:5000/api/products', { headers: headers() });
    const d = await r.json();
    if (d.status === "success") setProducts(d.data);
  };
  const fetchCashiers = async () => {
    const r = await fetch('http://localhost:5000/api/users/cashiers', { headers: headers() });
    const d = await r.json();
    if (d.status === "success") setCashiers(d.data);
  };
  const fetchReports = async () => {
    const r = await fetch('http://localhost:5000/api/reports/profit', { headers: headers() });
    const d = await r.json();
    if (d.status === "success") setReports(d.data);
    const r2 = await fetch('http://localhost:5000/api/reports/weekly', { headers: headers() });
    const d2 = await r2.json();
    if (d2.status === "success") setWeeklyReports(d2.data);
  };
  const fetchCustomers = async () => {
    const r = await fetch('http://localhost:5000/api/customers', { headers: headers() });
    const d = await r.json();
    if (d.status === "success") setCustomers(d.data);
  };
  const fetchLogs = async () => {
    const r = await fetch('http://localhost:5000/api/logs', { headers: headers() });
    const d = await r.json();
    if (d.status === "success") setLogs(d.data);
  };

  useEffect(() => { fetchProducts(); fetchCashiers(); fetchReports(); fetchCustomers(); fetchLogs(); }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const r = await fetch('http://localhost:5000/api/products', {
      method:'POST', headers: jsonHeaders(),
      body: JSON.stringify({ name:formData.name, barcode:formData.barcode, price:formData.price, category:formData.category, vat_rate:formData.vat_rate, stock:formData.stock, expiryDate:formData.expiryDate, sale_price:formData.price, cost_price:formData.costPrice })
    });
    const d = await r.json();
    if (r.ok) { toast.success("Ürün eklendi!"); setIsProductModalOpen(false); setFormData({}); fetchProducts(); fetchLogs(); }
    else toast.error(d.message);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!formData.stock || !formData.expiryDate) return toast.error("Miktar ve tarih zorunlu!");
    const r = await fetch('http://localhost:5000/api/batches', {
      method:'POST', headers: jsonHeaders(),
      body: JSON.stringify({ barcode:selectedBarcode, quantity:parseInt(formData.stock), expiry_date:formData.expiryDate, cost_price:formData.costPrice })
    });
    const d = await r.json();
    if (r.ok) { toast.success("Stok eklendi!"); setIsStockModalOpen(false); setFormData({}); fetchProducts(); fetchLogs(); }
    else toast.error(d.message);
  };

  const fetchBatches = async (barcode) => {
    const r = await fetch(`http://localhost:5000/api/batches/product/${barcode}`, { headers: headers() });
    const d = await r.json();
    if (r.ok) { setSelectedBatches(d.data); setIsBatchModalOpen(true); }
    else toast.error(d.message);
  };

  const toggleProductStatus = async (barcode) => {
    const r = await fetch(`http://localhost:5000/api/products/${barcode}/toggle-active`, { method:'PUT', headers: headers() });
    if (r.ok) { fetchProducts(); fetchLogs(); }
    else toast.error("Hata oluştu.");
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!campaignDiscount || isNaN(campaignDiscount) || campaignDiscount <= 0 || campaignDiscount > 100) return toast.error("1-100 arası değer girin.");
    const r = await fetch(`http://localhost:5000/api/products/${selectedBarcode}/campaign`, {
      method:'POST', headers: jsonHeaders(),
      body: JSON.stringify({ discount_percent: parseFloat(campaignDiscount) })
    });
    const d = await r.json();
    if (r.ok) { toast.success(d.message); setIsCampaignModalOpen(false); fetchProducts(); fetchLogs(); }
    else toast.error(d.message);
  };

  const toggleCashierStatus = async (userId) => {
    const r = await fetch(`http://localhost:5000/api/users/${userId}/toggle`, { method:'PUT', headers: headers() });
    const d = await r.json();
    if (r.ok) { toast.success(d.message); fetchCashiers(); fetchLogs(); }
    else toast.error(d.message);
  };

  const navItems = [
    { id:"products", icon:"📦", label:"Ürünler" },
    { id:"staff", icon:"👥", label:"Personel" },
    { id:"finance", icon:"📊", label:"Finans" },
    { id:"customers", icon:"🛍️", label:"Müşteriler" },
    { id:"logs", icon:"📋", label:"İşlem Geçmişi" },
  ];

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="manager-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🛒</div>
          <div>
            <div className="brand-name">SMarket</div>
            <div className="brand-role">Yönetici Paneli</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <div key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-ghost" style={{width:'100%'}} onClick={() => { localStorage.clear(); window.location.href='/'; }}>
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <div className="topbar">
          <div>
            <p className="page-title">{navItems.find(n=>n.id===tab)?.label}</p>
            <p className="page-subtitle">SMarket Yönetim Sistemi</p>
          </div>
          <div className="topbar-actions">
            {tab === "products" && (
              <>
                <div className="search-wrapper">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" placeholder="Ürün ara..." onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={() => { setFormData({critical_level:10,reorder_qty:50}); setIsProductModalOpen(true); }}>
                  + Yeni Ürün
                </button>
              </>
            )}
          </div>
        </div>

        <div className="content-area">
          {/* STATS */}
          {tab === "products" && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon purple">📦</div>
                  <div><div className="stat-value">{products.length}</div><div className="stat-label">Toplam Ürün</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">✅</div>
                  <div><div className="stat-value">{products.filter(p=>p.is_active!==false).length}</div><div className="stat-label">Aktif Ürün</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon amber">⚠️</div>
                  <div><div className="stat-value">{products.filter(p=>p.quantity<10&&p.quantity>0).length}</div><div className="stat-label">Kritik Stok</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon blue">🎁</div>
                  <div><div className="stat-value">{products.filter(p=>p.old_price).length}</div><div className="stat-label">İndirimli Ürün</div></div>
                </div>
              </div>

              <div className="section-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ürün Adı</th>
                      <th>Kategori</th>
                      <th>Fiyat</th>
                      <th>Stok</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.barcode} style={p.is_active===false?{opacity:0.5}:{}}>
                        <td style={{fontWeight:600,color:'#f1f5f9'}}>
                          {p.name}
                          {p.is_active===false && <span className="badge badge-gray" style={{marginLeft:8}}>Pasif</span>}
                        </td>
                        <td><span className="badge badge-purple">{p.category||'—'}</span></td>
                        <td>
                          {p.old_price && <span className="price-old">{p.old_price}₺</span>}
                          <span className={p.old_price?'price-new':'price-normal'}>{p.price}₺</span>
                        </td>
                        <td>
                          <span className={`badge ${p.quantity<=0?'badge-red':p.quantity<10?'badge-amber':'badge-green'}`}>
                            {p.quantity} adet
                          </span>
                        </td>
                        <td>
                          <button className={`btn btn-sm ${p.is_active===false?'btn-green':'btn-red'}`} onClick={() => toggleProductStatus(p.barcode)}>
                            {p.is_active===false?'Aktifleştir':'Pasife Al'}
                          </button>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-sm btn-amber" onClick={() => { setSelectedBarcode(p.barcode); setFormData({}); setIsStockModalOpen(true); }}>Stok Ekle</button>
                            <button className="btn btn-sm btn-blue" onClick={() => fetchBatches(p.barcode)}>📦 Partiler</button>
                            {!p.old_price && <button className="btn btn-sm btn-primary" onClick={() => { setSelectedBarcode(p.barcode); setCampaignDiscount(""); setIsCampaignModalOpen(true); }}>🎁 Kampanya</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length===0 && <tr className="empty-row"><td colSpan="6">Ürün bulunamadı.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STAFF */}
          {tab === "staff" && (
            <div className="section-card">
              <table className="data-table">
                <thead><tr><th>Tam Adı</th><th>Kullanıcı Adı</th><th>Maaş</th><th>Vardiya</th><th>Durum</th><th>İşlem</th></tr></thead>
                <tbody>
                  {cashiers.map(c => (
                    <tr key={c.user_id} style={c.is_active?{}:{opacity:0.5}}>
                      <td style={{fontWeight:600,color:'#f1f5f9'}}>{c.full_name}</td>
                      <td><span className="badge badge-blue">{c.username}</span></td>
                      <td>{c.salary}₺</td>
                      <td><span className="badge badge-purple">{c.shift||'08:00 - 16:00'}</span></td>
                      <td><span className={`badge ${c.is_active?'badge-green':'badge-red'}`}>{c.is_active?'🟢 Aktif':'🔴 Pasif'}</span></td>
                      <td><button className={`btn btn-sm ${c.is_active?'btn-red':'btn-green'}`} onClick={()=>toggleCashierStatus(c.user_id)}>{c.is_active?'Pasife Al':'Aktifleştir'}</button></td>
                    </tr>
                  ))}
                  {cashiers.length===0 && <tr className="empty-row"><td colSpan="6">Kasiyer bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* FINANCE */}
          {tab === "finance" && (
            <>
              <div className="section-card" style={{marginBottom:24}}>
                <div className="section-header"><h3 className="section-title">📈 Haftalık Kâr Grafiği</h3></div>
                <div className="chart-wrapper" style={{height:350}}>
                  <ResponsiveContainer>
                    <ComposedChart data={weeklyReports} margin={{top:10,right:20,bottom:10,left:20}}>
                      <CartesianGrid stroke="#1e2535" strokeDasharray="3 3"/>
                      <XAxis dataKey="week" tick={{fill:'#64748b',fontSize:12}}/>
                      <YAxis tick={{fill:'#64748b',fontSize:12}} domain={([min,max])=>{const m=Math.max(Math.abs(min||0),Math.abs(max||0));const l=m===0?10000:Math.ceil(m*1.3);return[-l,l];}}/>
                      <Tooltip contentStyle={{background:'#161b26',border:'1px solid #1e2535',borderRadius:10,color:'#e2e8f0'}}/>
                      <Legend wrapperStyle={{color:'#94a3b8'}}/>
                      <Line type="monotone" dataKey="net_profit" stroke="#8b5cf6" strokeWidth={3} name="Net Kâr" activeDot={{r:7,fill:'#8b5cf6'}}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="section-card">
                <div className="section-header"><h3 className="section-title">💰 Günlük Finansal Raporlar</h3></div>
                <table className="data-table">
                  <thead><tr><th>Tarih</th><th>Fiş</th><th>Ciro</th><th>Maliyet</th><th>KDV</th><th style={{textAlign:'right'}}>Net Kâr</th></tr></thead>
                  <tbody>
                    {reports.map((r,i)=>(
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleDateString('tr-TR')}</td>
                        <td><span className="badge badge-blue">{r.total_receipts} Fiş</span></td>
                        <td style={{color:'#60a5fa',fontWeight:600}}>{parseFloat(r.total_revenue).toFixed(2)}₺</td>
                        <td style={{color:'#f87171'}}>-{parseFloat(r.total_cost).toFixed(2)}₺</td>
                        <td style={{color:'#f87171'}}>-{parseFloat(r.total_vat).toFixed(2)}₺</td>
                        <td style={{textAlign:'right',fontWeight:700,color:parseFloat(r.net_profit)>=0?'#34d399':'#f87171'}}>{parseFloat(r.net_profit).toFixed(2)}₺</td>
                      </tr>
                    ))}
                    {reports.length===0 && <tr className="empty-row"><td colSpan="6">Henüz veri yok.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* CUSTOMERS */}
          {tab === "customers" && (
            <div className="section-card">
              <table className="data-table">
                <thead><tr><th>Müşteri Adı</th><th>Telefon</th><th style={{textAlign:'right'}}>Puan</th></tr></thead>
                <tbody>
                  {customers.map(c=>(
                    <tr key={c.customer_id}>
                      <td style={{fontWeight:600,color:'#f1f5f9'}}>{c.full_name}</td>
                      <td>{c.phone}</td>
                      <td style={{textAlign:'right'}}><span className="badge badge-green">{c.loyalty_points} Puan</span></td>
                    </tr>
                  ))}
                  {customers.length===0 && <tr className="empty-row"><td colSpan="3">Kayıtlı müşteri yok.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* LOGS */}
          {tab === "logs" && (
            <div className="section-card">
              <div className="log-wrapper">
                <table className="data-table">
                  <thead style={{position:'sticky',top:0,background:'#1a2030',zIndex:5}}>
                    <tr><th>Tarih</th><th>Kullanıcı</th><th>İşlem</th><th>Detay</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(l=>(
                      <tr key={l.log_id}>
                        <td style={{fontSize:12,color:'#64748b'}}>{new Date(l.timestamp).toLocaleString('tr-TR')}</td>
                        <td style={{fontWeight:600}}>{l.full_name||l.username}</td>
                        <td><span className={`badge ${l.action_type==='IADE_ISLEMI'?'badge-red':'badge-green'}`}>{l.action_type}</span></td>
                        <td style={{fontSize:12,color:'#64748b',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{typeof l.new_value==='object'?JSON.stringify(l.new_value):l.new_value}</td>
                      </tr>
                    ))}
                    {logs.length===0 && <tr className="empty-row"><td colSpan="4">Kayıt bulunamadı.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">📦 Yeni Ürün Tanımla</h3>
              <button className="modal-close" onClick={()=>setIsProductModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddProduct} className="form-grid">
              <div><label className="form-label">Ürün Adı</label><input className="form-input" placeholder="Ürün adı girin" required onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
              <div><label className="form-label">Barkod</label><input className="form-input" placeholder="Barkod" required onChange={e=>setFormData({...formData,barcode:e.target.value})}/></div>
              <div>
                <label className="form-label">Kategori ve KDV</label>
                <select className="form-select" required onChange={e=>{const v=e.target.value;let vr=20;if(v==="Temel Gıda")vr=1;else if(v==="Temizlik & Kozmetik")vr=10;setFormData({...formData,category:v,vat_rate:vr});}}>
                  <option value="">Seçiniz...</option>
                  <option value="Temel Gıda">Temel Gıda (%1 KDV)</option>
                  <option value="Temizlik & Kozmetik">Temizlik & Kozmetik (%10 KDV)</option>
                  <option value="Diğer / Teknoloji">Diğer / Teknoloji (%20 KDV)</option>
                </select>
              </div>
              <hr className="form-divider"/>
              <div className="form-row">
                <div><label className="form-label">Satış Fiyatı (₺)</label><input className="form-input" type="number" step="0.01" placeholder="0.00" required onChange={e=>setFormData({...formData,price:e.target.value})}/></div>
                <div><label className="form-label">Maliyet (₺)</label><input className="form-input" type="number" step="0.01" placeholder="0.00" required onChange={e=>setFormData({...formData,costPrice:e.target.value})}/></div>
              </div>
              <div className="form-row">
                <div><label className="form-label">Başlangıç Stoğu</label><input className="form-input" type="number" placeholder="0" required onChange={e=>setFormData({...formData,stock:e.target.value})}/></div>
                <div><label className="form-label">Son Kullanma Tarihi</label><input className="form-input" type="date" required onChange={e=>setFormData({...formData,expiryDate:e.target.value})}/></div>
              </div>
              <hr className="form-divider"/>
              <div className="form-row">
                <div><label className="form-label">Kritik Stok Seviyesi</label><input className="form-input" type="number" value={formData.critical_level} required onChange={e=>setFormData({...formData,critical_level:e.target.value})}/></div>
                <div><label className="form-label">Oto. Sipariş Miktarı</label><input className="form-input" type="number" value={formData.reorder_qty} required onChange={e=>setFormData({...formData,reorder_qty:e.target.value})}/></div>
              </div>
              <button type="submit" className="form-submit">Sisteme Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {isStockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">📥 Yeni Stok Girişi</h3>
              <button className="modal-close" onClick={()=>setIsStockModalOpen(false)}>✕</button>
            </div>
            <p style={{fontSize:13,color:'#64748b',margin:'0 0 16px'}}>Barkod: <strong style={{color:'#a78bfa'}}>{selectedBarcode}</strong></p>
            <form onSubmit={handleAddStock} className="form-grid">
              <div><label className="form-label">Gelecek Miktar (Adet)</label><input className="form-input" type="number" placeholder="0" required onChange={e=>setFormData({...formData,stock:e.target.value})}/></div>
              <div><label className="form-label">Birim Maliyet (₺)</label><input className="form-input" type="number" step="0.01" placeholder="0.00" required onChange={e=>setFormData({...formData,costPrice:e.target.value})}/></div>
              <div><label className="form-label">Son Kullanma Tarihi</label><input className="form-input" type="date" required onChange={e=>setFormData({...formData,expiryDate:e.target.value})}/></div>
              <button type="submit" className="form-submit">Stoku Onayla</button>
            </form>
          </div>
        </div>
      )}

      {isCampaignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">🎁 İndirim Uygula</h3>
              <button className="modal-close" onClick={()=>setIsCampaignModalOpen(false)}>✕</button>
            </div>
            <p style={{fontSize:13,color:'#64748b',margin:'0 0 16px'}}>Barkod: <strong style={{color:'#a78bfa'}}>{selectedBarcode}</strong></p>
            <form onSubmit={handleCampaignSubmit} className="form-grid">
              <div><label className="form-label">İndirim Yüzdesi (1-100)</label><input className="form-input" type="number" placeholder="Örn: 20" required value={campaignDiscount} onChange={e=>setCampaignDiscount(e.target.value)}/></div>
              <button type="submit" className="form-submit">Kampanyayı Başlat</button>
            </form>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{maxWidth:560}}>
            <div className="modal-header">
              <h3 className="modal-title">📦 Parti Bilgileri</h3>
              <button className="modal-close" onClick={()=>setIsBatchModalOpen(false)}>✕</button>
            </div>
            {selectedBatches.length>0?(
              <table className="data-table">
                <thead><tr><th>#</th><th>Miktar</th><th>Maliyet</th><th>Geliş T.</th><th>SKT</th></tr></thead>
                <tbody>
                  {selectedBatches.map(b=>(
                    <tr key={b.batch_id}>
                      <td style={{color:'#64748b'}}>#{b.batch_id}</td>
                      <td style={{fontWeight:600}}>{b.quantity}</td>
                      <td>{b.cost_price}₺</td>
                      <td>{new Date(b.arrival_date).toLocaleDateString('tr-TR')}</td>
                      <td style={{color:new Date(b.expiry_date)<new Date(new Date().setDate(new Date().getDate()+7))?'#f87171':'inherit'}}>{new Date(b.expiry_date).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):<p style={{textAlign:'center',color:'#64748b',padding:'20px 0'}}>Bu ürüne ait aktif parti bulunmuyor.</p>}
          </div>
        </div>
      )}
    </div>
  );
}