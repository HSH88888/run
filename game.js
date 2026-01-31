const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Settings
let charType = 0;
let speed = 6;
let width, height;
// Backgrounds
const bgImages = [];
let currentBgIndex = 0;
// Character Style
let playerColor = '#000000';
let playerGlow = false;

// Preload Images
for (let i = 1; i <= 5; i++) {
    const img = new Image();
    img.src = `assets/bg${i}.png`;
    bgImages.push(img);
}

// Player
const player = {
    distance: 0,
    yOffset: 0,
    verticalSpeed: 0,
    isJumping: false
};

// Map
const buildings = [];
const windowsCache = [];

// Init
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateMapSplit();
}
window.addEventListener('resize', resize);
resize();


// --- Interaction w/ HTML Menu ---
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

    // Smart Color Adaptation
    if (idx === 1 || idx === 3) { // Cyberpunk or Forest -> Dark BG
        playerColor = '#ffffff';
        playerGlow = true; // Neon effect
    } else {
        playerColor = '#000000';
        playerGlow = false;
    }
};

const speedSlider = document.getElementById('speed-slider');
if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
        speed = parseInt(e.target.value);
        let label = "Normal";
        if (speed < 4) label = "Slow";
        else if (speed > 10) label = "Fast";
        else if (speed > 13) label = "Turbo";
        document.getElementById('speed-val').innerText = label;
    });
}

// UI Toggle
const uiLayer = document.getElementById('ui-layer');
const startBtn = document.getElementById('start-btn');
let isUiVisible = true;

function hideUi(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to window
    }
    isUiVisible = false;
    uiLayer.style.display = 'none';
}

// Support both click and touch for button
startBtn.addEventListener('click', hideUi);
startBtn.addEventListener('touchstart', hideUi, { passive: false });

// Show UI on click (if hidden) - Global Listener
function showUi(e) {
    if (!isUiVisible) {
        // Prevent accidental re-trigger right after hiding? 
        // No, user likely lifts finger then taps again.
        isUiVisible = true;
        uiLayer.style.display = 'flex';
        // e.preventDefault(); // Might interfere with scrolling if we had any. OK here.
    }
}

window.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#main-menu') && !isUiVisible) showUi(e);
});
window.addEventListener('touchstart', (e) => {
    if (!e.target.closest('#main-menu') && !isUiVisible) showUi(e);
}, { passive: false });


// --- Map Gen ---
function generateMapSplit() {
    const w = width;
    const h = height;
    const total = (w + h) * 2;
    const corners = [w, w + h, w + h + w, total];

    buildings.length = 0;
    windowsCache.length = 0;

    let current = 0;
    while (current < total) {
        let next = current + 40 + Math.random() * 80;
        let bHeight = 40 + Math.random() * 80;

        for (let c of corners) {
            if (current < c && next > c) {
                next = c;
                break;
            }
        }

        // Windows
        const winList = [];
        const cols = Math.floor((next - current) / 15);
        const rows = Math.floor(bHeight / 20);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.3) {
                    winList.push({
                        r: r, c: c,
                        on: Math.random() > 0.5,
                        color: Math.random() > 0.8 ? '#f1c40f' : '#e67e22'
                    });
                }
            }
        }
        windowsCache.push(winList);

        buildings.push({ start: current, end: next, height: bHeight });
        current = next;
    }
}


