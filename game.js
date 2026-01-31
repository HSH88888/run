const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Settings
let charType = 0;
let speed = 6;
let width, height;
// Backgrounds
const bgImages = [];
let currentBgIndex = 0;
// Textures
const texImages = [];
let buildingType = 0; // 0:Silhouette, 1:Brick, 2:Candy, 3:Ice, 4:Tech, 5:Concrete

// Character Style
let playerColor = '#000000';
let playerGlow = false;

// Preload Images
for (let i = 1; i <= 5; i++) {
    const img = new Image();
    img.src = `assets/bg${i}.png`;
    bgImages.push(img);
}
// Preload Textures
for (let i = 1; i <= 5; i++) {
    const img = new Image();
    img.src = `assets/tex${i}.png`;
    texImages.push(img);
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
    if (idx === 1 || idx === 3) { // Cyberpunk or Forest
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
        e.stopPropagation();
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
// Refined Palettes based on user image (City Pop / Art Deco)
const cityColors = ['#2C3E50', '#E74C3C', '#ECF0F1', '#3498DB', '#F1C40F', '#8E44AD', '#D35400', '#16A085'];
const winColors = ['#F1C40F', '#F39C12', '#FFFFFF', '#D5DBDB']; // Lights

function generateMapSplit() {
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

        // Building Architecture Style
        // 0:Flat, 1:Step, 2:Spire, 3:Slope, 4:Dome
        let archType = 0;
        if (Math.random() > 0.3) archType = Math.floor(Math.random() * 5);

        // Color
        const mainColor = cityColors[Math.floor(Math.random() * cityColors.length)];

        // Windows Pattern
        // 0:Grid, 1:Vertical, 2:Horizontal, 3:None
        const winPattern = Math.floor(Math.random() * 4);

        // Windows Data Generation
        const winList = [];
        const bw = next - current;
        // Logic for specific patterns
        if (winPattern === 0) { // Grid
            const cols = Math.floor(bw / 15);
            const rows = Math.floor(bHeight / 20);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() > 0.4) {
                        winList.push({ type: 'rect', r, c, on: true, color: winColors[Math.floor(Math.random() * 2)] });
                    }
                }
            }
        } else if (winPattern === 1) { // Vertical Lines
            const cols = Math.floor(bw / 20);
            for (let c = 0; c < cols; c++) {
                winList.push({ type: 'vert', c, color: winColors[2] }); // Light strip
            }
        } else if (winPattern === 2) { // Horizontal Lines
            const rows = Math.floor(bHeight / 25);
            for (let r = 0; r < rows; r++) {
                winList.push({ type: 'horz', r, color: winColors[3] });
            }
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
    // 1. Draw Background
    if (bgImages[currentBgIndex] && bgImages[currentBgIndex].complete) {
        const img = bgImages[currentBgIndex];
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Buildings
    // Texture Setup
    let texPattern = null;
    if (buildingType !== 0) {
        const img = texImages[buildingType - 1];
        if (img && img.complete) {
            texPattern = ctx.createPattern(img, 'repeat');
        }
    }

    buildings.forEach((b, i) => {
        const p1 = getScreenPos(b.start, 0);
        const p2 = getScreenPos(b.end, 0);
        const p3 = getScreenPos(b.end, b.height);
        const p4 = getScreenPos(b.start, b.height);

        // Base Wall
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.save();

        if (buildingType === 0) {
            // Colorful Mode
            ctx.fillStyle = b.color;
        } else {
            // Texture Mode
            ctx.fillStyle = texPattern || '#333';
        }

        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Transform to Local Building Space (0,0 is Left-Bottom of wall segment on screen?)
        // No, let's use standard translate/rotate
        let angle = 0;
        if (b.start < width) angle = 0;
        else if (b.start < width + height) angle = -Math.PI / 2;
        else if (b.start < width * 2 + height) angle = Math.PI;
        else angle = Math.PI / 2;

        ctx.translate(p1.x, p1.y);
        ctx.rotate(angle);

        const bw = b.end - b.start;
        const bh = b.height;

        // Draw Architecture (Rooftop)
        // Y is pointing UP (-Y) in this local context? 
        // No, standard canvas: Y is down. We draw building UPwards (-Y).
        // But previously I utilized rotate -PI/2 etc.
        // Let's stick to: Draw rect at (0, -height).

        // Architecture Details
        ctx.fillStyle = (buildingType === 0) ? b.color : '#333'; // Match body
        // Slightly Darker for roof detail?
        ctx.filter = 'brightness(0.8)';

        if (b.arch === 1) { // Step
            ctx.fillRect(5, -bh - 10, bw - 10, 10);
            ctx.fillRect(10, -bh - 20, bw - 20, 10);
        } else if (b.arch === 2) { // Spire
            ctx.beginPath();
            ctx.moveTo(0, -bh);
            ctx.lineTo(bw, -bh);
            ctx.lineTo(bw / 2, -bh - 30);
            ctx.fill();
            // Pole
            ctx.beginPath(); ctx.moveTo(bw / 2, -bh - 30); ctx.lineTo(bw / 2, -bh - 50);
            ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
        } else if (b.arch === 3) { // Slope
            ctx.beginPath();
            ctx.moveTo(0, -bh);
            ctx.lineTo(bw, -bh);
            ctx.lineTo(bw, -bh - 15);
            ctx.fill();
        } else if (b.arch === 4) { // Dome
            ctx.beginPath();
            ctx.arc(bw / 2, -bh, bw / 2 - 2, Math.PI, 0);
            ctx.fill();
        }
        ctx.filter = 'none'; // Reset logic

        // Windows
        const wins = windowsCache[i];
        if (wins && buildingType !== 2 && buildingType !== 3) { // Skip for Candy/Ice
            for (let win of wins) {
                if (win.type === 'rect') {
                    if (buildingType === 4 && win.on) ctx.fillStyle = '#0f0';
                    else ctx.fillStyle = win.color;
                    ctx.fillRect(win.c * 15 + 5, - (win.r * 20 + 20), 8, 12);
                } else if (win.type === 'vert') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(win.c * 20 + 8, -bh + 10, 4, bh - 20);
                } else if (win.type === 'horz') {
                    ctx.fillStyle = win.color;
                    ctx.fillRect(5, - (win.r * 25 + 20), bw - 10, 5);
                }
            }
        }

        ctx.restore();
    });

    // Draw Player
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

    // Dynamic Animation Parameters based on Speed
    // Speed ranges roughly 2 to 15
    const animSpeed = Math.max(0.15, speed * 0.04); // Cycle frequency
    const stride = Math.min(25, 10 + speed * 1.2);   // Stride length (wider when fast)
    const lift = Math.min(15, 5 + speed * 0.8);      // Knee height
    const lean = Math.min(15, speed * 1.2);          // Forward lean amount

    // Articulated Run Cycle
    // Use player.distance directly scaling? Or accumulate independent time?
    // Using distance directly couples animation frame to movement perfectly (no sliding feet).
    const T = dist * animSpeed * (10 / stride); // Normalize T so stride matches distance

    // Helper to calculate Leg joint positions
    // Hip is at (0, -20) (relative to feet ground contact if standing)
    // Run Bounce: faster = more bounce?
    const bounce = Math.sin(T * 2) * (speed > 10 ? 3 : 2);
    const hipY = -25 + bounce;
    const hipX = 5 + lean / 2; // Leaning forward

    // Leg Animation Function (Phase offset)
    function getLegPos(phase) {
        const t = T + phase;

        const cycleX = Math.cos(t); // Front <-> Back
        const cycleY = Math.sin(t); // Up <-> Down

        let fx, fy;
        if (Math.sin(t) > 0) { // Forward Swing (Air)
            fx = Math.cos(t) * stride;
            fy = -5 - Math.sin(t) * lift; // High Knees
        } else { // Ground Contact (Pulling back)
            // Flatten the bottom of the cycle for ground contact
            // Actual ground is 0. 
            fx = Math.cos(t) * stride;
            fy = 0;
        }

        // IK to find Knee
        // Hip (hipX, hipY), Foot (hipX+fx, fy) -> Wait, foot moves relative to hip X too?
        // Yes, legs swing relative to hip.

        const footAbsX = hipX + fx; // Absolute X relative to player center
        const footAbsY = fy;

        // Simple Knee Bend Projection
        const kneeX = (hipX + footAbsX) / 2 + (type === 4 ? -5 : 5); // Alien knees backward
        const kneeY = (hipY + footAbsY) / 2 - 5;

        return { fx: footAbsX, fy: footAbsY, kx: kneeX, ky: kneeY };
    }

    const rightLeg = getLegPos(0);
    const leftLeg = getLegPos(Math.PI);

    // Arm Animation (Opposite to legs)
    function getArmPos(phase) {
        const t = T + phase;
        const armSwing = stride * 0.8;

        // Shoulder position
        const shX = hipX - 2 + lean / 3;
        const shY = hipY - 15; // Torso height

        const handX = shX + Math.sin(t) * armSwing;
        const handY = shY + 5 + Math.cos(t) * 5;

        const elbowX = (shX + handX) / 2 - 3;
        const elbowY = (shY + handY) / 2 + 2;

        return { sx: shX, sy: shY, hx: handX, hy: handY, ex: elbowX, ey: elbowY };
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

        // Body (Spine)
        // Hip to Neck
        const neckX = hipX + lean;
        const neckY = hipY - 25;
        drawLimb(hipX, hipY, neckX, neckY);

        // Head
        ctx.beginPath();
        const headX = neckX + lean * 0.2;
        ctx.arc(headX, neckY - 5, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Arms (Shoulder is on spine)
        const shX = (hipX + neckX) / 2;
        const shY = (hipY + neckY) / 2 - 5;

        // Re-calc arms based on actual shoulder calc above? 
        // Let's use the generic getArmPos shoulders for simplicity or attach to spine.
        // Attaching simple lines is enough.

        // Custom Arm Drawing to attach to spine
        function drawStickArm(arm) {
            drawLimb(arm.sx, arm.sy, arm.ex, arm.ey);
            drawLimb(arm.ex, arm.ey, arm.hx, arm.hy);
        }
        drawStickArm(leftArm);
        drawStickArm(rightArm);
    }
    else if (type === 1) { // Ninja
        // Dynamic Scarf
        const neckX = hipX + lean;
        const neckY = hipY - 22;

        // Legs
        ctx.lineWidth = 4;
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);
        ctx.lineWidth = 3;

        // Body
        drawLimb(hipX, hipY, neckX, neckY);

        // Head (Filled)
        ctx.beginPath();
        ctx.arc(neckX + lean * 0.2, neckY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Scarf (Flowing back furiously with speed)
        ctx.beginPath();
        ctx.moveTo(neckX, neckY);
        const flow = speed * 2;
        ctx.quadraticCurveTo(neckX - 10 - flow, neckY - 5 + Math.sin(T * 3) * 5, neckX - 20 - flow, neckY + Math.cos(T * 3) * 5);
        ctx.stroke();

        // Arms
        drawLimb(leftArm.sx, leftArm.sy, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    }
    else if (type === 2) { // Robot
        ctx.lineJoin = 'bevel';
        // Legs (Pistons)
        drawLimb(hipX, hipY, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.fx, rightLeg.fy);

        // Body (Box) - Tilted
        ctx.save();
        ctx.translate(hipX, hipY - 20);
        ctx.rotate(lean * 0.05); // Tilt body
        ctx.strokeRect(-6, -10, 12, 25); // Local box

        // Head
        ctx.fillStyle = playerColor;
        ctx.fillRect(-4, -18, 8, 8);
        // Antenna
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -25); ctx.stroke();
        ctx.restore();

        // Arms
        drawLimb(leftArm.sx, leftArm.sy, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.hx, rightArm.hy);
    }
    else if (type === 3) { // Punk
        // Active Running Style
        const neckX = hipX + lean;
        const neckY = hipY - 25;

        // Legs
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);

        // Body
        drawLimb(hipX, hipY, neckX, neckY);

        // Head
        const hX = neckX + lean * 0.2;
        const hY = neckY - 5;
        ctx.beginPath();
        ctx.arc(hX, hY, 7, 0, Math.PI * 2);
        ctx.stroke();
        // Mohawk - Angle it back
        ctx.beginPath();
        ctx.moveTo(hX - 2, hY - 6); ctx.lineTo(hX - speed, hY - 15); ctx.lineTo(hX + 6, hY - 4);
        ctx.fill();

        // Arms
        drawLimb(leftArm.sx, leftArm.sy, leftArm.ex, leftArm.ey);
        drawLimb(leftArm.ex, leftArm.ey, leftArm.hx, leftArm.hy);
        drawLimb(rightArm.sx, rightArm.sy, rightArm.ex, rightArm.ey);
        drawLimb(rightArm.ex, rightArm.ey, rightArm.hx, rightArm.hy);
    }
    else if (type === 4) { // Alien
        const neckX = hipX + lean * 1.5; // Leans a lot
        const neckY = hipY - 15; // Short body

        // Legs (Weird)
        drawLimb(hipX, hipY, leftLeg.kx, leftLeg.ky);
        drawLimb(leftLeg.kx, leftLeg.ky, leftLeg.fx, leftLeg.fy);
        drawLimb(hipX, hipY, rightLeg.kx, rightLeg.ky);
        drawLimb(rightLeg.kx, rightLeg.ky, rightLeg.fx, rightLeg.fy);

        // Body
        drawLimb(hipX, hipY, neckX, neckY);

        // Head
        ctx.beginPath(); ctx.ellipse(neckX, neckY - 8, 6, 8, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();

        // Long Arms dragging behind
        const armLag = speed * 2;
        drawLimb(neckX, neckY, leftArm.hx - armLag, leftArm.hy + 10);
        drawLimb(neckX, neckY, rightArm.hx - armLag, rightArm.hy + 10);
    }
}

function loop() {
    update();
    draw();
}

// Start
requestAnimationFrame(loop);
