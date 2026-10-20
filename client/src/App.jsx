import { Routes, Route, NavLink, Link, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Home from './pages/Home'
import Skins from './pages/Skins'
import Cases from './pages/Cases'
import Inventory from './pages/Inventory'
import Wallet from './pages/Wallet'
import Market from './pages/Market'
import About from './pages/About'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

// Layout — navbar + sahifa + footer. Barcha sahifalar undan foydalanadi.
function Layout() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="brand">
           MUSOR DROP
        </Link>
        <div className="links">
          <NavLink to="/">Asosiy</NavLink>
          <NavLink to="/skins">Skinlar</NavLink>
          <NavLink to="/cases">Keyslar</NavLink>
          {user && <NavLink to="/inventory">Inventar</NavLink>}
          {user && <NavLink to="/wallet">Wallet</NavLink>}
          <NavLink to="/market">Dokon</NavLink>
          <NavLink to="/about">Loyiha haqida</NavLink>
          {user ? (
            <>
              <NavLink to="/profile">Profil</NavLink>
              {isAdmin && <NavLink to="/admin">Admin</NavLink>}
              <span className="userchip">
                <span className="avatar">{user.username[0].toUpperCase()}</span>
                <span className="wallet">💰 {user.wallet}</span>
                <button className="btn small ghost" onClick={logout}>Chiqish</button>
              </span>
            </>
          ) : (
            <>
              <NavLink to="/login">Kirish</NavLink>
              <NavLink to="/register" className="chip on">Ro'yxatdan o'tish</NavLink>
            </>
          )}
        </div>
      </nav>

      <main className="container">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="foot-links">
          <Link to="/skins">Katalog</Link>
          <Link to="/cases">Keyslar</Link>
          <Link to="/about">Loyiha haqida</Link>
          <a href="https://developer.valvesoftware.com" target="_blank" rel="noreferrer">Valve Docs</a>
        </div>
        <div>
          <b>musor.drop</b> — CS2 Keys & Skins. Express + Mongoose + React (Vite)
        </div>
      </footer>
    </>
  )
}

// App — barcha routelar. HashRouter (main.jsx) ishlatilmadilar, BrowserRouter yo'q.
export default function App() {
  const { loading } = useAuth()

  if (loading) return <div className="center">⏳ Yuklanmoqda...</div>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/skins" element={<Skins />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/market" element={<Market />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}
