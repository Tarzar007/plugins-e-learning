define([], function() {

    let blocked = false;
    let lastHiddenTime = 0;

    return {
        init: function(user) {

            console.log("SUT Exam Protector Active", user);

            // ==============================
            // ❌ BASIC BLOCK
            // ==============================
            document.addEventListener('contextmenu', e => e.preventDefault());
            ['copy','paste','cut'].forEach(ev => 
                document.addEventListener(ev, e => e.preventDefault())
            );
            document.body.style.userSelect = "none";

            // ==============================
            // ❌ KEYBOARD CONTROL
            // ==============================
            document.addEventListener("keydown", function(e) {

                // F12 → BLOCK
                if (e.key === "F12") {
                    e.preventDefault();
                    degradeScreen("F12");
                }

                // Ctrl shortcuts → BLOCK
                if (e.ctrlKey && ['c','v','u','s','a','p'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }

                // Shift + S → temporary blur
                if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "s") {
                    e.preventDefault();
                    temporaryBlur("SHIFT_S");
                }
            });

            // ==============================
            // 🔍 PRINT SCREEN → temporary blur
            // ==============================
            document.addEventListener("keyup", function(e) {
                if (e.key === "PrintScreen") temporaryBlur("PRINT_SCREEN");
            });

            // ==============================
            // 🔍 TAB SWITCH / WINDOW BLUR
            // ==============================
            window.addEventListener('blur', () => temporaryBlur("WINDOW_BLUR", 2000));

            document.addEventListener("visibilitychange", function() {
                if (document.hidden) lastHiddenTime = Date.now();
                else {
                    let diff = Date.now() - lastHiddenTime;
                    if (diff < 1500) temporaryBlur("FAST_TAB_SWITCH", 2000);
                }
            });

            // ==============================
            // 🔒 FORCE FULLSCREEN
            // ==============================
            setTimeout(() => document.documentElement.requestFullscreen().catch(()=>{}), 1000);

            document.addEventListener("fullscreenchange", function() {
                if (!document.fullscreenElement) degradeScreen("EXIT_FULLSCREEN");
            });

            // ==============================
            // 🔍 DEVTOOLS DETECTION
            // ==============================
            setInterval(function() {
                if (window.outerWidth - window.innerWidth > 160) degradeScreen("DEVTOOLS_SIZE");
            }, 1000);

            // debugger trap
            setInterval(function() {
                let before = performance.now();
                debugger;
                let after = performance.now();
                if (after - before > 150) degradeScreen("DEBUGGER");
            }, 2000);

            // ==============================
            // 🔥 NOISE
            // ==============================
            addNoise();

            // ==============================
            // 🔥 WATERMARK (ไม่รบกวนผู้สอบ)
            // ==============================
            addWatermark(user);

            // ==============================
            // 🔥 PROTECT ANSWER CHOICES
            // ==============================
            protectChoices();
        }
    };

    // ==============================
    // 🔴 PUNISH FUNCTION (BLOCK)
    // ==============================
    function degradeScreen(reason) {

        if (blocked) return;
        blocked = true;

        console.warn("CHEAT DETECTED:", reason);

        document.body.style.filter = "blur(20px) brightness(0.3)";
        document.body.style.pointerEvents = "none";

        let block = document.createElement("div");
        block.id = "exam-blocked";

        block.innerHTML = `
            <div style="
                display:flex;
                justify-content:center;
                align-items:center;
                height:100%;
                flex-direction:column;
                color:red;
                font-size:28px;
            ">
                <h1>คุณถูกระงับการสอบ</h1>
                <p>Reason: ${reason}</p>
            </div>
        `;

        block.style.position = "fixed";
        block.style.top = 0;
        block.style.left = 0;
        block.style.width = "100%";
        block.style.height = "100%";
        block.style.background = "rgba(0,0,0,0.9)";
        block.style.zIndex = 99999;

        document.body.appendChild(block);

        // 🔥 log กลับ server
        try {
            fetch('/local/sutexam_protector/log.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({reason, time: new Date().toISOString()})
            });
        } catch(e) {}
    }

    // ==============================
    // 🔥 TEMPORARY BLUR FUNCTION
    // ==============================
    function temporaryBlur(reason, duration = 2000) {
        console.warn("SCREEN CAP DETECTED:", reason);
        document.querySelectorAll('.qtext').forEach(el => el.style.filter = 'blur(8px)');
        try {
            fetch('/local/sutexam_protector/log.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({reason, time: new Date().toISOString()})
            });
        } catch(e) {}
        setTimeout(() => document.querySelectorAll('.qtext').forEach(el => el.style.filter = ''), duration);
    }

    // ==============================
    // 🔥 NOISE OVERLAY
    // ==============================
    function addNoise() {
        let noise = document.createElement("div");
        noise.style.position = "fixed";
        noise.style.top = 0;
        noise.style.left = 0;
        noise.style.width = "100%";
        noise.style.height = "100%";
        noise.style.backgroundImage =
            "repeating-radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)";
        noise.style.pointerEvents = "none";
        noise.style.zIndex = 9998;
        document.body.appendChild(noise);
    }

    // ==============================
    // 🔥 WATERMARK (ไม่รบกวนผู้สอบ)
    // ==============================
function addWatermark(user) {
    if (!user) user = {};

    let name = user.fullname || `${user.firstname || "ห้ามคัดลอกหน้าจอ!"} ${user.lastname || ""}`;
    let id = user.id || "0";
    let timestamp = new Date().toLocaleString();

    for (let i = 0; i < 15; i++) {
        let wm = document.createElement("div");
        wm.innerText = `${name} | ${id} | ${timestamp}`;

        wm.style.position = "fixed";
        wm.style.top = Math.random() * 90 + "%";
        wm.style.left = Math.random() * 90 + "%";
        wm.style.opacity = 0.35;
        wm.style.fontSize = (14 + Math.random() * 4) + "px";
        wm.style.color = "rgba(80, 70, 70, 0.35)";
        wm.style.pointerEvents = "none";
        wm.style.zIndex = 9999;
        wm.style.whiteSpace = "nowrap";
        wm.style.transform = `rotate(${Math.random() * 30 - 15}deg)`;

        document.body.appendChild(wm);
    }
}

    // ==============================
    // 🔥 PROTECT ANSWER CHOICES
    // ==============================
    function protectChoices() {
        document.querySelectorAll('.answer').forEach(el => {
            el.style.position = "relative";

            let overlay = document.createElement("div");
            overlay.style.position = "absolute";
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.zIndex = 10;
            overlay.style.pointerEvents = "none"; // ไม่ขัดคลิก

            el.appendChild(overlay);
        });
    }

});