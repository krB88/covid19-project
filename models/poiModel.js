const mongoose = require('mongoose')

//POI schema definition for document structure in the DB.
const poiSchema = new mongoose.Schema({

    type: {
        type: String,
        enum: ['Feature']
    },
    properties: {
        description: {
            type: String,
        },
        name: {
            type: String,

        },
        address: {
            type: String,
        },
        types: {
            type: [String],
        },
        rating: {
            type: Number,
        },
        rating_n: {
            type: Number,
        },
        international_phone_number: {
            type: String,
        },
        time_spent: [{
            type: Number,
        }],
        current_popularity: {
            type: Number,
        },
        populartimes: [{
            name: {
                type: String
            },
            data: [{
                type: Number
            }]
        }]

    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
})

const Poi = mongoose.model('Poi', poiSchema);
module.exports = Poi;