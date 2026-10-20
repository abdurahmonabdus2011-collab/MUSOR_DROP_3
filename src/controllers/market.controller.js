const MarketListing = require('../models/market.model')
const Inventory = require('../models/inventory.model')
const User = require('../models/users.model')
const Transaction = require('../models/transaction.model')

// GET /api/market — bozordagi faol e'lonlar (hamma uchun ochiq)
exports.getListings = async (req, res) => {
    try {
        const filter = {}
        if (req.query.mine === '1' && req.user) {
            filter.seller = req.user._id
        } else {
            filter.status = 'active'
        }

        const listings = await MarketListing.find(filter)
            .sort({ listedAt: -1 })
            .populate('skin')
            .populate('seller', 'username')
            .populate('buyer', 'username')

        res.status(200).json(listings)
    } catch (error) {
        res.status(500).json({ message: 'Bozorni olishda xatolik', error: error.message })
    }
}

// POST /api/market — itemni bozorga qo'yish { itemId, price }
// Sotuvchi narxni o'zi tanlaydi (skinPrice dan arzon yoki qimmat)
exports.createListing = async (req, res) => {
    try {
        const { itemId, price } = req.body

        if (!/^[0-9a-fA-F]{24}$/.test(itemId || '')) {
            return res.status(400).json({ message: 'itemId notogri formatda' })
        }
        const numPrice = Number(price)
        if (!Number.isFinite(numPrice) || numPrice <= 0) {
            return res.status(400).json({ message: 'Narx musbat raqam bolishi kerak' })
        }
        if (numPrice > 1000000) {
            return res.status(400).json({ message: 'Narx 1 000 000 dan ortiq bolishi mumkin emas' })
        }

        const item = await Inventory.findById(itemId).populate('skin')
        if (!item) return res.status(404).json({ message: 'Item topilmadi' })

        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu item sizga tegishli emas' })
        }
        if (item.status !== 'owned') {
            return res.status(400).json({ message: 'Faqat "owned" holatdagi itemni bozorga qo\u2018yish mumkin' })
        }

        // Bir itemni ikki marta bozorga qo\u2018yib bo\u2018lmaydi
        const already = await MarketListing.findOne({ item: itemId, status: 'active' })
        if (already) {
            return res.status(400).json({ message: 'Bu item allaqachon bozorda' })
        }

        // Itemni "listed" qilamiz — shu oraliqda sotib yuborish (direct sell) mumkin emas
        item.status = 'listed'
        await item.save()

        const listing = await MarketListing.create({
            seller: req.user._id,
            item: item._id,
            skin: item.skin._id,
            price: numPrice
        })

        res.status(201).json({
            message: `"${item.skin.skinName}" $${numPrice} ga bozorga qo\u2018yildi`,
            listing
        })
    } catch (error) {
        res.status(500).json({ message: 'E\u2018lon qo\u2018yishda xatolik', error: error.message })
    }
}

// POST /api/market/:id/buy — e\u2018lonni sotib olish (xaridor uchun)
exports.buyListing = async (req, res) => {
    try {
        const { id } = req.params
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID notogri formatda' })
        }

        const listing = await MarketListing.findById(id).populate('skin').populate('item')
        if (!listing) return res.status(404).json({ message: 'E\u2018lon topilmadi' })

        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'Bu e\u2018lon allaqachon sotilgan yoki bekor qilingan' })
        }

        const sellerId = listing.seller?._id || listing.seller
        if (sellerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'O\u2018z e\u2018loningizni sotib ololmaysiz' })
        }

        // 1) Avval xaridordan pul yechamiz (pul yetmasa — 400, hech narsa o\u2018zgarmaydi)
        const buyerBefore = await User.findById(req.user._id)
        if (buyerBefore.wallet < listing.price) {
            return res.status(400).json({
                message: `Balans yetarli emas: kerak $${listing.price}, sizda $${buyerBefore.wallet}`
            })
        }

        // 2) Itemni xaridorga o\u2018tkazamiz (inventory egasini almashtiramiz)
        const itemId = listing.item?._id || listing.item
        const item = await Inventory.findByIdAndUpdate(
            itemId,
            { user: req.user._id, status: 'owned' },
            { new: true }
        )
        if (!item) return res.status(500).json({ message: 'Itemni o\u2018tkazishda xatolik' })

        // 3) E\u2018lonni "sold" qilamiz (parallel sotib olishga qarshi himoya)
        const claimed = await MarketListing.findOneAndUpdate(
            { _id: id, status: 'active' },
            { status: 'sold', buyer: req.user._id, soldAt: new Date() },
            { new: true }
        )
        if (!claimed) {
            // Kimdir bizdan oldin ulgurgan — itemni qaytarib, xatolik qaytaramiz
            await Inventory.findByIdAndUpdate(itemId, { user: sellerId, status: 'listed' })
            return res.status(400).json({ message: 'Bu e\u2018lon allaqachon sotildi' })
        }

        // 4) Xaridordan pul yechamiz
        const buyer = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { wallet: -listing.price } },
            { new: true, runValidators: true }
        )
        // 5) Sotuvchiga pul tushiramiz
        const seller = await User.findByIdAndUpdate(
            sellerId,
            { $inc: { wallet: listing.price } },
            { new: true, runValidators: true }
        )

        // 6) Ikkala tomon uchun transaction yozamiz
        await Transaction.create({
            user: buyer._id, type: 'case_open', // xaridor uchun: pul chiqdi
            amount: -listing.price,
            balanceBefore: buyer.wallet + listing.price,
            balanceAfter: buyer.wallet
        })
        await Transaction.create({
            user: sellerId, type: 'skin_sale', // sotuvchi uchun: pul kirdi
            amount: listing.price,
            balanceAfter: seller.wallet,
            balanceBefore: seller.wallet - listing.price
        })

        res.status(200).json({
            message: `"${listing.skin?.skinName || 'Skin'}" $${listing.price} ga sotib olindi!`,
            wallet: buyer.wallet,
            item
        })
    } catch (error) {
        res.status(500).json({ message: 'Sotib olishda xatolik', error: error.message })
    }
}

// DELETE /api/market/:id — o\u2018z e\u2018lonini bekor qilish (sotuvchi uchun)
exports.cancelListing = async (req, res) => {
    try {
        const { id } = req.params
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID notogri formatda' })
        }

        const listing = await MarketListing.findById(id)
        if (!listing) return res.status(404).json({ message: 'E\u2018lon topilmadi' })

        if (listing.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu e\u2018lon sizga tegishli emas' })
        }
        if (listing.status !== 'active') {
            return res.status(400).json({ message: 'Faqat faol e\u2018lonni bekor qilish mumkin' })
        }

        listing.status = 'cancelled'
        await listing.save()

        // Itemni qayta "owned" qilamiz — egasi uni sotish yoki qayta qo\u2018yish mumkin
        await Inventory.findByIdAndUpdate(listing.item, { status: 'owned' })

        res.status(200).json({ message: 'E\u2018lon bekor qilindi, item inventarga qaytdi' })
    } catch (error) {
        res.status(500).json({ message: 'Bekor qilishda xatolik', error: error.message })
    }
}
