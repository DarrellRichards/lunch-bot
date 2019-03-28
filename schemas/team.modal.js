const mongoose = require('../config/db');

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, typeKey: '$type'
};

TeamSchema = new mongoose.Schema({
  team_name: { $type: String, index: { unique: true } },
  team_id: { $type: String },
  bot_token: { $type: String },
}, options);
module.exports = mongoose.model('Team', TeamSchema);
