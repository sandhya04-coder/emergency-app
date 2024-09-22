// requester/app.js

const socket = io();

// Elements
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');
const authMessage = document.getElementById('auth-message');
const formSection = document.querySelector('.form-section');
const sendSignalBtn = document.getElementById('send-signal-btn');
const sosBtn = document.getElementById('sos-btn');
const statusMessage = document.getElementById('status-message');
const emergencyType = document.getElementById('emergency-type');
const description = document.getElementById('description');

// Authentication Variables
let token = '';

// Handle Authentication
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role') ? document.getElementById('role').value : 'requester';

    if(!username || !password || !role){
        authMessage.textContent = 'Please fill in all fields';
        authMessage.style.color = 'red';
        return;
    }

    try{
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await res.json();

        if(res.ok){
            token = data.token;
            localStorage.setItem('token', token);
            authMessage.textContent = 'Registration successful!';
            authMessage.style.color = 'green';
            formSection.style.display = 'none';
            document.querySelector('.form-section').style.display = 'block';
        } else {
            authMessage.textContent = data.msg;
            authMessage.style.color = 'red';
        }

    } catch(err){
        authMessage.textContent = 'Server error';
        authMessage.style.color = 'red';
    }
});

// Function to get user's location
function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation is not supported by your browser.');
        } else {
            navigator.geolocation.getCurrentPosition(position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, () => {
                reject('Unable to retrieve your location.');
            });
        }
    });
}

// Handle Sending Emergency Signal
sendSignalBtn.addEventListener('click', async () => {
    sendSignalBtn.disabled = true;
    statusMessage.textContent = 'Sending emergency signal...';
    statusMessage.style.color = '#555555';

    try {
        const location = await getLocation();
        const signalData = {
            timestamp: new Date(),
            type: emergencyType.value,
            description: description.value,
            location: location
        };

        // Send to server
        const res = await fetch('/api/signals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(signalData)
        });

        const data = await res.json();

        if(res.ok){
            socket.emit('emergencySignal', data);
            statusMessage.textContent = 'Emergency signal sent successfully!';
            statusMessage.style.color = 'green';
        } else {
            statusMessage.textContent = data.msg;
            statusMessage.style.color = 'red';
        }

    } catch (error) {
        statusMessage.textContent = error;
        statusMessage.style.color = 'red';
    } finally {
        sendSignalBtn.disabled = false;
    }
});

// Handle SOS Button
sosBtn.addEventListener('click', async () => {
    sosBtn.disabled = true;
    statusMessage.textContent = 'Sending SOS signal...';
    statusMessage.style.color = '#555555';

    try {
        const location = await getLocation();
        const signalData = {
            timestamp: new Date(),
            type: 'other',
            description: 'SOS signal',
            location: location
        };

        // Send to server
        const res = await fetch('/api/signals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(signalData)
        });

        const data = await res.json();

        if(res.ok){
            socket.emit('emergencySignal', data);
            statusMessage.textContent = 'SOS signal sent!';
            statusMessage.style.color = 'red';
        } else {
            statusMessage.textContent = data.msg;
            statusMessage.style.color = 'red';
        }

    } catch (error) {
        statusMessage.textContent = error;
        statusMessage.style.color = 'red';
    } finally {
        sosBtn.disabled = false;
    }
});
// requester/app.js

// ... existing code ...

socket.on('updateResponderLocation', (data) => {
    // Update map with responder locations
    // Example: Add a marker for the responder
    const responderPosition = [data.location.latitude, data.location.longitude];
    L.marker(responderPosition, { icon: responderIcon })
        .addTo(map)
        .bindPopup('Responder Location')
        .openPopup();
});

// Define a custom icon for responders
const responderIcon = L.icon({
    iconUrl: 'path/to/responder-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});
