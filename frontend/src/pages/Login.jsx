import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState(""); // Değişken ismi 'username' olarak güncellendi
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  /**
   * Giriş formunun gönderilmesini yöneten fonksiyon.
   * Backend API'sine istek atar ve gelen role göre yönlendirme yapar.
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }) // Veriler paketlenip gönderiliyor
      });

      const data = await response.json();

      if (data.status === "success") {
        // Backend'den gelen 'token'ı tarayıcı hafızasına
        localStorage.setItem('token', data.token);
        // Kullanıcının rolünü de saklıyoruz 
        localStorage.setItem('role', data.user.role);
        // Giriş başarılı: Backend'den gelen 'role' bilgisine göre yönlendirme yapılır
        if (data.user.role === "manager") {
          navigate("/manager");
        } else if (data.user.role === "cashier") {
          navigate("/cashier");
        }
      } else {
        // Giriş başarısız: Kullanıcıya hata mesajı gösterilir
        toast.error(data.message || "Giriş bilgileri hatalı!");
      }
    } catch (err) {
      console.error("Login hatası:", err);
      toast.error("Sunucuya bağlanılamadı. Lütfen backend'in açık olduğunu kontrol edin.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>

        <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#333' }}>SMarket Portal</h2>

        <input
          type="text" // 'email' yerine 'text' yapıldı
          placeholder="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <button type="submit" style={{ padding: '12px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Giriş Yap
        </button>
      </form>
    </div>
  );
}