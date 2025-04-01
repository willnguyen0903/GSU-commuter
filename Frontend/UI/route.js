// atlanta campus buildings and parking decks
const atlantaLocations = {
  "Aderhold Learning Center": {
    coordinates: { lat: 33.7490, lng: -84.3880 },
    address: "30 Pryor Street SW, Atlanta, GA 30303"
  },
  "Andrew Young School": {
    coordinates: { lat: 33.7495, lng: -84.3885 },
    address: "14 Marietta Street NW, Atlanta, GA 30303"
  },
  "Arts & Humanities Building": {
    coordinates: { lat: 33.7492, lng: -84.3878 },
    address: "25 Park Place NE, Atlanta, GA 30303"
  },
  "College of Law": {
    coordinates: { lat: 33.7498, lng: -84.3882 },
    address: "85 Park Place NE, Atlanta, GA 30303"
  },
  "Library North": {
    coordinates: { lat: 33.7493, lng: -84.3875 },
    address: "100 Decatur Street SE, Atlanta, GA 30303"
  },
  "Library South": {
    coordinates: { lat: 33.7491, lng: -84.3876 },
    address: "100 Decatur Street SE, Atlanta, GA 30303"
  },
  "Petit Science Center": {
    coordinates: { lat: 33.7494, lng: -84.3883 },
    address: "100 Piedmont Avenue SE, Atlanta, GA 30303"
  },
  "Student Center": {
    coordinates: { lat: 33.7496, lng: -84.3879 },
    address: "55 Gilmer Street SE, Atlanta, GA 30303"
  },
  "Urban Life Building": {
    coordinates: { lat: 33.7497, lng: -84.3881 },
    address: "140 Decatur Street SE, Atlanta, GA 30303"
  },
  "T Deck": {
    coordinates: { lat: 33.7555, lng: -84.3871 },
    address: "43 Auburn Ave NE, Atlanta, GA 30303"
  },
  "G Deck": {
    coordinates: { lat: 33.7520, lng: -84.3876 },
    address: "121 Collins St, Atlanta, GA 30303"
  },
  "K Deck": {
    coordinates: { lat: 33.7511, lng: -84.3841 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  },
  "N Deck": {
    coordinates: { lat: 33.7517, lng: -84.3835 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  },
  "S Deck": {
    coordinates: { lat: 33.7517, lng: -84.3835 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  }
};

let map;
let directionsService;
let directionsRenderer;
let isMapInitialized = false;
let currentLocation = null;

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Cannot get your location'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const geocoder = new google.maps.Geocoder();
          const latlng = { lat: latitude, lng: longitude };
          const response = await geocoder.geocode({ location: latlng });
          
          if (response.results[0]) {
            currentLocation = {
              name: "Current Location",
              coordinates: { lat: latitude, lng: longitude },
              address: response.results[0].formatted_address
            };
            resolve(currentLocation);
          } else {
            reject(new Error('cant get your location'));
          }
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function initMap() {
  try {
    map = new google.maps.Map(document.getElementById('map-container'), {
      center: { lat: 33.7490, lng: -84.3880 },
      zoom: 16
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      map: map
    });
    
    isMapInitialized = true;
  } catch (error) {
    alert("Map error, refresh the page");
  }
}

function updateEndLocations() {
  const startLocation = document.getElementById('start-location').value;
  const endLocationSelect = document.getElementById('end-location');
  
  endLocationSelect.innerHTML = '<option value="">Select End Location</option>';
  
  Object.entries(atlantaLocations).forEach(([key, location]) => {
    if (key !== startLocation) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      endLocationSelect.appendChild(option);
    }
  });
}

async function handleLocationSelect(locationType) {
  const select = document.getElementById(`${locationType}-location`);
  const selectedValue = select.value;
  
  if (selectedValue === 'current') {
    try {
      const location = await getCurrentLocation();
      select.options[select.selectedIndex].text = `Current Location (${location.address})`;
    } catch (error) {
      alert('cant get your location, pick somewhere else');
      select.value = '';
    }
  }
}

async function planRoute() {
  try {
    if (!isMapInitialized) {
      alert("refresh the page");
      return;
    }

    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    const transitType = document.getElementById('transit-type').value;

    if (!startLocation || !endLocation) {
      alert('Select both locations');
      return;
    }

    let start, end;

    if (startLocation === 'current') {
      try {
        start = await getCurrentLocation();
      } catch (error) {
        alert('cant get your location, pick somewhere else');
        return;
      }
    } else {
      start = atlantaLocations[startLocation];
    }

    if (endLocation === 'current') {
      try {
        end = await getCurrentLocation();
      } catch (error) {
        alert('cant get your location, pick somewhere else');
        return;
      }
    } else {
      end = atlantaLocations[endLocation];
    }

    let travelMode = google.maps.TravelMode.WALKING;
    switch (transitType) {
      case 'bus':
      case 'marta':
        travelMode = google.maps.TravelMode.TRANSIT;
        break;
      case 'walk':
        travelMode = google.maps.TravelMode.WALKING;
        break;
    }

    const request = {
      origin: start.address,
      destination: end.address,
      travelMode: travelMode
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        displayRouteDetails(result);
        const routeResults = document.getElementById('route-results');
        routeResults.classList.add('visible');
        routeResults.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('Could not find a route');
      }
    });
  } catch (error) {
    alert('Something went wrong');
  }
}

