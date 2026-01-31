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

// --- Init ---
let worldScale = 1.0;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    // Scale Logic: Mobile gets much smaller buildings/character (Higher density)
    if (width < 600) {
        worldScale = 0.4; // Requested ~1/2.5 of previous small size (effectively tiny)
        // User asked for 1/10 of "current" (which was already small). 
        // Let's use 0.4 to ensure visibility while meeting "small" requirement.
    } else {
        worldScale = 1.0;
    }

    generateMapSplit();
}
window.addEventListener('resize', resize);


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
        // Apply worldScale to building sizes
        const minW = 15 * worldScale;
        const maxW = 35 * worldScale;
        const minH = 20 * worldScale;
        const maxH = 50 * worldScale;

        let next = current + minW + Math.random() * (maxW - minW);
        let bHeight = minH + Math.random() * (maxH - minH);

        for (let c of corners) {
            if (current < c && next > c) {
                next = c;
                break;
            }
        }

        let archType = 0;
        if (Math.random() > 0.4) archType = Math.floor(Math.random() * 5);
        const mainColor = cityColors[Math.floor(Math.random() * cityColors.length)];
        const winPattern = Math.floor(Math.random() * 4);
        const winList = [];
        const bw = next - current;

        // Windows Logic (Scaled)
        // Adjust grid size based on scale to keep window count reasonable
        const winSizeW = 8 * worldScale;
        const winSizeH = 10 * worldScale;

        try {
            if (bHeight > 15 * worldScale) {
                if (winPattern === 0) { // Grid
                    const cols = Math.floor(bw / winSizeW);
                    const rows = Math.floor(bHeight / winSizeH);
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            if (Math.random() > 0.5) {
                                winList.push({ type: 'rect', r, c, color: winColors[Math.floor(Math.random() * winColors.length)] });
                            }
                        }
                    }
                } else if (winPattern === 1) { // Vert
                    if (bw > 10 * worldScale) winList.push({ type: 'vert', c: 0, color: winColors[2] });
                } else if (winPattern === 2) { // Horz
                    const rows = Math.floor(bHeight / (12 * worldScale));
                    for (let r = 0; r < rows; r++) {
                        if (r % 2 === 0) {
                            winList.push({ type: 'horz', r: r, color: winColors[3] });
                        }
                    }
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

    if (!player.isJumping && nextGroundHeight > player.yOffset + 10 * worldScale) {
        player.verticalSpeed = 15 * worldScale;
        player.isJumping = true;
    }

    player.yOffset += player.verticalSpeed;
    player.verticalSpeed -= 0.8 * worldScale;

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

// --- Draw ---
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
        else {
            ctx.fillStyle = texPattern || '#333';
            // Scale texture pattern if needed? No, seamless is fine.
        }
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

        // Details (Architecture)
        ctx.fillStyle = (buildingType === 0) ? b.color : '#333';
        ctx.filter = 'brightness(0.8)';

        // Define detail sizes based on worldScale
        const detH = 10 * worldScale;

        if (b.arch === 1) { // Step
            ctx.fillRect(bw * 0.2, -bh - detH / 2, bw * 0.6, detH / 2);
        } else if (b.arch === 2) { // Spire
            ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(bw, -bh); ctx.lineTo(bw / 2, -bh - detH * 2); ctx.fill();
        } else if (b.arch === 3) { // Slope
            ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(bw, -bh); ctx.lineTo(bw, -bh - detH); ctx.fill();
        } else if (b.arch === 4) { // Dome
            ctx.beginPath(); ctx.arc(bw / 2, -bh, Math.max(0, bw / 2 - 1), Math.PI, 0); ctx.fill();
        }
        ctx.filter = 'none';

        // Windows (Scaled offsets)
        const wins = windowsCache[i];
        if (wins && wins.length > 0 && buildingType !== 2 && buildingType !== 3) {
            // Scaled Dimensions
            const wW = 4 * worldScale; // Window Width
            const wH = 6 * worldScale; // Window Height
            const gridW = 8 * worldScale;
            const gridH = 10 * worldScale;

            for (let win of wins) {
                if (win.type === 'rect') {
                    const c = (buildingType === 4 && win.on) ? '#0f0' : win.color;
                    ctx.fillStyle = c;
                    ctx.fillRect(
                        win.c * gridW + (2 * worldScale),
                        -(win.r * gridH + gridH),
                        wW, wH
                    );
                } else if (win.type === 'vert') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(bw / 2 - (2 * worldScale), -bh + (5 * worldScale), 4 * worldScale, Math.max(0, bh - (10 * worldScale)));
                } else if (win.type === 'horz') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(2 * worldScale, -(win.r * (12 * worldScale) + (10 * worldScale)), Math.max(0, bw - (4 * worldScale)), 3 * worldScale);
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

    // Apply World Scale to Character
    ctx.scale(worldScale, worldScale);

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

// --- Character Render Logic (Running Cycle Fixed) ---
function drawCharacter(type, dist) {
    ctx.strokeStyle = playerColor;
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 3; // Will be scaled by ctx.scale transform
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Animation Parameters
    // Cycle length tuned for standard stride
    const cycleLen = 22;
    const t = (dist / cycleLen) * Math.PI * 2;

    const lean = Math.min(25, speed * 2);
    const hipX = 0;
    const hipY = -22 + Math.cos(t) * 2;

    const shoulderX = hipX + lean / 2;
    const shoulderY = hipY - 18;
    const headX = shoulderX + lean / 3;
    const headY = shoulderY - 8;

    // IK Helper
    function solveLeg(hx, hy, fx, fy, bendDir = 1) {
        const L1 = 11;
        const L2 = 11;
        const dx = fx - hx;
        const dy = fy - hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampDist = Math.min(dist, L1 + L2 - 0.01);
        const alpha = Math.acos((L1 * L1 + clampDist * clampDist - L2 * L2) / (2 * L1 * clampDist));
        const baseAngle = Math.atan2(dy, dx);
        const kneeAngle = baseAngle + alpha * bendDir;
        return { kx: hx + Math.cos(kneeAngle) * L1, ky: hy + Math.sin(kneeAngle) * L1 };
    }

    // Foot Cycle: Stance vs Swing
    function getFootPos(offset) {
        let phase = (t + offset) % (2 * Math.PI);
        if (phase < 0) phase += 2 * Math.PI;
        const stride = 14 + speed;

        let fx, fy;

        if (phase < Math.PI) {
            // Stance (Ground): Move Backwards
            // Cos: 1 -> -1
            fx = Math.cos(phase) * stride;
            fy = 0;
        } else {
            // Swing (Air): Move Forwards
            // Cos: -1 -> 1
            fx = Math.cos(phase) * stride;

            // "ㄱ" shape: Lift High during Swing
            // Peak at phase = 1.5 PI (mid swing)
            const swingProg = (phase - Math.PI) / Math.PI; // 0..1
            // Use Sine for lift
            const lift = 12 + speed;
            fy = -Math.sin(swingProg * Math.PI) * lift;
        }

        return { x: 5 + fx, y: fy };
    }

    const legL_foot = getFootPos(0);
    const legR_foot = getFootPos(Math.PI);

    const legL_knee = solveLeg(hipX, hipY, legL_foot.x, legL_foot.y, 1);
    const legR_knee = solveLeg(hipX, hipY, legR_foot.x, legR_foot.y, 1);

    // Arms 
    function getArmPos(offset) {
        const phase = (t + offset + Math.PI) % (2 * Math.PI);
        const swing = 12;
        const sx = shoulderX;
        const sy = shoulderY;
        const hx = sx + Math.cos(phase) * swing;
        const hy = sy + 10 + Math.sin(phase) * 5;
        const ex = (sx + hx) / 2 - 4;
        const ey = (sy + hy) / 2 + 4;
        return { sx, sy, hx, hy, ex, ey };
    }
    const armL = getArmPos(0);
    const armR = getArmPos(Math.PI);

    // Drawing
    const limb = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

    // Back Limbs
    limb(hipX, hipY, legR_knee.kx, legR_knee.ky);
    limb(legR_knee.kx, legR_knee.ky, legR_foot.x, legR_foot.y);
    limb(armR.sx, armR.sy, armR.ex, armR.ey);
    limb(armR.ex, armR.ey, armR.hx, armR.hy);

    // Body
    if (type === 0) { // Stickman
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.stroke();
    }
    else if (type === 1) { // Ninja
        ctx.lineWidth = 4;
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY);
        const flow = speed * 2;
        ctx.quadraticCurveTo(shoulderX - 10 - flow, shoulderY + Math.sin(t * 3) * 5, shoulderX - 20 - flow, shoulderY + 10);
        ctx.stroke();
        limb(leftArm.sx, leftArm.sy, leftArm.ex, leftArm.ey);
        limb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
    }
    else {
        // Generic backup for 2,3,4
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.stroke();
        if (type === 3) { // Punk
            ctx.beginPath(); ctx.moveTo(headX, headY - 6); ctx.lineTo(headX - 5, headY - 12); ctx.fill();
        } else if (type === 2) { // Robot
            ctx.fillStyle = playerColor; ctx.fillRect(headX - 4, headY - 4, 8, 8);
        } else if (type === 4) { // Alien
            ctx.beginPath(); ctx.ellipse(headX, headY, 4, 6, 0.2, 0, Math.PI * 2); ctx.stroke();
        }
    }

    // Front Limbs
    limb(hipX, hipY, legL_knee.kx, legL_knee.ky);
    limb(legL_knee.kx, legL_knee.ky, legL_foot.x, legL_foot.y);
    if (type !== 1) {
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
