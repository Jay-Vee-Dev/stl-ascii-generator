let scene, camera, renderer, mesh, controls;
let asciiOutput, renderTarget;

window.addEventListener("DOMContentLoaded", () => {
    asciiOutput = document.getElementById("asciiOutput");

    initThree();

    document.getElementById("modelInput").addEventListener("change", function () {
        if (this.files.length > 0) loadModel(this.files[0]);
    });

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
});

function initThree() {
    const canvas = document.getElementById("previewCanvas");

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Renderer (offscreen)
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 0.5));
    // NEW: bind controls to asciiOutput
    controls = new THREE.OrbitControls(camera, asciiOutput);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.addEventListener("change", renderASCII);


    // Offscreen render target for ASCII
    renderTarget = new THREE.WebGLRenderTarget(120, 60, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
    });

    animate();
}

function loadModel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const ext = file.name.split(".").pop().toLowerCase();

        if (mesh) {
            scene.remove(mesh);
            mesh.traverse(child => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (child.material?.dispose) child.material.dispose();
                }
            });
            mesh = null;
        }

        if (ext === "stl") {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(e.target.result);
            geometry.computeVertexNormals();
            const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geometry, material);
        } else if (ext === "obj") {
            const loader = new THREE.OBJLoader();
            mesh = loader.parse(e.target.result);
            mesh.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                    child.geometry.computeVertexNormals();
                }
            });
        } else {
            alert("Unsupported file type!");
            return;
        }

        // Rotate, center, scale
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = Math.PI / 8;

        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        mesh.scale.setScalar(maxDim > 0 ? 4 / maxDim : 1);

        const scaledBox = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        scaledBox.getCenter(center);
        mesh.position.sub(center);

        const boundingSphere = scaledBox.getBoundingSphere(new THREE.Sphere());
        camera.position.set(0, 0, boundingSphere.radius * 2.5);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        scene.add(mesh);
        renderASCII();
    };

    if (file.name.endsWith(".obj")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    renderASCII();
}

function renderASCII() {
    if (!mesh) return;

    const width = renderTarget.width;
    const height = renderTarget.height;
    const asciiChars = " .:-=+*#%@";

    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const buffer = new Uint8Array(width * height * 4);
    try {
        renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
    } catch (e) { return; }

    let ascii = "";
    for (let y = 0; y < height; y++) {  // fix upside-down
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
            const brightness = (r + g + b) / 3;
            const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
            ascii += asciiChars[charIndex];
        }
        ascii += "\n";
    }

    asciiOutput.textContent = ascii;
}

function onWindowResize() {
    asciiOutput.style.width = window.innerWidth + "px";
    asciiOutput.style.height = Math.floor(window.innerHeight * 0.8) + "px";
    renderASCII();
}
