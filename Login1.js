// ============================================
// SQLITE LOGIN SYSTEM
// ============================================


// ============================================
// SHOW LOGIN
// ============================================

window.showLogin = function () {

    document.getElementById("signupForm").style.display = "none";

    document.getElementById("loginForm").style.display = "block";

};


// ============================================
// SHOW SIGN UP
// ============================================

window.showSignup = function () {

    document.getElementById("signupForm").style.display = "block";

    document.getElementById("loginForm").style.display = "none";

};


// ============================================
// SIGN UP
// ============================================

window.signup = async function () {

    const username =
        document
            .getElementById("signupUsername")
            .value
            .trim();


    const password =
        document
            .getElementById("signupPassword")
            .value;


    // Check fields

    if (!username || !password) {

        alert("Please fill all fields.");

        return;

    }


    // Check password length

    if (password.length < 6) {

        alert(
            "Password must be at least 6 characters."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/signup",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            username,

                        password:
                            password

                    })

                }
            );


        const result =
            await response.json();


        // Signup failed

        if (!response.ok) {

            alert(
                result.error ||
                "Sign up failed."
            );

            return;

        }


        // Signup successful

        alert(
            "Sign up successful!"
        );


        // Clear fields

        document
            .getElementById(
                "signupUsername"
            )
            .value = "";


        document
            .getElementById(
                "signupPassword"
            )
            .value = "";


        // Show login

        showLogin();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

    }

};


// ============================================
// LOGIN
// ============================================

window.login = async function () {

    const username =
        document
            .getElementById("loginUsername")
            .value
            .trim();


    const password =
        document
            .getElementById("loginPassword")
            .value;


    // Check fields

    if (!username || !password) {

        alert(
            "Please fill all fields."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/login",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            username,

                        password:
                            password

                    })

                }
            );


        const result =
            await response.json();


        // Login failed

        if (!response.ok) {

            alert(
                result.error ||
                "Invalid username or password."
            );

            return;

        }


        // ============================================
        // SAVE LOGGED-IN USER
        // ============================================

        


        // ============================================
        // GO TO HOME
        // ============================================

        window.location.href =
            "Home.html";


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to the server."
        );

    }

};


// ============================================
// LOGOUT
// ============================================

window.logout = async function () {

    await fetch("/api/logout", {
        method: "POST"
    });

    window.location.href = "login.html";

};