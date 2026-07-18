// Global configuration object (with defaults in case config.json fails or CORS blocks it)
let config = {
    "pin": "1201",
    "startDate": "2026-07-18T17:00:00",
    "endDate": "2026-08-22T09:00:00",
    "quotes": [
        "In your smile, I see something more beautiful than the stars. ✨",
        "You are my favorite notification. ❤️",
        "I still fall in love with you every single day. 💕",
        "I wish I could turn back the clock. I'd find you sooner and love you longer. 🕰️💖",
        "No matter where I go, the path always leads back to you. 🗺️💞",
        "To the world you may be one person, but to me you are the world. 🌍💓",
        "You make my heart smile. 🌸",
        "Every love story is beautiful, but ours is my favorite. 📖❤️",
        "You are my today and all of my tomorrows. 🌅🌌"
    ]
};

// Application State
let loggedIn = false;
let currentPinInput = "";
let characterState = "default"; // 'default', 'scenario', 'wish'
let activeScenarioTimeout = null;

// Canvas Initialization
const canvas = document.getElementById("sky-canvas");
const ctx = canvas.getContext("2d");

// Particle Systems
const stars = [];
const shootingStars = [];
const fireworks = [];
const fireworkParticles = [];
const heartParticles = [];
let wishParticle = null;

// Wish Tracking
let clickedStarSource = { x: 0, y: 0 };
let activeWishText = "";

// Initialize dimensions
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Load Config
async function loadConfig() {
    try {
        const response = await fetch("config.json");
        if (response.ok) {
            const data = await response.json();
            config = { ...config, ...data };
            console.log("Config loaded successfully:", config);
        } else {
            console.warn("Failed to load config.json (using fallback defaults)");
        }
    } catch (err) {
        console.warn("CORS/Network error loading config.json. Using fallback defaults.", err);
    }
}

/* ==========================================================
   PARTICLE & ANIMATION SYSTEMS
   ========================================================== */

// 1. Twinkling Stars Background
function initStars() {
    stars.length = 0;
    const starCount = Math.min(180, Math.floor((canvas.width * canvas.height) / 8000));
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.75, // mainly keep in top 75%
            size: Math.random() * 1.5 + 0.5,
            twinkleSpeed: Math.random() * 0.03 + 0.008,
            phase: Math.random() * Math.PI * 2
        });
    }
}

