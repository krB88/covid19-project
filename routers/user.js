const bcrypt = require('bcryptjs');
const express = require('express');
const { append } = require('express/lib/response');
const User = require('../models/user');
const router = new express.Router();
const Poi = require('../models/poiModel');
const Visit = require('../models/visitModel')
var haversine = require("haversine-distance");
const { findById } = require('../models/user');
const app = express();

//Middleware func checks if the user is logged in. In other case redirect in the login page
const requiredLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/userLogin');
    }
    next();
}

router.get('/', (req, res) => {
    res.redirect('/userLogin');
})

router.get('/homepage', async (req, res) => {
    const database_pois = await Poi.find({});
    const pois = [];

    for (i = 0; i < database_pois.length; i++) {
        const lat1 = database_pois[i].geometry.coordinates[1];
        const lng1 = database_pois[i].geometry.coordinates[0];


        var point1 = { lat: lat1, lng: lng1 }
        var point2 = { lat: 38.2376827, lng: 21.7259359 }
        var haversine_m = haversine(point1, point2);

        if (haversine_m < 5000) {

            pois.push(database_pois[i]);

        }
    }
    res.render('homepage.ejs', { pois })
});

//User Sign UP page.
router.get('/userSignUp', (req, res) => {
    res.render('userSignUp.ejs');
})

router.post('/userSignUp', async (req, res) => {
    const { password, username } = req.body;
    //passwordValidation() is a static function in user router.
    const isPasswordValid = await User.passwordValidation(req.body.password);

    if (isPasswordValid != null) {
        console.log("Invalid Password")
        return res.status(400).send(isPasswordValid);
    }

    const user = new User(req.body);
    await user.save();
    //if we do succesfully login, we store the user ID in the session.
    req.session.user_id = user._id;
    res.status(201).redirect('/homepage');
})

//User login.
router.get('/userLogin', (req, res) => {
    res.render('userLogin.ejs', { messages: req.flash('failedLogin') });
})

router.post('/userLogin', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findAndValidate(username, password);
    if (foundUser) {
        //if we do succesfully login, we store the user ID in the session.
        req.session.user_id = foundUser._id;
        res.redirect('/homepage');
    } else {
        req.flash('failedLogin', "Username or Password is incorrect! Try again")
        res.redirect('/userLogin');
    }
})

//User Logout.
router.get('/userLogout', requiredLogin, (req, res) => {
    req.session.destroy();
    //when logout we redirect in the login page!
    res.redirect('/userLogin');
})

router.get('/profile', requiredLogin, async (req, res) => {
    user_id = req.session.user_id;
    const foundUser = await User.findById(user_id);
    const username = foundUser.username;
    const email = foundUser.email;
    const covid_infected = foundUser.positive;
    //Update the Infected by covid to 'negative' value, after 14 days.
    if (covid_infected == "positive") {
        const current_date = new Date();
        const diffInDays = Math.abs((current_date - foundUser.positive_datetime) / (1000 * 60 * 60 * 24));
        if (diffInDays >= 14) {
            const filter = { _id: user_id };
            const update = { positive: "negative", positive_datetime: null }
            await User.findOneAndUpdate(filter, update);
        }

    }
    res.render('profile.ejs', { username: username, email: email, positive: covid_infected });
})

router.get('/editProfile', requiredLogin, async (req, res) => {
    user_id = req.session.user_id;
    const foundUser = await User.findById(user_id);
    const email = foundUser.email;
    res.render('editProfile.ejs', { email: email, messages: req.flash('failedLogin') });
})

router.post('/editProfile', requiredLogin, async (req, res) => {
    user_id = req.session.user_id;
    const { username, password } = req.body;
    if (password == "") {
        const filter = { _id: user_id };
        const update = { username: username }
        await User.findOneAndUpdate(filter, update);

    } else if (username == "") {
        const isPasswordValid = await User.passwordValidation(password);

        if (isPasswordValid != null) {
            req.flash('failedLogin', "Password must contain at least: 1) 8 letters incl 1 capital 2) 1 number 3) 1 symbol. Try again!");
            return res.redirect('/editProfile');
        }

        const filter = { _id: user_id };
        hashed_password = await bcrypt.hash(password, 8);
        const update = { password: hashed_password }
        await User.findOneAndUpdate(filter, update);
    } else {
        const isPasswordValid = await User.passwordValidation(password);

        if (isPasswordValid != null) {
            req.flash('failedLogin', "Password must contain at least: 1) 8 letters incl 1 capital 2) 1 number 3) 1 symbol. Try again!");
            return res.redirect('/editProfile');
        }

        const filter = { _id: user_id };
        hashed_password = await bcrypt.hash(password, 8);
        const update = { username: username, password: hashed_password }
        await User.findOneAndUpdate(filter, update);

    }

    res.redirect('/profile');
})

router.get('/editCovidStatus', requiredLogin, (req, res) => {
    res.render('editCovidStatus.ejs');
})

