import { useState } from "react";

export default function Cashier() {
  

  const [inventory, setInventory] = useState(() => {
  const saved = localStorage.getItem("smarket_inventory");
  return saved ? JSON.parse(saved) : [];
});

  // STATE'LER
  const [cart, setCart] = useState([]); // Sepetteki ürünler
  const [barcodeInput, setBarcodeInput] = useState(""); // Barkod kutusuna yazılan değer

  // BARKOD OKUTMA İŞLEMİ
  const handleScan = (e) => {
    e.preventDefault();
    
    // Girilen barkodu envanterde ara
    const foundProduct = inventory.find(p => p.barcode === barcodeInput);

    if (foundProduct) {
      // Ürün sepette zaten var mı kontrol et
      const existingItem = cart.find(item => item.barcode === foundProduct.barcode);
      
      if (existingItem) {
        // Varsa miktarını 1 artır
        setCart(cart.map(item => 
          item.barcode === foundProduct.barcode 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        ));
      } else {
        // Yoksa sepete miktar=1 olarak yeni ekle
        setCart([...cart, { ...foundProduct, quantity: 1 }]);
      }
      setBarcodeInput(""); // Okutma sonrası kutuyu temizle
    } else {
      alert("Product not found! Check the barcode.");
    }
  };

  // SEPETTEN ÜRÜN ÇIKARMA
  const removeItem = (barcode) => {
    setCart(cart.filter(item => item.barcode !== barcode));
  };

  // TOPLAM FİYAT HESAPLAMA
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // SATIŞI TAMAMLAMA
  // SATIŞI TAMAMLAMA VE STOKTAN DÜŞME
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    // 1. Sepetteki ürünlerin miktarını ana envanterden (inventory) çıkar
    const updatedInventory = inventory.map(invItem => {
      // Bu envanter ürünü sepette var mı diye bakıyoruz
      const cartItem = cart.find(item => item.barcode === invItem.barcode);
      
      if (cartItem) {
        // Sepette varsa, ana stoktan sepetteki miktarı çıkar
        return { ...invItem, stock: invItem.stock - cartItem.quantity };
      }
      return invItem; // Sepette yoksa aynen bırak
    });

    // 2. Kasiyerin hafızasındaki envanteri güncelle 
    setInventory(updatedInventory);

    // 3. Yeni (azalmış) stoku localStorage'a kaydet ki Müdürün ekranında da düşsün
    localStorage.setItem("smarket_inventory", JSON.stringify(updatedInventory));

    alert(`Sale Completed Successfully! Total: ₺${totalPrice.toFixed(2)}`);
    setCart([]); // Satış bitince Kasiyerin sepetini boşalt
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      
      {/* SOL PANEL: Barkod Okutma Kısmı */}
      <div style={{ flex: '1', padding: '30px', borderRight: '2px solid #e5e7eb' }}>
        <h2 style={{ color: '#333', marginTop: 0 }}>Cashier Terminal</h2>
        
        {/* Barkod Formu */}
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input 
            type="text" 
            placeholder="Scan or Type Barcode (e.g. 869123456)" 
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            style={{ flex: '1', padding: '15px', fontSize: '18px', borderRadius: '5px', border: '1px solid #ccc' }}
            autoFocus
          />
          <button type="submit" style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Add
          </button>
        </form>

        {/* Bilgi Kutusu: Hangi barkodların çalıştığını görmek için */}
        <div style={{ backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '5px', color: '#0369a1' }}>
          <strong>Test Barcodes:</strong><br/>
          Milk: 869123456 <br/>
          Apple: 869111222 <br/>
          Pasta: 869333444
        </div>
      </div>

      {/* SAĞ PANEL: Fiş / Sepet Kısmı */}
      <div style={{ width: '400px', backgroundColor: 'white', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>Current Sale (Receipt)</h3>
        
        {/* Sepetteki Ürünlerin Listesi */}
        <div style={{ flex: '1', overflowY: 'auto' }}>
          {cart.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '50px' }}>Cart is empty. Scan an item to begin.</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e5e7eb' }}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block' }}>{item.name}</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>{item.quantity} x ₺{item.price.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: 'bold' }}>₺{(item.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.barcode)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✖</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Toplam Fiyat ve Ödeme Butonu */}
        <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            <span>Total:</span>
            <span>₺{totalPrice.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            style={{ width: '100%', padding: '15px', fontSize: '18px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Complete Sale
          </button>
        </div>
      </div>

    </div>
  );
}