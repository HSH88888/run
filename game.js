const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Settings
let charType = 0;
let speed = 6;
let width, height;

// Backgrounds
const bgImages = [];
let currentBgIndex = 0;

// Textures & Assets
const texImages = []; // Array of Image objects
let buildingType = 0; // 0:CityPop, 1:Brick, 2:Candy, 3:Ice, 4:Tech, 5:Concrete

// Character Style
let playerColor = '#000000';
let playerGlow = false;

// Preload Images
try {
    for (let i = 1; i <= 5; i++) {
        const img = new Image();
        img.src = `assets/bg${i}.png`;
        bgImages.push(img);
    }
    for (let i = 1; i <= 5; i++) {
        const img = new Image();
        img.src = `assets/tex${i}.png`;
        texImages.push(img);
    }
} catch (e) {
    console.error("Image Preload Error:", e);
}

// Player Object
const player = {
    distance: 0,
    yOffset: 0,
    verticalSpeed: 0,
    isJumping: false
};

// Map Data
const buildings = [];
const windowsCache = [];

// Refined Palettes (City Pop / Art Deco)
const cityColors = ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#F1C40F', '#8E44AD', '#D35400', '#16A085'];
const winColors = ['#F1C40F', '#F39C12', '#FFFFFF', '#D5DBDB']; // Lights

// --- Map Gneration ---
function generateMapSplit() {
    if (!width || !height) return;

    const w = width;
    const h = height;
    const total = (w + h) * 2;
    const corners = [w, w + h, w + h + w, total];

    buildings.length = 0;
    windowsCache.length = 0;

    let current = 0;
    while (current < total) {
        let next = current + 50 + Math.random() * 80;
        let bHeight = 60 + Math.random() * 120;

        // Cut at corners
        for (let c of corners) {
            if (current < c && next > c) {
                next = c;
                break;
            }
        }

        // Architecture Style
        // 0:Flat, 1:Step, 2:Spire, 3:Slope, 4:Dome
        let archType = 0;
        if (Math.random() > 0.3) archType = Math.floor(Math.random() * 5);

        // Color & Pattern
        const mainColor = cityColors[Math.floor(Math.random() * cityColors.length)];
        // 0:Grid, 1:Vertical, 2:Horizontal, 3:None
        const winPattern = Math.floor(Math.random() * 4);

        // Windows Data
        const winList = [];
        const bw = next - current;

        try {
            if (winPattern === 0) { // Grid
                const cols = Math.floor(bw / 15);
                const rows = Math.floor(bHeight / 20);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (Math.random() > 0.4) {
                            winList.push({
                                type: 'rect',
                                r: r, c: c,
                                color: winColors[Math.floor(Math.random() * winColors.length)]
                            });
                        }
                    }
                }
            } else if (winPattern === 1) { // Vertical Lines
                const cols = Math.floor(bw / 20);
                for (let c = 0; c < cols; c++) {
                    winList.push({ type: 'vert', c: c, color: winColors[2] });
                }
            } else if (winPattern === 2) { // Horizontal Lines
                const rows = Math.floor(bHeight / 25);
                for (let r = 0; r < rows; r++) {
                    winList.push({ type: 'horz', r: r, color: winColors[3] });
                }
            }
        } catch (err) {
            console.warn("Window Gen Error", err);
        }

        windowsCache.push(winList);

        buildings.push({
            start: current,
            end: next,
            height: bHeight,
            arch: archType,
            color: mainColor,
            pattern: winPattern
        });

        current = next;
    }
    // console.log(`Map Generated: ${buildings.length} buildings`);
}


