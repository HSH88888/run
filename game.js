const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let width, height;
let isPlaying = false;
let score = 0;
let speed = 6;

// Player
const player = {
    distance: 0,
    yOffset: 0, // Height from the "ground" (building roof)
    verticalSpeed: 0,
    isJumping: false,
    radius: 10
};

// Map Data
// Buildings are defined as segments along the track.
// Each segment can have a different "height" (sticking inwards).
const buildings = []; // { startDist, endDist, height }
const totalTrackLength = 0; // Calculated
const wallPadding = 0; // Outer limit

const gravity = 0.8;
const jumpForce = 15;

// Init
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateMap();
}
window.addEventListener('resize', resize);


function generateMap() {
    // 4 Walls: Bottom, Right, Top, Left
    // Generate buildings along the perimeter

    // Perimeter length
    // Bottom: 0 ~ width
    // Right: width ~ width+height
    // Top: width+height ~ 2*width+height
    // Left: ... ~ 2*width+2*height

    const w = width;
    const h = height;

    // Clear
    buildings.length = 0;

    // Helper to add buildings for a segment
    let currentDist = 0;
    const totalLen = (w + h) * 2;

    // We want buildings to be continuous.
    // Let's generate random widths

    while (currentDist < totalLen) {
        const bWidth = 50 + Math.random() * 100;
        // Height: How much it sticks INWARDS from the edge
        // Random usage: 30px to 100px.
        // Some gaps? No, contiguous skyline.
        const bHeight = 30 + Math.random() * 80;

        buildings.push({
            start: currentDist,
            end: currentDist + bWidth,
            height: bHeight
        });

        currentDist += bWidth;
    }

    // Fix last building to wrap perfectly?
    // Simply set last building end to totalLen
    buildings[buildings.length - 1].end = totalLen;
}


// Input
function jump() {
    // Allow jumping even if slightly in air (coyote time) or only on ground?
    // Let's strict: only if not jumping (or vertical speed near 0)
    // Actually if yOffset is near 0.

    // Find current ground height
    // We need to know if we are "on ground". 
    // Jumping logic happens in update.

    if (!player.isJumping) {
        player.verticalSpeed = jumpForce;
        player.isJumping = true;

        document.querySelector('h1').style.display = 'none';
        isPlaying = true;
    }
}
window.addEventListener('keydown', (e) => { if (e.code === 'Space') jump(); });
window.addEventListener('mousedown', jump);
window.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, { passive: false });

resize();


// Physics & Logic
function update() {
    if (isPlaying) {
        player.distance += speed;
        score++;
        document.getElementById('score').innerText = `SCORE: ${Math.floor(score / 10)}`;

        // Speed up
        if (score % 500 === 0) speed += 0.5;
    }

    const totalLen = (width + height) * 2;
    const modDist = player.distance % totalLen;

    // 1. Find Current Building Height
    let groundHeight = 0;
    // Simple linear search (Performance is fine for small array)
    for (let b of buildings) {
        if (modDist >= b.start && modDist < b.end) {
            groundHeight = b.height;
            break;
        }
    }

    // 2. Physics
    if (isPlaying) {
        // Apply Gravity
        player.yOffset += player.verticalSpeed;
        player.verticalSpeed -= gravity;
    }

    // 3. Collision with Ground
    // Definition: yOffset is relative to the *Edge of Screen*.
    // Wait, let's redefine yOffset.
    // yOffset = Distance from the *flat wall line* (screen edge)? 
    // No, better: yOffset is Absolute visual offset from the screen edge.
    // Buildings occupy 0 to groundHeight.
    // Player must be at yOffset >= groundHeight.

    // So "Floor" is at `groundHeight`.

    if (player.yOffset < groundHeight) {
        // Hit the building (Landing or Crashing?)

        // If we were falling, we land.
        // But what if we hit the SIDE of a tall building?
        // Current logic: We are at Distance X. Building height is H.
        // If our Y < H, we are inside the building.

        // Detailed Collision:
        // Previous frame Y was >= Previous Building Height.
        // Current frame Y < Current Building Height.
        // This means we hit a wall or landed.

        // Simplified Runner: You assume instant climb if change is small?
        // Or Game Over if hitting a wall?

        // User requested "Obstacles... jump or go over".
        // Let's make it Game Over if height difference is too big > 20.
        // Otherwise snap to top (auto-climb small steps).

        // We need 'prevGroundHeight'. But let's simplify.
        // Just solid ground. If yOffset < groundHeight, snap to groundHeight.

        if (player.verticalSpeed <= 0) {
            player.yOffset = groundHeight;
            player.verticalSpeed = 0;
            player.isJumping = false;
        } else {
            // Jumping UP into a ceiling? Not possible with this map gen.
        }
    }

    // Fall off screen? (Into the center void)
    // If yOffset becomes huge? No, yOffset increases towards Center.
    // Screen Edge is 0. Center is Width/2.
    // If yOffset > Width/2, you are flying in space. That's fine.
}

