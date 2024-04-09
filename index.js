const express = require('express');
const app = express();
const path = require('path');
const userRouter = require('./routers/user');
const adminRouter = require('./routers/adminRouter');
const adminBroRouter = require('./routers/admin.router')
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('./db/mongoose');


app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//parse the request body.
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'notagoodsecret' }));
app.use(flash());
app.use(methodOverride('_method'));
app.use(express.json({ limit: '50mb' }))
app.use(userRouter);
app.use(adminRouter);
app.use('/admin', adminBroRouter);
var haversine = require("haversine-distance");
//app.use(userRouter.isAdmin());


var bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true, parameterLimit: 50000 }));

app.listen(3000, () => {
    console.log("App is listening on port 3000!");
})
