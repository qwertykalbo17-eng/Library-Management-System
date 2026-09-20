// ============================================
// SQLITE LIBRARY SYSTEM
// ============================================


// ============================================
// CURRENT USER
// ============================================

let currentUser = null;

let borrowedBooks = [];

let books = [];


// ============================================
// CHECK LOGIN
// ============================================

async function checkLogin() {

    // Login page does not need a user
    if (
        window.location.pathname
            .toLowerCase()
            .includes("login")
    ) {
        return true;
    }

    try {

        const response =
            await fetch("/api/me");

        if (!response.ok) {

            window.location.href =
                "login.html";

            return false;
        }

        const result =
            await response.json();

        currentUser =
            result.user;

        return true;

    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

        return false;
    }
}


// ============================================
// INITIALIZE
// ============================================


async function initializeLibrary() {

    const loggedIn =
        await checkLogin();

    if (!loggedIn || !currentUser) {
        return;
    }

    await loadBooksFromDatabase();

    await loadBorrowedBooks();

    loadBooks();

    displayBorrowedBooks();

    updateBookAvailability();

    displayUsername();

}


// ============================================
// DISPLAY USERNAME
// ============================================

function displayUsername() {

    const userElement =
        document.getElementById("user");


    if (!userElement || !currentUser) {
        return;
    }


    userElement.textContent =
        currentUser.username;

}


// ============================================
// LOAD BOOKS FROM SQLITE
// ============================================

async function loadBooksFromDatabase() {

    try {

        const response =
            await fetch("/api/books");


        if (!response.ok) {

            throw new Error(
                "Failed to load books."
            );

        }


        books =
            await response.json();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load books from the database."
        );

    }

}


// ============================================
// LOAD BORROWED BOOKS
// ============================================

async function loadBorrowedBooks() {

    try {

        const response =
            await fetch(
                "/api/borrowed-books"
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load borrowed books."
            );

        }


        borrowedBooks =
            await response.json();

    } catch (error) {

        console.error(error);

        borrowedBooks = [];

    }

}


// ============================================
// CHECK IF BOOK IS BORROWED
// ============================================

function isBookBorrowed(bookName) {

    return borrowedBooks.some(
        borrow =>
            borrow.book === bookName
    );

}


// ============================================
// LOAD BOOKS INTO DROPDOWN
// ============================================

function loadBooks() {

    const bookSelect =
        document.getElementById("bookSelect");


    if (!bookSelect) {
        return;
    }


    bookSelect.innerHTML =
        `<option value="">
            Select a Book
        </option>`;


    books.forEach(book => {

        if (book.available === 1) {

            const option =
                document.createElement("option");


            option.value =
                book.id;


            option.textContent =
                book.title;


            bookSelect.appendChild(option);

        }

    });

}


// ============================================
// BORROW BOOK
// ============================================

window.borrowBook =
async function () {

    if (!currentUser) {

        alert(
            "You must be logged in."
        );

        return;

    }


    const studentName =
        document
            .getElementById("studentName")
            .value
            .trim();


    const studentId =
        document
            .getElementById("studentId")
            .value
            .trim();


    const bookId =
        document
            .getElementById("bookSelect")
            .value;


    const borrowDate =
        document
            .getElementById("borrowDate")
            .value;


    const returnDate =
        document
            .getElementById("returnDate")
            .value;


    if (
        !studentName ||
        !studentId ||
        !bookId ||
        !borrowDate ||
        !returnDate
    ) {

        alert(
            "Please fill in all fields."
        );

        return;

    }


    if (returnDate < borrowDate) {

        alert(
            "Return date cannot be before the borrow date."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/borrow",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        studentName:
                            studentName,

                        studentId:
                            studentId,

                        bookId:
                            Number(bookId),

                        borrowDate:
                            borrowDate,

                        returnDate:
                            returnDate,

                        userId:
                            currentUser.id

                    })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            if (
                result.error ===
                "BOOK_UNAVAILABLE"
            ) {

                alert(
                    "This book is currently not available."
                );

            } else {

                alert(
                    result.error ||
                    "Something went wrong."
                );

            }

            return;

        }


        alert(result.message);


        // Clear form

        document
            .getElementById("studentName")
            .value = "";


        document
            .getElementById("studentId")
            .value = "";


        document
            .getElementById("bookSelect")
            .value = "";


        document
            .getElementById("borrowDate")
            .value = "";


        document
            .getElementById("returnDate")
            .value = "";


        // Reload database

        await loadBooksFromDatabase();

        await loadBorrowedBooks();

        loadBooks();

        displayBorrowedBooks();

        updateBookAvailability();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

    }

};


// ============================================
// DISPLAY BORROWED BOOKS
// ============================================

