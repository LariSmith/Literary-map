// script.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('map');

    // Scene setup
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 300, 200); // Look down at the board

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't allow camera to go below the board
    controls.minDistance = 50;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.6); // Warm ambient
    scene.add(ambientLight);
    controls.target.set(0, 0, -30);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    scene.add(dirLight);

    // Create a procedural map texture (Vintage Paper / Corkboard style)
    function createProceduralMapTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Base paper color
        ctx.fillStyle = '#ebd7a3'; // Light parchment
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add noise/texture
        for(let i=0; i < 50000; i++) {
            ctx.fillStyle = `rgba(139, 90, 43, ${Math.random() * 0.1})`;
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
        }

        // Add a subtle grid
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.2)';
        ctx.lineWidth = 1;
        for(let x=0; x<canvas.width; x+=64) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for(let y=0; y<canvas.height; y+=64) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Draw simple generic continents/blobs for visual anchor (since we are fully 3D and procedural for now)
        // We'll just draw a few large faint shapes to simulate landmasses
        ctx.fillStyle = '#d4c08b'; // Slightly darker for land
        function drawBlob(cx, cy, r) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Very rough "continents"
        drawBlob(canvas.width*0.2, canvas.height*0.3, 150); // North America
        drawBlob(canvas.width*0.3, canvas.height*0.7, 100); // South America
        drawBlob(canvas.width*0.5, canvas.height*0.4, 120); // Europe/Africa
        drawBlob(canvas.width*0.7, canvas.height*0.3, 180); // Asia

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // The Map Board (Plane)
    // Assuming a world map roughly 400x200 units
    const boardWidth = 400;
    const boardHeight = 200;

    const boardGeometry = new THREE.PlaneGeometry(boardWidth, boardHeight);
    const boardMaterial = new THREE.MeshStandardMaterial({
        map: createProceduralMapTexture(),
        roughness: 0.9,
        metalness: 0.1
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.rotation.x = -Math.PI / 2; // Lay flat
    board.receiveShadow = true;
    scene.add(board);

    // Data handling and Procedural Pins
    const pins = [];
    const pinHeads = []; // For raycasting/tooltips

    // Convert Geo-coordinates (Lat/Lon) to 3D Board Coordinates (X/Z)
    function geoTo3D(lat, lon) {
        // Simple equirectangular projection mapping
        // Longitude: -180 to 180 maps to -boardWidth/2 to boardWidth/2
        const x = (lon / 180) * (boardWidth / 2);
        // Latitude: -90 to 90 maps to boardHeight/2 to -boardHeight/2
        const z = -(lat / 90) * (boardHeight / 2);
        return { x, z };
    }

    // Create a 3D Procedural Pin
    function createPin(lat, lon, bookData) {
        const pinGroup = new THREE.Group();

        // Pin dimensions
        const needleRadius = 0.5;
        const needleHeight = 10;
        const headRadius = 2.5;

        // Needle (Silver/Metal cylinder)
        const needleGeo = new THREE.CylinderGeometry(needleRadius, 0.1, needleHeight, 16);
        // Cylinder is centered, so shift it up by half its height so bottom is at y=0
        needleGeo.translate(0, needleHeight / 2, 0);
        const needleMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.8,
            roughness: 0.2
        });
        const needle = new THREE.Mesh(needleGeo, needleMat);
        needle.castShadow = true;
        needle.receiveShadow = true;
        pinGroup.add(needle);

        // Head (Red Plastic sphere, slightly squashed)
        const headGeo = new THREE.SphereGeometry(headRadius, 32, 32);
        // Flatten the sphere slightly to look like a pushpin head
        headGeo.scale(1, 0.7, 1);
        headGeo.translate(0, needleHeight + headRadius*0.7, 0);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xcc0000,
            roughness: 0.3,
            metalness: 0.1,
            clearcoat: 1.0,      // Add shine
            clearcoatRoughness: 0.1
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.castShadow = true;
        head.receiveShadow = true;

        // Store user data in the head mesh for raycasting
        head.userData = {
            title: bookData.title,
            location: bookData.location,
            isPinHead: true
        };

        pinGroup.add(head);
        pinHeads.push(head); // Keep track of heads for hover effects

        // Position the entire pin on the board
        const pos = geoTo3D(lat, lon);
        pinGroup.position.set(pos.x, 0, pos.z);

        // Add a slight random tilt to make it look manually pushed in
        pinGroup.rotation.x = (Math.random() - 0.5) * 0.2;
        pinGroup.rotation.z = (Math.random() - 0.5) * 0.2;

        scene.add(pinGroup);
        return {
            group: pinGroup,
            head: head,
            headWorldPos: new THREE.Vector3(pos.x, needleHeight + headRadius*0.7, pos.z).applyMatrix4(pinGroup.matrixWorld) // Will update properly after rendering
        };
    }

    // Load data and create elements
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Sort books by reading order
            data.sort((a, b) => a.readOrder - b.readOrder);

            // Create pins
            data.forEach((book, index) => {
                // data.json format uses [lat, lon] natively (unlike standard GeoJSON)
                // Let's adapt based on the data.json: e.g. [51.5074, -0.1278] for London is [lat, lon]
                const lat = book.coordinates[0];
                const lon = book.coordinates[1];

                const pinData = createPin(lat, lon, book);
                pins.push(pinData);
            });

            // Force an update matrix world so we have accurate head positions for the strings
            scene.updateMatrixWorld(true);

            // Create strings connecting the pins in read order
            for (let i = 0; i < pins.length - 1; i++) {
                const pinA = pins[i];
                const pinB = pins[i + 1];

                // Get exact global positions of the pin heads
                const posA = new THREE.Vector3();
                pinA.head.getWorldPosition(posA);

                const posB = new THREE.Vector3();
                pinB.head.getWorldPosition(posB);

                // Create a quadratic bezier curve to simulate sagging string
                const midX = (posA.x + posB.x) / 2;
                const midZ = (posA.z + posB.z) / 2;

                // Distance to determine sag depth
                const dist = posA.distanceTo(posB);
                const sag = dist * 0.2; // Sag is proportional to distance

                // The string goes from head A, dips down slightly, then goes to head B
                const midY = (posA.y + posB.y) / 2 - sag;

                const curve = new THREE.QuadraticBezierCurve3(
                    posA,
                    new THREE.Vector3(midX, midY, midZ),
                    posB
                );

                // Tube geometry for the string
                const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.3, 8, false);
                const tubeMat = new THREE.MeshStandardMaterial({
                    color: 0x8b0000, // Dark red wool
                    roughness: 0.9,
                    metalness: 0.0
                });

                const stringMesh = new THREE.Mesh(tubeGeo, tubeMat);
                stringMesh.castShadow = true;
                stringMesh.receiveShadow = true;
                scene.add(stringMesh);
            }
        })
        .catch(error => console.error('Erro ao carregar data.json:', error));

    // Interactivity: Raycasting for Tooltips
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipLocation = document.getElementById('tooltip-location');

    let hoveredPin = null;

    container.addEventListener('mousemove', (event) => {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast
        raycaster.setFromCamera(mouse, camera);
        // Only intersect with pinHeads
        const intersects = raycaster.intersectObjects(pinHeads);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (hoveredPin !== object) {
                // If we were hovering something else, reset it
                if (hoveredPin) hoveredPin.material.emissive.setHex(0x000000);

                // New hover
                hoveredPin = object;
                hoveredPin.material.emissive.setHex(0x440000); // Glow red
                document.body.style.cursor = 'pointer';

                // Show and update tooltip
                tooltipTitle.innerText = hoveredPin.userData.title;
                tooltipLocation.innerText = hoveredPin.userData.location;
                tooltip.style.opacity = 1;
            }

            // Move tooltip to follow cursor but adjust position based on DOM
            tooltip.style.left = event.clientX + 'px';
            tooltip.style.top = event.clientY - 20 + 'px';

        } else {
            if (hoveredPin) {
                hoveredPin.material.emissive.setHex(0x000000);
                hoveredPin = null;
                document.body.style.cursor = 'default';
                tooltip.style.opacity = 0;
            }
        }
    });

    container.addEventListener('mouseleave', () => {
        if (hoveredPin) {
            hoveredPin.material.emissive.setHex(0x000000);
            hoveredPin = null;
            document.body.style.cursor = 'default';
            tooltip.style.opacity = 0;
        }
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
});
