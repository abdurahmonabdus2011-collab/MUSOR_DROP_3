const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('./config/env')
const fs = require('fs')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const connectDB = require('./config/db')
const skinsRouter = require('./routes/skins.routes')
const usersRouter = require('./routes/users.routes')
const authRouter = require('./routes/auth.routes')
const casesRouter = require('./routes/cases.routes')
const inventoryRouter = require('./routes/inventory.routes')
const walletRouter = require('./routes/wallet.routes')
const marketRouter = require('./routes/market.routes')

const { authenticate } = require('./middlewares/auth.middleware')
const { adminOnly } = require('./middlewares/admin.middleware')

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Uploads papkasi — yuklangan rasmlar serverda umrbod saqlanadi
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// React frontend build qilingan bo'lsa (client/dist), server o'zi ham sahifani beradi.
// Build qilish:  cd client && npm run build
const clientDist = path.join(__dirname, '..', 'client', 'dist')
const hasFrontend = fs.existsSync(path.join(clientDist, 'index.html'))
if (hasFrontend) {
    app.use(express.static(clientDist))
}

const cloudinary = require('./config/cloudinary')

// Admin uchun rasm yuklash API (Cloudinary orqali)
app.post('/api/upload', authenticate, adminOnly, async (req, res) => {
    try {
        const { image } = req.body
        if (!image) {
            return res.status(400).json({ message: 'Rasm yuborilmadi' })
        }

        // Cloudinary ga yuklash
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'cs2-skins',
            resource_type: 'image'
        })

        res.status(201).json({
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            message: 'Rasm Cloudinary ga muvaffaqiyatli yuklandi'
        })
    } catch (err) {
        console.error('Cloudinary upload xatosi:', err.message)
        // Agar Cloudinary ishlamasa, mahalliy uploads papkasiga saqlaymiz (fallback)
        try {
            const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
            let ext = 'png'
            let base64Data = image

            if (matches && matches.length === 3) {
                ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
                base64Data = matches[2]
            }

            const filename = `skin-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`
            const filePath = path.join(uploadsDir, filename)

            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))

            const fileUrl = `/uploads/${filename}`
            res.status(201).json({ url: fileUrl, message: 'Rasm mahalliy serverga saqlandi' })
        } catch (fallbackErr) {
            res.status(500).json({ message: 'Rasmni saqlashda xatolik', error: err.message })
        }
    }
})

// Diagnostika: DB holatini ko'rsatadi (Render'da 500 sababini aniqlash uchun)
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting']
app.get('/api/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1
    res.status(ready ? 200 : 503).json({
        ok: true,
        db: DB_STATES[mongoose.connection.readyState] || 'unknown',
        dbReady: ready,
        mongoUriSet: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
        uptimeSec: Math.round(process.uptime()),
    })
})

// DB ulanmagan bo'lsa, API so'rovlarini aniq xabar bilan rad etish (jonsiz 500 o'rniga)
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next() // health doim javob beradi
    if (req.path === '/market') return next() // bozor (hamma uchun ochiq)
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'MongoDB ulanmagan',
            hint: 'Render -> Environment da MONGODB_URI tekshiring, Atlas -> Network Access ga 0.0.0.0/0 qo\'shing',
        })
    }
    next()
})

app.use('/api/skins', skinsRouter)
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)
app.use('/api/cases', casesRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/market', marketRouter)

// API emas bo'lgan so'rovlarni React ilovasiga yunaltirish (SPA uchun)
if (hasFrontend) {
    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next() // API marshrutlar odatdagidek ishlaydi
        res.sendFile(path.join(clientDist, 'index.html'))
    })
}

const PORT = process.env.PORT || 5432
// HTTP birinchi ko'tariladi — Render'ning tekshiruvi 502 olmasligi uchun
app.listen(PORT, () => {
    console.log('API: Skins http://localhost:' + PORT + '/api/skins  Users /api/users  Auth /api/auth');

    // DB ulanishi server ko'tarilganidan keyin, qayta-urinish bilan
    connectDB()
})

// Node jarayonini yiqitmaslik uchun: ushlab qolmasdan loglaymiz
process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err);
});
