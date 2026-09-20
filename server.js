require("dotenv").config();

const express = require("express");
const postgres = require("postgres");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// DATABASE
// ============================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
}

const sql = postgres(connectionString);

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.static(__dirname));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "library-management-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        }
    })
);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/Login.html");
});

// ============================================
// DATABASE TEST
// ============================================

async function testDatabase() {
    try {
        await sql`SELECT 1`;
        console.log("Connected to PostgreSQL!");
    } catch (error) {
        console.error("Database connection error:", error.message);
    }
}

testDatabase();

// ============================================
// TEST ROUTE
// ============================================

app.get("/api/test", async (req, res) => {
    try {
        await sql`SELECT 1`;

        res.json({
            message: "PostgreSQL server is working!"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database connection failed."
        });
    }
});

// ============================================
// GET BOOKS
// ============================================

app.get("/api/books", async (req, res) => {
    try {
        const books = await sql`
            SELECT
                id,
                title,
                author,
                description,
                available,
                "borrowedBy"
            FROM books
            ORDER BY id
        `;

        res.json(books);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to load books."
        });
    }
});

// ============================================
// GET BORROWED BOOKS
// ============================================

app.get("/api/borrowed-books", async (req, res) => {
    try {
        const rows = await sql`
            SELECT
                borrowed_books.id,
                borrowed_books."studentName",
                borrowed_books."studentId",
                books.title AS book,
                borrowed_books."bookId",
                borrowed_books."borrowDate",
                borrowed_books."returnDate",
                borrowed_books."userId",
                borrowed_books.returned
            FROM borrowed_books
            INNER JOIN books
                ON borrowed_books."bookId" = books.id
            WHERE borrowed_books.returned = 0
            ORDER BY borrowed_books.id
        `;

        res.json(rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to load borrowed books."
        });
    }
});

// ============================================
// BORROW BOOK
// ============================================

app.post("/api/borrow", async (req, res) => {
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

    try {
        const result = await sql.begin(async (transaction) => {
            const bookRows = await transaction`
                SELECT *
                FROM books
                WHERE id = ${bookId}
                FOR UPDATE
            `;

            if (bookRows.length === 0) {
                throw new Error("BOOK_NOT_FOUND");
            }

            const book = bookRows[0];

            if (Number(book.available) !== 1) {
                throw new Error("BOOK_UNAVAILABLE");
            }

            await transaction`
                UPDATE books
                SET
                    available = 0,
                    "borrowedBy" = ${userId}
                WHERE id = ${bookId}
            `;

            await transaction`
                INSERT INTO borrowed_books
                (
                    "studentName",
                    "studentId",
                    "bookId",
                    "borrowDate",
                    "returnDate",
                    "userId",
                    returned
                )
                VALUES (
                    ${studentName},
                    ${studentId},
                    ${bookId},
                    ${borrowDate},
                    ${returnDate},
                    ${userId},
                    0
                )
            `;

            return book;
        });

        res.json({
            success: true,
            message: `"${result.title}" has been borrowed successfully!`
        });
    } catch (error) {
        console.error(error);

        if (error.message === "BOOK_NOT_FOUND") {
            return res.status(404).json({
                error: "Book was not found."
            });
        }

        if (error.message === "BOOK_UNAVAILABLE") {
            return res.status(400).json({
                error: "BOOK_UNAVAILABLE"
            });
        }

        res.status(500).json({
            error: "Failed to save borrowing record."
        });
    }
});

// ============================================
// RETURN BOOK
// ============================================

app.post("/api/return", async (req, res) => {
    const {
        borrowId,
        userId
    } = req.body;

    if (!borrowId || !userId) {
        return res.status(400).json({
            error: "Missing information."
        });
    }

    try {
        const borrowRows = await sql`
            SELECT *
            FROM borrowed_books
            WHERE id = ${borrowId}
        `;

        if (borrowRows.length === 0) {
            return res.status(404).json({
                error: "Borrow record not found."
            });
        }

        const borrow = borrowRows[0];

        if (Number(borrow.userId) !== Number(userId)) {
            return res.status(403).json({
                error: "You can only return books you borrowed."
            });
        }

        await sql.begin(async (transaction) => {
            await transaction`
                UPDATE books
                SET
                    available = 1,
                    "borrowedBy" = NULL
                WHERE id = ${borrow.bookId}
            `;

            await transaction`
                UPDATE borrowed_books
                SET returned = 1
                WHERE id = ${borrowId}
            `;
        });

        res.json({
            success: true,
            message: "Book returned successfully!"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to return book."
        });
    }
});

// ============================================
// SIGN UP
// ============================================

app.post("/api/signup", async (req, res) => {
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

    const cleanUsername = username.trim();

    try {
        const result = await sql`
            INSERT INTO users
            (username, password)
            VALUES
            (${cleanUsername}, ${password})
            RETURNING id, username
        `;

        res.json({
            success: true,
            userId: result[0].id,
            username: result[0].username
        });
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(400).json({
                error: "Username already exists."
            });
        }

        res.status(500).json({
            error: "Failed to create account."
        });
    }
});

// ============================================
// LOGIN
// ============================================

app.post("/api/login", async (req, res) => {
    const {
        username,
        password
    } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: "Please fill all fields."
        });
    }

    try {
        const users = await sql`
            SELECT id, username
            FROM users
            WHERE username = ${username.trim()}
            AND password = ${password}
        `;

        if (users.length === 0) {
            return res.status(401).json({
                error: "Invalid username or password."
            });
        }

        const user = users[0];

        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({
            success: true
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error."
        });
    }
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