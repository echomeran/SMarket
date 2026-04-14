import { useState } from "react";

export default function Manager() {
  // SAHTE VERİLER (Mock Data)
  const [products, setProducts] = useState([
    { id: 1, name: "Milk", barcode: "869123456", category: "Dairy", stock: 50, price: "₺25.00", expiryDate: "2026-04-16" },
    { id: 2, name: "Apple", barcode: "869111222", category: "Produce", stock: 120, price: "₺15.00", expiryDate: "2026-04-20" },
    { id: 3, name: "Pasta", barcode: "869333444", category: "Pantry", stock: 300, price: "₺18.00", expiryDate: "2027-01-10" },
  ]);

  // Yeni state'ler: Açılır pencereyi (Modal) ve formdaki yazıları tutmak için
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "", barcode: "", category: "", stock: "", price: "", expiryDate: ""
  });

  // Renklendirme mantığı (Değişmedi)
  const getRowStyle = (expiryDateString) => {
    const today = new Date("2026-04-14"); 
    const expDate = new Date(expiryDateString);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) return { backgroundColor: '#ffebee', color: '#c62828' };
    if (diffDays <= 7) return { backgroundColor: '#fff8e1', color: '#f57f17' };
    return {};
  };

  // Yeni ürün kaydet butonuna basıldığında çalışacak fonksiyon
  const handleAddProduct = (e) => {
    e.preventDefault();
    // Forma yazılan bilgileri al, listeye yeni bir satır olarak ekle
    const productToAdd = { ...newProduct, id: products.length + 1, price: `₺${newProduct.price}` };
    setProducts([...products, productToAdd]);
    
    // İşlem bitince formu temizle ve pencereyi kapat
    setNewProduct({ name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "" });
    setIsModalOpen(false);
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#333', margin: 0 }}>Manager Dashboard - Inventory & FIFO</h2>
        <button 
          onClick={() => setIsModalOpen(true)} // Butona tıklandığında Modal'ı açar
          style={{ padding: '10px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add New Product
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '15px' }}>Product Name</th>
              <th style={{ padding: '15px' }}>Barcode</th>
              <th style={{ padding: '15px' }}>Category</th>
              <th style={{ padding: '15px' }}>Stock</th>
              <th style={{ padding: '15px' }}>Price</th>
              <th style={{ padding: '15px' }}>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb', ...getRowStyle(product.expiryDate) }}>
                <td style={{ padding: '15px', fontWeight: '500' }}>{product.name}</td>
                <td style={{ padding: '15px' }}>{product.barcode}</td>
                <td style={{ padding: '15px' }}>{product.category}</td>
                <td style={{ padding: '15px' }}>{product.stock}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{product.price}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{product.expiryDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (AÇILIR PENCERE) KISMI */}
      {isModalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Add New Product</h3>
            
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Product Name (e.g. Bread)" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Barcode" required value={newProduct.barcode} onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Category" required value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Stock Amount" required value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Price" required value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '-8px' }}>Expiry Date:</label>
              <input type="date" required value={newProduct.expiryDate} onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 15px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Product</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}