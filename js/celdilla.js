const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const viewerDiv = document.getElementById('viewer');
const width = viewerDiv.clientWidth;
const height = viewerDiv.clientHeight;

const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
camera.position.set(3,3,3);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(width, height);
viewerDiv.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

const pointLight = new THREE.PointLight(0xffffff,1);
pointLight.position.set(10,10,10);
scene.add(pointLight);
scene.add(new THREE.AmbientLight(0x404040));

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

let cellsData = {};
let atomTypes = {};

// Función recursiva para bases múltiples
function getCellData(cellName, typeName){
    const data = cellsData[cellName][typeName];
    let combinedAtoms = [];

    if(data.bases && Array.isArray(data.bases)){
        data.bases.forEach(b => {
            const baseData = getCellData(cellName,b);
            combinedAtoms.push(...baseData.atoms);
        });
    } else if(data.base){
        const baseData = getCellData(cellName,data.base);
        combinedAtoms.push(...baseData.atoms);
    }

    if(data.atoms) combinedAtoms.push(...data.atoms);

    let a = data.a, b = data.b, c = data.c;
    if((!a||!b||!c) && data.bases && data.bases.length>0){
        const firstBase = getCellData(cellName,data.bases[0]);
        a = a||firstBase.a; b = b||firstBase.b; c = c||firstBase.c;
    } else if((!a||!b||!c) && data.base){
        const baseData = getCellData(cellName,data.base);
        a = a||baseData.a; b = b||baseData.b; c = c||baseData.c;
    }

    return {a,b,c,atoms:combinedAtoms};
}

// Cargar múltiples JSON
const jsonFiles = [
    'json/atomTypes.json',
    'json/A1.json',
    'json/A2.json'
];

Promise.all(jsonFiles.map(f=>fetch(f).then(r=>r.json())))
.then(results=>{
    results.forEach(data=>{
        if(data.cells) Object.assign(cellsData,data.cells);
        if(data.atomTypes) Object.assign(atomTypes,data.atomTypes);
    });
    initSelectorsAndDraw();
});

function initSelectorsAndDraw(){
    const cellSelect = document.getElementById('cellSelect');
    const typeSelect = document.getElementById('typeSelect');
    const radiusScale = document.getElementById('radiusScale');

    cellSelect.innerHTML = Object.keys(cellsData).map(c=>`<option value="${c}">${c}</option>`).join('');
    const firstCell = Object.keys(cellsData)[0];
    typeSelect.innerHTML = Object.keys(cellsData[firstCell]).map(t=>`<option value="${t}">${t}</option>`).join('');

    cellSelect.addEventListener('change',()=>{
        const selectedCell = cellSelect.value;
        typeSelect.innerHTML = Object.keys(cellsData[selectedCell]).map(t=>`<option value="${t}">${t}</option>`).join('');
        drawSelectedCell();
    });

    typeSelect.addEventListener('change', drawSelectedCell);
    radiusScale.addEventListener('change', drawSelectedCell);

    drawSelectedCell();
}

function drawSelectedCell(){
    if(!cellsData || !atomTypes) return;
    while(scene.children.length>0) scene.remove(scene.children[0]);
    scene.add(pointLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const cell = document.getElementById('cellSelect').value;
    const type = document.getElementById('typeSelect').value;
    const scale = parseFloat(document.getElementById('radiusScale').value);

    if(cellsData[cell] && cellsData[cell][type]){
        const data = getCellData(cell,type);
        drawCell(data.a,data.b,data.c);
        data.atoms.forEach(atom=>{
            const t = atomTypes[atom.element];
            addAtom(atom.x*data.a, atom.y*data.b, atom.z*data.c, t.color, t.radius*scale);
        });
    }
}

function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',()=>{
    const w = viewerDiv.clientWidth;
    const h = viewerDiv.clientHeight;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
});
