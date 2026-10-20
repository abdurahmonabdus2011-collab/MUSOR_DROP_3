const Inventory = require('../models/inventory.model')
const User = require('../models/users.model')
const Transaction = require('../models/transaction.model')

// GET /api/inventory — joriy user inventari (token talab)
// status: owned|sold filtr, populate skin + sourceCase
exports.getInventory = async (req, res) => {
    try {
        const filter = { user: req.user._id }
        if (['owned', 'sold', 'listed'].includes(req.query.status)) {
            filter.status = req.query.status
        }

        const items = await Inventory
            .find(filter)
            .sort({ obtainedAt: -1 })
            .populate('skin')
            .populate('sourceCase', 'caseName casePrice')

        res.status(200).json(items)
    } catch (error) {
        res.status(500).json({ message: 'Inventarni olishda xatolik', error: error.message })
    }
}

// POST /api/inventory/:id/sell — skinni sotish
// Mantiq: item userning ownligini tekshirish -> status=sold -> wallet ga qo'shish -> Transaction
exports.sellItem = async (req, res) => {
    try {
        const { id } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID notogri formatda' })
        }

        const item = await Inventory.findById(id).populate('skin')
        if (!item) return res.status(404).json({ message: 'Item topilmadi' })
        if (!item.skin) return res.status(400).json({ message: 'Skin ma\'lumoti topilmadi' })

        // Faqat o'z itemini sotish mumkin
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu item sizga tegishli emas' })
        }

        if (item.status === 'sold') {
            return res.status(400).json({ message: 'Bu skin allaqachon sotilgan' })
        }

        // Bozorda turgan itemni to'g'ridan-to'g'ri sotib yuborib bo'lmaydi — avval bekor qiling
        if (item.status === 'listed') {
            return res.status(400).json({ message: 'Bu skin bozorda turgan — avval bozordan olib tashlang' })
        }

        // 1) status = sold
        item.status = 'sold'
        await item.save()

        // 2) wallet ga skinPrice qo'shish
        const price = item.skin.skinPrice || 0
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { wallet: price } },
            { new: true, runValidators: true }
        )

        if (!user) {
            return res.status(500).json({ message: 'Balansni yangilashda xatolik' })
        }

        // 3) Transaction (skin_sale musbat amount)
        const txn = await Transaction.create({
            user: req.user._id,
            type: 'skin_sale',
            amount: price,
            balanceBefore: user.wallet - price,
            balanceAfter: user.wallet
        })

        res.status(200).json({
            message: `"${item.skin.skinName}" $${price} ga sotildi`,
            wallet: user.wallet,
            transaction: txn,
            item: { ...item.toObject(), status: 'sold' }
        })
    } catch (error) {
        res.status(500).json({ message: 'Sotishda xatolik', error: error.message })
    }
}
