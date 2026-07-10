const BASE_URL = "http://127.0.0.1:5000";

let registrationRequestInProgress = false;

function setRegistrationStatus(message, type = "info") {
    const statusEl = document.getElementById("registrationStatus");
    if (!statusEl) return;

    if (!message) {
        statusEl.textContent = "";
        statusEl.className = "hidden mt-3 px-4 py-3 rounded-md text-sm font-medium";
        return;
    }

    const baseClass = "mt-3 px-4 py-3 rounded-md text-sm font-medium";
    if (type === "error") {
        statusEl.className = `${baseClass} bg-red-50 text-red-700 border border-red-200`;
    } else if (type === "success") {
        statusEl.className = `${baseClass} bg-green-50 text-green-700 border border-green-200`;
    } else {
        statusEl.className = `${baseClass} bg-blue-50 text-blue-700 border border-blue-200`;
    }

    statusEl.textContent = message;
}

function getRegistrationFormValues() {
    const fullname = document.getElementById("fullname").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const sport = document.getElementById("sport").value.trim();
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const gender = genderEl ? genderEl.value.trim().toLowerCase() : "";

    return { fullname, username, email, password, sport, gender };
}

function validateRegistrationForm(values) {
    if (!values.fullname || !values.username || !values.email || !values.password || !values.gender || !values.sport) {
        return "Please fill all fields";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(values.email)) {
        return "Please enter a valid email address";
    }

    if (values.password.length < 6) {
        return "Password must be at least 6 characters";
    }

    return "";
}

function formatRegistrationError(message, email) {
    const normalized = (message || "").trim();
    if (!normalized) {
        return `Registration failed for ${email}.`;
    }

    const lower = normalized.toLowerCase();
    if (lower.includes("username already exists")) {
        return "Username already exists. Please choose a different username.";
    }
    if (lower.includes("email already exists")) {
        return "Email already exists. Please use another email or login.";
    }
    if (lower.includes("missing required fields")) {
        return "Please fill all required fields.";
    }
    if (lower.includes("invalid gender")) {
        return "Please select a valid gender.";
    }
    if (lower.includes("invalid email")) {
        return "Please enter a valid email address.";
    }

    return lower.includes(email.toLowerCase())
        ? normalized
        : `${normalized} (recipient: ${email})`;
}

function setRegistrationBusy(isBusy, text) {
    const registerBtn = document.getElementById("registerBtn");
    if (!registerBtn) return;

    registerBtn.disabled = isBusy;
    registerBtn.textContent = text || "Register";
}

function registerUser() {
    const values = getRegistrationFormValues();
    const validationMessage = validateRegistrationForm(values);

    if (validationMessage) {
        setRegistrationStatus(validationMessage, "error");
        showToast(validationMessage, "error");
        return;
    }

    setRegistrationStatus("");

    if (registrationRequestInProgress) {
        return;
    }

    registrationRequestInProgress = true;
    setRegistrationBusy(true, "Creating account...");

    fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            full_name: values.fullname,
            username: values.username,
            email: values.email,
            password: values.password,
            gender: values.gender,
            favorite_sport: values.sport
        })
    })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Registration Failed");
            }
            return data;
        })
        .then(data => {
            if (data.message !== "registered") {
                throw new Error(data.message || "Registration Failed");
            }

            localStorage.setItem("username", values.username);
            localStorage.setItem("email", values.email);
            localStorage.setItem("full_name", values.fullname);
            localStorage.setItem("gender", values.gender);
            localStorage.setItem("active_page", "dashboard");

            setRegistrationStatus("Registration successful. Redirecting to dashboard...", "success");
            showToast("Registration successful. Redirecting to dashboard...", "success");
            setTimeout(() => {
                window.location = "dashboard.html";
            }, 1200);
        })
        .catch(error => {
            console.error(error);
            const backendReason = formatRegistrationError(error.message, values.email);
            setRegistrationStatus(backendReason, "error");
            showToast(backendReason, "error");
        })
        .finally(() => {
            registrationRequestInProgress = false;
            setRegistrationBusy(false);
        });
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");

    toast.textContent = message;

    const baseClass = "fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all";

    if (type === "success") {
        toast.className = baseClass + " bg-green-600";
    } else if (type === "error") {
        toast.className = baseClass + " bg-red-600";
    }

    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}