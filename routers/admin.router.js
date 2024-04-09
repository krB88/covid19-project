const AdminBro = require('admin-bro')
const AdminBroExpress = require('admin-bro-expressjs')
const AdminBroMongoose = require('admin-bro-mongoose')
const Poi = require('../models/poiModel')
const Visit = require('../models/visitModel')
const User = require('../models/user');

AdminBro.registerAdapter(AdminBroMongoose);

const adminBro = new AdminBro({
  resources: [User, Poi, Visit],
  rootPath: '/admin',
  branding: {
    logo: 'https://indiebenefits.com/wp-content/uploads/2022/06/health-insurance.png',
    companyName: 'Covid-19 Shield'
  },

})

const router = AdminBroExpress.buildRouter(adminBro);

module.exports = router;