function update() {
    player.distance += speed;

    const totalLen = (width + height) * 2;
    const modDist = player.distance % totalLen;
    const futureDist = (player.distance + 40) % totalLen;

    let groundHeight = 0;
    let nextGroundHeight = 0;

    for (let b of buildings) {
        if (modDist >= b.start && modDist < b.end) {
            groundHeight = b.height;
        }
        if (futureDist >= b.start && futureDist < b.end) {
            nextGroundHeight = b.height;
        }
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
    // 1. Draw Background Image
    if (bgImages[currentBgIndex] && bgImages[currentBgIndex].complete) {
        // Draw image covering the whole canvas (cover mode)
        const img = bgImages[currentBgIndex];
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
        // Fallback
        ctx.fillStyle = '#ff9a9e';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Buildings (Frame)
    ctx.fillStyle = '#000000';
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
        ctx.fill();

        // Windows
        const wins = windowsCache[i];
        if (wins) {
            let angle = 0;
            if (b.start < width) angle = 0;
            else if (b.start < width + height) angle = -Math.PI / 2;
            else if (b.start < width * 2 + height) angle = Math.PI;
            else angle = Math.PI / 2;

            ctx.save();
            ctx.translate(p1.x, p1.y);
            ctx.rotate(angle);

            for (let win of wins) {
                if (win.on) {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(win.c * 15 + 5, - (win.r * 20 + 20), 8, 12);
                }
            }
            ctx.restore();
        }
    });

    // Draw Player
    const pPos = getScreenPos(player.distance, player.yOffset);

    ctx.save();
    ctx.translate(pPos.x, pPos.y);
    ctx.rotate(pPos.angle);

    // Glow Effect
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

// Helper: Draw Segment for Limbs
function drawLimb(x1, y1, x2, y2) {
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

    // Articulated Run Cycle
    // Cycle T goes 0 -> 2PI
    const T = dist * 0.3;

    // Helper to calculate Leg joint positions
    // Hip is at (0, -20) (relative to feet ground contact if standing)
    // But we are running, so Hip oscillates vertically slightly
    const hipY = -25 + Math.sin(T * 2) * 2;
    const hipX = 5; // Leaning forward

    // Leg Animation Function (Phase offset)
    function getLegPos(phase) {
        const t = T + phase;
        // Simple elliptical orbit for foot relative to hip
        // Stride width approx 20, Step height approx 10
        // Let's create foot positions relative to Hip centered at 0,0 locally
        // Run cycle: Contact(Front) -> Slide Back -> Kick Up -> Swing Forward

        const cycleX = Math.cos(t); // Front <-> Back
        const cycleY = Math.sin(t); // Up <-> Down

        // Customize cycle for smooth running
        let fx, fy;
        if (Math.sin(t) > 0) { // Forward Swing (Top part of circle)
            fx = Math.cos(t) * 15;
            fy = -10 - Math.sin(t) * 10; // High Knees
        } else { // Ground Contact (Bottom part)
            fx = Math.cos(t) * 15;
            fy = 0; // On ground (approx)
        }

        // IK to find Knee
        // Hip (0, hipY), Foot (fx, fy)
        // Thigh L1=12, Shin L2=12

        // Simplify: Just draw bent lines based on phase
        // Knee always bends forward
        const kneeX = (hipX + fx) / 2 + 5;
        const kneeY = (hipY + fy) / 2 - 5;

        return { fx, fy, kx: kneeX, ky: kneeY };
    }

    const rightLeg = getLegPos(0);
    const leftLeg = getLegPos(Math.PI);

    // Arm Animation (Opposite to legs)
    function getArmPos(phase) {
        // Shoulder at (0, -40);
        const t = T + phase;
        const handX = Math.sin(t) * 12;
        const handY = -35 + Math.cos(t) * 5;
        const elbowX = handX / 2 - 3;
        const elbowY = -33;
        return { hx: handX, hy: handY, ex: elbowX, ey: elbowY };
    }

    const rightArm = getArmPos(Math.PI);
    const leftArm = getArmPos(0);


    // Draw Logic based on Type

    // Common Body Parts
    if (type === 0) { // Stickman
        // Legs
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);

        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);

        // Body
        drawLimb(hipX, hipY, 0, -45); // Spine

        // Head
        ctx.beginPath();
        ctx.arc(2, -50, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Arms
        drawLimb(0, -40, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);

        drawLimb(0, -40, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    }
    else if (type === 1) { // Ninja
        // Legs
        ctx.lineWidth = 4;
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        ctx.lineWidth = 3;

        // Body
        drawLimb(hipX, hipY, 0, -42);

        // Head
        ctx.beginPath();
        ctx.arc(2, -47, 6, 0, Math.PI * 2);
        ctx.fill();

        // Scarf (Flowing back)
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.quadraticCurveTo(-15, -45 + Math.sin(T * 3) * 3, -25, -40 + Math.cos(T * 3) * 3);
        ctx.stroke();

        // Arms
        drawLimb(0, -40, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(0, -40, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    }
    else if (type === 2) { // Robot
        ctx.lineJoin = 'bevel';
        // Legs (Pistons)
        drawLimb(hipX, hipY, leftLeg.fx, leftLeg.fy); // Straight piston leg?
        drawLimb(hipX, hipY, rightLeg.fx, rightLeg.fy);

        // Body (Box)
        ctx.strokeRect(-4, -45, 12, 20);

        // Head (Square)
        ctx.fillStyle = playerColor;
        ctx.fillRect(-2, -55, 8, 8);
        // Antenna
        ctx.beginPath(); ctx.moveTo(2, -55); ctx.lineTo(2, -60); ctx.stroke();

        // Arms (Mechanical Clamps)
        drawLimb(2, -40, leftArm.hx, leftArm.hy);
        drawLimb(2, -40, rightArm.hx, rightArm.hy);
    }
    else if (type === 3) { // Punk
        // Active Running Style
        // Legs
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);

        // Body
        drawLimb(hipX, hipY, 0, -45);

        // Head
        ctx.beginPath();
        ctx.arc(2, -50, 7, 0, Math.PI * 2);
        ctx.stroke();
        // Mohawk
        ctx.beginPath();
        ctx.moveTo(0, -56); ctx.lineTo(4, -65); ctx.lineTo(8, -54);
        ctx.fill();

        // Arms
        drawLimb(0, -40, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(0, -40, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    }
    else if (type === 4) { // Alien
        // Weird long limbs
        const kneeL = { x: leftLeg.kx - 5, y: leftLeg.ky }; // Knees bend backward?
        const kneeR = { x: rightLeg.kx - 5, y: rightLeg.ky };

        drawLimb(hipX, hipY, kneeL.x, kneeL.y);
        drawLimb(kneeL.x, kneeL.y, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, kneeR.x, kneeR.y);
        drawLimb(kneeR.x, kneeR.y, rightLeg.fx, rightLeg.fy);

        // Body
        ctx.beginPath(); ctx.ellipse(2, -35, 4, 10, 0, 0, Math.PI * 2); ctx.stroke();

        // Head
        ctx.beginPath(); ctx.ellipse(2, -52, 6, 8, 0, 0, Math.PI * 2); ctx.stroke();

        // Long Arms dragging
        drawLimb(2, -40, leftArm.hx, leftArm.hy + 10);
        drawLimb(2, -40, rightArm.hx, rightArm.hy + 10);
    }
}

function loop() {
    update();
    draw();
}

// Start
requestAnimationFrame(loop);
