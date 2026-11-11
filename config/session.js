
const session = require('express-session')

// Session-based login. The default in-memory store is the simple
// default used in class — fine for development and this assignment.
// (Restarting the server logs everyone out.)
const sessionMiddleware = session({
    name: 'sportcenter.sid',

    secret: process.env.SESSION_SECRET,

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
})

module.exports = sessionMiddleware