// --- Game Loop ---
function update() {
    player.distance += speed;

    const totalLen = (width + height) * 2;
    if (totalLen === 0) return; // Prevention

    // Looping Logic
    const modDist = player.distance % totalLen;
    const futureDist = (player.distance + 40) % totalLen;

    let groundHeight = 0;
    let nextGroundHeight = 0;

    // Check Ground Collision
    for (let b of buildings) {
        if (modDist >= b.start && modDist < b.end) {
            groundHeight = b.height;
        }
        if (futureDist >= b.start && futureDist < b.end) {
            nextGroundHeight = b.height;
        }
    }

    // Auto Jump
    if (!player.isJumping && nextGroundHeight > player.yOffset + 10) {
        player.verticalSpeed = 15;
        player.isJumping = true;
    }

    // Gravity
    player.yOffset += player.verticalSpeed;
    player.verticalSpeed -= 0.8;

    // Landing
    if (player.yOffset < groundHeight) {
        player.yOffset = groundHeight;
        player.verticalSpeed = 0;
        player.isJumping = false;
    }
}

function getScreenPos(dist, altitude) {
    const w = width;
    const h = height;
    const total = (w + h) * 2;
    if (total === 0) return { x: 0, y: 0, angle: 0 };

    let d = dist % total;
    while (d < 0) d += total;

    if (d < w) return { x: d, y: h - altitude, angle: 0 };
    d -= w;
    if (d < h) return { x: w - altitude, y: h - d, angle: -Math.PI / 2 };
    d -= h;
    if (d < w) return { x: w - d, y: altitude, angle: Math.PI };
    d -= w;
    return { x: altitude, y: d, angle: Math.PI / 2 };
}

function draw() {
    if (!width || !height) return;

    // 1. Draw Background
    if (bgImages[currentBgIndex] && bgImages[currentBgIndex].complete && bgImages[currentBgIndex].naturalWidth > 0) {
        const img = bgImages[currentBgIndex];
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Prepare Texture Pattern (if needed)
    let texPattern = null;
    if (buildingType !== 0) {
        // buildingType 1..5 maps to texImages 0..4
        const img = texImages[buildingType - 1];
        if (img && img.complete && img.naturalWidth > 0) {
            texPattern = ctx.createPattern(img, 'repeat');
        }
    }

    // 3. Draw Buildings
    buildings.forEach((b, i) => {
        const p1 = getScreenPos(b.start, 0);
        const p2 = getScreenPos(b.end, 0);
        const p3 = getScreenPos(b.end, b.height);
        const p4 = getScreenPos(b.start, b.height);

        // Building Path
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.save();

        // Fill
        if (buildingType === 0) {
            ctx.fillStyle = b.color || '#555'; // Fallback
        } else {
            ctx.fillStyle = texPattern || '#333';
        }
        ctx.fill();

        // Stroke
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Transform for Details
        // Determine segment orientation manually or use getScreenPos info
        let angle = 0;
        if (b.start < width) angle = 0;
        else if (b.start < width + height) angle = -Math.PI / 2;
        else if (b.start < width * 2 + height) angle = Math.PI;
        else angle = Math.PI / 2;

        ctx.translate(p1.x, p1.y);
        ctx.rotate(angle);

        const bw = b.end - b.start;
        const bh = b.height;

        // Draw Rooftop Architecture (Upwards is -y)
        ctx.fillStyle = (buildingType === 0) ? b.color : '#333';
        ctx.filter = 'brightness(0.8)'; // Darker roof

        if (b.arch === 1) { // Step
            ctx.fillRect(5, -bh - 10, Math.max(0, bw - 10), 10);
            ctx.fillRect(10, -bh - 20, Math.max(0, bw - 20), 10);
        } else if (b.arch === 2) { // Spire
            ctx.beginPath();
            ctx.moveTo(0, -bh);
            ctx.lineTo(bw, -bh);
            ctx.lineTo(bw / 2, -bh - 40);
            ctx.fill();
            // Antenna Line
            ctx.beginPath(); ctx.moveTo(bw / 2, -bh - 40); ctx.lineTo(bw / 2, -bh - 60);
            ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
        } else if (b.arch === 3) { // Slope
            ctx.beginPath();
            ctx.moveTo(0, -bh);
            ctx.lineTo(bw, -bh);
            ctx.lineTo(bw, -bh - 20);
            ctx.fill();
        } else if (b.arch === 4) { // Dome
            ctx.beginPath();
            ctx.arc(bw / 2, -bh, Math.max(0, bw / 2 - 2), Math.PI, 0);
            ctx.fill();
        }
        ctx.filter = 'none';

        // Draw Windows
        const wins = windowsCache[i];
        if (wins && wins.length > 0 && buildingType !== 2 && buildingType !== 3) { // Skip Ice/Candy
            for (let win of wins) {
                if (win.type === 'rect') {
                    // Tech mode override
                    const c = (buildingType === 4 && win.on) ? '#0f0' : win.color;
                    ctx.fillStyle = c;
                    ctx.fillRect(win.c * 15 + 5, -(win.r * 20 + 20), 8, 12);
                } else if (win.type === 'vert') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(win.c * 20 + 8, -bh + 10, 4, Math.max(0, bh - 20));
                } else if (win.type === 'horz') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(5, -(win.r * 25 + 20), Math.max(0, bw - 10), 5);
                }
            }
        }
        ctx.restore();
    });

    // 4. Draw Player
    const pPos = getScreenPos(player.distance, player.yOffset);
    ctx.save();
    ctx.translate(pPos.x, pPos.y);
    ctx.rotate(pPos.angle);

    if (playerGlow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
    } else {
        ctx.shadowBlur = 0;
    }

    drawCharacter(charType, player.distance);
    ctx.restore();

    requestAnimationFrame(loop);
}

