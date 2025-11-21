let scene, camera, renderer, mesh;

function initThree() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 3);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("previewCanvas"),
        antialias: true
    });
    renderer.setSize(400, 400);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
}

function loadModel(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const extension = file.name.split(".").pop().toLowerCase();

        if (extension === "stl") {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(e.target.result);
            const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geometry, material);
        } else if (extension === "obj") {
            const loader = new THREE.OBJLoader();
            mesh = loader.parse(e.target.result);
        }

        scene.add(mesh);
        animate();
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
    if (mesh) mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
}

function generateASCII() {
    let width = 120;
    let height = 80;

    const asciiChars = " .:-=+*#%@";

    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const buffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);

    let ascii = "";

    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];
            const brightness = (r + g + b) / 3;
            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            ascii += asciiChars[charIndex];
        }
        ascii += "\n";
    }

    document.getElementById("asciiOutput").textContent = ascii;
}

document.getElementById("modelInput").addEventListener("change", function () {
    if (this.files.length > 0) {
        loadModel(this.files[0]);
    }
});

initThree();
