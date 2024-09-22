// responder/app.js

const socket = io();

// Elements
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');
const authMessage = document.getElementById('auth-message');
const signalsSection = document.querySelector('.signals-section');
const signalsDiv = document.getElementById('signals');
const mapElement = document.getElementById('map');

// Authentication Variables
let token = '';
let map;
let markers = [];
let directionsLayer;


// Initialize Leaflet Map
// Modify initMap in responder/app.js

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            map = L.map('map').setView([userLat, userLng], 13);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Add a marker for responder's current location
            L.marker([userLat, userLng]).addTo(map)
                .bindPopup('Your Location')
                .openPopup();
        }, () => {
            // Fallback to default location if geolocation fails
            map = L.map('map').setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
        });
    } else {
        // Browser doesn't support Geolocation
        map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }
}



// Handle Authentication
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if(!username || !password){
        authMessage.textContent = 'Please fill in all fields';
        authMessage.style.color = 'red';
        return;
    }

    try{
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if(res.ok){
            token = data.token;
            localStorage.setItem('token', token);
            authMessage.textContent = 'Login successful!';
            authMessage.style.color = 'green';
            authForm.style.display = 'none';
            signalsSection.style.display = 'block';
            // Fetch existing signals
            fetchSignals();
        } else {
            authMessage.textContent = data.msg;
            authMessage.style.color = 'red';
        }

    } catch(err){
        authMessage.textContent = 'Server error';
        authMessage.style.color = 'red';
    }
});

// Function to fetch existing signals
async function fetchSignals(){
    try{
        const res = await fetch('/api/signals', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const signals = await res.json();

        if(res.ok){
            signalsDiv.innerHTML = '';
            signals.forEach(signal => {
                displaySignal(signal);
            });
        } else {
            signalsDiv.innerHTML = '<p>Error fetching signals.</p>';
        }

    } catch(err){
        signalsDiv.innerHTML = '<p>Server error.</p>';
    }
}

// Function to display a signal
function displaySignal(data){
    const signalElement = document.createElement('div');
    signalElement.classList.add('signal', `type-${data.type}`);

    signalElement.innerHTML = `
        <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        <p><strong>Type:</strong> ${capitalizeFirstLetter(data.type)}</p>
        <p><strong>Description:</strong> ${data.description ? data.description : 'N/A'}</p>
        <p><strong>Location:</strong> Latitude ${data.location.latitude.toFixed(4)}, Longitude ${data.location.longitude.toFixed(4)}</p>
    `;

    signalsDiv.prepend(signalElement);
}

// Listen for incoming emergency signals
socket.on('receiveSignal', (data) => {
    displaySignal(data);
});

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


// Initialize marker cluster group
const markersGroup = L.markerClusterGroup();
map.addLayer(markersGroup);

// Modify addMarker function
// responder/app.js

// ... existing code ...

// Initialize Leaflet Routing Machine
let routingControl;

// Modify addMarker function to include routing
function addMarker(data){
    const destination = [data.location.latitude, data.location.longitude];
    
    // Add marker
    const marker = L.marker(destination)
        .bindPopup(`<strong>Emergency: ${capitalizeFirstLetter(data.type)}</strong><br>${data.description || 'No Description'}`);
    
    markersGroup.addLayer(marker);
    
    // Calculate route from responder's location to destination
    if(responderLocation){
        if(routingControl){
            map.removeControl(routingControl);
        }
        
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(responderLocation.lat, responderLocation.lng),
                L.latLng(destination[0], destination[1])
            ],
            routeWhileDragging: false,
            geocoder: L.Control.Geocoder.nominatim(),
            lineOptions: {
                styles: [{ color: 'blue', weight: 4 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);
    }
    
    // Optionally, adjust map view to fit all markers
    map.fitBounds(markersGroup.getBounds());
    
    // Estimate time to reach using OSRM
    estimateTime(destination);
}

// Function to estimate time to reach (using OSRM API)
async function estimateTime(destination){
    if (!responderLocation) return;
    
    const origin = `${responderLocation.lng},${responderLocation.lat}`;
    const dest = `${destination[1]},${destination[0]}`; // OSRM expects lng,lat
    
    try{
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin};${dest}?overview=false`);
        const data = await res.json();
        
        if(data.code === 'Ok'){
            const duration = data.routes[0].duration; // in seconds
            const durationMinutes = Math.ceil(duration / 60);
            displayEstimatedTime(durationMinutes);
        } else {
            console.log('Error fetching route:', data.message);
        }
    } catch(err){
        console.log('Error:', err);
    }
}

// Function to display estimated time
function displayEstimatedTime(durationMinutes){
    const timeElement = document.getElementById('estimated-time');
    timeElement.innerHTML = `<strong>Estimated Arrival Time:</strong> ${durationMinutes} minutes`;
}

// responder/app.js

// Function to send location updates
function sendLocationUpdate(){
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(position => {
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            socket.emit('responderLocation', locationData);
        });
    }
}

// Send location every 10 seconds
setInterval(sendLocationUpdate, 10000);

// Handle incoming responder locations (if needed)
socket.on('updateResponderLocation', (data) => {
    // Update markers or perform actions based on responder locations
});
