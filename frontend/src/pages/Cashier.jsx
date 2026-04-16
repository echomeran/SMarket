import { useState, useEffect } from "react";

export default function Cashier() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.status === "success") setProducts(result.data);
  };

  useEffect(() => { fetchProducts(); }, []);

  // Ortak Ekleme Fonksiyonu (Hem barkod hem tıklama için)
  const addToCart = (product) => {
    if (product.quantity <= 0) return alert("Bu ürünün stoğu kalmamış!");

    const existingItem = cart.find(item => item.barcode === product.barcode);
    if (existingItem) {
      if (existingItem.qty + 1 > product.quantity) return alert("Mevcut tüm stok sepette!");
      setCart(cart.map(item => item.barcode === product.barcode ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  // Barkod Okutma (Enter'a basınca çalışır)
  const handleScan = (e) => {
    e.preventDefault();
    const found = products.find(p => p.barcode === barcodeInput);
    if (found) {
      addToCart(found);
      setBarcodeInput("");
    } else {
      alert("Ürün bulunamadı!");
    }
  };

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: cart })
    });
    if (response.ok) {
      alert("Satış Tamamlandı!");
      setCart([]); fetchProducts();
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
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.name}</div>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', margin: '5px 0' }}>{p.price} ₺</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Stok: {p.quantity}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SAĞ: FİŞ (Cart) */}
      <div style={{ width: '380px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
        <div style={{ padding: '20px', borderBottom: '2px solid #f1f5f9' }}>
          <h3>📋 Güncel Fiş</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {cart.map(item => (
            <div key={item.barcode} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span>{item.name} <strong>x{item.qty}</strong></span>
              <span>{(item.price * item.qty).toFixed(2)} ₺</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold' }}>
            <span>TOPLAM</span>
            <span>{cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)} ₺</span>
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
    </div>
  );
}