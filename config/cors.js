const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3000/signup',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg =
        'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
};

module.exports = cors(corsOptions);
