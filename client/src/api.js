// Backendga boradigan barcha so'rovlar bitta joyni — bu funksiyadan o'tadi.
// JWT token localStorage da saqlanadi va har so'rovga header ga qo'shiladi.

const API_URL = '/api'

// localStorage dan tokenni olish
export const getToken = () => localStorage.getItem('token')

// Tokenni saqlash / o'chirish
export const setToken = (token) => localStorage.setItem('token', token)
export const clearToken = () => localStorage.removeItem('token')

// Umumiy fetch funksiya: method, body, auth (token yuborilsa) parametrlari
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Xavfsiz tanuh: bo'sh javob body ihtimolligida
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Backend qaytargan xato xabarini o'qish osonligi uchun birlashtiramiz
    let message = data.message || ''
    if (Array.isArray(data.errors)) message = data.errors.join('. ')
    throw new Error(message || `Xatolik: ${res.status}`)
  }

  return data
}

// ---- Auth so'rovlari ----
export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  getMe: () => request('/auth/me'),

  // ---- Users (faqat admin) ----
  getUsers: () => request('/users'),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // ---- Skins (list - hamma, CRUD - admin) ----
  getSkins: () => request('/skins', { auth: false }),
  createSkin: (body) => request('/skins', { method: 'POST', body }),
  updateSkin: (id, body) => request(`/skins/${id}`, { method: 'PATCH', body }),
  deleteSkin: (id) => request(`/skins/${id}`, { method: 'DELETE' }),
  uploadImage: (image) => request('/upload', { method: 'POST', body: { image } }),

  // ---- Wallet (balans, deposit, tarix) ----
  getWallet: () => request('/wallet'),
  deposit: (amount) => request('/wallet/deposit', { method: 'POST', body: { amount } }),
  getTransactions: () => request('/wallet/transactions'),

  // ---- Cases (list omaviy, open — token bilan) ----
  getCases: () => request('/cases', { auth: false }),
  getCaseById: (id) => request(`/cases/${id}`, { auth: false }),
  openCase: (id) => request(`/cases/${id}/open`, { method: 'POST' }),

  // ---- Inventory ----
  getInventory: (status) => request(`/inventory${status ? `?status=${status}` : ''}`),
  sellItem: (id) => request(`/inventory/${id}/sell`, { method: 'POST' }),

  // ---- Market (bozor) ----
  getMarket: (mine) => request(`/market${mine ? '?mine=1' : ''}`),
  createListing: (body) => request('/market', { method: 'POST', body }),
  buyListing: (id) => request(`/market/${id}/buy`, { method: 'POST' }),
  cancelListing: (id) => request(`/market/${id}`, { method: 'DELETE' }),
}
