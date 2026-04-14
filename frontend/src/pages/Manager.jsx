import { useState } from "react";

export default function Manager() {

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("smarket_inventory");
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "Milk", barcode: "869123456", category: "Dairy", stock: 50, price: "25.00", expiryDate: "2026-04-16" },
      { id: 2, name: "Apple", barcode: "869111222", category: "Produce", stock: 120, price: "15.00", expiryDate: "2026-04-20" },
      { id: 3, name: "Pasta", barcode: "869333444", category: "Pantry", stock: 300, price: "18.00", expiryDate: "2027-01-10" },
    ];
  });

  useEffect(() => {
    localStorage.setItem("smarket_inventory", JSON.stringify(products));
  }, [products]);
  
  // STATE'LER
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Arama çubuğu için
  const [editingId, setEditingId] = useState(null); // Hangi ürünün düzenlendiğini bilmek için
  const [formData, setFormData] = useState({
    name: "", barcode: "", category: "", stock: "", price: "", expiryDate: ""
  });

  // FIFO RENKLENDİRME MANTIĞI
  const getRowStyle = (expiryDateString) => {
    const today = new Date("2026-04-14"); 
    const expDate = new Date(expiryDateString);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) return { backgroundColor: '#ffebee', color: '#c62828' };
    if (diffDays <= 7) return { backgroundColor: '#fff8e1', color: '#f57f17' };
    return {};
  };

  // ARAMA FİLTRESİ: Ekranda sadece aranan kelimeyle eşleşenleri bırakır
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.barcode.includes(searchTerm)
  );

  // SİLME İŞLEMİ
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // YENİ ÜRÜN EKLEME MODALINI AÇMA
  const openAddModal = () => {
    setFormData({ name: "", barcode: "", category: "", stock: "", price: "", expiryDate: "" });
    setEditingId(null); // Yeni ekleme modu
    setIsModalOpen(true);
  };

  // DÜZENLEME MODALINI AÇMA
  const openEditModal = (product) => {
    setFormData(product); // Kutuları mevcut bilgilerle doldur
    setEditingId(product.id); // Düzenleme moduna geç
    setIsModalOpen(true);
  };

  // KAYDETME (EKLE VEYA GÜNCELLE)
  const handleSave = (e) => {
    e.preventDefault();
    
    if (editingId) {
      // GÜNCELLEME: İd'si eşleşen ürünü bul ve yeni verilerle değiştir
      setProducts(products.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
    } else {
      // YENİ EKLEME
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      setProducts([...products, { ...formData, id: newId }]);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', position: 'relative' }}>
      
      {/* ÜST KISIM: Başlık, Arama Çubuğu ve Ekleme Butonu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#333', margin: 0 }}>Manager Dashboard</h2>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Search by name or barcode..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '250px' }}
          />
          <button onClick={openAddModal} style={{ padding: '10px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add New Product
          </button>
        </div>
      </div>

      {/* TABLO */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '15px' }}>Product Name</th>
              <th style={{ padding: '15px' }}>Barcode</th>
              <th style={{ padding: '15px' }}>Category</th>
              <th style={{ padding: '15px' }}>Stock</th>
              <th style={{ padding: '15px' }}>Price (₺)</th>
              <th style={{ padding: '15px' }}>Expiry Date</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Burada 'products' yerine 'filteredProducts' kullanıyoruz ki arama çalışsın */}
            {filteredProducts.map((product) => (
              <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb', ...getRowStyle(product.expiryDate) }}>
                <td style={{ padding: '15px', fontWeight: '500' }}>{product.name}</td>
                <td style={{ padding: '15px' }}>{product.barcode}</td>
                <td style={{ padding: '15px' }}>{product.category}</td>
                <td style={{ padding: '15px' }}>{product.stock}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{product.price}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{product.expiryDate}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <button onClick={() => openEditModal(product)} style={{ marginRight: '10px', padding: '6px 12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(product.id)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL (EKLEME VE DÜZENLEME İÇİN ORTAK) */}
      {isModalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
              {editingId ? "Edit Product" : "Add New Product"}
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Product Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Barcode" required value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Category" required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Stock Amount" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" step="0.01" placeholder="Price" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <label style={{ fontSize: '14px', color: '#666', marginBottom: '-8px' }}>Expiry Date:</label>
              <input type="date" required value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 15px', backgroundColor: '#e5e7eb', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {editingId ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}