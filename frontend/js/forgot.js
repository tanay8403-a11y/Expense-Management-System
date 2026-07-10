const BASE_URL = 'http://127.0.0.1:5000';

let verifiedResetToken = "";
let verifiedUsername = "";
let verifiedEmail = "";
let otpRequestInProgress = false;
let otpVerifyInProgress = false;

function showOtpInfo(message) {
	const otpInfo = document.getElementById('otpInfo');
	if (!otpInfo) return;

	otpInfo.textContent = message;
	otpInfo.classList.remove('hidden');
}

function requestOtp() {
	const username = document.getElementById('username').value.trim();
	const email = document.getElementById('email').value.trim();
	const requestOtpBtn = document.getElementById('requestOtpBtn');

	if (!username || !email) {
		alert('Please fill username and email');
		return;
	}

	if (otpRequestInProgress) {
		return;
	}

	otpRequestInProgress = true;
	if (requestOtpBtn) {
		requestOtpBtn.disabled = true;
		requestOtpBtn.textContent = 'Sending OTP...';
	}

	fetch(`${BASE_URL}/forgot-password/request-otp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ username, email })
	})
		.then(async res => {
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || 'Unable to send OTP');
			return data;
		})
		.then(data => {
			verifiedUsername = username;
			verifiedEmail = email;
			document.getElementById('otpSection').classList.remove('hidden');
			document.getElementById('resetSection').classList.add('hidden');
			if (data.otp_code) {
				const otpField = document.getElementById('otp');
				if (otpField) {
					otpField.value = data.otp_code;
				}
				showOtpInfo(`Email delivery is not configured for this local run, so the OTP was returned by the server. Use the prefilled code below.`);
			} else {
				showOtpInfo(`OTP sent successfully to ${email}. Please check your email and enter the code below.`);
			}
		})
		.catch(error => {
			console.log(error);
			const msg = (error.message || '').toLowerCase();
			if (msg.includes('email service is not configured')) {
				alert('Server email service is not configured. Please contact admin to set SMTP in backend/.env');
			} else if (msg.includes('smtp placeholders detected')) {
				alert(error.message || 'SMTP is still using sample values. Update backend/.env with real email and app password.');
			} else if (msg.includes('email authentication failed')) {
				alert(error.message || 'SMTP login failed. Use a real Gmail App Password in backend/.env (not your normal password).');
			} else if (msg.includes('failed to send otp')) {
				alert(error.message || 'Unable to send OTP email right now. Please try again later or contact admin.');
			} else {
				alert(error.message || 'Server Error');
			}
		})
		.finally(() => {
			otpRequestInProgress = false;
			if (requestOtpBtn) {
				requestOtpBtn.disabled = false;
				requestOtpBtn.textContent = 'Send OTP';
			}
		});
}

function verifyOtp() {
	const otp = document.getElementById('otp').value.trim();
	const verifyBtn = document.getElementById('verifyOtpBtn');

	if (!verifiedUsername) {
		alert('Request OTP first');
		return;
	}

	if (!otp) {
		alert('Enter OTP');
		return;
	}

	if (otpVerifyInProgress) {
		return;
	}

	otpVerifyInProgress = true;
	if (verifyBtn) {
		verifyBtn.disabled = true;
		verifyBtn.textContent = 'Verifying...';
	}

	fetch(`${BASE_URL}/forgot-password/verify-otp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			username: verifiedUsername,
			otp: otp
		})
	})
		.then(async res => {
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || 'Invalid OTP');
			return data;
		})
		.then(data => {
			verifiedResetToken = data.reset_token || '';
			document.getElementById('resetSection').classList.remove('hidden');
			showOtpInfo('OTP verified successfully. You can now set a new password.');
			alert('OTP Verified Successfully');
		})
		.catch(error => {
			console.log(error);
			alert(error.message || 'OTP verification failed');
		})
		.finally(() => {
			otpVerifyInProgress = false;
			if (verifyBtn) {
				verifyBtn.disabled = false;
				verifyBtn.textContent = 'Verify OTP';
			}
		});
}

function resetPassword(){

let password = document.getElementById("password").value.trim();
let confirmPassword = document.getElementById("confirmPassword").value.trim();

if(!verifiedUsername || !verifiedResetToken){
alert("Please verify OTP first")
return
}

if(password === "" || confirmPassword === ""){
alert("Please fill all fields")
return
}

if(password !== confirmPassword){
alert("Passwords do not match")
return
}

fetch(`${BASE_URL}/forgot-password/reset-password`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username: verifiedUsername,
reset_token: verifiedResetToken,
new_password: password
})

})
.then(async res=>{
	const data = await res.json();
	if(!res.ok) throw new Error(data.message || 'Unable to reset password');
	return data;
})
.then(()=>{
alert("Password Updated Successfully")
window.location="login.html"
})
.catch(error=>{
console.log(error)
alert(error.message || "Server Error")
})

}
