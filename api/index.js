
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Use sessions to track user state
app.use(
    session({
        secret: 'your_secret_key', // Change this to a strong secret key in production
        resave: false,
        saveUninitialized: true,
    })
);

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'joeyhehe';

const path = require('path');
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs'); // or your template engine of choice
// Read and write usernames to data.json
const readData = () => JSON.parse(fs.readFileSync(path.join(__dirname,'data.json'), 'utf8') || '[]');
const writeData = (data) => fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
// Display the home page
app.get('/', (req, res) => {
    const data = readData();

    // Check if the username in session still exists in the backend data
    if (req.session.username && req.session.result) {
        const usernameExists = data.some((entry) => entry.username === req.session.username);
        
        if (usernameExists) {
            // If username exists, display the stored username and result
            return res.render('index', { message: `Username: ${req.session.username} - Result: ${req.session.result}` });
        } else {
            // If username no longer exists, clear session data
            req.session.username = null;
            req.session.result = null;
        }
    }

    // Render the page with the form since no username is in session or it no longer exists in data.json
    res.render('index', { message: null });
});

// Handle username submission and box opening
app.post('/open-box', (req, res) => {
    if (req.session.username && req.session.result) {
        // If user has already submitted, display their stored username and result
        return res.render('index', { message: `Username: ${req.session.username} - Result: ${req.session.result}` });
    }

    const username = req.body.username;
    const data = readData();

    // Check if username already exists
    const usernameExists = data.some((entry) => entry.username === username);
    if (usernameExists) {
        res.render('index', { message: `The username "${username}" is already taken. Please choose a different one.` });
    } else {
        // Generate a random outcome
        const outcome = Math.random() < 0.5 ? 'Bomb' : 'Move Up!';

        // Add the new entry to the data
        data.push({ username, outcome });
        writeData(data);

        // Store the username and result in the session
        req.session.username = username;
        req.session.result = outcome;

        res.render('index', { message: `Username: ${username} - Result: ${outcome}` });
    }
});
// Render the login page for the admin
app.get('/admin-login', (req, res) => {
    res.render('admin-login', { message: null });
});

// Handle admin login
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('admin-login', { message: 'Invalid credentials, please try again.' });
    }
});

// Admin route to view all usernames and their outcomes
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        const data = readData();
        res.render('admin', { data });
    } else {
        res.redirect('/admin-login');
    }
});

// Admin logout route
app.get('/admin-logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/admin');
        }
        res.redirect('/admin-login');
    });
});

// Handle data deletion by admin
app.post('/admin/delete/:username', (req, res) => {
    if (req.session.isAdmin) {
        const username = req.params.username;
        let data = readData();
        data = data.filter((entry) => entry.username !== username); // Remove the specified entry
        writeData(data);
        res.redirect('/admin');
    } else {
        res.redirect('/admin-login');
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

