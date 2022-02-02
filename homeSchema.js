const mongoose = require('mongoose')

const eventSchema = mongoose.Schema({
  data: Array,
})

module.exports = mongoose.model('homeCollection', eventSchema)
