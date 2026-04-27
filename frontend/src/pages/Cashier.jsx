import { useState, useEffect } from "react";
import toast from 'react-hot-toast';

export default function Cashier() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundSaleId, setRefundSaleId] = useState("");
  const [completedSale, setCompletedSale] = useState(null);

  const fetchData = async () => {
    const token = localStorage.getItem('token');

    // Fetch Products
    const resProd = await fetch('http://localhost:5000/api/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resultProd = await resProd.json();
    if (resultProd.status === "success") setProducts(resultProd.data);

    // Fetch Customers
    const resCust = await fetch('http://localhost:5000/api/customers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resultCust = await resCust.json();
    if (resultCust.status === "success") setCustomers(resultCust.data);
  };

  useEffect(() => { fetchData(); }, []);

  const addToCart = (product) => {
    if (product.quantity <= 0) return toast.error("Bu ürünün stoğu kalmamış!");

    const existingItem = cart.find(item => item.barcode === product.barcode);
    if (existingItem) {
      if (existingItem.qty + 1 > product.quantity) return toast.error("Mevcut tüm stok sepette!");
      setCart(cart.map(item => item.barcode === product.barcode ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleScan = (e) => {
    e.preventDefault();
    const found = products.find(p => p.barcode === barcodeInput);
    if (found) {
      addToCart(found);
      setBarcodeInput("");
    } else {
      toast.error("Ürün bulunamadı!");
    }
  };

  // Calculations
  const cartTotal = cart.reduce((acc, i) => acc + (parseFloat(i.price) * i.qty), 0);
  const cartVat = cart.reduce((acc, i) => acc + (parseFloat(i.price) * i.qty * ((i.vat_rate || 0) / 100)), 0);
  const cartSubtotal = cartTotal - cartVat;

  let discount = 0;
  let pointsUsed = 0;
  const custObj = customers.find(c => c.customer_id === selectedCustomer);
  if (custObj && usePoints && custObj.loyalty_points > 0) {
    const maxPointsCanUse = cartTotal * 100; // max points we can use to cover cartTotal
    pointsUsed = Math.min(custObj.loyalty_points, maxPointsCanUse);
    discount = pointsUsed / 100; // 100 points = 1 TL
  }

  const finalTotal = cartTotal - discount;

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        items: cart,
        customer_id: selectedCustomer || null,
        points_to_use: pointsUsed
      })
    });
    if (response.ok) {
      const resData = await response.json();
      toast.success("Satış Tamamlandı!");
      setCompletedSale(resData.sale_receipt); // Ekranda kalıcı göstermek için state'e kaydet
      setCart([]);
      setSelectedCustomer("");
      setUsePoints(false);
      fetchData();
    } else {
      const errorData = await response.json();
      toast.error(`Hata: ${errorData.message}`);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    if (!refundSaleId) return toast.error("Lütfen bir Fiş Numarası (Sale ID) girin!");
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/sales/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sale_id: refundSaleId })
      });
      const resData = await response.json();
      if (response.ok) {
        toast.success(`Fiş İptali Başarılı! (Referans: ${resData.refund_sale_id})`);
        setIsRefundModalOpen(false);
        setRefundSaleId("");
        fetchData();
      } else {
        toast.error(`Hata: ${resData.message}`);
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı!");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
      {/* SOL: Ürün Seçim Alanı */}
      <div style={{ flex: 1, padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <form onSubmit={handleScan} style={{ flex: 1 }}>
            <input
              placeholder="Barkod Okut veya Yaz..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '18px' }}
              autoFocus
            />
          </form>
          <input
            placeholder="İsimle Ürün Ara..."
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px', padding: '15px', borderRadius: '8px', border: '1px solid #ccc' }}
          />
        </div>

        {/* ÜRÜN KARTLARI (Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', overflowY: 'auto' }}>
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <div
              key={p.barcode}
              onClick={() => addToCart(p)}
              style={{
                backgroundColor: 'white', padding: '15px', borderRadius: '12px', cursor: 'pointer',
                textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
                transition: 'transform 0.1s', opacity: p.quantity <= 0 ? 0.5 : 1
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>📦</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.name} {p.old_price && <span style={{color: '#ef4444', fontSize: '10px'}}>(İNDİRİM)</span>}</div>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', margin: '5px 0' }}>
                {p.old_price && <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px', marginRight: '5px' }}>{p.old_price} ₺</span>}
                {p.price} ₺
              </div>
              <div style={{ fontSize: '11px', color: p.quantity < 10 ? '#ef4444' : '#64748b', fontWeight: p.quantity < 10 ? 'bold' : 'normal' }}>
                Stok: {p.quantity} {p.quantity < 10 && '(Kritik)'} | KDV: %{p.vat_rate || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SAĞ: FİŞ (Cart) */}
      <div style={{ width: '380px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
        <div style={{ padding: '20px', borderBottom: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>📋 Güncel Fiş</h3>
          <button
            onClick={() => setIsRefundModalOpen(true)}
            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            Fiş İptal / İade
          </button>
        </div>
        <div style={{ padding: '0 20px 20px 20px', borderBottom: '2px solid #f1f5f9' }}>
          <select
            value={selectedCustomer}
            onChange={(e) => { setSelectedCustomer(e.target.value); setUsePoints(false); }}
            style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="">-- Müşteri Seç (Opsiyonel) --</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>{c.full_name} ({c.phone}) - {c.loyalty_points} Puan</option>
            ))}
          </select>

          {selectedCustomer && custObj && custObj.loyalty_points > 0 && (
            <label style={{ display: 'block', marginTop: '10px', fontSize: '13px', color: '#059669', cursor: 'pointer' }}>
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
              Mevcut puanları ({custObj.loyalty_points} Puan = {(custObj.loyalty_points / 100).toFixed(2)} ₺) kullan
            </label>
          )}

        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {cart.map(item => (
            <div key={item.barcode} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <div>
                <span>{item.name} <strong>x{item.qty}</strong></span>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>KDV: %{item.vat_rate || 0}</div>
              </div>
              <span>{(item.price * item.qty).toFixed(2)} ₺</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px' }}>
            <span>Ara Toplam</span>
            <span>{cartSubtotal.toFixed(2)} ₺</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px', color: '#64748b' }}>
            <span>KDV Toplamı</span>
            <span>{cartVat.toFixed(2)} ₺</span>
          </div>
          {usePoints && discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px', color: '#10b981' }}>
              <span>Puan İndirimi</span>
              <span>-{discount.toFixed(2)} ₺</span>
            </div>
          )}
          <hr style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold' }}>
            <span>GENEL TOPLAM</span>
            <span>{finalTotal.toFixed(2)} ₺</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{ width: '100%', marginTop: '15px', padding: '15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ÖDEME AL VE KAPAT
          </button>
        </div>
      </div>

      {isRefundModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#ef4444' }}>🔄 Fiş İptali / İade</h3>
              <button onClick={() => setIsRefundModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✖</button>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Lütfen iptal edilecek fişin ID'sini (Fiş Numarası) girin. Bu işlem faturayı geçersiz kılar ve ürünleri stoğa geri ekler.</p>
            <form onSubmit={handleRefund} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Fiş Numarası (Sale ID)"
                required
                value={refundSaleId}
                onChange={e => setRefundSaleId(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                İadeyi Onayla
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SATIŞ BAŞARILI MODALI (Ekranda kalıcı fiş) */}
      {completedSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
            <h2 style={{ color: '#22c55e', margin: '0 0 15px 0' }}>Satış Başarılı!</h2>

            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'left', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Fiş No (Sale ID):</strong></p>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', wordBreak: 'break-all', backgroundColor: '#e2e8f0', padding: '8px', borderRadius: '4px' }}>
                {completedSale.sale_id}
              </p>

              <p style={{ margin: '5px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <strong>Toplam Tutar:</strong> <span>{parseFloat(completedSale.total_amount).toFixed(2)} ₺</span>
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#3b82f6' }}>
                <strong>Kazanılan Puan:</strong> <span>+{completedSale.points_earned || 0} Puan</span>
              </p>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              İade işlemi için lütfen yukarıdaki Fiş No değerini kopyalayıp saklayın.
            </p>

            <button
              onClick={() => setCompletedSale(null)}
              style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Kapat
            </button>
          </div>
        </div>
      )}

    </div>
  );
}