// --- Char Drawing (Helper) ---
function drawLimb(x1, y1, x2, y2) {
    ctx.id = 'limb'; // dummy
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawCharacter(type, dist) {
    ctx.strokeStyle = playerColor;
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Animation Params
    const animSpeed = Math.max(0.15, speed * 0.04);
    const stride = Math.min(25, 10 + speed * 1.2);
    const lift = Math.min(15, 5 + speed * 0.8);
    const lean = Math.min(15, speed * 1.2);

    const T = dist * animSpeed * (10 / stride);
    const bounce = Math.sin(T * 2) * (speed > 10 ? 3 : 2);
    const hipY = -25 + bounce;
    const hipX = 5 + lean / 2;

    function getLegPos(phase) {
        const t = T + phase;
        let fx, fy;
        if (Math.sin(t) > 0) {
            fx = Math.cos(t) * stride;
            fy = -5 - Math.sin(t) * lift;
        } else {
            fx = Math.cos(t) * stride;
            fy = 0;
        }
        const footAbsX = hipX + fx;
        const footAbsY = fy;
        const kneeX = (hipX + footAbsX) / 2 + (type === 4 ? -5 : 5);
        const kneeY = (hipY + footAbsY) / 2 - 5;
        return { fx: footAbsX, fy: footAbsY, kx: kneeX, ky: kneeY };
    }

    const rightLeg = getLegPos(0);
    const leftLeg = getLegPos(Math.PI);

    function getArmPos(phase) {
        const t = T + phase;
        const armSwing = stride * 0.8;
        const shX = hipX - 2 + lean / 3;
        const shY = hipY - 15;
        const handX = shX + Math.sin(t) * armSwing;
        const handY = shY + 5 + Math.cos(t) * 5;
        const elbowX = (shX + handX) / 2 - 3;
        const elbowY = (shY + handY) / 2 + 2;
        return { sx: shX, sy: shY, hx: handX, hy: handY, ex: elbowX, ey: elbowY };
    }

    const rightArm = getArmPos(Math.PI);
    const leftArm = getArmPos(0);

    // Drawing Logic (Stickman default)
    if (type === 0) { // Stickman
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        const neckX = hipX + lean;
        const neckY = hipY - 25;
        drawLimb(hipX, hipY, neckX, neckY);
        ctx.beginPath();
        const headX = neckX + lean * 0.2;
        ctx.arc(headX, neckY - 5, 6, 0, Math.PI * 2);
        ctx.stroke();
        function drawStickArm(arm) {
            drawLimb(arm.sx, arm.sy, arm.ex, arm.ey);
            drawLimb(arm.ex, arm.ey, arm.hx, arm.hy);
        }
        drawStickArm(leftArm);
        drawStickArm(rightArm);
    } else if (type === 1) { // Ninja
        const neckX = hipX + lean;
        const neckY = hipY - 22;
        ctx.lineWidth = 4;
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        ctx.lineWidth = 3;
        drawLimb(hipX, hipY, neckX, neckY);
        ctx.beginPath(); ctx.arc(neckX + lean * 0.2, neckY - 5, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(neckX, neckY);
        const flow = speed * 2;
        ctx.quadraticCurveTo(neckX - 10 - flow, neckY - 5 + Math.sin(T * 3) * 5, neckX - 20 - flow, neckY + Math.cos(T * 3) * 5);
        ctx.stroke();
        drawLimb(leftArm.sx, leftArm.sy, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    } else if (type === 2) { // Robot
        drawLimb(hipX, hipY, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.fx, rightLeg.fy);
        ctx.save();
        ctx.translate(hipX, hipY - 20);
        ctx.rotate(lean * 0.05);
        ctx.strokeRect(-6, -10, 12, 25);
        ctx.fillStyle = playerColor;
        ctx.fillRect(-4, -18, 8, 8);
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -25); ctx.stroke();
        ctx.restore();
        drawLimb(leftArm.sx, leftArm.sy, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.hx, rightArm.hy);
    } else if (type === 3) { // Punk
        const neckX = hipX + lean;
        const neckY = hipY - 25;
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        drawLimb(hipX, hipY, neckX, neckY);
        const hX = neckX + lean * 0.2;
        const hY = neckY - 5;
        ctx.beginPath(); ctx.arc(hX, hY, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hX - 2, hY - 6); ctx.lineTo(hX - speed, hY - 15); ctx.lineTo(hX + 6, hY - 4); ctx.fill();
        drawLimb(leftArm.sx, leftArm.sy, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    } else if (type === 4) { // Alien
        const neckX = hipX + lean * 1.5;
        const neckY = hipY - 15;
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        drawLimb(hipX, hipY, neckX, neckY);
        ctx.beginPath(); ctx.ellipse(neckX, neckY - 8, 6, 8, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
        const armLag = speed * 2;
        drawLimb(neckX, neckY, leftArm.hx - armLag, leftArm.hy + 10);
        drawLimb(neckX, neckY, rightArm.hx - armLag, rightArm.hy + 10);
    }
}


// --- Init ---
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateMapSplit();
}
window.addEventListener('resize', resize);
// Initial call
resize();
// Game Loop
requestAnimationFrame(loop);

function loop() {
    update();
    draw();
}


// UI Interaction
window.selectChar = function (idx) {
    charType = idx;
    document.querySelectorAll('.section:nth-child(2) .char-btn').forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
    });
};

window.selectBg = function (idx) {
    currentBgIndex = idx;
    document.querySelectorAll('.section:nth-child(3) .char-btn').forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (idx === 1 || idx === 3) {
        playerColor = '#ffffff';
        playerGlow = true;
    } else {
        playerColor = '#000000';
        playerGlow = false;
    }
};

window.selectBuilding = function (idx) {
    buildingType = idx;
    document.querySelectorAll('.section:nth-child(4) .char-btn').forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
    });
};

const slider = document.getElementById('speed-slider');
if (slider) {
    slider.addEventListener('input', (e) => {
        speed = parseInt(e.target.value);
        let label = "Normal";
        if (speed < 4) label = "Slow";
        else if (speed > 10) label = "Fast";
        else if (speed > 13) label = "Turbo";
        document.getElementById('speed-val').innerText = label;
    });
}

const ui = document.getElementById('ui-layer');
const start = document.getElementById('start-btn');
let uiVis = true;

function closeUi(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    uiVis = false;
    ui.style.display = 'none';
}
function openUi(e) {
    if (!uiVis) {
        uiVis = true;
        ui.style.display = 'flex';
    }
}
start.addEventListener('click', closeUi);
start.addEventListener('touchstart', closeUi, { passive: false });

window.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#main-menu') && !uiVis) openUi(e);
});
window.addEventListener('touchstart', (e) => {
    if (!e.target.closest('#main-menu') && !uiVis) openUi(e);
}, { passive: false });
