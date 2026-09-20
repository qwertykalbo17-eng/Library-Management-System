
    // Get the username from localStorage
    const username = localStorage.getItem("username");

    if (username) {
        document.getElementById("welcome").textContent =
            "Hello, " + username + "!";
    } else {
        // If no username is stored, return to login page
        window.location.href = "login.html";
    }

function logout() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
}