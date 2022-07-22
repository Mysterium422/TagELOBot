const mongoose = require('mongoose')

const profileSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true},
    elo: { type: Number, require: true, default: 1000 },
    username: { type: String, require: true },
    uuid: { type: String, require: true},
    wins: { type: Number, require: true, default: 0 },
    losses: { type: Number, require: true, default: 0 },
    records: {type: Array, require: true, default: [] },
    deviation: { type: Number, require: true, default: 100 }
})

const model = mongoose.model("user", profileSchema)

module.exports = model