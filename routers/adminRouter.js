const express = require('express')
const router = new express.Router()
const Poi = require('../models/poiModel')
const Visit = require('../models/visitModel')
const User = require('../models/user');
const poiTable = require('../public/starting_pois_original.json');


//CREATE POI
router.get('/pois/new', async (req, res,) => {

    res.render('pois/new');
})

//INSERT POIS
router.post('/poiTable', async (req, res,) => {

    for (let i = 0; i < poiTable.length; i++) {

        // const poiTables = JSON.parse(poiTable)
        const poi = new Poi();
        console.log(poiTable[i].coordinates)
        poi.properties.name = poiTable[i].name
        poi.properties.address = poiTable[i].address
        poi.properties.types = poiTable[i].types
        poi.properties.rating = poiTable[i].rating
        poi.properties.rating_n = poiTable[i].rating_n
        poi.type = 'Feature';
        poi.geometry.type = 'Point';
        poi.geometry.coordinates = [poiTable[i].coordinates.lng, poiTable[i].coordinates.lat];
        poi.properties.time_spent = poiTable[i].time_spent
        poi.properties.populartimes = poiTable[i].populartimes

        console.log(i);
        await poi.save();

    }
    res.send('ok')
})

//Statistics queries
//Total active covid-19 cases
router.get('/statistics/active', async (req, res) => {
    const total_visits = await Visit.count();
    const total_users = await User.count();
    const active_covid_cases = await User.aggregate([
        { $match: { positive: "positive" } },
        { $count: 'total_active_covid_cases' }
    ])

    res.render('statistics', { users: total_users, active: active_covid_cases[0].total_active_covid_cases, visits: total_visits });
});

//TODO: Create additional chart for the statistics page.
//Total vists of covid infected people.
router.get('/statistics/covid_visits', async (req, res) => {
    const positive_users = await User.find({ positive: "positive" })

    for (let user of positive_users) {
        //Calculate time interval which start 7 days before the diagnosis until 14 days after it.
        const date_before_7_days = new Date(user.positive_datetime);
        date_before_7_days.setDate(date_before_7_days.getDate() - 7);
        const date_after_14_days = new Date(user.positive_datetime);
        date_after_14_days.setDate(date_after_14_days.getDate() + 14);

        //Count the positive visits the specified interval
        const user_visits = await Visit.aggregate([
            { $match: { $and: [{ userId: user.id }, { positive: "positive" }] } },
            { $match: { createdAt: { $gte: date_before_7_days, $lt: date_after_14_days } } },
            { $group: { _id: null, myCount: { $sum: 1 } } },
            { $project: { _id: 0 } }
        ])
        //In case that a user is positive but has no visits.
        if (user_visits.length > 0) {
            var total = [];
            total.push(user_visits[0].myCount)
        }

    }
    res.send(total)
})

//TODO: Create additional chart for the statistics page.
//Pois classification based on type and number of visits
router.get('/statistics/type_classification', async (req, res) => {
    //Find all the pois types that exist in DB.
    const all_types = await Poi.aggregate([
        {
            $group: {
                "_id": "",
                "type": {
                    $push: "$properties.types"
                }
            }
        },
        { $project: { "type": 1, "_id": 0 } }
    ])
    unified_array = all_types[0].type.join(",").split(",");

    const poi_types_counter = {};
    const visits = await Visit.find();

    for (let visit of visits) {
        var poi_type = await Poi.aggregate([
            { $match: { "properties.name": visit.poiName } },
            { $unwind: "$properties.types" },
        ])
        for (let type of poi_type) {
            if (Object.hasOwn(poi_types_counter, type.properties.types)) {
                poi_types_counter[type.properties.types]++
            } else {
                poi_types_counter[type.properties.types] = 0;
                poi_types_counter[type.properties.types]++
            }
        }

    }
    res.send(poi_types_counter)
})

//TODO: Create additional chart for the statistics page.
//Pois classification based on the visitation of covid affected users.
router.get('/statistics/type_classification_cases', async (req, res) => {
    const positive_users = await User.find({ positive: "positive" })

    const poi_types_counter = {};

    for (let user of positive_users) {
        //Calculate the dates before 7 day of covid diagnosis and after 14 days of covid diagnosis
        const date_before_7_days = new Date(user.positive_datetime);
        date_before_7_days.setDate(date_before_7_days.getDate() - 7);
        const date_after_14_days = new Date(user.positive_datetime);
        date_after_14_days.setDate(date_after_14_days.getDate() + 14);

        const user_visits = await Visit.aggregate([
            { $match: { $and: [{ userId: user.id }, { positive: "positive" }] } },
            { $match: { createdAt: { $gte: date_before_7_days, $lt: date_after_14_days } } }
        ])

        for (let visit of user_visits) {
            var poi_type = await Poi.aggregate([
                { $match: { "properties.name": visit.poiName } },
                { $unwind: "$properties.types" },
            ])
            for (let type of poi_type) {
                if (Object.hasOwn(poi_types_counter, type.properties.types)) {
                    dictionary[type.properties.types]++
                } else {
                    poi_types_counter[type.properties.types] = 0;
                    poi_types_counter[type.properties.types]++
                }
            }
        }

    }
    res.send(dictionary)

})


module.exports = router;