function displayBorrowedBooks() {

    const table =
        document.getElementById(
            "borrowTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML = "";


    if (borrowedBooks.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="7">

                    No books are currently borrowed.

                </td>

            </tr>

        `;

        return;

    }


    borrowedBooks.forEach(borrow => {

        const row =
            document.createElement("tr");


        const status =
            getBookStatus(
                borrow.returnDate
            );


        row.innerHTML = `

            <td>
                ${borrow.studentName}
            </td>

            <td>
                ${borrow.studentId}
            </td>

            <td>
                ${borrow.book}
            </td>

            <td>
                ${borrow.borrowDate}
            </td>

            <td>
                ${borrow.returnDate}
            </td>

            <td>

                <span
                    class="status ${status.class}"
                >

                    ${status.text}

                </span>

            </td>

            <td>

                ${
                    Number(borrow.userId) ===
                    Number(currentUser.id)

                    ?

                    `

                    <button
                        class="return-btn"
                        onclick="returnBook(${borrow.id})"
                    >

                        Return Book

                    </button>

                    `

                    :

                    `

                    <span
                        style="color:#777;"
                    >

                        Borrowed by another user

                    </span>

                    `
                }

            </td>

        `;


        table.appendChild(row);

    });

}


// ============================================
// BOOK STATUS
// ============================================

function getBookStatus(returnDate) {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const dueDate =
        new Date(returnDate);


    dueDate.setHours(
        0,
        0,
        0,
        0
    );


    if (today > dueDate) {

        return {

            text: "Overdue",

            class: "overdue"

        };

    }


    if (
        today.getTime() ===
        dueDate.getTime()
    ) {

        return {

            text: "Due Today",

            class: "due"

        };

    }


    return {

        text: "Borrowed",

        class: "borrowed"

    };

}


// ============================================
// RETURN BOOK
// ============================================

window.returnBook =
async function (id) {

    const borrow =
        borrowedBooks.find(
            book =>
                Number(book.id) ===
                Number(id)
        );


    if (!borrow) {
        return;
    }


    const confirmed =
        confirm(
            `Return "${borrow.book}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/return",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        borrowId:
                            Number(id),

                        userId:
                            currentUser.id

                    })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.error ||
                "Something went wrong."
            );

            return;

        }


        alert(result.message);


        await loadBooksFromDatabase();

        await loadBorrowedBooks();

        loadBooks();

        displayBorrowedBooks();

        updateBookAvailability();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

    }

};


// ============================================
// BOOKS PAGE AVAILABILITY
// ============================================

function updateBookAvailability() {

    const cards =
        document.querySelectorAll(
            ".book-card"
        );


    if (!cards.length) {
        return;
    }


    cards.forEach(card => {

        const title =
            card.querySelector(
                ".book-info h2"
            );


        if (!title) {
            return;
        }


        const bookName =
            title.textContent
                .trim();


        const availability =
            card.querySelector(
                ".availability"
            );


        const button =
            card.querySelector(
                ".book-button"
            );


        const bookData =
            books.find(
                book =>
                    book.title ===
                    bookName
            );


        const available =
            bookData
                ? bookData.available === 1
                : true;


        if (!available) {

            if (availability) {

                availability.textContent =
                    "Not Available";


                availability.classList.remove(
                    "available"
                );


                availability.classList.add(
                    "not-available"
                );

            }


            if (button) {

                button.textContent =
                    "Not Available";


                button.removeAttribute(
                    "href"
                );


                button.classList.add(
                    "disabled-button"
                );


                button.onclick =
                    function (event) {

                        event.preventDefault();


                        alert(
                            "This book is currently not available."
                        );

                    };

            }

        } else {

            if (availability) {

                availability.textContent =
                    "Available";


                availability.classList.remove(
                    "not-available"
                );


                availability.classList.add(
                    "available"
                );

            }


            if (button) {

                button.textContent =
                    "Borrow Book";


                button.href =
                    "Borrow.html";


                button.classList.remove(
                    "disabled-button"
                );


                button.onclick = null;

            }

        }

    });

}


// ============================================
// LOGOUT
// ============================================


window.logout = async function () {

    try {

        await fetch(
            "/api/logout",
            {
                method: "POST"
            }
        );

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(error);

        alert(
            "Unable to log out."
        );

    }

};


// ============================================
// SEARCH BOOKS
// ============================================

window.searchBooks =
function () {

    const searchInput =
        document.getElementById(
            "bookSearch"
        );


    if (!searchInput) {
        return;
    }


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const cards =
        document.querySelectorAll(
            ".book-card"
        );


    cards.forEach(card => {

        const title =
            card.querySelector(
                ".book-info h2"
            );


        if (!title) {
            return;
        }


        const bookName =
            title.textContent
                .toLowerCase()
                .trim();


        if (
            bookName.includes(search)
        ) {

            card.style.display = "";

        } else {

            card.style.display =
                "none";

        }

    });

};


// ============================================
// START
// ============================================

initializeLibrary();