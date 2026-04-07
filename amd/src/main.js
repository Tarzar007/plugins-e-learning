define([], function() {

    let isExamFinished = false;
    let violationCount = 0;

    return {
        init: function() {
            console.log("🚀 SUT Exam Protector: Ultimate Fullscreen Mode Active");

            this.injectStrictStyles();

            // 1. บล็อกการทำงานพื้นฐาน
            document.addEventListener('contextmenu', e => e.preventDefault());
            ['copy', 'paste', 'cut', 'dragstart', 'drop'].forEach(ev =>
                document.addEventListener(ev, e => e.preventDefault())
            );
            document.body.style.userSelect = "none";

            // 2. ตั้งค่าปุ่มเริ่ม
            this.setupStartButton();

            // 3. ตรวจจับการหลุด Fullscreen
            document.addEventListener("fullscreenchange", () => {
                if (!document.fullscreenElement && !isExamFinished) {
                    this.handleViolation();
                }
            });

            // 4. ป้องกันการกดย้อนกลับ
            this.preventBackNavigation();

            // 5. ดักจับการปิด Tab
            window.onbeforeunload = (e) => {
                if (!isExamFinished) {
                    e.preventDefault();
                    return "คำเตือน: การออกจากหน้าจอนี้จะทำให้การสอบเป็นโมฆะ";
                }
            };

            this.observeSubmitButton();
        },

        injectStrictStyles: function() {
            const style = document.createElement('style');
            style.innerHTML = `
                ::-webkit-scrollbar { display: none; }
                html, body { 
                    overflow: hidden !important; 
                    height: 100vh !important; 
                    width: 100vw !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -ms-overflow-style: none; 
                    scrollbar-width: none; 
                }
                #custom-alert-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.85); z-index: 10000000;
                    display: flex; justify-content: center; align-items: center;
                }
            `;
            document.head.appendChild(style);
        },

        setupStartButton: function() {
            let overlay = document.createElement("div");
            overlay.id = "exam-overlay";
            overlay.innerHTML = `
                <div style="text-align:center; background:white; padding:40px; border-radius:20px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                    <h1 style="color:#333; margin-bottom:10px;">เตรียมพร้อมสำหรับการสอบ</h1>
                    <p style="color:#666;">ระบบจะเข้าสู่โหมดเต็มจอและปิดการใช้งาน Navbar</p>
                    <button id="enter-btn" style="padding:15px 40px; font-size:22px; cursor:pointer; background:#28a745; color:white; border:none; border-radius:10px; margin-top:20px; font-weight:bold;">
                        เริ่มทำข้อสอบทันที
                    </button>
                </div>
            `;
            Object.assign(overlay.style, {
                position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
                background: "rgba(0,0,0,0.9)", zIndex: "9999999", display: "flex", justifyContent: "center", alignItems: "center"
            });
            document.body.appendChild(overlay);

            document.getElementById("enter-btn").onclick = () => {
                this.forceFullscreen();
                overlay.remove();
                history.pushState(null, null, location.href);
            };
        },

        forceFullscreen: function() {
            let elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => console.log("FS Error:", err));
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen().catch(err => console.log("FS Error:", err));
            }
        },

        showCustomWarning: function(title, message) {
            if (document.getElementById("custom-alert-overlay")) return;

            let warningDiv = document.createElement("div");
            warningDiv.id = "custom-alert-overlay";
            warningDiv.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.5); max-width: 450px; border: 3px solid #ff4d4d;">
                    <h2 style="color: #ff4d4d; margin-top: 0; font-size: 24px;">${title}</h2>
                    <p style="color: #333; font-size: 18px; line-height: 1.5;">${message}</p>
                    <button id="confirm-re-fs" style="margin-top: 20px; padding: 15px 35px; font-size: 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        ตกลง (กลับเข้าสู่การสอบ)
                    </button>
                </div>
            `;
            document.body.appendChild(warningDiv);

            document.getElementById("confirm-re-fs").onclick = () => {
                this.forceFullscreen();
                warningDiv.remove();
            };
        },

        handleViolation: function() {
            violationCount++;
            if (violationCount === 1) {
                this.showCustomWarning(
                    "⚠️ เตือนครั้งที่ 1: ตรวจพบการออกจากหน้าจอ!",
                    "ไม่อนุญาตให้ออกจากโหมดเต็มจอระหว่างทำข้อสอบ <br><b>หากทำผิดอีกครั้ง คุณจะหมดสิทธิ์สอบทันที</b>"
                );
            } 
            else if (violationCount >= 2) {
                this.autoTerminate();
            }
        },

        // --- ส่วนที่ปรับปรุง: เด้งไปหน้า Home ทันที ---
        autoTerminate: function() {
            isExamFinished = true;
            
            // ล้างหน้าจอทันทีเพื่อความปลอดภัย
            document.body.innerHTML = "";
            document.body.style.background = "#fff";
            document.body.style.display = "flex";
            document.body.style.justifyContent = "center";
            document.body.style.alignItems = "center";
            
            // แสดงข้อความสั้นๆ ก่อนเด้ง
            document.body.innerHTML = `<h1 style="color:red; text-align:center; font-family: sans-serif;">🚫 คุณหมดสิทธิ์สอบและกำลังถูกส่งกลับหน้าหลัก...</h1>`;
            
            // ปิด Fullscreen (ถ้าค้างอยู่)
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }

            // เด้งไปหน้า Home หลังจากผ่านไป 2 วินาที (หรือเปลี่ยนเป็น '/' ทันทีได้เลย)
            setTimeout(() => {
                window.location.href = "/"; // แก้ไขเป็น URL หน้า Home ของคุณ เช่น "/home" หรือ "/"
            }, 2000);
        },

        preventBackNavigation: function() {
            window.onpopstate = () => {
                if (!isExamFinished) {
                    alert("🚫 ไม่อนุญาตให้กดย้อนกลับระหว่างการสอบ!");
                    history.pushState(null, null, location.href);
                }
            };
        },

        observeSubmitButton: function() {
            document.addEventListener('click', (e) => {
                let btn = e.target.closest('button, input[type="submit"]');
                if (!btn) return;
                
                let text = (btn.innerText || btn.value || "").toLowerCase();
                
                if (["finish", "submit", "ส่ง", "เสร็จ"].some(kw => text.includes(kw))) {
                    isExamFinished = true;
                    document.body.style.overflow = "auto";
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => {});
                    }
                }
            });
        }
    };
});