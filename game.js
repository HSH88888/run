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

startBtn.addEventListener('click', () => {
    isUiVisible = false;
    uiLayer.style.display = 'none';
});

// Show UI on click (if hidden)
window.addEventListener('mousedown', (e) => {
    if (!isUiVisible) {
        isUiVisible = true;
        uiLayer.style.display = 'flex';
    }
});
window.addEventListener('touchstart', (e) => {
    if (!isUiVisible) {
        isUiVisible = true;
        uiLayer.style.display = 'flex';
        e.preventDefault();
    }
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

    // Glow Effect?
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

function drawCharacter(type, dist) {
    ctx.strokeStyle = playerColor;
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const cycle = Math.sin(dist * 0.2);
    const cycle2 = Math.cos(dist * 0.2);

    if (type === 0) { // Basic Stickman
        // Legs
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-10 + cycle * 10, -20);
        ctx.moveTo(0, 0); ctx.lineTo(10 - cycle * 10, -20);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(0, -45);
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(0, -50, 6, 0, Math.PI * 2);
        ctx.stroke();
        // Arms
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(-10 - cycle * 10, -30);
        ctx.moveTo(0, -40); ctx.lineTo(10 + cycle * 10, -30);
        ctx.stroke();
    }
    else if (type === 1) { // Ninja (Headband + Scarf)
        // Legs (Wide stance)
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-15 + cycle * 15, -15);
        ctx.moveTo(0, 0); ctx.lineTo(15 - cycle * 15, -15);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.moveTo(0, -15); ctx.lineTo(0, -40);
        ctx.stroke();
        // Head (Filled)
        ctx.beginPath();
        ctx.arc(0, -45, 6, 0, Math.PI * 2);
        ctx.fill();
        // Headband tails
        ctx.beginPath();
        ctx.moveTo(0, -45); ctx.lineTo(-15 - Math.abs(cycle) * 5, -45 - cycle * 5);
        ctx.stroke();
        // Scarf
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(-20 - Math.abs(cycle2) * 10, -35 + cycle2 * 5);
        ctx.stroke();
        // Arms (Weapon?)
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(-10 - cycle * 10, -25);
        ctx.moveTo(0, -35); ctx.lineTo(10 + cycle * 10, -25);
        ctx.stroke();
    }
    else if (type === 2) { // Robot (Boxy, Antenna)
        // Color override for Robot body details if strictly monochrome is boring?
        // Keep it to playerColor for consistency
        // Legs (Straight)
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-5 + cycle * 5, -15);
        ctx.moveTo(0, 0); ctx.lineTo(5 - cycle * 5, -15);
        ctx.stroke();
        // Body (Rect)
        ctx.strokeRect(-8, -40, 16, 25);
        // Head (Rect)
        ctx.strokeRect(-6, -52, 12, 10);
        // Antenna
        ctx.beginPath();
        ctx.moveTo(0, -52); ctx.lineTo(0, -60);
        ctx.stroke();
        // Arms (Mechanical)
        ctx.beginPath();
        ctx.moveTo(-8, -35); ctx.lineTo(-15 - cycle * 5, -25);
        ctx.moveTo(8, -35); ctx.lineTo(15 + cycle * 5, -25);
        ctx.stroke();
    }
    else if (type === 3) { // Punk (Mohawk)
        // Legs
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-10 + cycle * 10, -20);
        ctx.moveTo(0, 0); ctx.lineTo(10 - cycle * 10, -20);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(0, -45);
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(0, -50, 7, 0, Math.PI * 2);
        ctx.stroke();
        // Mohawk
        ctx.beginPath();
        ctx.moveTo(-4, -55); ctx.lineTo(0, -65); ctx.lineTo(4, -55);
        ctx.stroke();
        // Arms
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(-10 - cycle * 10, -35);
        ctx.moveTo(0, -40); ctx.lineTo(10 + cycle * 10, -35);
        ctx.stroke();
    }
    else if (type === 4) { // Alien (Big head, long limbs)
        // Legs (Long)
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-15 + cycle * 15, -25);
        ctx.moveTo(0, 0); ctx.lineTo(15 - cycle * 15, -25);
        ctx.stroke();
        // Body (Short)
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(0, -40);
        ctx.stroke();
        // Head (Oval)
        ctx.beginPath();
        ctx.ellipse(0, -50, 10, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Eyes (Filled with background color? tricky. Just fill playerColor inverse?)
        // Let's just draw stroke eyes
        ctx.beginPath();
        ctx.moveTo(-3, -50); ctx.lineTo(-3, -48);
        ctx.moveTo(3, -50); ctx.lineTo(3, -48);
        ctx.stroke();

        // Arms (Long)
        ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(-20 - cycle * 10, -10);
        ctx.moveTo(0, -35); ctx.lineTo(20 + cycle * 10, -10);
        ctx.stroke();
    }
}

function loop() {
    update();
    draw();
}

// Start
requestAnimationFrame(loop);
