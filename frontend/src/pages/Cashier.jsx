import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import "./Cashier.css";

export default function Cashier() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundSaleId, setRefundSaleId] = useState("");
  const [refundSaleDetails, setRefundSaleDetails] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const h = { 'Authorization': `Bearer ${token}` };
    const rp = await fetch('http://localhost:5000/api/products', { headers: h });
    const dp = await rp.json();
    if (dp.status === "success") setProducts(dp.data);
    const rc = await fetch('http://localhost:5000/api/customers', { headers: h });
    const dc = await rc.json();
    if (dc.status === "success") setCustomers(dc.data);
  };

  useEffect(() => { fetchData(); }, []);

  const addToCart = (product, qtyToAdd = 1) => {
    if (product.is_active === false) return toast.error("Bu ürün pasif durumda!");
    if (product.quantity <= 0) return toast.error("Bu ürünün stoğu kalmamış!");
    
    const existing = cart.find(i => i.barcode === product.barcode);
    const currentQty = existing ? existing.qty : 0;
    
    if (currentQty + qtyToAdd > product.quantity) {
      return toast.error(`Mevcut stok yetersiz! (Maks: ${product.quantity})`);
    }

    if (existing) {
      setCart(cart.map(i => i.barcode === product.barcode ? { ...i, qty: i.qty + qtyToAdd } : i));
    } else {
      setCart([...cart, { ...product, qty: qtyToAdd }]);
    }
    toast.success(`${product.name} (${qtyToAdd} adet) eklendi`, { duration: 900, icon: '🛒' });
  };

  const removeFromCart = (barcode) => setCart(cart.filter(i => i.barcode !== barcode));

  const updateCartQty = (barcode, change) => {
    const item = cart.find(i => i.barcode === barcode);
    if (!item) return;
    const newQty = item.qty + change;
    if (newQty <= 0) return removeFromCart(barcode);
    
    const product = products.find(p => p.barcode === barcode);
    if (product && newQty > product.quantity) {
      return toast.error(`Mevcut stok yetersiz! (Maks: ${product.quantity})`);
    }
    setCart(cart.map(i => i.barcode === barcode ? { ...i, qty: newQty } : i));
  };

  const handleScan = (e) => {
    e.preventDefault();
    let search = searchTerm.trim();
    let qtyToAdd = 1;

    const match = search.match(/^(\d+)\*(.+)$/);
    if (match) {
      qtyToAdd = parseInt(match[1]);
      search = match[2];
    }

    const found = products.find(p => p.barcode === search || p.name.toLowerCase() === search.toLowerCase());
    if (found) { addToCart(found, qtyToAdd); setSearchTerm(""); }
    else toast.error("Ürün bulunamadı!");
  };

  const cartTotal = cart.reduce((a, i) => a + parseFloat(i.price) * i.qty, 0);
  const cartVat = cart.reduce((a, i) => a + parseFloat(i.price) * i.qty * ((i.vat_rate || 0) / 100), 0);
  const cartSubtotal = cartTotal - cartVat;

  let discount = 0, pointsUsed = 0;
  const custObj = customers.find(c => c.customer_id === selectedCustomer);
  if (custObj && usePoints && custObj.loyalty_points > 0) {
    pointsUsed = Math.min(custObj.loyalty_points, cartTotal * 100);
    discount = pointsUsed / 100;
  }
  const finalTotal = cartTotal - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const token = localStorage.getItem('token');
    const r = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: cart, customer_id: selectedCustomer || null, points_to_use: pointsUsed })
    });
    if (r.ok) {
      const d = await r.json();
      toast.success("Satış tamamlandı!");
      setCompletedSale(d.sale_receipt);
      setCart([]); setSelectedCustomer(""); setUsePoints(false);
      fetchData();
    } else {
      const d = await r.json();
      toast.error(`Hata: ${d.message}`);
    }
  };

  const handleRefund = async (e) => {
    if (e) e.preventDefault();
    if (!refundSaleId) return toast.error("Fiş numarası girin!");
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('http://localhost:5000/api/sales/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sale_id: refundSaleId })
      });
      const d = await r.json();
      if (r.ok) { 
        toast.success(`Tüm fiş iade edildi!`); 
        setIsRefundModalOpen(false); 
        setRefundSaleId(""); 
        setRefundSaleDetails(null);
        fetchData(); 
      }
      else toast.error(`Hata: ${d.message}`);
    } catch { toast.error("Sunucuya bağlanılamadı!"); }
  };

  const fetchSaleDetails = async () => {
    if (!refundSaleId) return toast.error("Sorgulamak için Fiş ID girin!");
    const token = localStorage.getItem('token');
    const r = await fetch(`http://localhost:5000/api/sales/${refundSaleId}`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    const d = await r.json();
    if (r.ok) setRefundSaleDetails(d);
    else { toast.error(d.message); setRefundSaleDetails(null); }
  };

  const refundSingleItem = async (itemId) => {
    const token = localStorage.getItem('token');
    const r = await fetch('http://localhost:5000/api/sales/refund-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sale_id: refundSaleId, item_id: itemId })
    });
    const d = await r.json();
    if (r.ok) { 
      toast.success(d.message); 
      fetchSaleDetails(); 
      fetchData(); 
    }
    else toast.error(d.message);
  };

  const filtered = products.filter(p =>
    p.is_active !== false &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm))
  );

  const stockClass = (qty) => qty <= 0 ? 'stock-out' : qty < 10 ? 'stock-low' : 'stock-ok';
  const stockLabel = (qty) => qty <= 0 ? 'Tükendi' : qty < 10 ? `${qty} (Kritik)` : `${qty} adet`;

  return (
    <div className="cashier-layout">
      {/* LEFT */}
      <div className="cashier-left">
        <div className="cashier-topbar">
          <div className="cashier-brand">
            <div className="cashier-brand-icon">🛒</div>
            <span className="cashier-brand-name">SMarket</span>
          </div>
          <form onSubmit={handleScan} className="scan-form">
            <input
              className="scan-input"
              placeholder="Barkod okut veya ürün adı yaz, Enter ile ekle..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </form>
          <button className="refund-icon-btn" onClick={() => setIsRefundModalOpen(true)}>
            🔄 İade
          </button>
        </div>

        <div className="product-grid">
          {filtered.map(p => (
            <div
              key={p.barcode}
              className={`product-card ${p.quantity <= 0 ? 'out-of-stock' : ''}`}
              onClick={() => addToCart(p)}
            >
              <div className="product-emoji">📦</div>
              <div className="product-name">
                {p.name}
                {p.old_price && <span className="product-sale-label"> İNDİRİM</span>}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: -2, marginBottom: 4 }}>{p.barcode}</div>
              <div className="product-price">
                {p.old_price && <span className="product-old-price">{p.old_price}₺</span>}
                {p.price}₺
              </div>
              <span className={`product-stock ${stockClass(p.quantity)}`}>{stockLabel(p.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="cashier-right">
        <div className="receipt-header">
          <h3 className="receipt-title">Güncel Fiş</h3>
          <span style={{ fontSize: 13, color: '#475569' }}>{cart.length} ürün</span>
        </div>

        <div className="receipt-customer">
          <select
            className="receipt-select"
            value={selectedCustomer}
            onChange={e => { setSelectedCustomer(e.target.value); setUsePoints(false); }}
          >
            <option value="">— Müşteri Seç (Opsiyonel) —</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.full_name} • {c.loyalty_points} Puan
              </option>
            ))}
          </select>
          {selectedCustomer && custObj && custObj.loyalty_points > 0 && (
            <label className="points-label">
              <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} />
              {custObj.loyalty_points} Puan kullan → -{(custObj.loyalty_points / 100).toFixed(2)}₺
            </label>
          )}
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty-icon">🛒</span>
              Sepet boş
            </div>
          ) : (
            cart.map(item => (
              <div key={item.barcode} className="cart-item">
                <div style={{ flex: 1 }}>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-meta">KDV: %{item.vat_rate || 0} • {item.price}₺/adet</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
                  <button onClick={() => updateCartQty(item.barcode, -1)} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <span className="cart-item-qty" style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateCartQty(item.barcode, 1)} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                <span className="cart-item-price">{(item.price * item.qty).toFixed(2)}₺</span>
                <span
                  onClick={() => removeFromCart(item.barcode)}
                  style={{ cursor: 'pointer', color: '#475569', fontSize: 16, marginLeft: 6 }}
                  title="Kaldır"
                >✕</span>
              </div>
            ))
          )}
        </div>

        <div className="receipt-totals">
          <div className="total-row"><span>Ara Toplam</span><span>{cartSubtotal.toFixed(2)}₺</span></div>
          <div className="total-row"><span>KDV</span><span>{cartVat.toFixed(2)}₺</span></div>
          {usePoints && discount > 0 && (
            <div className="total-row discount"><span>🎉 Puan İndirimi</span><span>-{discount.toFixed(2)}₺</span></div>
          )}
          <hr className="total-divider" />
          <div className="total-grand"><span>TOPLAM</span><span>{finalTotal.toFixed(2)}₺</span></div>
          <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
            ÖDEME AL VE KAPAT
          </button>
        </div>
      </div>

      {/* REFUND MODAL */}
      {isRefundModalOpen && (
        <div className="c-modal-overlay">
          <div className="c-modal-card" style={{ maxWidth: 500 }}>
            <div className="c-modal-header">
              <h3 className="c-modal-title">🔄 İade / Ürün İptali</h3>
              <button className="c-modal-close" onClick={() => { setIsRefundModalOpen(false); setRefundSaleDetails(null); }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input 
                className="c-form-input" 
                placeholder="Fiş ID girin..." 
                value={refundSaleId} 
                onChange={e => setRefundSaleId(e.target.value)} 
              />
              <button className="checkout-btn" style={{ padding: '0 20px', height: 42, width: 'auto' }} onClick={fetchSaleDetails}>Sorgula</button>
            </div>

            {refundSaleDetails && (
              <div className="refund-content">
                {refundSaleDetails.sale.points_used > 0 ? (
                  <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                    ⚠️ Bu fişte <strong>{refundSaleDetails.sale.points_used}</strong> puan kullanılmıştır. Puanlı alışverişlerde iade yapılamaz.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                      Müşteri: <strong>{refundSaleDetails.sale.customer_name || 'Kayıtsız'}</strong> | Toplam: <strong>{refundSaleDetails.sale.total_amount}₺</strong>
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                      {refundSaleDetails.items.map(item => (
                        <div key={item.sale_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {item.quantity} adet x {item.unit_price}₺ | SKT: {new Date(item.expiry_date).toLocaleDateString()}
                            </div>
                          </div>
                          <button 
                            className="btn-red" 
                            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}
                            onClick={() => refundSingleItem(item.item_id)}
                          >İade Et</button>
                        </div>
                      ))}
                    </div>
                    <button 
                      className="checkout-btn" 
                      style={{ backgroundColor: '#dc2626', width: '100%' }} 
                      onClick={handleRefund}
                    >TÜM FİŞİ İPTAL ET</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {completedSale && (
        <div className="c-modal-overlay">
          <div className="c-modal-card" style={{ maxWidth: 380 }}>
            <div className="success-icon">✅</div>
            <h2 className="success-title">Satış Başarılı!</h2>
            <div className="success-card">
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Fiş Numarası:</p>
              <div className="success-sale-id">{completedSale.sale_id}</div>
              <div className="success-row">
                <span style={{ color: '#94a3b8' }}>Toplam Tutar</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{parseFloat(completedSale.total_amount).toFixed(2)}₺</span>
              </div>
              <div className="success-row">
                <span style={{ color: '#94a3b8' }}>Kazanılan Puan</span>
                <span style={{ fontWeight: 700, color: '#a78bfa' }}>+{completedSale.points_earned || 0}</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', margin: '0 0 16px' }}>
              İade için fiş numarasını saklayın.
            </p>
            <button className="success-close-btn" onClick={() => setCompletedSale(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}