// Convert Distance + Height to Screen X,Y
function getScreenPos(dist, altitude) {
    // dist: Track distance
    // altitude: Distance from the outer edge (screen border) inwards.

    const w = width;
    const h = height;
    const total = (w + h) * 2;

    let d = dist % total;
    while (d < 0) d += total;

    // 1. Bottom Edge (Left -> Right)
    if (d < w) {
        return {
            x: d,
            y: h - altitude,
            angle: 0
        };
    }
    d -= w;

    // 2. Right Edge (Bottom -> Top)
    if (d < h) {
        return {
            x: w - altitude,
            y: h - d,
            angle: -Math.PI / 2
        };
    }
    d -= h;

    // 3. Top Edge (Right -> Left)
    if (d < w) {
        return {
            x: w - d,
            y: altitude,
            angle: Math.PI
        };
    }
    d -= w;

    // 4. Left Edge (Top -> Bottom)
    return {
        x: altitude,
        y: d,
        angle: Math.PI / 2
    };
}


function draw() {
    // Sky Background
    // Just White as requested, or maybe a sunset gradient?
    // User said "Like this image" (sunset city). But before said "Black stickman".
    // Let's stick to the Black/White sketch style first, but refine the Buildings.
    // Or maybe "Sunset" background with Black Silhouette Buildings? That looks cool.

    // Let's Try: Sunset Gradient Background + Black Buildings
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#ff9a9e');
    grad.addColorStop(1, '#fecfef');
    ctx.fillStyle = grad;
    // Actually simple white might be cleaner for stickman.
    // Let's stick to White Background + Black Buildings for clarity unless asked.

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw Buildings
    ctx.fillStyle = '#000000';

    // We need to iterate all buildings and draw quads.
    // But since they wrap around corners, 'fillRect' is tricky.
    // Instead, use getScreenPos to find corners.

    ctx.beginPath();
    // Inner loop (Ground level)
    // It's a closed polygon hole? No, buildings stick in from outside.
    // Let's draw screen border -> building height.

    // Drawing Strategy:
    // Draw outer big rectangle (Screen)
    // Cut out the inner hole?
    // Or just draw each building block.

    for (let b of buildings) {
        // Building Segment: b.start to b.end
        // Height: b.height

        // Draw Quad:
        // P1(start, 0), P2(end, 0) -> Outer Edge (Invisible, clipped)
        // P3(end, height), P4(start, height) -> Inner Roof

        const p1 = getScreenPos(b.start, 0); // Outer
        const p2 = getScreenPos(b.end, 0);   // Outer
        const p3 = getScreenPos(b.end, b.height); // Inner Roof
        const p4 = getScreenPos(b.start, b.height); // Inner Roof

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);

        // Handling Corner Wraps?
        // My map generation doesn't split at corners.
        // So a building length can sustain across a corner.
        // getScreenPos handles the coordinate wrap.
        // But drawing a straight line from P1 to P2 across a corner will cut through.
        // We must split drawing at corners if a building crosses one.

        // Actually, easiest way is to draw building segments pixel by pixel? No.
        // Draw many small segments?
        // Or split buildings at corners during generation.
        // --> Let's split them in generation! (Simplifies rendering)
        // (Wait, I'll allow generation to overlap, but render step needs care)

        // Simpler: Just draw a polylne for the "Ground" and fill everything "Behind" it (Outwards).
        // Let's draw the Inner Loop (Roofs) and fill outwards?

        // Actually, just draw Black Rectangles for each side's buildings. 
        // We know which side a building belongs to roughly.
        // But getScreenPos abstracts that.

        // Let's use `step` to handle corners safely.

        // Brute force: Draw vertical lines? No.
        // Draw Quad. If it crosses corner, P1-P2 line is wrong.

        // Correct fix: Split building at corners OR simple iteration.
        // Let's assume buildings are small enough or step 10px.

        // RE-GENERATION: Let's split buildings at corners.
    }
}

