const exampleRoutes = {
    'library-to-student-center': {
        name: 'Library to Student Center',
        start: 'Library North',
        end: 'Student Center',
        transitType: 'Walking',
    },
    'tdeck-to-library': {
        name: 'T Deck to Library',
        start: 'T Deck',
        end: 'Library North',
        transitType: 'Walking',
    },
    'current-to-student-center': {
        name: 'Current Location to Student Center',
        start: 'Current Location',
        end: 'Student Center',
        transitType: 'MARTA + Walking',
    }
};

function displayRoutes(routes) {
    const routesList = document.querySelector('.saved-routes-list');
    routesList.innerHTML = '';

    if (routes.length === 0) {
        routesList.innerHTML = '<p class="no-routes">No saved routes yet</p>';
        return;
    }

    routes.forEach((route, index) => {
        const routeElement = createRouteElement(route, index);
        routesList.appendChild(routeElement);
    });
}

function createRouteElement(route, index) {
    const div = document.createElement('div');
    div.className = 'saved-route-item';
    

    div.innerHTML = `
        <div class="route-header">
            <h3>${route.name}</h3>
            <div class="route-actions">
                <button class="btn-small" onclick="loadRoute(${index})">Load</button>
                <button class="btn-small delete" onclick="deleteRoute(${index})">Delete</button>
            </div>
        </div>
        <div class="route-details">
            <p><strong>From:</strong> ${route.start}</p>
            <p><strong>To:</strong> ${route.end}</p>
            <p><strong>Transit Type:</strong> ${route.transitType}</p>
        </div>
    `;

    return div;
}

function loadRoute(index) {
    const routes = Object.values(exampleRoutes);
    const route = routes[index];
    
    if (route) {
        // store in session storage
        sessionStorage.setItem('selectedRoute', JSON.stringify(route));
        window.location.href = 'route.html';
    }
}

// TODO
function deleteRoute(index) {
    alert('wip');
}


document.addEventListener('DOMContentLoaded', () => {
    // TODO: get routes from db rather than example
    const routes = Object.values(exampleRoutes);
    displayRoutes(routes);
}); 