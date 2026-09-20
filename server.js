const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const app = express();
const PORT = 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.static(__dirname));

app.use(
    session({
        secret: "library-management-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax"
        }
    })
);


// ============================================
// SQLITE DATABASE
// ============================================

const db = new sqlite3.Database("./library.db", (err) => {

    if (err) {

        console.error("Database error:", err.message);

    } else {

        console.log("Connected to SQLite!");

    }

});


// ============================================
// CREATE TABLES
// ============================================

db.serialize(() => {

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);


    // BOOKS
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            description TEXT,
            available INTEGER DEFAULT 1,
            borrowedBy INTEGER
        )
    `);


    // BORROWED BOOKS
    db.run(`
        CREATE TABLE IF NOT EXISTS borrowed_books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentName TEXT NOT NULL,
            studentId TEXT NOT NULL,
            bookId INTEGER NOT NULL,
            borrowDate TEXT NOT NULL,
            returnDate TEXT NOT NULL,
            userId INTEGER NOT NULL,
            returned INTEGER DEFAULT 0,

            FOREIGN KEY (bookId)
                REFERENCES books(id),

            FOREIGN KEY (userId)
                REFERENCES users(id)
        )
    `);


    // ============================================
    // CREATE INITIAL BOOKS
    // ============================================

    const books = [
        "Book 1",
        "Book 2",
        "Book 3",
        "Book 4",
        "Book 5",
        "Book 6",
        "Book 7",
        "Book 8"
    ];


    books.forEach((book) => {

        db.run(
            `
            INSERT OR IGNORE INTO books
            (title, author, description, available)
            VALUES (?, ?, ?, 1)
            `,
            [
                book,
                "Placeholder Author",
                "Book Description."
            ]
        );

    });

});


// ============================================
// TEST ROUTE
// ============================================

app.get("/api/test", (req, res) => {

    res.json({
        message: "SQLite server is working!"
    });

});


// ============================================
// GET BOOKS
// ============================================

app.get("/api/books", (req, res) => {

    db.all(
        `SELECT * FROM books`,
        [],
        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Failed to load books."
                });

            }

            res.json(rows);

        }
    );

});


// ============================================
// GET BORROWED BOOKS
// ============================================

app.get("/api/borrowed-books", (req, res) => {

    db.all(
        `
        SELECT
            borrowed_books.id,
            borrowed_books.studentName,
            borrowed_books.studentId,
            books.title AS book,
            borrowed_books.bookId,
            borrowed_books.borrowDate,
            borrowed_books.returnDate,
            borrowed_books.userId,
            borrowed_books.returned

        FROM borrowed_books

        INNER JOIN books
            ON borrowed_books.bookId = books.id

        WHERE borrowed_books.returned = 0
        `,
        [],
        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Failed to load borrowed books."
                });

            }

            res.json(rows);

        }
    );

});


// ============================================
// BORROW BOOK
// ============================================

app.post("/api/borrow", (req, res) => {

    const {
        studentName,
        studentId,
        bookId,
        borrowDate,
        returnDate,
        userId
    } = req.body;


    if (
        !studentName ||
        !studentId ||
        !bookId ||
        !borrowDate ||
        !returnDate ||
        !userId
    ) {

        return res.status(400).json({
            error: "Please fill in all fields."
        });

    }


    if (returnDate < borrowDate) {

        return res.status(400).json({
            error: "Return date cannot be before the borrow date."
        });

    }


    db.serialize(() => {

        db.get(
            `
            SELECT *
            FROM books
            WHERE id = ?
            `,
            [bookId],
            (err, book) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Database error."
                    });

                }


                if (!book) {

                    return res.status(404).json({
                        error: "Book was not found."
                    });

                }


                if (book.available !== 1) {

                    return res.status(400).json({
                        error: "BOOK_UNAVAILABLE"
                    });

                }


                // Mark book unavailable
                db.run(
                    `
                    UPDATE books
                    SET available = 0,
                        borrowedBy = ?
                    WHERE id = ?
                    `,
                    [userId, bookId],
                    (updateErr) => {

                        if (updateErr) {

                            console.error(updateErr);

                            return res.status(500).json({
                                error: "Failed to update book."
                            });

                        }


                        // Create borrowing record
                        db.run(
                            `
                            INSERT INTO borrowed_books
                            (
                                studentName,
                                studentId,
                                bookId,
                                borrowDate,
                                returnDate,
                                userId,
                                returned
                            )
                            VALUES (?, ?, ?, ?, ?, ?, 0)
                            `,
                            [
                                studentName,
                                studentId,
                                bookId,
                                borrowDate,
                                returnDate,
                                userId
                            ],
                            function (insertErr) {

                                if (insertErr) {

                                    console.error(insertErr);

                                    return res.status(500).json({
                                        error: "Failed to save borrowing record."
                                    });

                                }


                                res.json({
                                    success: true,
                                    message:
                                        `"${book.title}" has been borrowed successfully!`
                                });

                            }
                        );

                    }
                );

            }
        );

    });

});


// ============================================
// RETURN BOOK
// ============================================

app.post("/api/return", (req, res) => {

    const {
        borrowId,
        userId
    } = req.body;


    if (!borrowId || !userId) {

        return res.status(400).json({
            error: "Missing information."
        });

    }


    db.get(
        `
        SELECT *
        FROM borrowed_books
        WHERE id = ?
        `,
        [borrowId],
        (err, borrow) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Database error."
                });

            }


            if (!borrow) {

                return res.status(404).json({
                    error: "Borrow record not found."
                });

            }


            // Only the user who borrowed it can return it
            if (Number(borrow.userId) !== Number(userId)) {

                return res.status(403).json({
                    error: "You can only return books you borrowed."
                });

            }


            db.run(
                `
                UPDATE books
                SET available = 1,
                    borrowedBy = NULL
                WHERE id = ?
                `,
                [borrow.bookId],
                (bookErr) => {

                    if (bookErr) {

                        console.error(bookErr);

                        return res.status(500).json({
                            error: "Failed to update book."
                        });

                    }


                    db.run(
                        `
                        UPDATE borrowed_books
                        SET returned = 1
                        WHERE id = ?
                        `,
                        [borrowId],
                        (borrowErr) => {

                            if (borrowErr) {

                                console.error(borrowErr);

                                return res.status(500).json({
                                    error: "Failed to return book."
                                });

                            }


                            res.json({
                                success: true,
                                message: "Book returned successfully!"
                            });

                        }
                    );

                }
            );

        }
    );

});


// ============================================
// SIGN UP
// ============================================

app.post("/api/signup", (req, res) => {

    const {
        username,
        password
    } = req.body;


    if (!username || !password) {

        return res.status(400).json({
            error: "Please fill all fields."
        });

    }


    if (password.length < 6) {

        return res.status(400).json({
            error: "Password must be at least 6 characters."
        });

    }


    db.run(
        `
        INSERT INTO users
        (username, password)
        VALUES (?, ?)
        `,
        [
            username.trim(),
            password
        ],
        function (err) {

            if (err) {

                if (
                    err.message.includes(
                        "UNIQUE constraint failed"
                    )
                ) {

                    return res.status(400).json({
                        error: "Username already exists."
                    });

                }


                console.error(err);

                return res.status(500).json({
                    error: "Failed to create account."
                });

            }


            res.json({
                success: true,
                userId: this.lastID,
                username: username.trim()
            });

        }
    );

});


// ============================================
// LOGIN
// ============================================

app.post("/api/login", (req, res) => {

    const {
        username,
        password
    } = req.body;


    if (!username || !password) {

        return res.status(400).json({
            error: "Please fill all fields."
        });

    }


    db.get(
        `
        SELECT id, username
        FROM users
        WHERE username = ?
        AND password = ?
        `,
        [
            username.trim(),
            password
        ],
        (err, user) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Database error."
                });

            }


            if (!user) {

                return res.status(401).json({
                    error: "Invalid username or password."
                });

            }


            req.session.user = {
    id: user.id,
    username: user.username
};

res.json({
    success: true
});

        }
    );

});


// ============================================
// CHECK CURRENT USER
// ============================================

app.get("/api/me", (req, res) => {

    if (!req.session.user) {

        return res.status(401).json({
            error: "Not logged in."
        });

    }

    res.json({
        user: req.session.user
    });

});


// ============================================
// LOGOUT
// ============================================

app.post("/api/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            return res.status(500).json({
                error: "Failed to log out."
            });

        }

        res.clearCookie("connect.sid");

        res.json({
            success: true
        });

    });

});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});