// Override Gen Map to split at corners
function generateMapSplit() {
    const w = width;
    const h = height;
    const total = (w + h) * 2;
    const corners = [w, w + h, w + h + w, total];

    buildings.length = 0;

    let current = 0;
    while (current < total) {
        let next = current + 50 + Math.random() * 100;
        let bHeight = 20 + Math.random() * 60; // Random heights

        // Check corner crossing
        for (let c of corners) {
            if (current < c && next > c) {
                next = c; // Snap to corner
                break;
            }
        }

        buildings.push({ start: current, end: next, height: bHeight });
        current = next;
    }
}

// Redefine resize
window.removeEventListener('resize', resize);
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateMapSplit();
});

// Windows Cache (to prevent flickering)
const windowsCache = [];

function generateMapSplit() {
    const w = width;
    const h = height;
    const total = (w + h) * 2;
    const corners = [w, w + h, w + h + w, total];

    buildings.length = 0;
    windowsCache.length = 0; // Clear window data

    let current = 0;
    while (current < total) {
        let next = current + 40 + Math.random() * 80; // Building Width
        let bHeight = 40 + Math.random() * 80; // Building Height (Inwards)

        // Corner Logic
        for (let c of corners) {
            if (current < c && next > c) {
                next = c;
                break;
            }
        }

        // Generate Windows for this building
        const winList = [];
        // Determine number of floor/cols based on size
        const cols = Math.floor((next - current) / 15);
        const rows = Math.floor(bHeight / 20);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.3) { // 70% chance of window
                    winList.push({
                        r: r, c: c,
                        on: Math.random() > 0.5, // Lights on?
                        color: Math.random() > 0.8 ? '#f1c40f' : '#e67e22' // Yellow or Orange
                    });
                }
            }
        }
        windowsCache.push(winList);

        buildings.push({ start: current, end: next, height: bHeight });
        current = next;
    }
}
generateMapSplit(); // Init

