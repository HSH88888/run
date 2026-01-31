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

// Feature Flags
let isRandomMode = false;
let lastLap = 0;

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

const cityColors = ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#F1C40F', '#8E44AD', '#D35400', '#16A085'];
const winColors = ['#F1C40F', '#F39C12', '#FFFFFF', '#D5DBDB'];

// --- Init ---
let worldScale = 1.0;
let charScale = 1.0; // New variable for separate character scaling
let trackPad = 0;
let trackTotalLen = 0;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    if (width < 600) {
        // Mobile
        worldScale = 0.4;
        // Character Size: Reduce to 1/3 of previous mobile size
        // Previous was worldScale * 0.5 = 0.2
        // Target is 0.2 / 3 = 0.0666...
        charScale = (0.4 * 0.5) / 3.0;
    } else {
        // PC / Tablet
        worldScale = 1.0;
        charScale = 1.0 * 0.5; // Maintain PC size (0.5x)
    }

    trackPad = 40 * worldScale;

    const iW = width - trackPad * 2;
    const iH = height - trackPad * 2;
    trackTotalLen = (iW + iH) * 2;

    generateMapSplit();
}
window.addEventListener('resize', resize);


// --- Map Gen ---
function generateMapSplit() {
    if (!width || !height) return;
    if (trackTotalLen <= 0) return;

    const iW = width - trackPad * 2;
    const iH = height - trackPad * 2;

    const c1 = iW;
    const c2 = iW + iH;
    const c3 = iW + iH + iW;
    const c4 = trackTotalLen;
    const corners = [c1, c2, c3, c4];

    buildings.length = 0;
    windowsCache.length = 0;

    let current = 0;
    let safetyCounter = 0;

    while (current < trackTotalLen && safetyCounter < 10000) {
        safetyCounter++;

        const minW = Math.max(10, 15 * worldScale);
        const maxW = Math.max(20, 35 * worldScale);
        const minH = trackPad;
        const maxH = trackPad + (50 * worldScale);

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

        const winSizeW = Math.max(3, 8 * worldScale);
        const winSizeH = Math.max(4, 10 * worldScale);

        try {
            if (bHeight > winSizeH * 1.5) {
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
                    if (bw > winSizeW) winList.push({ type: 'vert', c: 0, color: winColors[2] });
                } else if (winPattern === 2) { // Horz
                    const rows = Math.floor(bHeight / (winSizeH * 1.2));
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

// --- Random Shuffle Logic ---
function randomizeAll() {
    const newChar = Math.floor(Math.random() * 5);
    window.selectChar(newChar);

    const newBg = Math.floor(Math.random() * 5);
    window.selectBg(newBg);

    const newBuild = Math.floor(Math.random() * 6);
    window.selectBuilding(newBuild);
}


// --- Game Loop ---
function update() {
    player.distance += speed;

    if (trackTotalLen === 0) return;

    const currentLap = Math.floor(player.distance / trackTotalLen);
    if (currentLap > lastLap) {
        if (isRandomMode && currentLap % 5 === 0) {
            randomizeAll();
        }
        lastLap = currentLap;
    }

    const modDist = player.distance % trackTotalLen;
    const lookAhead = 40 * worldScale;
    const futureDist = (player.distance + lookAhead) % trackTotalLen;

    let groundHeight = 0;
    let nextGroundHeight = 0;

    for (let b of buildings) {
        if (modDist >= b.start && modDist < b.end) {
            groundHeight = Math.max(0, b.height - trackPad);
        }
        if (futureDist >= b.start && futureDist < b.end) {
            nextGroundHeight = Math.max(0, b.height - trackPad);
        }
    }

    const jumpThreshold = 5 * worldScale;
    if (!player.isJumping && nextGroundHeight > player.yOffset + jumpThreshold) {
        player.verticalSpeed = 12 * worldScale;
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

    const iW = w - trackPad * 2;
    const iH = h - trackPad * 2;
    const total = trackTotalLen;

    if (total <= 0) return { x: w / 2, y: h / 2, angle: 0 };

    let d = dist % total;
    while (d < 0) d += total;

    let x, y, angle;

    if (d < iW) {
        x = trackPad + d;
        y = h - trackPad - altitude;
        angle = 0;
    } else if (d < iW + iH) {
        d -= iW;
        x = w - trackPad - altitude;
        y = h - trackPad - d;
        angle = -Math.PI / 2;
    } else if (d < iW + iH + iW) {
        d -= (iW + iH);
        x = w - trackPad - d;
        y = trackPad + altitude;
        angle = Math.PI;
    } else {
        d -= (iW + iH + iW);
        x = trackPad + altitude;
        y = trackPad + d;
        angle = Math.PI / 2;
    }

    return { x, y, angle };
}

function draw() {
    if (!width || !height) return;

    if (bgImages[currentBgIndex] && bgImages[currentBgIndex].complete && bgImages[currentBgIndex].naturalWidth > 0) {
        const img = bgImages[currentBgIndex];
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, Math.floor(x), Math.floor(y), Math.ceil(img.width * scale), Math.ceil(img.height * scale));
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
    }

    let texPattern = null;
    if (buildingType !== 0) {
        const img = texImages[buildingType - 1];
        if (img && img.complete) texPattern = ctx.createPattern(img, 'repeat');
    }

    buildings.forEach((b, i) => {
        const p1 = getScreenPos(b.start, 0);
        const p2 = getScreenPos(b.end, 0);

        const topAlt = b.height - trackPad;
        const baseAlt = -trackPad;

        const p3 = getScreenPos(b.end, baseAlt);
        const p4 = getScreenPos(b.start, baseAlt);
        const pTop1 = getScreenPos(b.start, topAlt);
        const pTop2 = getScreenPos(b.end, topAlt);

        ctx.beginPath();
        ctx.moveTo(pTop1.x, pTop1.y);
        ctx.lineTo(pTop2.x, pTop2.y);
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

        const angle = pTop1.angle;
        ctx.translate(pTop1.x, pTop1.y);
        ctx.rotate(angle);

        const bw = b.end - b.start;
        const bh = b.height;

        ctx.fillStyle = (buildingType === 0) ? b.color : '#333';
        ctx.filter = 'brightness(0.8)';

        const detH = 10 * worldScale;

        if (b.arch === 1) { // Step
            ctx.fillRect(bw * 0.2, -detH, bw * 0.6, detH);
        } else if (b.arch === 2) { // Spire
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bw, 0); ctx.lineTo(bw / 2, -detH * 3); ctx.fill();
        } else if (b.arch === 3) { // Slope
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bw, 0); ctx.lineTo(bw, -detH * 2); ctx.fill();
        } else if (b.arch === 4) { // Dome
            ctx.beginPath(); ctx.arc(bw / 2, 0, Math.max(0, bw / 2 - 2), Math.PI, 0); ctx.fill();
        }
        ctx.filter = 'none';

        const wins = windowsCache[i];
        if (wins && wins.length > 0 && buildingType !== 2 && buildingType !== 3) {
            const wW = Math.max(2, 4 * worldScale);
            const wH = Math.max(3, 6 * worldScale);
            const gridW = Math.max(4, 8 * worldScale);
            const gridH = Math.max(5, 10 * worldScale);

            for (let win of wins) {
                const wx = win.c * gridW + (2 * worldScale);
                const wy = -(win.r * gridH + gridH + 10 * worldScale);

                if (win.type === 'rect') {
                    const c = (buildingType === 4 && win.on) ? '#0f0' : win.color;
                    ctx.fillStyle = c;
                    ctx.fillRect(wx, wy, wW, wH);
                } else if (win.type === 'vert') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(bw / 2 - 2 * worldScale, -bh + 10 * worldScale, 4 * worldScale, bh - 20 * worldScale);
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

    // Use charScale instead of fixed multiplier
    ctx.scale(charScale, charScale);

    if (playerGlow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
    } else {
        ctx.shadowBlur = 0;
    }

    drawCharacter(charType, player.distance);
    ctx.restore();
}

function drawCharacter(type, dist) {
    ctx.strokeStyle = playerColor;
    ctx.fillStyle = playerColor;
    // Boost lineWidth slightly for visibility when very small
    // Base 3, but if charScale is tiny (<0.1), maybe boost relative? 
    // Let's keep it safe. If char is 1/3 size, lines should be thinner to match.
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cycleLen = 22;
    const t = (dist / cycleLen) * Math.PI * 2;

    const lean = Math.min(20, speed * 1.5);
    const hipX = 0;
    const hipY = -22 + Math.cos(t) * 2;

    const shoulderX = hipX + lean / 2;
    const shoulderY = hipY - 18;
    const headX = shoulderX + lean / 3;
    const headY = shoulderY - 8;

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

    function getFootPos(offset) {
        let phase = (t + offset) % (2 * Math.PI);
        if (phase < 0) phase += 2 * Math.PI;

        const stride = 14 + speed;
        let fx, fy;

        if (phase < Math.PI) {
            fx = Math.cos(phase) * stride;
            fy = 0;
        } else {
            fx = Math.cos(phase) * stride;
            const swingProg = (phase - Math.PI) / Math.PI;
            const lift = 12 + speed;
            fy = -Math.sin(swingProg * Math.PI) * lift;
        }
        return { x: 5 + fx, y: fy };
    }

    const legL_foot = getFootPos(0);
    const legR_foot = getFootPos(Math.PI);
    const legL_knee = solveLeg(hipX, hipY, legL_foot.x, legL_foot.y, 1);
    const legR_knee = solveLeg(hipX, hipY, legR_foot.x, legR_foot.y, 1);

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

    const limb = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

    limb(hipX, hipY, legR_knee.kx, legR_knee.ky);
    limb(legR_knee.kx, legR_knee.ky, legR_foot.x, legR_foot.y);
    limb(armR.sx, armR.sy, armR.ex, armR.ey);
    limb(armR.ex, armR.ey, armR.hx, armR.hy);

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
    }
    else {
        limb(hipX, hipY, shoulderX, shoulderY);
        ctx.beginPath(); ctx.arc(headX, headY, 6, 0, Math.PI * 2); ctx.stroke();
        if (type === 3) { ctx.beginPath(); ctx.moveTo(headX, headY - 6); ctx.lineTo(headX - 5, headY - 12); ctx.fill(); }
        else if (type === 2) { ctx.fillStyle = playerColor; ctx.fillRect(headX - 4, headY - 4, 8, 8); }
        else if (type === 4) { ctx.beginPath(); ctx.ellipse(headX, headY, 4, 6, 0.2, 0, Math.PI * 2); ctx.stroke(); }
    }

    limb(hipX, hipY, legL_knee.kx, legL_knee.ky);
    limb(legL_knee.kx, legL_knee.ky, legL_foot.x, legL_foot.y);
    if (type !== 1) {
        limb(armL.sx, armL.sy, armL.ex, armL.ey);
        limb(armL.ex, armL.ey, armL.hx, armL.hy);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

resize();
requestAnimationFrame(loop);

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
    slider.min = "1";
    slider.addEventListener('input', (e) => {
        speed = parseInt(e.target.value);
        let label = "Normal";
        if (speed < 2) label = "Very Slow";
        else if (speed < 4) label = "Slow";
        else if (speed > 10) label = "Fast";
        else if (speed > 13) label = "Turbo";
        document.getElementById('speed-val').innerText = label;
    });
}

const randChk = document.getElementById('random-mode-chk');
if (randChk) {
    randChk.addEventListener('change', (e) => {
        isRandomMode = e.target.checked;
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
