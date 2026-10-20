const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    skin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skin',
        required: true
    },
    // Qaysi kasedan chiqqanini saqlaymiz
    sourceCase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
    },
    status: {
        type: String,
        enum: {
            values: ['owned', 'listed', 'sold'],
            message: 'Status faqat "owned", "listed" yoki "sold" bolishi mumkin'
        },
        default: 'owned'
    },
    obtainedAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false
});

// Nega har bir skin uchun ayrı dokyument kerak?
// 1) Bir xil skin bir necha marta chiqishi mumkin — unikal misollar kerak.
// 2) status (owned/sold) har bir misol uchun ayrı saqlanadi.
// 3) obtainedAt, sourceCase va tarixi bilan ayrı saqlash mantiqiy.

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