function drawRefined() {
    // Clear Canvas to transparent (Show CSS Background)
    ctx.clearRect(0, 0, width, height);

    // Draw Buildings (The Frame)
    ctx.fillStyle = '#000000';

    buildings.forEach((b, index) => {
        const p1 = getScreenPos(b.start, 0);       // Outer Corner 1
        const p2 = getScreenPos(b.end, 0);         // Outer Corner 2
        const p3 = getScreenPos(b.end, b.height);  // Inner Roof 2
        const p4 = getScreenPos(b.start, b.height); // Inner Roof 1

        // Draw Silhouette
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Draw Windows
        // Need to calculate position based on building rotation
        // Determine wall side based on start dist
        // 0-W: Bottom, W-(W+H): Right, etc.
        // It's easier to transform context to draw windows.

        const wins = windowsCache[index];
        if (wins && wins.length > 0) {
            ctx.save();

            // Transform to building space
            // P1 is the anchor (Outer Left corner of building)
            // But angle?
            let angle = 0;
            const w = width, h = height;
            if (b.start < w) angle = 0; // Bottom
            else if (b.start < w + h) angle = -Math.PI / 2; // Right
            else if (b.start < w + h + w) angle = Math.PI; // Top
            else angle = Math.PI / 2; // Left

            ctx.translate(p1.x, p1.y);
            ctx.rotate(angle);

            // Now draw windows relative to P1 (0,0)
            // Windows go Inwards (Negative Y in local space? No, Altitude increases Y in local?)
            // Wait, getScreenPos logic:
            // Bottom: x=d, y=h-alt. Alt 0 is h. Alt+ is Up.
            // Rotated 0: X+ is Right, Y+ is Down.
            // So Altitude 0 -> Y=0? 
            // My getScreenPos for Bottom: y = h - altitude.
            // Screen Y = h (Bottom edge).
            // So if I translate to (Start, H), Y-axis points Down (default).
            // So altitude goes -Y.

            // Let's rely on P4 relative to P1?
            // Vector P1->P4 is the "Up" vector (Height).
            // Vector P1->P2 is the "Right" vector (Width).

            // Normalize slightly? No, linear interpolation.
            // Win pos: P1 + (col/cols)*vW + (row/rows)*vH

            // Window Size relative
            const len = b.end - b.start;
            const stepX = len / Math.floor(len / 15);
            const stepY = b.height / Math.floor(b.height / 20);

            for (let win of wins) {
                if (!win.on) continue;
                ctx.fillStyle = win.color;

                // Calc position
                // Simple Grid
                const x = win.c * 15 + 5;
                const y = win.r * 20 + 5;

                // Draw in local transformed space?
                // Our transform was crude. Let's use points directly.
                // Just use Canvas transform!
                // But we need to know orientation per wall.

                // Actually easier:
                // Bottom: Inwards is -Y.
                // Right: Inwards is -X.
                // Top: Inwards is +Y.
                // Left: Inwards is +X.

                // Let's just draw rects.
                // The rotation and translation should handle this.
                // In the transformed space, X is along the wall, Y is inwards.
                // So, windows are drawn at (x, y_inwards).
                // The y-coordinate for drawing should be negative because the building height
                // is measured inwards from the screen edge, and after rotation,
                // the "inwards" direction corresponds to negative Y in the local coordinate system
                // if the original P1 was at the screen edge and we're drawing "up" into the building.
                // The `getScreenPos` for altitude 0 gives the outer edge.
                // `getScreenPos` for `b.height` gives the inner edge.
                // So, if `p1` is the origin, the building extends from `y=0` to `y=b.height` (in local space).
                // Windows should be drawn at `y` values between `0` and `b.height`.
                // The instruction's `-y - 10` suggests `y` is a positive value representing depth,
                // and it's being offset and made negative. Let's use `y` directly as depth.
                ctx.fillRect(x, y, 8, 12);
            }

            ctx.restore();
        }
    });

    // Draw Player
    const pPos = getScreenPos(player.distance, player.yOffset);

    ctx.save();
    ctx.translate(pPos.x, pPos.y);
    // Add extra rotation for Stickman to match surface normal
    // getScreenPos returns angle.
    // Bottom Wall: Angle 0. Stickman Up is -Y.
    ctx.rotate(pPos.angle);

    // Draw Stickman (Black)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const runCycle = Math.sin(player.distance * 0.2);
    const s = 0.8;

    // Stickman Pivot: Feet on the Ground (0,0)
    // Draw Up (-Y)

    ctx.beginPath();

    // Legs
    // 0,0 is ground contact
    ctx.moveTo(0, 0); ctx.lineTo(-8 + runCycle * 8, -15);
    ctx.moveTo(0, 0); ctx.lineTo(8 - runCycle * 8, -15);

    // Body
    ctx.moveTo(0, -15); ctx.lineTo(0, -35); // Spine

    // Head (Circle)
    // ctx.moveTo(0, -42); 
    ctx.stroke(); // Draw body/legs first

    ctx.beginPath();
    ctx.arc(0, -40, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(0, -30); ctx.lineTo(-10 - runCycle * 8, -20);
    ctx.moveTo(0, -30); ctx.lineTo(10 + runCycle * 8, -20);
    ctx.stroke();

    ctx.restore();

    requestAnimationFrame(loop);
}

function loop() {
    update();
    drawRefined();
}

requestAnimationFrame(loop);
