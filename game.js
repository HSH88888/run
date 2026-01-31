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
const texImages = [];
let buildingType = 0;

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

// Refined Palettes
const cityColors = ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#F1C40F', '#8E44AD', '#D35400', '#16A085'];
const winColors = ['#F1C40F', '#F39C12', '#FFFFFF', '#D5DBDB'];

// --- Map Gen ---
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

        for (let c of corners) {
            if (current < c && next > c) {
                next = c;
                break;
            }
        }

        let archType = 0;
        if (Math.random() > 0.3) archType = Math.floor(Math.random() * 5);
        const mainColor = cityColors[Math.floor(Math.random() * cityColors.length)];
        const winPattern = Math.floor(Math.random() * 4);
        const winList = [];
        const bw = next - current;

        try {
            if (winPattern === 0) { // Grid
                const cols = Math.floor(bw / 15);
                const rows = Math.floor(bHeight / 20);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (Math.random() > 0.4) {
                            winList.push({ type: 'rect', r, c, color: winColors[Math.floor(Math.random() * winColors.length)] });
                        }
                    }
                }
            } else if (winPattern === 1) { // Vert
                const cols = Math.floor(bw / 20);
                for (let c = 0; c < cols; c++) {
                    winList.push({ type: 'vert', c, color: winColors[2] });
                }
            } else if (winPattern === 2) { // Horz
                const rows = Math.floor(bHeight / 25);
                for (let r = 0; r < rows; r++) {
                    winList.push({ type: 'horz', r, color: winColors[3] });
                }
            }
        } catch (err) { }

        windowsCache.push(winList);
        buildings.push({ start: current, end: next, height: bHeight, arch: archType, color: mainColor, pattern: winPattern });
        current = next;
    }
}

