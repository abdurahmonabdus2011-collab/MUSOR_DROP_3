const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: {
            values: ['deposit', 'case_open', 'skin_sale', 'market_buy', 'market_sale'],
            message: 'Type faqat deposit, case_open yoki skin_sale bolishi mumkin'
        },
        required: true
    },
    amount: {
        type: Number,
        required: true
        // case_open da manfiy (chiqish), deposit/skin_sale da musbat boladi
    },
    balanceBefore: {
        type: Number,
        required: true,
        min: 0
    },
    balanceAfter: {
        type: Number,
        required: true,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
