const mongoose = require('../config/db');

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, typeKey: '$type'
};

LunchSchema = new mongoose.Schema({
  name: { $type: String, index: { unique: true } },
  address: { $type: String },
  last_used: { $type: Date, default: null }
}, options);
module.exports = mongoose.model('Lunch', LunchSchema);