// --- Game Loop ---
function update() {
    player.distance += speed;

    const totalLen = (width + height) * 2;
    if (totalLen === 0) return;

    const modDist = player.distance % totalLen;
    const futureDist = (player.distance + 40) % totalLen;

    let groundHeight = 0;
    let nextGroundHeight = 0;

    for (let b of buildings) {
        if (modDist >= b.start && modDist < b.end) groundHeight = b.height;
        if (futureDist >= b.start && futureDist < b.end) nextGroundHeight = b.height;
    }

    if (!player.isJumping && nextGroundHeight > player.yOffset + 10) {
        player.verticalSpeed = 15;
        player.isJumping = true;
    }

    player.yOffset += player.verticalSpeed;
    player.verticalSpeed -= 0.8;

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

    // BG
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

    // Tex
    let texPattern = null;
    if (buildingType !== 0) {
        const img = texImages[buildingType - 1];
        if (img && img.complete) texPattern = ctx.createPattern(img, 'repeat');
    }

    // Buildings
    buildings.forEach((b, i) => {
        const p1 = getScreenPos(b.start, 0);
        const p2 = getScreenPos(b.end, 0);
        const p3 = getScreenPos(b.end, b.height);
        const p4 = getScreenPos(b.start, b.height);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.save();
        if (buildingType === 0) ctx.fillStyle = b.color || '#555';
        else ctx.fillStyle = texPattern || '#333';
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        let angle = 0;
        if (b.start < width) angle = 0;
        else if (b.start < width + height) angle = -Math.PI / 2;
        else if (b.start < width * 2 + height) angle = Math.PI;
        else angle = Math.PI / 2;

        ctx.translate(p1.x, p1.y);
        ctx.rotate(angle);

        const bw = b.end - b.start;
        const bh = b.height;

        ctx.fillStyle = (buildingType === 0) ? b.color : '#333';
        ctx.filter = 'brightness(0.8)';

        if (b.arch === 1) { // Step
            ctx.fillRect(5, -bh - 10, Math.max(0, bw - 10), 10);
            ctx.fillRect(10, -bh - 20, Math.max(0, bw - 20), 10);
        } else if (b.arch === 2) { // Spire
            ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(bw, -bh); ctx.lineTo(bw / 2, -bh - 40); ctx.fill();
        } else if (b.arch === 3) { // Slope
            ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(bw, -bh); ctx.lineTo(bw, -bh - 20); ctx.fill();
        } else if (b.arch === 4) { // Dome
            ctx.beginPath(); ctx.arc(bw / 2, -bh, Math.max(0, bw / 2 - 2), Math.PI, 0); ctx.fill();
        }
        ctx.filter = 'none';

        const wins = windowsCache[i];
        if (wins && wins.length > 0 && buildingType !== 2 && buildingType !== 3) {
            for (let win of wins) {
                if (win.type === 'rect') {
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

    // Player
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

// --- Character Render Logic (FIXED) ---
function drawCharacter(type, dist) {
    ctx.strokeStyle = playerColor;
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Animation Parameters
    // Normalize speed for stable animation connection
    // Speed roughly 5 to 15.
    const animRate = 0.2 + (speed * 0.02);
    const cycleLen = 20; // Distance unit per Step

    // Global Time for Animation
    // dist is pixel distance. 
    // t goes 0 -> 2PI per cycle
    const t = (dist / cycleLen);

    // Character Body Dimensions
    // Center Hip at (0, -25). Ground is y=0.
    // Dynamic Lean (Faster = Lean Forward more)
    const lean = Math.min(20, speed * 1.5);
    const hipX = 0;
    const hipY = -25 + Math.sin(t * 2) * 2; // Bounce

    const shoulderX = hipX + lean / 2;
    const shoulderY = hipY - 20;
    const headX = shoulderX + lean / 4;
    const headY = shoulderY - 8;

    // Helper: Inverse Kinematics for Leg
    function solveLeg(hx, hy, fx, fy, bendDir = 1) {
        const L1 = 12;
        const L2 = 12;
        const dx = fx - hx;
        const dy = fy - hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampDist = Math.min(dist, L1 + L2 - 0.1);

        const alpha = Math.acos((L1 * L1 + clampDist * clampDist - L2 * L2) / (2 * L1 * clampDist));
        const baseAngle = Math.atan2(dy, dx);

        const kneeAngle = baseAngle + alpha * bendDir;

        const kx = hx + Math.cos(kneeAngle) * L1;
        const ky = hy + Math.sin(kneeAngle) * L1;

        return { kx, ky };
    }

    // Generate Foot Position based on Cycle Phase
    function getFootPos(offset) {
        // Cycle: Standard run cycle (Right hand rule like)
        const cycle = (t + offset) % (2 * Math.PI);
        const stride = 12 + speed;
        const liftHeight = 10 + speed * 0.5;

        // Correct Logic:
        // Swing (Air): Foot moves Back -> Front (positive cos)
        // Stance (Ground): Foot moves Front -> Back (negative cos)
        // We use Math.sin(cycle) for horizontal pos.
        // Derivative of sin is cos.
        // When cos > 0 (cycle -PI/2 to PI/2), sin goes -1 -> 1. This is Swing.

        let fx = Math.sin(cycle) * stride;
        let fy = 0;

        if (Math.cos(cycle) > 0) { // Swing Phase (Moving forward)
            // Lift foot
            fy = -5 - Math.cos(cycle) * 5; // Simple arc
        } else { // Stance Phase (Moving backward)
            fy = 0; // On ground
        }

        return { x: 5 + fx, y: fy }; // +5 offset relative to body center
    }

    const legL_foot = getFootPos(0);
    const legR_foot = getFootPos(Math.PI);

    const legL_knee = solveLeg(hipX, hipY, legL_foot.x, legL_foot.y, 1);
    const legR_knee = solveLeg(hipX, hipY, legR_foot.x, legR_foot.y, 1);

    // Arms 
    function getArmPos(offset) {
        const cycle = (t + offset + Math.PI) % (2 * Math.PI);
        const swing = 10 + speed;
        // Shoulder
        const sx = shoulderX;
        const sy = shoulderY;

        const hx = sx + Math.sin(cycle) * swing;
        const hy = sy + 10 + Math.cos(cycle) * 5;

        // Elbow
        const ex = (sx + hx) / 2 - 5;
        const ey = (sy + hy) / 2 + 5;

        return { sx, sy, hx, hy, ex, ey };
    }

    const armL = getArmPos(0);
    const armR = getArmPos(Math.PI);


    // --- Drawing ---

    const limb = (x1, y1, x2, y2) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };

    // 1. Back Limbs
    limb(hipX, hipY, legR_knee.kx, legR_knee.ky);
    limb(legR_knee.kx, legR_knee.ky, legR_foot.x, legR_foot.y);
    limb(armR.sx, armR.sy, armR.ex, armR.ey);
    limb(armR.ex, armR.ey, armR.hx, armR.hy);

    // 2. Body based on Type
    if (type === 0) { // Stickman
        limb(hipX, hipY, shoulderX, shoulderY); // Spine
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.stroke();
    }
    else if (type === 1) { // Ninja
        ctx.lineWidth = 4;
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY - 5);
        ctx.quadraticCurveTo(shoulderX - 15, shoulderY - 10 + Math.sin(t * 5) * 5, shoulderX - 30, shoulderY + Math.cos(t * 5) * 5);
        ctx.stroke();
    }
    else if (type === 2) { // Robot
        ctx.save();
        ctx.translate(shoulderX, (hipY + shoulderY) / 2);
        ctx.rotate(lean * 0.05);
        ctx.strokeRect(-6, -12, 12, 24); // Torso
        ctx.restore();
        ctx.fillStyle = playerColor;
        ctx.fillRect(headX - 4, headY - 4, 8, 8);
    }
    else if (type === 3) { // Punk
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(headX - 3, headY - 5); ctx.lineTo(headX - 5, headY - 12); ctx.lineTo(headX + 3, headY - 5); ctx.fill();
    }
    else if (type === 4) { // Alien
        const alienNeck = headY + 5;
        limb(hipX, hipY, shoulderX, alienNeck);
        ctx.beginPath(); ctx.ellipse(headX + 2, headY, 5, 8, 0.2, 0, Math.PI * 2); ctx.stroke();
        const dragX = armL.hx - speed * 2;
        limb(shoulderX, alienNeck, dragX, armL.hy + 10);
    }

    // 3. Front Limbs
    limb(hipX, hipY, legL_knee.kx, legL_knee.ky);
    limb(legL_knee.kx, legL_knee.ky, legL_foot.x, legL_foot.y);
    if (type !== 4) {
        limb(armL.sx, armL.sy, armL.ex, armL.ey);
        limb(armL.ex, armL.ey, armL.hx, armL.hy);
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateMapSplit();
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(loop);

function loop() {
    update();
    draw();
}

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