router.post('/editCovidStatus', requiredLogin, async (req, res) => {
    user_id = req.session.user_id;
    const filter = { _id: user_id };
    const { covid_infected, date } = req.body;
    const update = { positive: covid_infected, positive_datetime: new Date(date) }
    //Update the 'positive' field of user.
    await User.findOneAndUpdate(filter, update);

    var covidDate = new Date(date);

    nextDate = new Date(covidDate)
    nextDate.setDate(nextDate.getDate() + 1);
    //Find the visits of the user in on the date that user diagnosed positive.
    const user_visits = await Visit.aggregate([
        { $match: { userId: user_id } },
        { $match: { createdAt: { $gte: new Date(covidDate), $lt: new Date(nextDate) } } }
    ])

    //For every visit of the user calculate the Date 2 hours before and 2 hours after.
    for (let visit of user_visits) {
        const visit_before_2_hours = new Date(visit.createdAt);
        visit_before_2_hours.setHours(visit.createdAt.getHours() - 2);
        const visit_after_2_hours = new Date(visit.createdAt);
        visit_after_2_hours.setHours(visit.createdAt.getHours() + 2);

        //Find the visits that are in the same day, between +- 2 hours.
        var all_visits = await Visit.aggregate([
            { $match: { poiId: visit.poiId } },
            { $match: { createdAt: { $gte: new Date(visit_before_2_hours), $lt: new Date(visit_after_2_hours) } } },
        ])
        //For every one of this visit update the field 'positive' to positive.
        for (let visits of all_visits) {
            const filter = { _id: visits._id };
            const update = { positive: "positive" }
            await Visit.findOneAndUpdate(filter, update);
        }
    }

    res.redirect('/profile');
})

router.get('/visitsEstimation/:name_of_poi', async (req, res) => {
    let current_weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
    const date = new Date();
    const current_time = date.getHours();

    const name_of_poi = decodeURIComponent(req.params.name_of_poi);

    const visits_estimation = await Poi.aggregate([
        { $match: { "properties.name": name_of_poi } },
        { $unwind: "$properties.populartimes" },
        { $match: { "properties.populartimes.name": current_weekday } },
        {
            $project: {
                _id: 0, "properties.populartimes.data": 1,
                first: { $arrayElemAt: ["$properties.populartimes.data", current_time] },
                second: { $arrayElemAt: ["$properties.populartimes.data", current_time + 1] },
            }
        }


    ])

    if (visits_estimation[0].first != 0 && visits_estimation[0].second != 0) {
        const average_visits = (visits_estimation[0].first + visits_estimation[0].second) / 2
        res.send({ average: average_visits });
    }
    else
        res.send({ average: "N/A" });

})

router.get('/distance/:lat/:lng', async (req, res) => {

    lat = (req.params.lat);
    lng = (req.params.lng);
    var point1 = { lat: lat, lng: lng };
    var point2 = { lat: 38.2376827, lng: 21.7259359 }

    var haversine_m = haversine(point1, point2);
    res.send({ distance__result: haversine_m });
})

router.get('/statistics', (req, res) => {
    res.render("statistics.ejs")
})

//create visit
router.post('/visit/:name', async (req, res) => {
    const crowd_estimate = req.body;
    const visit = new Visit();
    const name = req.params.name;
    const poi = await Poi.find({ "properties.name": name });
    const poiName = poi[0].properties.name;
    const poiId = poi[0].id;
    const user_id = req.session.user_id;

    //If the user is positive and visit a new poi, it needs to update the visit to positive.
    const user = await User.findById(user_id)
    if (user.positive == "positive") {
        visit.positive = "positive"
    }

    visit.userId = user_id;
    visit.poiId = poiId;
    visit.crowd_estimate = crowd_estimate.crowd_est;
    visit.poiName = poiName;
    visit.save();

    res.redirect('/homepage')
})

//Check if user is in contact with covid case
router.get('/checkContact', async (req, res) => {
    user_id = req.session.user_id;
    var PastDate = new Date();
    PastDate.setDate(PastDate.getDate() - 7);

    const user_visits = await Visit.aggregate([
        { $match: { userId: user_id } },
        { $match: { positive: "positive" } },
        { $match: { createdAt: { $gte: new Date(PastDate) } } }
    ])

    res.render('checkContact.ejs', { user_visits })
})

router.get('/visitrate/:name_of_poi', async (req, res) => {
    let current_weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
    const date = new Date();
    const current_time = date.getHours();

    const name_of_poi = decodeURIComponent(req.params.name_of_poi);

    const visits_estimation = await Poi.aggregate([
        { $match: { "properties.name": name_of_poi } },
        { $unwind: "$properties.populartimes" },
        { $match: { "properties.populartimes.name": current_weekday } },
        {
            $project: {
                _id: 0, "properties.populartimes.data": 1
            }
        }
    ])
    const visitarray = visits_estimation[0].properties.populartimes.data;
    var max = visitarray[0];
    for (var i = 0; i <= visitarray.length; i++) {
        if (visitarray[i] > max) {
            max = visitarray[i]
        }
    }
    var rate = 0;
    var icon = 'green';
    for (var i = 0; i <= visitarray.length - 1; i++) {
        if (visitarray[i] != 0) {
            rate = (visitarray[i] / max) * 100
        }
        if (rate <= 32) {
            icon = 'green';
        }
        else if (rate <= 65) {
            icon = 'orange';
        }
        else if (rate >= 66) {
            icon = 'red';
        }

        if (current_time == i) {
            var finalicon = icon;
        }
    }
    res.send({ icon_colour: finalicon });

})

app.use(express.static('public'));
app.use('/icons', express.static('icons'));

module.exports = router;