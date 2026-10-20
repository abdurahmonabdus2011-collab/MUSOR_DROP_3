import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// Inventory — joriy user skinlari: filtrlash (owned/sold), sotish, jonli statistika.

const RARITY_LINE = {
  Common: '#b0c3d9', Rare: '#4b69ff', Epic: '#8847ff',
  Legendary: '#d32ce6', Mythic: '#eb4b4b',
}

export default function Inventory() {
  const { user, setUser, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('owned') // owned | sold
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selling, setSelling] = useState(null) // aynan sotilyotgan item id
  const [listing, setListing] = useState(null) // aynan bozonga qoylani

  const load = useCallback(async () => {
    try {
      const list = await api.getInventory(tab)
      setItems(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  // Bozorga qo'yish modali
  const openListModal = (item) => {
    setError('')
    setNotice('')
    setListing({ item, price: String(item.skin?.skinPrice || 0) })
  }

  const closeListModal = () => {
    setListing(null)
  }

  const confirmList = async (e) => {
    e.preventDefault()
    if (!listing?.item) return
    try {
      const p = parseFloat(listing.price)
      if (!Number.isFinite(p) || p <= 0) {
        setError('Narx musbat raqam bo\'lishi kerak')
        setTimeout(() => setError(''), 4000)
        return
      }
      if (p > 1000000) {
        setError('Narx 1 000 000 dan ortiq bo\'lishi mumkin emas')
        setTimeout(() => setError(''), 4000)
        return
      }
      setListing({ ...listing, submitting: true })
      await api.createListing({ itemId: listing.item._id, price: p })
      setNotice(`Bozorga qo'yildi: ${listing.item.skin?.skinName || 'Skin'} — $${p.toFixed(2)}`)
      setListing(null)
      setTimeout(() => {
        navigate('/market')
      }, 600)
    } catch (e) {
      setError(e.message)
      setTimeout(() => setError(''), 4000)
      setListing(prev => prev ? { ...prev, submitting: false } : null)
    }
  }

  // Ulangan bo'lmasa kirish taklifi
  if (!user) {
    return (
      <section className="form-page">
        <h1>🎒 Inventar</h1>
        <div className="top-card">
          <p className="muted">
            Keyslardan chiqqan skinlaringiz shu yerda ko'rinadi. Sotish orqali balansni to'ldirasiz.
          </p>
          <Link to="/login" className="btn" style={{ marginTop: 16, display: 'inline-block' }}>Kirish</Link>
        </div>
      </section>
    )
  }

  const sell = async (item) => {
    setError(''); setNotice(''); setSelling(item._id)
    try {
      const data = await api.sellItem(item._id)
      // Navbar balansini yangilash
      setUser({ ...user, wallet: data.wallet })
      setNotice(`✅ "${item.skin?.skinName || 'Skin'}" $${Number(item.skin?.skinPrice || 0).toFixed(2)} ga sotildi`)
      load() // royxatni yangilash (owned dan yo'qoladi, sold ga o'tadi)
      setTimeout(() => setNotice(''), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSelling(null)
    }
  }

  // Statistika (owned itemlar bo'yicha)
  const owned = items.filter((i) => i.status === 'owned')
  const totalValue = owned.reduce((s, i) => s + (i.skin?.skinPrice || 0), 0)
  const best = owned.reduce((b, i) => ((i.skin?.skinPrice || 0) > (b?.skin?.skinPrice || 0) ? i : b), null)

  return (
    <section>
      <h1>🎒 Inventaringiz</h1>
      <p className="muted" style={{ margin: '6px 0 20px' }}>
        @{user.username} · Balans <b style={{ color: 'var(--green)' }}>💰 {Number(user.wallet).toFixed(2)}</b>
      </p>

      {/* Statistika chiziqlari */}
      {tab === 'owned' && owned.length > 0 && (
        <div className="stats">
          <div className="stat"><b>{owned.length}</b><span>Inventarda skin</span></div>
          <div className="stat"><b>${totalValue.toFixed(2)}</b><span>Umumiy qiymati</span></div>
          <div className="stat" style={{ gridColumn: 'span 2' }}>
            <b style={{ fontSize: 17 }}>{best?.skin?.skinName || '—'}</b>
            <span>Eng qimmat skin</span>
          </div>
        </div>
      )}

      {notice && <p className="success">{notice}</p>}
      {error && <p className="error">{error}</p>}

      {/* Filtrlash tab'lari */}
      <div className="chips" style={{ margin: '14px 0 18px' }}>
        <button className={`chip ${tab === 'owned' ? 'on' : ''}`} onClick={() => setTab('owned')}>🖐 Menda bor ({tab === 'owned' && items.length})</button>
        <button className={`chip ${tab === 'sold' ? 'on' : ''}`} onClick={() => setTab('sold')}>💸 Sotilganlar ({tab === 'sold' && items.length})</button>
      </div>

      {loading && <p className="muted">Yuklanmoqda...</p>}
      {!loading && items.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📭</div>
          <h3 style={{ margin: '12px 0 6px' }}>{tab === 'owned' ? 'Inventar bo\\\'sh' : 'Sotilgan skin yo\\\'q'}</h3>
          {tab === 'owned' && (
            <p className="muted small">
              <Link to="/cases" style={{ color: 'var(--accent)' }}>Keys oching</Link> — skinlar bu yerda paydo bo'ladi!
            </p>
          )}
        </div>
      )}

      <div className="grid">
        {items.map((item) => (
          <div key={item._id} className="card inv-item"
               style={{ '--line': RARITY_LINE[item.skin?.skinRarity] || '#8b93a1' }}>
            <img
              src={item.skin?.imageUrl}
              alt={item.skin?.skinName}
              className="inv-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.classList.add('noimg') }}
            />
            <div className="inv-info">
              <h3>{item.skin?.skinName || 'Noma\'lum skin'}</h3>
              <div style={{ color: RARITY_LINE[item.skin?.skinRarity], fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                {item.skin?.skinRarity || 'Common'}
              </div>
              <div className="muted small" style={{ marginTop: 6 }}>
                📦 {item.sourceCase?.caseName || '—'} · {new Date(item.obtainedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="inv-bottom">
              <span className="price">${Number(item.skin?.skinPrice || 0).toFixed(2)}</span>
              {item.status === 'owned' ? (
                <span className="inv-actions">
                  <button className="btn small green" onClick={() => sell(item)} disabled={selling === item._id}>
                    {selling === item._id ? 'Sotilyapti...' : '💰 Sotish'}
                  </button>
                  <button className="btn small blue" onClick={() => openListModal(item)}>
                    🏪 Bozorga qo‘yish
                  </button>
                </span>
              ) : item.status === 'listed' ? (
                <span className="badge listed">bozorda 🏪</span>
              ) : (
                <span className="badge sold">sotilgan</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {listing && (
        <div className="modal-overlay" onClick={closeListModal}>
          <div className="roll-modal" style={{ maxWidth: 420, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 22 }}>Bozorga qo‘yish</h2>
              <button className="btn small ghost" onClick={closeListModal}>Yopish</button>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <img
                src={listing.item.skin?.imageUrl}
                alt={listing.item.skin?.skinName}
                style={{ width: 92, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.5))' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{listing.item.skin?.skinName || 'Skin'}</div>
                <div style={{ color: RARITY_LINE[listing.item.skin?.skinRarity], fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {listing.item.skin?.skinRarity || 'Common'}
                </div>
                <div className="muted small">Tavsiya narxi: ${Number(listing.item.skin?.skinPrice || 0).toFixed(2)}</div>
              </div>
            </div>
            <form onSubmit={confirmList} className="form" style={{ maxWidth: '100%' }}>
              <label>
                Narx ($)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  value={listing.price}
                  onChange={(e) => setListing({ ...listing, price: e.target.value })}
                  autoFocus
                />
              </label>
              <div className="row-btns">
                <button className="btn" type="submit" disabled={listing.submitting}>
                  {listing.submitting ? 'Qo‘yilyapti...' : 'Bozorga qo‘yish'}
                </button>
                <button className="btn ghost" type="button" onClick={closeListModal}>Bekor qilish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
