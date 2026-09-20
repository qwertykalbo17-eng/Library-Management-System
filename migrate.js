require("dotenv").config();

const sqlite3 = require("sqlite3").verbose();
const postgres = require("postgres");

const sqlite = new sqlite3.Database("./library.db");
const sql = postgres(process.env.DATABASE_URL);

function getAll(query) {
    return new Promise((resolve, reject) => {
        sqlite.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrate() {
    try {
        console.log("Reading SQLite data...");

        const users = await getAll("SELECT * FROM users");
        const books = await getAll("SELECT * FROM books");
        const borrowedBooks = await getAll("SELECT * FROM borrowed_books");

        console.log(`Found ${users.length} users`);
        console.log(`Found ${books.length} books`);
        console.log(`Found ${borrowedBooks.length} borrowed records`);

        // Migrate users
        for (const user of users) {
            await sql`
                INSERT INTO users (id, username, password)
                VALUES (${user.id}, ${user.username}, ${user.password})
                ON CONFLICT (id) DO UPDATE SET
                    username = EXCLUDED.username,
                    password = EXCLUDED.password
            `;
        }

        // Migrate books
        for (const book of books) {
            await sql`
                INSERT INTO books
                    (id, title, author, description, available, "borrowedBy")
                VALUES
                    (
                        ${book.id},
                        ${book.title},
                        ${book.author},
                        ${book.description},
                        ${book.available},
                        ${book.borrowedBy}
                    )
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    author = EXCLUDED.author,
                    description = EXCLUDED.description,
                    available = EXCLUDED.available,
                    "borrowedBy" = EXCLUDED."borrowedBy"
            `;
        }

        // Migrate borrowed books
        for (const borrow of borrowedBooks) {
            await sql`
                INSERT INTO borrowed_books
                    (
                        id,
                        "studentName",
                        "studentId",
                        "bookId",
                        "borrowDate",
                        "returnDate",
                        "userId",
                        returned
                    )
                VALUES
                    (
                        ${borrow.id},
                        ${borrow.studentName},
                        ${borrow.studentId},
                        ${borrow.bookId},
                        ${borrow.borrowDate},
                        ${borrow.returnDate},
                        ${borrow.userId},
                        ${borrow.returned}
                    )
                ON CONFLICT (id) DO NOTHING
            `;
        }

        // Reset PostgreSQL ID sequences
        await sql`
            SELECT setval(
                pg_get_serial_sequence('users', 'id'),
                COALESCE((SELECT MAX(id) FROM users), 1)
            )
        `;

        await sql`
            SELECT setval(
                pg_get_serial_sequence('books', 'id'),
                COALESCE((SELECT MAX(id) FROM books), 1)
            )
        `;

        await sql`
            SELECT setval(
                pg_get_serial_sequence('borrowed_books', 'id'),
                COALESCE((SELECT MAX(id) FROM borrowed_books), 1)
            )
        `;

        console.log("Migration completed successfully!");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        sqlite.close();
        await sql.end();
    }
}

migrate();