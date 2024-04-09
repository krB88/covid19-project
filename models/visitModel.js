const mongoose = require('mongoose')

//Visitation definition for document structure in the DB.
const visitSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,

    },
    poiId: {
        type: String,
        required: true,
    },
    poiName:{
        type : String,
        required: true
    },
    crowd_estimate: {
        type: Number,
        default : 97,
    },
    positive: {
        type: String,
        default: 'negative',
    }
}, {
    timestamps: true
})

const Visit = mongoose.model('Visit', visitSchema);
module.exports = Visit;