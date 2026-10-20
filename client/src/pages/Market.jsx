import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const RARITY_LINE = {
  Common: '#b0c3d9',
  Rare: '#4b69ff',
  Epic: '#8847ff',
  Legendary: '#d32ce6',
  Mythic: '#eb4b4b',
}

export default function Market() {
  const { user, setUser } = useAuth()
  const [market, setMarket] = useState([])
  const [mine, setMine] = useState([])
  const [tab, setTab] = useState('public')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadMarket = useCallback(async () => {
    try {
      if (tab === 'mine') {
        const my = await api.getMarket(true)
        setMine(my)
        setMarket([])
      } else {
        const publicList = await api.getMarket()
        setMarket(publicList)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (user) {
      loadMarket()
    }
  }, [user, loadMarket])

  if (!user) {
    return (
      <section className="form-page">
        <h1>🏪 Dokon</h1>
        <div className="top-card">
          <p className="muted">
            Hamma foydalanuvchi bozordagi skinlarni ko'rasin va sotib olishi mumkin.
            E'londan foydalanish uchun <Link to="/login" className="btn" style={{ display: 'inline-block', marginTop: 12 }}>kirish</Link> yoki <Link to="/register" className="chip on" style={{ display: 'inline-block', marginTop: 12, marginLeft: 8 }}>ro'yxatdan o'ting</Link>.
          </p>
        </div>
        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Yuklanmoqda...</p>}
      </section>
    )
  }

  const buy = async (listing) => {
    try {
      const { message, wallet } = await api.buyListing(listing._id)
      setUser({ ...user, wallet })
      setNotice(message)
      setTimeout(() => setNotice(''), 3500)
      loadMarket()
    } catch (e) {
      setError(e.message)
      setTimeout(() => setError(''), 4000)
    }
  }

  const cancel = async (listing) => {
    try {
      await api.cancelListing(listing._id)
      setNotice('E’lon bekor qilindi')
      setTimeout(() => setNotice(''), 2500)
      loadMarket()
    } catch (e) {
      setError(e.message)
      setTimeout(() => setError(''), 4000)
    }
  }

  return (
    <section>
      <h1>🏪 Dokon</h1>
      <p className="muted" style={{ margin: '6px 0 20px' }}>
        @{user.username} · Balans <b style={{ color: 'var(--green)' }}>💰 {Number(user.wallet).toFixed(2)}</b>
      </p>

      {notice && <p className="success">{notice}</p>}
      {error && <p className="error">{error}</p>}

      {mine.length === 0 && (
        <p className="muted small" style={{ margin: '18px 0 4px' }}>
          <Link to="/inventory">Inventaridan foydalanuvchi skinni narx qo‘yib bozonga qo‘yish mumkin</Link>
        </p>
      )}

      <div className="chips" style={{ margin: '16px 0 18px' }}>
        <button className={`chip ${tab === 'public' ? 'on' : ''}`} onClick={() => setTab('public')}>
          🏪 Bozordagi e'lonlar ({market.length})
        </button>
        <button className={`chip ${tab === 'mine' ? 'on' : ''}`} onClick={() => setTab('mine')} style={{ background: tab === 'mine' ? 'var(--accent)' : undefined }}>
          👤 Mening e'lonlarim ({mine.length})
        </button>
      </div>

      {loading && <p className="muted">Yuklanmoqda...</p>}

      {!loading && tab === 'public' && market.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🏪</div>
          <h3 style={{ margin: '12px 0 6px' }}>Dokon hozirda bo'sh</h3>
          <p className="muted small">Inventarningizdagi itemlarni bozorga qo'yish orqali tezroq yuklanadi</p>
        </div>
      )}

      {!loading && tab === 'public' && market.length > 0 && (
        <div className="grid">
          {market.map((listing) => {
            const skin = listing.skin
            const sellerId = listing.seller?._id || listing.seller
            const isMine = user && (sellerId === user._id || sellerId === user.id)
            const eligible = !!user && !isMine
            return (
              <div key={listing._id} className="card shop-item" style={{ '--line': RARITY_LINE[skin?.skinRarity] || '#8b93a1' }}>
                <img
                  src={skin?.imageUrl}
                  alt={skin?.skinName}
                  className="shop-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.parentElement) e.currentTarget.parentElement.classList.add('noimg')
                  }}
                />
                <div className="shop-info">
                  <h3>{skin?.skinName || 'Noma\'lum skin'}</h3>
                  <div style={{ color: RARITY_LINE[skin?.skinRarity], fontWeight: 700, fontSize: 12, marginTop: 4, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                    {skin?.skinRarity || 'Common'}
                  </div>
                  <div className="market-mini">
                    <span className="market-mini-label">Qo‘ygan</span>
                    <span className="market-mini-value">@{listing.seller?.username || '—'} · ${Number(listing.price).toFixed(2)}</span>
                  </div>
                </div>
                <div className="shop-bottom">
                  <span className="price">${Number(listing.price).toFixed(2)}</span>
                  <button className="btn small green" disabled={!eligible} onClick={() => buy(listing)}>
                    {isMine ? "O'zingizniki" : 'Sotib olish'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'mine' && mine.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📭</div>
          <h3 style={{ margin: '12px 0 6px' }}>Sizning e'lonlaringiz yo'q</h3>
          <p className="muted small">
            <Link to="/inventory">Inventaridan bozonga qo'yish</Link>
          </p>
        </div>
      )}

      {tab === 'mine' && mine.length > 0 && (
        <div className="grid">
          {mine.map((listing) => {
            const skin = listing.skin
            const isSold = listing.status === 'sold'
            const isCancelled = listing.status === 'cancelled'
            const lineColor = isSold ? '#e5534b' : isCancelled ? '#9aa3b2' : (RARITY_LINE[skin?.skinRarity] || '#8b93a1')
            return (
              <div key={listing._id} className="card shop-item" style={{ '--line': lineColor }}>
                <img
                  src={skin?.imageUrl}
                  alt={skin?.skinName}
                  className="shop-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.parentElement) e.currentTarget.parentElement.classList.add('noimg')
                  }}
                />
                <div className="shop-info">
                  <h3>{skin?.skinName || 'Noma\'lum skin'}</h3>
                  <div style={{ color: RARITY_LINE[skin?.skinRarity], fontWeight: 700, fontSize: 12, marginTop: 4, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                    {skin?.skinRarity || 'Common'}
                  </div>
                  {isSold && (
                    <div className="market-mini sold">
                      <span className="market-mini-label">Sotilgan</span>
                      <span className="market-mini-value">@{listing.buyer?.username || '—'} · ${Number(listing.price).toFixed(2)} ga sotib oldi</span>
                    </div>
                  )}
                  {isCancelled && !isSold && (
                    <div className="market-mini">
                      <span className="market-mini-label">Bekor qilingan</span>
                      <span className="market-mini-value">${Number(listing.price).toFixed(2)} ga qo‘yilgan edi</span>
                    </div>
                  )}
                  {!isSold && !isCancelled && (
                    <div className="market-mini">
                      <span className="market-mini-label">Siz qo‘ydingiz</span>
                      <span className="market-mini-value">@{user.username} · ${Number(listing.price).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="shop-bottom">
                  <span className="price">${Number(listing.price).toFixed(2)}</span>
                  <button className="btn small yellow" disabled={listing.status !== 'active'} onClick={() => cancel(listing)}>
                    {isSold ? 'Sotilgan' : isCancelled ? 'Bekor qilingan' : 'Bekor qilish'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}