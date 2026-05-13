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

  const addToCart = (product) => {
    if (product.is_active === false) return toast.error("Bu ürün pasif durumda!");
    if (product.quantity <= 0) return toast.error("Bu ürünün stoğu kalmamış!");
    const existing = cart.find(i => i.barcode === product.barcode);
    if (existing) {
      if (existing.qty + 1 > product.quantity) return toast.error("Mevcut tüm stok sepette!");
      setCart(cart.map(i => i.barcode === product.barcode ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    toast.success(`${product.name} eklendi`, { duration: 900, icon: '🛒' });
  };

  const removeFromCart = (barcode) => setCart(cart.filter(i => i.barcode !== barcode));

  const handleScan = (e) => {
    e.preventDefault();
    const found = products.find(p => p.barcode === searchTerm || p.name.toLowerCase() === searchTerm.toLowerCase());
    if (found) { addToCart(found); setSearchTerm(""); }
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
    e.preventDefault();
    if (!refundSaleId) return toast.error("Fiş numarası girin!");
    const token = localStorage.getItem('token');
    try {
      const r = await fetch('http://localhost:5000/api/sales/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sale_id: refundSaleId })
      });
      const d = await r.json();
      if (r.ok) { toast.success(`İade başarılı! (Ref: ${d.refund_sale_id})`); setIsRefundModalOpen(false); setRefundSaleId(""); fetchData(); }
      else toast.error(`Hata: ${d.message}`);
    } catch { toast.error("Sunucuya bağlanılamadı!"); }
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
            <span className="scan-icon">📷</span>
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
          <h3 className="receipt-title">📋 Güncel Fiş</h3>
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
                <span className="cart-item-qty">x{item.qty}</span>
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
          <div className="c-modal-card">
            <div className="c-modal-header">
              <h3 className="c-modal-title">🔄 Fiş İptali / İade</h3>
              <button className="c-modal-close" onClick={() => setIsRefundModalOpen(false)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              İptal edilecek fişin numarasını girin. Ürünler stoğa geri eklenir.
            </p>
            <form onSubmit={handleRefund}>
              <input
                className="c-form-input"
                type="text"
                placeholder="Fiş Numarası (Sale ID)"
                required
                value={refundSaleId}
                onChange={e => setRefundSaleId(e.target.value)}
              />
              <button type="submit" className="refund-btn">İadeyi Onayla</button>
            </form>
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