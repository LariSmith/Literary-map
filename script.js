// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Initial camera settings
    const initialCenter = [12.0, 48.0]; // Longitude, Latitude for Europe
    const initialZoom = 4.2;
    const initialPitch = 45;
    const initialBearing = 0;

    // Initialize MapLibre GL JS map
    const map = new maplibregl.Map({
        container: 'map',
        style: {
            'version': 8,
            'sources': {
                'raster-tiles': {
                    'type': 'raster',
                    // Using CartoDB Positron (No Labels) as a clean base, labels can be added or we can use the regular one.
                    // The CSS filter on the canvas will give it the parchment look.
                    'tiles': [
                        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
                    ],
                    'tileSize': 256,
                    'attribution': '&copy; OpenStreetMap contributors &copy; CARTO'
                }
            },
            'layers': [
                {
                    'id': 'simple-tiles',
                    'type': 'raster',
                    'source': 'raster-tiles',
                    'minzoom': 0,
                    'maxzoom': 22
                }
            ]
        },
        center: initialCenter,
        zoom: initialZoom,
        pitch: initialPitch,
        bearing: initialBearing,
        attributionControl: false // We will handle attribution differently if needed or hide it for aesthetics
    });

    // Custom Navigation Control (Zoom in, Zoom out, Reset)
    class CustomNavigationControl {
        onAdd(map) {
            this._map = map;
            this._container = document.createElement('div');
            this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group custom-nav-ctrl';

            // Zoom In Button
            const zoomIn = document.createElement('button');
            zoomIn.className = 'maplibregl-ctrl-icon custom-ctrl-zoomin';
            zoomIn.type = 'button';
            zoomIn.innerHTML = '+';
            zoomIn.onclick = () => this._map.zoomIn();
            this._container.appendChild(zoomIn);

            // Zoom Out Button
            const zoomOut = document.createElement('button');
            zoomOut.className = 'maplibregl-ctrl-icon custom-ctrl-zoomout';
            zoomOut.type = 'button';
            zoomOut.innerHTML = '-';
            zoomOut.onclick = () => this._map.zoomOut();
            this._container.appendChild(zoomOut);

            // Reset (X) Button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'maplibregl-ctrl-icon custom-ctrl-reset';
            resetBtn.type = 'button';
            resetBtn.innerHTML = '×'; // Multiplication sign for X
            resetBtn.onclick = () => {
                this._map.flyTo({
                    center: initialCenter,
                    zoom: initialZoom,
                    pitch: initialPitch,
                    bearing: initialBearing,
                    duration: 1500
                });
            };
            this._container.appendChild(resetBtn);

            return this._container;
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
        }
    }

    map.addControl(new CustomNavigationControl(), 'top-left');

    // Ensure map fills the flex container completely
    window.addEventListener('resize', () => map.resize());
    setTimeout(() => map.resize(), 100);

    map.on('load', () => {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                data.sort((a, b) => a.readOrder - b.readOrder);

                // MapLibre uses [lng, lat] unlike Leaflet which uses [lat, lng]
                // Convert coordinates from [lat, lng] to [lng, lat]
                const lngLatData = data.map(book => ({
                    ...book,
                    coordinates: [book.coordinates[1], book.coordinates[0]]
                }));

                const coordinatesArray = lngLatData.map(book => book.coordinates);

                // Add data source for the pins (points)
                map.addSource('books-data', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': lngLatData.map(book => ({
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': book.coordinates
                            },
                            'properties': {
                                'title': book.title,
                                'location': book.location
                            }
                        }))
                    }
                });

                // Instead of 3D models (which require heavy glTF loading), we use custom HTML markers for pins
                // This allows us to use CSS 3D styling (shadows, gradients) which looks identical to the reference image.
                lngLatData.forEach(book => {
                    const el = document.createElement('div');
                    el.className = 'detective-pin';

                    const popup = new maplibregl.Popup({ offset: 25, className: 'custom-popup' })
                        .setHTML(`<b>${book.title}</b><br><small>${book.location}</small>`);

                    new maplibregl.Marker({ element: el })
                        .setLngLat(book.coordinates)
                        .setPopup(popup)
                        .addTo(map);
                });

                // Add data source for the red string (line)
                map.addSource('red-string-source', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': coordinatesArray
                        }
                    }
                });

                // Add a layer to render the line with a 3D-like appearance (shadow layer)
                map.addLayer({
                    'id': 'red-string-shadow',
                    'type': 'line',
                    'source': 'red-string-source',
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': 'rgba(0, 0, 0, 0.5)',
                        'line-width': 8,
                        'line-translate': [3, 3] // Offset the line to simulate drop shadow
                    }
                });

                // Main red string layer
                map.addLayer({
                    'id': 'red-string',
                    'type': 'line',
                    'source': 'red-string-source',
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': '#a81010', // Deep red wool color
                        'line-width': 5
                    }
                });

            })
            .catch(error => console.error('Erro ao carregar os dados dos livros:', error));
    });
});
