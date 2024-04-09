const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/covid', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Database Connected")
    })
    .catch(err => {
        console.log("DATABASE CONNECTION ERROR!")
        console.log(err)
    })

