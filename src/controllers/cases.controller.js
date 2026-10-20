const Case = require('../models/case.model')
const Skin = require('../models/skins.model')
const Inventory = require('../models/inventory.model')
const Transaction = require('../models/transaction.model')
const User = require('../models/users.model')

// GET /api/cases — barcha keyslar (omaviy, skinlar populate qilingan)
exports.getAllCases = async (req, res) => {
    try {
        const cases = await Case.find({ isAvailable: true }).populate('skins.skin')
        res.status(200).json(cases)
    } catch (error) {
        res.status(500).json({ message: 'Keyslarni olishda xatolik', error: error.message })
    }
}

// GET /api/cases/:id — bitta keys
exports.getCaseById = async (req, res) => {
    try {
        const { id } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID notogri formatda' })
        }

        const c = await Case.findById(id).populate('skins.skin')
        if (!c) return res.status(404).json({ message: 'Keys topilmadi' })

        res.status(200).json(c)
    } catch (error) {
        res.status(500).json({ message: 'Keysni olishda xatolik', error: error.message })
    }
}

// Weighted random: chance massivi orasidan bitta element (odds = 0..100)
function pickSkinByChance(skins) {
    const roll = Math.random() * 100
    let cumulative = 0
    for (const s of skins) {
        cumulative += s.chance
        if (roll < cumulative) return s
    }
    return skins[skins.length - 1] // xavfsizlik uchun (yig'indi 100 bo'lsa yetib bormaydi)
}

// POST /api/cases/:id/open — keys ochish (token talab)
// Mantiq: balansdan yechish -> chance boyicha skin -> Inventory.g yozish -> Transaction yozish
exports.openCase = async (req, res) => {
    try {
        const { id } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: 'ID notogri formatda' })
        }

        const c = await Case.findById(id).populate('skins.skin')
        if (!c) return res.status(404).json({ message: 'Keys topilmadi' })
        if (!c.isAvailable) return res.status(400).json({ message: 'Keys hozir mavjud emas' })
        
        const validSkins = (c.skins || []).filter(s => s && s.skin)
        if (validSkins.length === 0) return res.status(400).json({ message: 'Keysda skinlar yoq' })

        const user = await User.findById(req.user._id)
        if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' })

        // Balansni oldindan tekshirib, userga tushunarli xato qaytaramiz
        if (user.wallet < c.casePrice) {
            return res.status(400).json({
                message: `Balans yetarli emas. Keying narxi $${c.casePrice}, balansezda $${user.wallet}`
            })
        }

        // 1) Balansdan yechish (atomic $inc; min:0 validator)
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $inc: { wallet: -c.casePrice } },
            { new: true, runValidators: true }
        )

        if (!updatedUser) {
            return res.status(500).json({ message: 'Balansdan yechishda xatolik' })
        }

        // 2) Chance boyicha skin tushirish
        const won = pickSkinByChance(validSkins)

        // 3) Inventoryga yozish
        const invItem = await Inventory.create({
            user: user._id,
            skin: won.skin._id,
            sourceCase: c._id,
            status: 'owned'
        })

        // 4) Transaction yozish (case_open manfiy amount)
        const txn = await Transaction.create({
            user: user._id,
            type: 'case_open',
            amount: -c.casePrice,
            balanceBefore: updatedUser.wallet + c.casePrice,
            balanceAfter: updatedUser.wallet
        })

        res.status(200).json({
            message: `"${won.skin.skinName}" chiqdi!`,
            skin: won.skin,
            inventoryId: invItem._id,
            wallet: updatedUser.wallet,
            transaction: txn
        })
    } catch (error) {
        // Balans minusga o'tsa (validator) bu yerda tutib qolamiz
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Balans yetarli emas', error: error.message })
        }
        res.status(500).json({ message: 'Keys ochishda xatolik', error: error.message })
    }
}
