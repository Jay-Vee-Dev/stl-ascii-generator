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

    // Key light (main)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(2, 2, 3);
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 1, 2);
    scene.add(fillLight);

    // Rim / back
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
    rimLight.position.set(0, 3, -2);
    scene.add(rimLight);

    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Orbit controls for the ASCII window
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
            mesh = new THREE.Mesh(
                geometry,
                new THREE.MeshPhongMaterial({ color: 0x00ff00 })
            );
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

        // ORIENTATION 
        mesh.rotation.x = Math.PI / 2;
        mesh.rotation.y = Math.PI/20;
        mesh.rotation.z = Math.PI;



        // Center and scaling
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
    } catch (e) {
        return;
    }

    let ascii = "";
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
            const brightness = (r + g + b) / 3;
            const index = Math.floor((brightness / 255) * (asciiChars.length - 1));
            ascii += asciiChars[index];
        }
        ascii += "\n";
    }

    asciiOutput.textContent = ascii;
}

function onWindowResize() {
    asciiOutput.style.width = window.innerWidth + "px";
    asciiOutput.style.height = window.innerHeight + "px";
    renderASCII();
}
