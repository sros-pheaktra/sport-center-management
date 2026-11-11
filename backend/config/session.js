const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./db');

const sessionStore = new MySQLStore({}, db);

const sessionMiddleware = session({
    name: 'sportcenter.sid',

    secret: process.env.SESSION_SECRET,

    store: sessionStore,

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
});

module.exports = sessionMiddleware;