function displayRouteDetails(result) {
  try {
    const route = result.routes[0];
    const leg = route.legs[0];
    
    const instructionsDiv = document.getElementById('route-instructions');
    instructionsDiv.innerHTML = '<h3>Directions:</h3>';
    
    leg.steps.forEach((step, index) => {
      const stepDiv = document.createElement('div');
      stepDiv.innerHTML = `
        <p><strong>${index + 1}.</strong> ${step.instructions}</p>
        <p class="step-distance">${step.distance.text} - ${step.duration.text}</p>
      `;
      instructionsDiv.appendChild(stepDiv);
    });

    const summaryDiv = document.getElementById('route-summary');
    summaryDiv.innerHTML = `
      <h3>Route Summary</h3>
      <p><strong>Total Distance:</strong> ${leg.distance.text}</p>
      <p><strong>Estimated Time:</strong> ${leg.duration.text}</p>
      <p><strong>Start Address:</strong> ${leg.start_address}</p>
      <p><strong>End Address:</strong> ${leg.end_address}</p>
    `;
  } catch (error) {
    alert('cant show the route details');
  }
}

function resetDropdowns() {
  const startLocationSelect = document.getElementById('start-location');
  const endLocationSelect = document.getElementById('end-location');
  const transitTypeSelect = document.getElementById('transit-type');
  const routeResults = document.getElementById('route-results');
  
  startLocationSelect.value = '';
  
  endLocationSelect.innerHTML = '<option value="">Select End Location</option>';
  Object.keys(atlantaLocations).forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    endLocationSelect.appendChild(option);
  });
  
  transitTypeSelect.value = 'all';
  
  const currentOption = startLocationSelect.querySelector('option[value="current"]');
  if (currentOption) {
    currentOption.textContent = 'Current Location';
  }

  routeResults.classList.remove('visible');
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
  }
}

function saveRoute() {
    // todo
    // get current route details
    // get the current route data
    // save to saved routes
    // show success/error message
    alert('Route saving functionality coming soon!');
}

function loadSelectedRoute() {
    const selectedRoute = sessionStorage.getItem('selectedRoute');
    if (selectedRoute) {
        const route = JSON.parse(selectedRoute);
        document.getElementById('start-location').value = route.start;
        document.getElementById('end-location').value = route.end;
        document.getElementById('transit-type').value = route.transitType;
        sessionStorage.removeItem('selectedRoute');
        planRoute();
    } else {
        resetDropdowns();
    }
}

window.onload = function() {
    try {
        if (window.google && window.google.maps) {
            initMap();
            resetDropdowns();
            loadSelectedRoute(); 
        } else {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCLGt6MAIFv2ePOaHat5R7SiUUR-2RkmWk&libraries=places&callback=initMap`;
            script.async = true;
            script.defer = true;
            script.onerror = function() {
                alert("cant load google maps");
            };
            document.head.appendChild(script);
        }
    } catch (error) {
        alert('page error, refresh');
    }
}; 