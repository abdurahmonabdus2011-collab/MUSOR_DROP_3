import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// Cases — keyslarni ko'rish va ochish (CS2 uslubidagi roll animatsiyasi bilan).
// Roll: gorizontal lentada 60 tasodifiy skin aylanadi, oxirida yutqazgan skin to'xtaydi.

const RARITY_LINE = {
  Common: '#b0c3d9',
  Rare: '#4b69ff',
  Epic: '#8847ff',
  Legendary: '#d32ce6',
  Mythic: '#eb4b4b',
}

// Bitta skin lentadagi katak
function RollItem({ skin }) {
  return (
    <div className="roll-item" style={{ '--line': RARITY_LINE[skin?.skinRarity] || '#8b93a1' }}>
      <img
        src={skin?.imageUrl}
        alt={skin?.skinName}
        className="roll-img"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <div className="roll-name">{skin?.skinName}</div>
      <div className="roll-chance" style={{ color: RARITY_LINE[skin?.skinRarity] }}>
        {skin?.skinRarity}
      </div>
    </div>
  )
}

// Ajratuvchi chiziq (roll markazida to'xtaydi)
function Marker() {
  return <div className="roll-marker" />
}

export default function Cases() {
  const { user, setUser, isAdmin } = useAuth()
  const [cases, setCases] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Roll holati
  const [rollingCase, setRollingCase] = useState(null) // tanlangan/ochilayotgan keys
  const [rollItems, setRollItems] = useState([])       // lentadagi 60 skin
  const [winner, setWinner] = useState(null)           // yutgan skin
  const [rollOffset, setRollOffset] = useState(0)      // lenta siljishi
  const [phase, setPhase] = useState('idle')           // idle | rolling | result
  const [openError, setOpenError] = useState('')
  const stripRef = useRef(null)

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Keysni tanlash va roulette tayyorlash (ochishdan oldin ko'rsatish)
  const selectCase = (c) => {
    setOpenError('')
    setRollingCase(c)
    const allSkins = (c.skins || []).filter((s) => s && s.skin).map((s) => s.skin)
    const filler = Array.from({ length: 60 }, () =>
      allSkins.length > 0 ? allSkins[Math.floor(Math.random() * allSkins.length)] : null
    )
    setRollItems(filler)
    setWinner(null)
    setPhase('idle')
    setRollOffset(0)
  }

  // Haqiqiy "OCHMOQ" tugmasi bosilganda ishlaydigan funksiya
  const executeOpen = async (c) => {
    if (!user) {
      setOpenError('Keys ochish uchun avval kiring!')
      return
    }

    if (user.wallet < c.casePrice) {
      setOpenError(`Balansingiz yetarli emas! Keys narxi: $${c.casePrice}, sizning balansingiz: $${user.wallet.toFixed(2)}`)
      return
    }

    setOpenError('')
    setWinner(null)
    setRollOffset(0)
    setPhase('rolling')

    // Lentani yangilash
    const allSkins = (c.skins || []).filter((s) => s && s.skin).map((s) => s.skin)
    const filler = Array.from({ length: 60 }, () =>
      allSkins.length > 0 ? allSkins[Math.floor(Math.random() * allSkins.length)] : null
    )
    setRollItems(filler)

    try {
      // 1) Backendga so'rov
      const result = await api.openCase(c._id)

      // 2) Yutuqni 55-katakka joylash
      const WIN_INDEX = 55
      const finalStrip = [...filler]
      finalStrip[WIN_INDEX] = result.skin
      setRollItems(finalStrip)
      setWinner(result.skin)

      // 3) Balansni yangilash
      setUser({ ...user, wallet: result.wallet })

      // 4) Animatsiya hisoblash va boshlash
      const ITEM_W = 142
      const viewport = stripRef.current?.parentElement?.clientWidth || 900
      const targetOffset = WIN_INDEX * ITEM_W - viewport / 2 + ITEM_W / 2

      requestAnimationFrame(() => {
        setTimeout(() => setRollOffset(targetOffset), 60)
      })

      // 5) 6.8 soniyadan so'ng natijani ko'rsatish
      setTimeout(() => setPhase('result'), 6800)
    } catch (e) {
      setPhase('idle')
      setOpenError(e.message)
    }
  }

  const closeModal = () => {
    if (phase === 'rolling') return
    setPhase('idle')
    setRollingCase(null)
    setWinner(null)
    setRollOffset(0)
    setOpenError('')
  }

  return (
    <section>
      <h1>🔑 Keyslar</h1>
      <p className="muted" style={{ margin: '6px 0 8px' }}>
        Keys ochish — balansdan narxi yechiladi, chance bo'yicha skin tushadi va inventaringizga qo'shiladi.
      </p>
      {!user && (
        <p className="muted small" style={{ marginBottom: 20 }}>
          🔒 Ochish uchun <Link to="/login" style={{ color: 'var(--accent)' }}>kiring</Link> va
          <Link to="/wallet" style={{ color: 'var(--accent)' }}> balans to'ldiring</Link>.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {openError && !rollingCase && <p className="error">{openError}</p>}
      {loading && <p className="muted">Yuklanmoqda...</p>}

      <div className="grid cases-grid">
        {cases.map((c) => (
          <div
            key={c._id}
            className="card case-card"
            style={{ cursor: 'pointer' }}
            onClick={() => selectCase(c)}
          >
            <div className="case-icon">📦</div>
            <h3>{c.caseName}</h3>
            <div className="case-odds">
              {(c.skins || []).filter((s) => s && s.skin).slice(0, 4).map((s, i) => (
                <span key={i} style={{ color: RARITY_LINE[s.skin?.skinRarity] || '#8b93a1' }}>
                  {s.skin?.skinName?.split(' | ')[1] || s.skin?.skinName} · {s.chance}%
                </span>
              ))}
              {c.skins.length > 4 && <span className="muted">+{c.skins.length - 4} ta yana...</span>}
            </div>
            <div className="case-bottom">
              <span className="price">${c.casePrice}</span>
              <button
                className="btn small"
                onClick={(e) => {
                  e.stopPropagation()
                  selectCase(c)
                }}
              >
                🔓 Tanlash
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <p className="muted small" style={{ marginTop: 20 }}>
          👑 Siz adminsiz. Admin panel orqali foydalanuvchilar balansini boshqarishingiz mumkin.
        </p>
      )}

      {/* ================= ROLL MODAL — CS2 animatsiyasi ================= */}
      {rollingCase && (
        <div className="modal-overlay" onClick={phase !== 'rolling' ? closeModal : undefined}>
          <div className="roll-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>📦 {rollingCase.caseName}</h2>
              <button
                className="btn ghost small"
                onClick={closeModal}
                disabled={phase === 'rolling'}
                style={{ fontSize: 18, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <p className="muted small" style={{ marginBottom: 18 }}>
              Narxi: <b style={{ color: '#fff' }}>${rollingCase.casePrice}</b> · Sizning balansingiz: <b style={{ color: '#4ade80' }}>💰 {user ? user.wallet.toFixed(2) : '0.00'}</b>
            </p>

            {openError && <p className="error" style={{ marginBottom: 14 }}>{openError}</p>}

            {/* Lenta oynasi */}
            <div className="roll-viewport">
              <div
                ref={stripRef}
                className={`roll-strip ${phase === 'rolling' ? 'rolling' : ''}`}
                style={{ transform: `translateX(-${rollOffset}px)` }}
              >
                {rollItems.map((s, i) => <RollItem key={i} skin={s} />)}
              </div>
              <Marker />
            </div>

            {/* ===== OCHMOQ BUTTON (Pastida) ===== */}
            {phase === 'idle' && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn open-action-btn"
                  style={{
                    fontSize: '20px',
                    padding: '16px 50px',
                    fontWeight: '800',
                    letterSpacing: '1.5px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(239, 68, 68, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: 'scale(1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => executeOpen(rollingCase)}
                >
                  🔥 OCHMOQ (${rollingCase.casePrice})
                </button>
                <button className="btn ghost small" onClick={closeModal}>
                  Bekor qilish
                </button>
              </div>
            )}

            {/* Rolling holati */}
            {phase === 'rolling' && (
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn"
                  disabled
                  style={{
                    fontSize: '18px',
                    padding: '14px 44px',
                    opacity: 0.8,
                    cursor: 'not-allowed',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '12px'
                  }}
                >
                  ⏳ OCHILMOQDA...
                </button>
                <div className="roll-hint" style={{ marginTop: 12 }}>
                  Rulon aylanmoqda... Omad tilaymiz! 🎯
                </div>
              </div>
            )}

            {/* Natija */}
            {phase === 'result' && winner && (
              <div className="win-banner" style={{ '--line': RARITY_LINE[winner.skinRarity], marginTop: 22 }}>
                <img
                  src={winner.imageUrl}
                  alt={winner.skinName}
                  className="win-img"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <div>
                  <div className="muted small">🎉 Tabriklaymiz! Sizga tushdi:</div>
                  <h3 style={{ color: 'var(--text)', margin: '6px 0' }}>{winner.skinName}</h3>
                  <div style={{ color: RARITY_LINE[winner.skinRarity], fontWeight: 700, fontSize: 16 }}>
                    ${Number(winner.skinPrice).toFixed(2)} · inventaringizga qo'shildi
                  </div>
                  <div className="row-btns" style={{ marginTop: 18, justifyContent: 'center', gap: '12px' }}>
                    <button
                      className="btn"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                        fontWeight: '700',
                        padding: '10px 24px'
                      }}
                      onClick={() => executeOpen(rollingCase)}
                    >
                      🔥 YANA OCHMOQ (${rollingCase.casePrice})
                    </button>
                    <Link to="/inventory" className="btn ghost">🎒 Inventarga →</Link>
                    <button className="btn ghost" onClick={closeModal}>Yopish</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
