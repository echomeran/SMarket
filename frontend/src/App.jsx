import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Manager from "./pages/Manager";
import Cashier from "./pages/Cashier";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Adres çubuğunda ne yazıyorsa o sayfayı göster */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/cashier" element={<Cashier />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;