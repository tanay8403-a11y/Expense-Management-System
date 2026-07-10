const savedUsername = localStorage.getItem('username');
if (savedUsername) {
    localStorage.setItem('active_page', 'dashboard');
    window.location.replace('dashboard.html');
}

function loginUser(event){

event.preventDefault()

let username = document.getElementById("username").value.trim()
let password = document.getElementById("password").value.trim()

if(username === "" || password === ""){
alert("Please fill all fields")
return
}

fetch("http://127.0.0.1:5000/login", {

method: "POST",

headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({
username: username,
password: password
})

})
.then(async response => {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Invalid Username or Password");
    }

    return data;
})
.then(data => {

if(data.message === "success"){

alert("Login Successful")

        // Store username + gender in localStorage
        localStorage.setItem("username", data.username || username)
        if(data.gender){
            localStorage.setItem("gender", data.gender.toLowerCase())
        }
    localStorage.setItem('active_page', 'dashboard')

        window.location.href = "dashboard.html"

} else {
    alert("Invalid Username or Password")
}

})
.catch(error => {

console.error(error)
if ((error.message || "").toLowerCase().includes("invalid")) {
    alert("Invalid Username or Password")
} else {
    alert("Server Error. Please try again.")
}

})

}


