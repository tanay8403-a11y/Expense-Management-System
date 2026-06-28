function registerUser(){

let fullname = document.getElementById("fullname").value
let username = document.getElementById("username").value
let password = document.getElementById("password").value
let sport = document.getElementById("sport").value

if(fullname=="" || username=="" || password=="" || sport==""){
alert("Please fill all fields")
return
}

fetch("http://127.0.0.1:5000/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify({
full_name:fullname,
username:username,
password:password,
favorite_sport:sport
})

})
.then(res=>res.json())
.then(data=>{

if(data.message=="registered"){

alert("Registration Successful")
window.location="login.html"

}else{

alert("Registration Failed")

}

})
.catch(error=>{
alert("Server Error")
})

}