function drawStars() {
    for (let star of stars) {
        star.phase += star.twinkleSpeed;
        const alpha = 0.3 + Math.abs(Math.sin(star.phase)) * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 2. Shooting Stars
class ShootingStar {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width * 0.8;
        this.y = Math.random() * canvas.height * 0.3;
        this.speed = Math.random() * 1.2 + 0.8; // Slower speed (0.8 - 2.0) for easier clicking
        this.angle = Math.PI / 6 + Math.random() * (Math.PI / 12); // ~30 deg to 45 deg
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.length = Math.random() * 80 + 50;
        this.history = [];
        this.maxHistory = 12;
        this.opacity = 1;
        this.fadeSpeed = 0.005;
        this.active = true;
    }

    update() {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.x += this.vx;
        this.y += this.vy;

        // Fade out slightly over time
        this.opacity -= this.fadeSpeed;

        // Deactivate if out of boundaries or completely faded
        if (this.x > canvas.width || this.y > canvas.height || this.opacity <= 0) {
            this.active = false;
        }
    }

    draw() {
        if (this.history.length < 2) return;

        // Draw trail
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }

        // Gradient tail: Blue-cyan to white
        const grad = ctx.createLinearGradient(
            this.history[0].x, this.history[0].y,
            this.x, this.y
        );
        grad.addColorStop(0, "rgba(0, 168, 255, 0)");
        grad.addColorStop(0.5, "rgba(255, 59, 92, 0.4)");
        grad.addColorStop(1, `rgba(255, 255, 255, ${this.opacity})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Glowing head
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
    }
}

// 3. Fireworks (Login Screen)
class Firework {
    constructor(targetX, targetY) {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.tx = targetX || Math.random() * canvas.width;
        this.ty = targetY || Math.random() * canvas.height * 0.5;
        this.speed = 3;
        this.angle = Math.atan2(this.ty - this.y, this.tx - this.x);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.active = true;
        this.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Boost velocity as it ascends
        this.vx *= 1.02;
        this.vy *= 1.02;

        // Check if rocket has reached target height
        const dist = Math.hypot(this.tx - this.x, this.ty - this.y);
        if (dist < 15 || this.vy >= 0) {
            this.explode();
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    explode() {
        const count = 40 + Math.floor(Math.random() * 30);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            fireworkParticles.push(new FireworkParticle(this.x, this.y, angle, speed, this.color));
        }
    }
}

class FireworkParticle {
    constructor(x, y, angle, speed, color) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = 0.06;
        this.drag = 0.97;
        this.alpha = 1;
        this.fade = Math.random() * 0.015 + 0.01;
        this.color = color;
    }

    update() {
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.fade;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 4. Heart Particles Burst
class HeartParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = -Math.random() * 4 - 1;
        this.gravity = 0.03;
        this.scale = Math.random() * 0.4 + 0.3;
        this.alpha = 1;
        this.fade = Math.random() * 0.01 + 0.01;
        this.color = Math.random() > 0.5 ? "#ff3b5c" : "#ff8ba0";
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.fade;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Draw Heart
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-5, -5, -15, -5, -15, 5);
        ctx.bezierCurveTo(-15, 15, 0, 25, 0, 30);
        ctx.bezierCurveTo(0, 25, 15, 15, 15, 5);
        ctx.bezierCurveTo(15, -5, 5, -5, 0, 0);
        ctx.fill();

        ctx.restore();
    }
}

// 5. Wish Particle (Flying from clicked star coordinate to the Boy)
class WishParticle {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.tx = targetX;
        this.ty = targetY;
        this.history = [];
    }

    update() {
        // Dynamically get target coordinates because the boy might have shifted
        const boyRect = document.getElementById("boy-holder").getBoundingClientRect();
        this.tx = boyRect.left + boyRect.width / 2;
        this.ty = boyRect.top + boyRect.height / 2 - 20; // Aim a bit higher than the center

        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 15) {
            this.history.shift();
        }

        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 15) {
            // Arrived at destination!
            triggerWishArrival(this.tx, this.ty);
            return false; // delete particle
        }

        // Snap speed: accelerate as it gets closer
        const speed = Math.max(7, dist * 0.08);
        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;
        return true;
    }

    draw() {
        if (this.history.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let pt of this.history) {
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Draw star head
        ctx.fillStyle = "gold";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "gold";
        ctx.beginPath();
        // Simple star shape draw
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}


/* ==========================================================
   ANIMATION LOOP
   ========================================================== */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars twinkles in background of both screens
    drawStars();

    // 1. If not logged in, show fireworks
    if (!loggedIn) {
        // Auto-launch rockets
        if (Math.random() < 0.02) {
            fireworks.push(new Firework());
        }

        // Update & Draw Rockets
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update();
            if (!fireworks[i].active) {
                fireworks.splice(i, 1);
            } else {
                fireworks[i].draw();
            }
        }
    }

    // 2. If logged in, update shooting stars, wish particle, and hearts
    if (loggedIn) {
        // Auto-spawn shooting stars
        if (Math.random() < 0.0025 && shootingStars.length < 2) {
            shootingStars.push(new ShootingStar());
        }

        // Update & Draw Shooting Stars
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            shootingStars[i].update();
            if (!shootingStars[i].active) {
                shootingStars.splice(i, 1);
            } else {
                shootingStars[i].draw();
            }
        }

        // Update & Draw Wish Particle
        if (wishParticle) {
            const active = wishParticle.update();
            if (!active) {
                wishParticle = null;
            } else {
                wishParticle.draw();
            }
        }

        // Update & Draw Heart Explosion Particles
        for (let i = heartParticles.length - 1; i >= 0; i--) {
            heartParticles[i].update();
            if (heartParticles[i].alpha <= 0) {
                heartParticles.splice(i, 1);
            } else {
                heartParticles[i].draw();
            }
        }
    }

    // Update & Draw Firework/Sparkle Particles (rendered on both screens)
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
        fireworkParticles[i].update();
        if (fireworkParticles[i].alpha <= 0) {
            fireworkParticles.splice(i, 1);
        } else {
            fireworkParticles[i].draw();
        }
    }

    requestAnimationFrame(animate);
}


/* ==========================================================
   INTERACTIVE CLICK EVENTS (SHOOTING STARS / FIREWORKS)
   ========================================================== */
canvas.addEventListener("click", (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    if (!loggedIn) {
        // Interactive firework launcher on click
        fireworks.push(new Firework(clickX, clickY));
    } else {
        // Detect click on shooting star
        let clickedShootingStar = false;
        for (let i = 0; i < shootingStars.length; i++) {
            const star = shootingStars[i];
            const dx = clickX - star.x;
            const dy = clickY - star.y;
            const dist = Math.hypot(dx, dy);

            // Generous click zone: 55px for easier mobile tapping
            if (dist < 55) {
                clickedStarSource = { x: star.x, y: star.y };
                openWishModal();
                shootingStars.splice(i, 1); // remove clicked star
                clickedShootingStar = true;
                break;
            }
        }

        // If not a shooting star, check if click hit a twinkling background star
        if (!clickedShootingStar) {
            for (let i = 0; i < stars.length; i++) {
                const star = stars[i];
                const dx = clickX - star.x;
                const dy = clickY - star.y;
                const dist = Math.hypot(dx, dy);

                // Hit zone for blinking stars: 30px for easy mobile and desktop clicking
                if (dist < 30) {
                    showRandomQuoteFromStars(star.x, star.y);
                    break;
                }
            }
        }
    }
});

// Star quote display: Spawns sparkles and displays a random quote card
function showRandomQuoteFromStars(x, y) {
    // 1. Spawn a cute sparkle effect at click coordinates
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        fireworkParticles.push(new FireworkParticle(x, y, angle, speed, "gold"));
    }

    // 2. Select a random quote from config array
    const randomQuote = config.quotes[Math.floor(Math.random() * config.quotes.length)];

    // 3. Update the quote text
    quoteText.textContent = `"${randomQuote}"`;

    // Hide the wish reveal section since this is just a star click
    wishRevealText.classList.add("hidden");

    // Show the quote card
    quoteCard.classList.remove("hidden");
}


/* ==========================================================
   PIN GATING / LOGIN SCREEN
   ========================================================== */
const pinDots = document.querySelectorAll(".pin-dots .dot");
const errorMsg = document.getElementById("login-error");

// Set active filled dots state
function updatePinDots() {
    pinDots.forEach((dot, idx) => {
        if (idx < currentPinInput.length) {
            dot.classList.add("filled");
        } else {
            dot.classList.remove("filled");
        }
    });
}

function resetPinInput() {
    currentPinInput = "";
    updatePinDots();
}

function handlePinDigit(digit) {
    if (currentPinInput.length < 4) {
        currentPinInput += digit;
        updatePinDots();
        errorMsg.classList.remove("visible");

        if (currentPinInput.length === 4) {
            // Check password validation
            setTimeout(validatePin, 250);
        }
    }
}

function validatePin() {
    if (currentPinInput === config.pin) {
        // Celebratory screen transition
        loggedIn = true;

        // Spawn massive celebratory firework burst on login screen
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const fw = new Firework(
                    canvas.width * (0.2 + 0.6 * Math.random()),
                    canvas.height * (0.2 + 0.4 * Math.random())
                );
                fireworks.push(fw);
            }, i * 200);
        }

        setTimeout(() => {
            transitionToDashboard();
        }, 1200);

    } else {
        // Failure: Shake animation and display error
        pinDots.forEach(dot => dot.classList.add("error"));
        errorMsg.classList.add("visible");

        setTimeout(() => {
            pinDots.forEach(dot => dot.classList.remove("error"));
            resetPinInput();
        }, 600);
    }
}

// Bind PIN Pad Keys
document.querySelectorAll(".key-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-val");
        if (val === "del") {
            if (currentPinInput.length > 0) {
                currentPinInput = currentPinInput.slice(0, -1);
                updatePinDots();
            }
        } else if (val === "clear") {
            resetPinInput();
        } else {
            handlePinDigit(val);
        }
    });
});

// Bind physical keyboard events for accessibility
document.addEventListener("keydown", (e) => {
    if (loggedIn) return;

    if (e.key >= "0" && e.key <= "9") {
        handlePinDigit(e.key);
    } else if (e.key === "Backspace") {
        if (currentPinInput.length > 0) {
            currentPinInput = currentPinInput.slice(0, -1);
            updatePinDots();
        }
    } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        resetPinInput();
    }
});


/* ==========================================================
   TRANSITION TO DASHBOARD
   ========================================================== */
function transitionToDashboard() {
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("dashboard-screen").classList.add("active");

    // Switch fireworks array to trigger clean canvas
    fireworks.length = 0;
    fireworkParticles.length = 0;

    // Start running active loops
    startCountdown();
    setupCharacterLoop();
}


/* ==========================================================
   COUNTDOWN TIMER & CHARACTER TRACK SPACING
   ========================================================== */
const daysVal = document.getElementById("days-val");
const hoursVal = document.getElementById("hours-val");
const minutesVal = document.getElementById("minutes-val");
const secondsVal = document.getElementById("seconds-val");

const boyHolder = document.getElementById("boy-holder");
const girlHolder = document.getElementById("girl-holder");
const boyImg = document.getElementById("boy-img");
const girlImg = document.getElementById("girl-img");

function startCountdown() {
    updateTimer();
    setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = new Date();
    const targetDate = new Date(config.endDate);
    const startDate = new Date(config.startDate);

    const diffMs = targetDate - now;

    if (diffMs <= 0) {
        // Countdown is complete!
        daysVal.textContent = "00";
        hoursVal.textContent = "00";
        minutesVal.textContent = "00";
        secondsVal.textContent = "00";

        updateBoyPosition(1.0); // boy at maximum closeness

        // Show happy together states
        if (characterState !== "wish") {
            boyImg.src = "Boy_Flirty.gif";
            girlImg.src = "Girl_Happy.gif";
            showBubble("boy", "We are finally together! ❤️");
            showBubble("girl", "At last! I love you! 💕");
        }
        return;
    }

    // Convert milliseconds to days, hours, mins, secs
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    // Format output
    daysVal.textContent = days.toString().padStart(2, "0");
    hoursVal.textContent = hours.toString().padStart(2, "0");
    minutesVal.textContent = minutes.toString().padStart(2, "0");
    secondsVal.textContent = seconds.toString().padStart(2, "0");

    // Spacing progress calculation
    const totalDuration = targetDate - startDate;
    const elapsedDuration = now - startDate;
    let progress = elapsedDuration / totalDuration;

    // Clamp progress between 0 and 1
    progress = Math.max(0, Math.min(1, progress));

    // Update spacing
    updateBoyPosition(progress);
}

// Moves boy closer to girl (boy ranges 0% to 75% track width)
function updateBoyPosition(progress) {
    // Only move position if not in the middle of wish particle arrival
    const maxCloseness = 75; // percentage of parent track container
    const currentPosition = progress * maxCloseness;
    boyHolder.style.left = `${currentPosition}%`;
}


/* ==========================================================
   RANDOM CHARACTER SCENARIO SYSTEM
   ========================================================== */
const boyBubble = document.getElementById("boy-bubble");
const girlBubble = document.getElementById("girl-bubble");

function showBubble(character, text) {
    const bubble = character === "boy" ? boyBubble : girlBubble;
    bubble.textContent = text;
    bubble.classList.remove("hidden");
}

function hideBubbles() {
    boyBubble.classList.add("hidden");
    girlBubble.classList.add("hidden");
}

function resetCharacters() {
    characterState = "default";
    boyImg.src = "Boy_Walk.gif";
    girlImg.src = "Girl_Wait.gif";
    hideBubbles();
}

function triggerRandomScenario() {
    if (characterState !== "default") return;

    // Check countdown status. If finished, they stand together flirty/happy permanently.
    const now = new Date();
    if (new Date(config.endDate) - now <= 0) return;

    characterState = "scenario";

    const scenarios = [
        {
            boyGif: "Boy_Yawn.gif",
            girlGif: "Girl_Yawn.gif",
            boyText: "I'm so sleepy... 🥱",
            girlText: "Me too, let's nap! 😴",
            duration: 7000
        },
        {
            boyGif: "Boy_Playing.gif",
            girlGif: "Girl_Phone.gif",
            boyText: "Look at my game! 🎮",
            girlText: "Checking my texts! 📱",
            duration: 8000
        },
        {
            boyGif: "Boy_Crying.gif",
            girlGif: "Girl_Crying.gif",
            boyText: "I miss you... 😭",
            girlText: "I miss you more! 😢",
            duration: 6500
        },
        {
            boyGif: "Boy_Flirty.gif",
            girlGif: "Girl_Happy.gif",
            boyText: "You are so beautiful! 🥰",
            girlText: "Hehe! Oh stop it! ❤️",
            duration: 7000
        },
        {
            boyGif: "Boy_Playing.gif",
            girlGif: "Girl_Happy.gif",
            boyText: "What should we eat? 🍕",
            girlText: "Let's get ice cream! 🍦",
            duration: 7500
        },
        {
            boyGif: "Boy_Yawn.gif",
            girlGif: "Girl_Phone.gif",
            boyText: "Brr, it's getting cold! ❄️",
            girlText: "Sending a warm hug! 🤗❤️",
            duration: 7000
        },
        {
            boyGif: "Boy_Flirty.gif",
            girlGif: "Girl_Happy.gif",
            boyText: "I'm the luckiest guy! 🍀❤️",
            girlText: "And I'm the luckiest girl! 😘",
            duration: 7000
        },
        {
            boyGif: "Boy_Playing.gif",
            girlGif: "Girl_Phone.gif",
            boyText: "Listen to this cute song! 🎵",
            girlText: "It makes me think of you! 🎧💗",
            duration: 7500
        },
        {
            boyGif: "Boy_Crying.gif",
            girlGif: "Girl_Crying.gif",
            boyText: "Crying tears of happiness 🥺",
            girlText: "Aww, you're so sweet! 😭❤️",
            duration: 7000
        }
    ];

    const pick = scenarios[Math.floor(Math.random() * scenarios.length)];

    boyImg.src = pick.boyGif;
    girlImg.src = pick.girlGif;

    showBubble("boy", pick.boyText);
    showBubble("girl", pick.girlText);

    if (activeScenarioTimeout) clearTimeout(activeScenarioTimeout);

    activeScenarioTimeout = setTimeout(() => {
        if (characterState === "scenario") {
            resetCharacters();
        }
    }, pick.duration);
}

function setupCharacterLoop() {
    resetCharacters();
    // Periodically try to launch a scenario (every 20s)
    setInterval(() => {
        if (characterState === "default" && Math.random() < 0.6) {
            triggerRandomScenario();
        }
    }, 20000);
}


/* ==========================================================
   WISHING SYSTEM & MODALS
   ========================================================== */
const wishModal = document.getElementById("wish-modal");
const wishInput = document.getElementById("wish-input");
const submitWishBtn = document.getElementById("submit-wish");
const closeWishModalBtn = document.getElementById("close-wish-modal");

const quoteCard = document.getElementById("quote-card");
const quoteText = document.getElementById("quote-text");
const wishRevealText = document.getElementById("wish-reveal-text");
const sentWishLabel = document.getElementById("sent-wish");
const closeQuoteBtn = document.getElementById("close-quote");

function openWishModal() {
    wishInput.value = "";
    wishModal.classList.remove("hidden");
    wishInput.focus();
}

function closeWishModal() {
    wishModal.classList.add("hidden");
}

closeWishModalBtn.addEventListener("click", closeWishModal);

submitWishBtn.addEventListener("click", () => {
    const wishText = wishInput.value.trim();
    if (!wishText) return;

    activeWishText = wishText;
    closeWishModal();

    // Spawn a wish particle moving from the clicked star position to the boy
    const boyRect = boyHolder.getBoundingClientRect();
    const targetX = boyRect.left + boyRect.width / 2;
    const targetY = boyRect.top + boyRect.height / 2;

    // Create the particle
    wishParticle = new WishParticle(
        clickedStarSource.x,
        clickedStarSource.y,
        targetX,
        targetY
    );
});

// Triggered when wish particle lands on boy
function triggerWishArrival(x, y) {
    // 1. Create a burst of heart particles
    for (let i = 0; i < 25; i++) {
        heartParticles.push(new HeartParticle(x, y));
    }

    // 2. Change characters state to Wish/Flirty
    characterState = "wish";
    if (activeScenarioTimeout) clearTimeout(activeScenarioTimeout);

    boyImg.src = "Boy_Flirty.gif";
    showBubble("boy", "For you, my star! ✨💖");

    // 3. Show quotes dialog
    const randomQuote = config.quotes[Math.floor(Math.random() * config.quotes.length)];
    quoteText.textContent = `"${randomQuote}"`;
    sentWishLabel.textContent = `"${activeWishText}"`;
    wishRevealText.classList.remove("hidden");
    quoteCard.classList.remove("hidden");

    // Reset character state back to default after 6 seconds
    setTimeout(() => {
        if (characterState === "wish") {
            resetCharacters();
        }
    }, 6000);
}

// Close Quotes Popup Card
closeQuoteBtn.addEventListener("click", () => {
    quoteCard.classList.add("hidden");
});


/* ==========================================================
   APP START
   ========================================================== */
async function startApp() {
    // 1. Load config
    await loadConfig();
    // 2. Initialize background stars
    initStars();
    // 3. Kick off rendering loops
    animate();
}

startApp();
