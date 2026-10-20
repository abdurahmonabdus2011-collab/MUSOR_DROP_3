const mongoose = require('mongoose');

// Bozor e'loni: bir user o'z inventaridagi itemni o'z narxida bozorga qo'yadi.
// Boshqa userlar uni sotib olib, sotuvchining walletiga pul o'tadi.
const marketSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
        index: true
    },
    skin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skin',
        required: true
    },
    // Sotuvchi o'z narxini tanlaydi (skinPrice dan arzon yoki qimmat)
    price: {
        type: Number,
        required: true,
        min: [0.01, 'Narx 0 dan katta bolishi kerak'],
        max: 1000000
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'sold', 'cancelled'],
            message: 'Status faqat "active", "sold" yoki "cancelled" bolishi mumkin'
        },
        default: 'active'
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    listedAt: {
        type: Date,
        default: Date.now
    },
    soldAt: {
        type: Date,
        default: null
    }
}, {
    versionKey: false
});

const MarketListing = mongoose.model('MarketListing', marketSchema);

module.exports = MarketListing;
