import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.status === "success") {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.role);
        if (data.user.role === "manager") navigate("/manager");
        else if (data.user.role === "cashier") navigate("/cashier");
      } else {
        toast.error(data.message || "Giriş bilgileri hatalı!");
      }
    } catch (err) {
      toast.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-orb orb1" />
      <div className="login-orb orb2" />
      <div className="login-orb orb3" />

      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🛒</span>
        </div>
        <h1 className="login-title">SMarket</h1>
        <p className="login-subtitle">Mağaza Yönetim Sistemi</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
              autoFocus
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>

          <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}