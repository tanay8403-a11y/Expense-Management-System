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
.then(response => response.json())
.then(data => {

if(data.message === "success"){

alert("Login Successful")

// Store username in localStorage
localStorage.setItem("username", username)

window.location.href = "dashboard.html"

}else{

alert("Invalid Username or Password")

}

})
.catch(error => {

console.error(error)
alert("Server Error. Please try again.")

})

}


