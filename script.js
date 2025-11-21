let scene, camera, renderer, mesh, controls;

function initThree() {
    const canvas = document.getElementById("previewCanvas");
    
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 3);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 2, 2);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    animate();
}

function loadModel(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const extension = file.name.split(".").pop().toLowerCase();

        // Remove previous mesh
        if (mesh) {
            scene.remove(mesh);
            mesh.geometry?.dispose();
            if (mesh.material?.dispose) mesh.material.dispose();
            mesh = null;
        }

        // Load new mesh
        if (extension === "stl") {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(e.target.result);
            const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geometry, material);
        } else if (extension === "obj") {
            const loader = new THREE.OBJLoader();
            mesh = loader.parse(e.target.result);
        } else {
            alert("Unsupported file type!");
            return;
        }

        // Rotate, center, and scale
        mesh.rotation.x = -Math.PI / 2;  // face forward
        mesh.rotation.y = Math.PI / 8;   // slight tilt

        // Compute bounding box
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) mesh.scale.setScalar(1 / maxDim);

        // Center mesh
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);

        scene.add(mesh);
        generateASCII();
    };

    if (file.name.endsWith(".obj")) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ASCII generation function stays the same
function generateASCII() {
    if (!mesh) return; // nothing to render

    // Low-res ASCII for performance
    const width = 80;
    const height = 50;

    const asciiChars = " .:-=+*#%@";

    // Off-screen render target
    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const buffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);

    let ascii = "";

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];

            // brightness 0..255
            const brightness = (r + g + b) / 3;
            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            ascii += asciiChars[charIndex];
        }
        ascii += "\n";
    }

    document.getElementById("asciiOutput").textContent = ascii;
}


// File input listener
document.getElementById("modelInput").addEventListener("change", function () {
    if (this.files.length > 0) {
        loadModel(this.files[0]);
    }
});

// Initialize scene
initThree();
