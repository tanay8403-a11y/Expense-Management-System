function resetPassword(){

let username = document.getElementById("username").value
let sport = document.getElementById("sport").value
let password = document.getElementById("password").value

if(username=="" || sport=="" || password==""){
alert("Please fill all fields")
return
}

fetch("http://127.0.0.1:5000/reset-password",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username:username,
sport:sport,
password:password
})

})
.then(res=>res.json())
.then(data=>{

if(data.message=="updated"){

alert("Password Updated Successfully")

window.location="login.html"

}else{

alert("Verification Failed")

}

})
.catch(error=>{
console.log(error)
alert("Server Error")
})

}
