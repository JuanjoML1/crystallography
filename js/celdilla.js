// Escena, cámara, render
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const viewerDiv = document.getElementById('viewer');
const width = viewerDiv.clientWidth;
const height = viewerDiv.clientHeight;

const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
camera.position.set(5,5,5);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(width, height);
viewerDiv.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Luces
const pointLight = new THREE.PointLight(0xffffff,1);
pointLight.position.set(10,10,10);
scene.add(pointLight);
scene.add(new THREE.AmbientLight(0x404040));

// Funciones para dibujar
function drawCell(a,b,c){
    const geometry = new THREE.BoxGeometry(a,b,c);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0x000000}));
    scene.add(line);
}

function addAtom(x,y,z,color,radius){
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius,32,32),
        new THREE.MeshPhongMaterial({color})
    );
    sphere.position.set(x,y,z);
    scene.add(sphere);
}

// Variables globales para datos
let cellsData = null;
let atomTypes = null;

// Función recursiva para obtener datos considerando base
function getCellData(cellName, typeName){
    let data = cellsData[cellName][typeName];
    if(data.base){
        const baseData = getCellData(cellName, data.base);
        return {
            a: data.a || baseData.a,
            b: data.b || baseData.b,
            c: data.c || baseData.c,
            atoms: [...baseData.atoms, ...(data.atoms || [])]
        };
    }
    return data;
}

// Dibujar según selección y escala de radios
function drawSelectedCell(){
    if(!cellsData || !atomTypes) return;

    // Limpiar escena
    while(scene.children.length>0){
        scene.remove(scene.children[0]);
    }
    scene.add(pointLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const cell = document.getElementById('cellSelect').value;
    const type = document.getElementById('typeSelect').value;
    const scale = parseFloat(document.getElementById('radiusScale').value);

    if(cellsData[cell] && cellsData[cell][type]){
        const data = getCellData(cell,type);
        drawCell(data.a, data.b, data.c);
        data.atoms.forEach(atom=>{
            const t = atomTypes[atom.element];
            addAtom(atom.x*data.a, atom.y*data.b, atom.z*data.c, t.color, t.radius*scale);
        });
    }
}

// Cargar JSON externo
fetch('json/celdilla.json')
.then(res => res.json())
.then(data => {
    cellsData = data.cells;
    atomTypes = data.atomTypes;

    // Generar selectores dinámicamente
    const cellSelect = document.getElementById('cellSelect');
    cellSelect.innerHTML = Object.keys(cellsData).map(c => `<option value="${c}">${c}</option>`).join('');

    const typeSelect = document.getElementById('typeSelect');
    const firstCell = Object.keys(cellsData)[0];
    typeSelect.innerHTML = Object.keys(cellsData[firstCell]).map(t => `<option value="${t}">${t}</option>`).join('');

    // Eventos selectores
    cellSelect.addEventListener('change', ()=>{
        const selectedCell = cellSelect.value;
        const types = Object.keys(cellsData[selectedCell]);
        typeSelect.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
        drawSelectedCell();
    });

    typeSelect.addEventListener('change', drawSelectedCell);

    // Selector de escala de radios
    const radiusScale = document.getElementById('radiusScale');
    radiusScale.addEventListener('change', drawSelectedCell);

    // Dibujar inicial
    drawSelectedCell();
});

// Animación
function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
}
animate();

// Ajuste al redimensionar
window.addEventListener('resize',()=>{
    const w = viewerDiv.clientWidth;
    const h = viewerDiv.clientHeight;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
});
