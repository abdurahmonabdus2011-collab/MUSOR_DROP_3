const User = require('../models/users.model')
const Transaction = require('../models/transaction.model')

// Balansni atomic tarzda yangilash va Transaction yozuvini yaratish.
// $inc bilan atomic IBORA: bir vaqtda ikki so'rov to'qnashsa ham balans buzilmaydi.
async function applyBalance(userId, amount, type) {
    const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: amount } },
        { new: true, runValidators: true } // min: 0 validatsiyasi shu yerda ishlaydi
    )

    if (!user) throw new Error('Foydalanuvchi topilmadi')

    const txn = await Transaction.create({
        user: userId,
        type,
        amount,
        balanceBefore: user.wallet - amount,
        balanceAfter: user.wallet
    })

    return { user, txn }
}

// GET /api/wallet — joriy balans
exports.getWallet = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })

        res.status(200).json({ wallet: user.wallet, user: { _id: user._id, username: user.username } })
    } catch (error) {
        res.status(500).json({ message: 'Balansni olishda xatolik', error: error.message })
    }
}

// POST /api/wallet/deposit — pul qo'shish { amount: Number }
exports.deposit = async (req, res) => {
    try {
        const amount = Number(req.body.amount)

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'amount musbat raqam bolishi kerak' })
        }
        if (amount > 100000) {
            return res.status(400).json({ message: 'Bir kunda maksimal 100 000 qushish mumkin' })
        }

        const { user, txn } = await applyBalance(req.user._id, amount, 'deposit')

        res.status(200).json({
            message: `Balansga ${amount} qoshildi`,
            wallet: user.wallet,
            transaction: txn
        })
    } catch (error) {
        res.status(500).json({ message: 'Pul qoshishda xatolik', error: error.message })
    }
}

// GET /api/wallet/transactions — operatsiyalar tarixi
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction
            .find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)

        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ message: 'Tarixni olishda xatolik', error: error.message })
    }
}
