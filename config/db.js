const mongoose = require('mongoose');

let mongoUri = 'mongodb://db1.valert.io/lunch-bot';

// use es6 default promise library in mongoose
mongoose.Promise = global.Promise;
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
const mongoOptions = { keepAlive: 1, useNewUrlParser: true, autoIndex: true };
/* istanbul ignore if */
if (process.env.NODE_ENV === 'production') mongoOptions.autoIndex = false;
mongoose.connect(mongoUri, mongoOptions);
// its not worth refactoring this into a class just to get this error for a unit test
/* istanbul ignore next */
mongoose.connection.on('error', () => { throw new Error(`unable to connect to database: ${mongoUri}`); });

module.exports = mongoose;
