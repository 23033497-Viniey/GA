const express = require('express');
const mysql = require('mysql2');
const app = express();

// In-memory user data and cart
let loggedInUser = null;
let userCarts = {};

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'mysql-viniey.alwaysdata.net',
    port: 3306, 
    user: 'viniey',
    password: 'harinee0904!',
    database: 'viniey_artgallery'  
});

connection.connect((err) => {
    if (err) { 
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Enable form processing
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Define routes
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM paintings';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving paintings');
        }
        res.render('index', { paintings: results, user: loggedInUser }); // Render HTML page with data
    });
});

app.get('/paintings/:paintingid', (req, res) => {
    const paintingid = req.params.paintingid;
    const sql = 'SELECT * FROM paintings WHERE paintingid = ?'; // Adjusted to use paintingid
    connection.query(sql, [paintingid], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving painting by ID');
        }
        if (results.length > 0) {
            res.render('paintingInfo', { painting: results[0], user: loggedInUser }); // Pass single painting object to view
        } else {
            res.status(404).send('Painting not found');
        }
    });
});

app.get('/addPainting', (req, res) => {
    res.render('addPainting', { user: loggedInUser });
});

app.post('/addPainting', (req, res) => {
    const { title, artist, description, image, category, availability, social} = req.body;
    const sql = 'INSERT INTO paintings (title, artist, description, image, category, availability, social) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [title, artist, description, image, category, availability, social], (error, results) => {
        if (error) {
            console.error('Error adding painting:', error);
            res.status(500).send('Error adding painting');
        } else {
            res.redirect('/');
        }
    });
});
app.post('/cart/add', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const paintingId = req.body.id;
    const quantity = parseInt(req.body.quantity) || 1;
    const query = 'SELECT * FROM paintings WHERE paintingid = ?';

    connection.query(query, [paintingId], (err, results) => {
        if (err) {
            console.error('Error retrieving painting by ID:', err);
            res.status(500).send('Error retrieving painting by ID');
            return;
        }
        if (results.length > 0) {
            if (!userCarts[loggedInUser.user_id]) {
                userCarts[loggedInUser.user_id] = [];
            }
            const painting = results[0];
            const existingItem = userCarts[loggedInUser.user_id].find(item => item.painting.paintingid === painting.paintingid);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                userCarts[loggedInUser.user_id].push({ painting, quantity });
            }
            res.redirect('/cart');
        } else {
            res.status(404).send('Painting not found');
        }
    });
});

app.post('/cart/update', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const paintingId = req.body.paintingid;
    const quantity = parseInt(req.body.quantity);

    if (quantity <= 0) {
        userCarts[loggedInUser.user_id] = userCarts[loggedInUser.user_id].filter(item => item.painting.paintingid != paintingId);
    } else {
        const cartItem = userCarts[loggedInUser.user_id].find(item => item.painting.paintingid == paintingId);
        if (cartItem) {
            cartItem.quantity = quantity;
        }
    }
    res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const paintingId = req.body.paintingid;
    userCarts[loggedInUser.user_id] = userCarts[loggedInUser.user_id].filter(item => item.painting.paintingid != paintingId);
    res.redirect('/cart');
});


app.get('/cart', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    res.render('cart', { cart: userCarts[loggedInUser.user_id] || [], user: loggedInUser });
});

app.post('/cart/remove', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const paintingId = req.body.id;
    userCarts[loggedInUser.user_id] = userCarts[loggedInUser.user_id].filter(painting => painting.paintingid != paintingId);
    res.redirect('/cart');
});

app.get('/login', (req, res) => {
    res.render('login', { user: loggedInUser });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM user WHERE email = ? AND password = ?';

    connection.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            res.status(500).send('Error during login');
            return;
        }

        if (results.length > 0) {
            loggedInUser = results[0];
            if (!userCarts[loggedInUser.user_id]) {
                userCarts[loggedInUser.user_id] = [];
            }
            res.redirect('/');
        } else {
            console.log('Invalid email or password:', { email, password });
            res.status(401).send('Invalid email or password');
        }
    });
});

app.get('/logout', (req, res) => {
    loggedInUser = null;
    res.redirect('/');
});

app.get('/register', (req, res) => {
    res.render('register', { user: loggedInUser });
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const query = 'INSERT INTO user (name, email, password) VALUES (?, ?, ?)';

    connection.query(query, [name, email, password], (err, results) => {
        if (err) {
            console.error('Error during registration:', err);
            res.status(500).send('Error during registration');
            return;
        }
        console.log('User registered successfully:', results);
        res.redirect('/login');
    });
});

app.get('/checkout', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const cart = userCarts[loggedInUser.user_id] || [];
    if (cart.length === 0) {
        return res.redirect('/cart');
    }

    res.render('checkout', { cart: cart, user: loggedInUser });
});

app.post('/checkout', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login');
    }

    const cart = userCarts[loggedInUser.user_id] || [];
    if (cart.length === 0) {
        return res.redirect('/cart');
    }

    // Clear the user's cart after successful checkout
    userCarts[loggedInUser.user_id] = [];
    res.redirect('/thankyou');
}); 

app.get('/thankyou', (req, res) => {
    res.render('thankyou', { user: loggedInUser });
});