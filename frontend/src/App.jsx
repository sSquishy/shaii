import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./pages/navbar/nav";
import ToastContainer from "./components/ToastContainer";
import Upload from "./pages/Upload";
import Sell from "./pages/Sell";
import Purchase from "./pages/purchase";
import MyLibrary from "./pages/MyLibrary";

function App() {
  return (
    <BrowserRouter>
      <Nav /> {/* Navbar always visible */}
      <ToastContainer />
      <div className="">
        <Routes>
          <Route path="/" element={<Purchase />} />{" "}
          <Route path="/upload" element={<Upload />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/my-library" element={<MyLibrary />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
