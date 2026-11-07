// =========================================================================
// ♻️ น้องถังช่วยทิ้ง • การทำงานหลักของแอป
// (ต้องโหลดหลัง config.js และ data.js • ไฟล์อื่นของแอป: account.js, scan.js, ai.js, cert.js)
// =========================================================================

// 🔗 ลิงก์ระบบหลังบ้าน (อ่านจาก config.js)
const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '';

// ⚙️ ตั้งค่าระบบ
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/F8hAM3mgz/";
const USE_GEMINI = true;                        // ใช้ Gemini เป็นตัววิเคราะห์หลัก
const GEMINI_TIMEOUT_MS = 4500;                 // รอ Gemini ไม่เกินเท่านี้ ถ้าช้ากว่าใช้ผลจากโมเดลในเครื่องแทน
const GEMINI_IMAGE_MAX = 640;                   // ย่อภาพก่อนส่ง Gemini (ยิ่งเล็กยิ่งเร็ว)
const ALLOW_CAMERA_APP_FALLBACK = false;        // ปิดไว้ = รับภาพจากกล้องสดในแอปเท่านั้น
const FRESH_PHOTO_MAX_AGE_MS = 2 * 60 * 1000;   // (ใช้เมื่อเปิดทางสำรอง) รูปต้องถ่ายไม่เกิน 2 นาที
const AVATAR_SIZE = 200;                        // ขนาดรูปโปรไฟล์ (px) ที่เก็บใน Sheet
const MIN_PASSWORD_LENGTH = 6;                  // ต้องตรงกับค่าใน Code.gs
const ADMIN_SESSION_KEY = 'nongtang_admin_session';
const AUTH_ROLE_KEY = 'nongtang_auth_role';
const GUEST_SESSION_KEY = 'nongtang_guest';    // โหมดผู้เยี่ยมชม (จำไว้เฉพาะแท็บนี้ ปิดแท็บแล้วกลับหน้าเข้าสู่ระบบ)
const GUEST_ID_KEY = 'nongtang_guest_id';       // รหัสสุ่มของเครื่อง (ไม่ใช่ข้อมูลส่วนตัว) ใช้จำกัดจำนวนครั้งที่บันทึก
const CAMPUS_REFRESH_MS = 45000;                // อัปเดตตัวเลขทั้งวิทยาลัย/ภารกิจทุก 45 วินาที
const TIP_INTERVAL_MS = 5000;                   // สลับข้อความ/เคล็ดลับบนฝาถังทุก 5 วินาที
const LEAF_COUNT = 9;                           // จำนวนใบไม้ลอยพื้นหลัง
const TOUR_KEY = 'nongtang_tour_v1';            // จำว่าเคยดูทัวร์แล้ว
const RESPECT_REDUCED_MOTION = true;            // false = เล่นเอฟเฟกต์ครบทุกเครื่อง แม้ตั้ง "ลดการเคลื่อนไหว"
const REDUCED_MOTION = RESPECT_REDUCED_MOTION && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
document.documentElement.classList.toggle('rm', REDUCED_MOTION);

// =========================================================================
// 📐 ความสูงหน้าจอจริง (แก้ปัญหาแถบเบราว์เซอร์ Safari iOS ทำให้หน้าล้น)
// =========================================================================
function setAppHeight() {
    const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 350));
if (window.visualViewport) window.visualViewport.addEventListener('resize', setAppHeight);

// =========================================================================
// 🔌 ตัวแปลง google.script.run -> fetch
// =========================================================================
async function callApi(action, args) {
    if (!API_URL || API_URL.indexOf('ใส่_ID') !== -1) {
        throw new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js');
    }
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // ใช้ text/plain เพื่อเลี่ยงปัญหา CORS ของ Apps Script
        body: JSON.stringify({ action: action, args: args }),
        redirect: 'follow'
    });
    if (!res.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ' + res.status + ')');
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์');
    return json.data;
}

function createScriptRunner(onSuccess, onFailure) {
    return new Proxy({}, {
        get(_, prop) {
            if (prop === 'withSuccessHandler') return fn => createScriptRunner(fn, onFailure);
            if (prop === 'withFailureHandler') return fn => createScriptRunner(onSuccess, fn);
            return (...args) => {
                callApi(String(prop), args)
                    .then(data => { if (onSuccess) onSuccess(data); })
                    .catch(err => {
                        console.warn('API error [' + String(prop) + ']:', err);
                        if (onFailure) onFailure(err);
                        else alert('❌ เชื่อมต่อระบบไม่สำเร็จ: ' + err.message);
                    });
            };
        }
    });
}

window.google = { script: { get run() { return createScriptRunner(null, null); } } };

// =========================================================================
// 🖼️ โหลดรูปล่วงหน้า (โลโก้/รูประดับบนประกาศนียบัตร)
// =========================================================================
const loadedImagesCache = {};

function getOrLoadImage(url) {
    if (!url) return null;
    if (loadedImagesCache[url]) return loadedImagesCache[url];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    loadedImagesCache[url] = img;
    return img;
}

getOrLoadImage(SIAMTECH_LOGO_URL);
getOrLoadImage(ITM_LOGO_URL);
RANK_TIERS.forEach(t => getOrLoadImage(t.artImgUrl));

// =========================================================================
// 📦 สถานะของแอป
// =========================================================================
let model = null;
let cocoModel = null;
let maxPredictions = 0;
let mediaStream = null;
let cameraReady = false;
let cameraStarting = false;
let isAnalyzing = false;
let currentUser = null;
let currentRole = 'student';     // บทบาทของผู้ใช้ที่ล็อกอินอยู่ (student / teacher / guest)
let authRole = 'student';        // ประเภทผู้ใช้ที่เลือกในหน้าเข้าสู่ระบบ
let userTotalScore = 0;
let userDaysInactive = 0;
let scoreLoaded = false;
let selectedCertTier = RANK_TIERS[0];
let currentDetectedItems = [];
let lastRawCanvas = null;        // ภาพต้นฉบับ (ไม่มีกรอบสี) ของการสแกนล่าสุด
let lastAnalysisSource = 'local';
let lastElapsed = '0';
let itemsCorrected = false;
let scanTimerId = null;
let toastTimer = null;
let pendingCelebrateTier = null;
let tipTimer = null;
let tipIdx = Math.floor(Math.random() * TIPS.length);
let tipShowing = false;
let campusState = null;
let campusTimer = null;
let campusLoading = false;
let tourActive = false;
let tourIndex = 0;
let guideActiveClass = FIX_CLASSES[0];
let guideReturnToFix = false;
let fixDraft = null;             // ค่าที่เลือกค้างไว้ในหน้าแก้ประเภท (ตอนสลับไปดูคู่มือ)
let otpUser = '';                // ชื่อผู้ใช้ที่กำลังขอ OTP
let otpEmail = '';               // อีเมลที่กำลังขอ OTP
let otpCooldownTimer = null;
const countAnims = new WeakMap();
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

// ดึงข้อความตามบทบาท
function T(key) {
    const d = TEXTS[currentRole] || TEXTS.student;
    return d[key] !== undefined ? d[key] : TEXTS.student[key];
}

// 👀 ผู้เยี่ยมชม (ไม่ได้ลงทะเบียน)
function isGuest() {
    return !!(currentUser && currentUser.guest);
}

function getGuestId() {
    let id = '';
    try { id = localStorage.getItem(GUEST_ID_KEY) || ''; } catch (e) {}
    if (!/^[a-z0-9]{12,40}$/.test(id)) {
        id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        try { localStorage.setItem(GUEST_ID_KEY, id); } catch (e) {}
    }
    return id;
}

function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isShowingCapture() {
    return !document.getElementById('captureWrap').classList.contains('hidden');
}

function isAppVisible() {
    return !document.getElementById('appSection').classList.contains('hidden');
}

function setBtnLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
        btn.dataset.label = btn.dataset.label || btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>' + (label || 'กำลังดำเนินการ...');
    } else {
        btn.disabled = false;
        if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
        delete btn.dataset.label;
    }
}

// --- ตรวจอีเมลตามบทบาท ---
function emailParts(email) {
    const m = String(email || '').trim().toLowerCase().match(/^([a-z0-9._%+\-]+)@([a-z0-9.\-]+)$/);
    return m ? { local: m[1], domain: m[2] } : null;
}

function emailError(email, role) {
    const p = emailParts(email);
    const dom = role === 'teacher' ? TEACHER_EMAIL_DOMAIN : STUDENT_EMAIL_DOMAIN;
    if (!p || p.domain !== dom) return `กรุณาใช้อีเมลของวิทยาลัย (ลงท้ายด้วย @${dom})`;
    if (role === 'teacher' && !/[a-z]/.test(p.local)) return `อีเมลอาจารย์ต้องเป็นแบบชื่อ เช่น somchai.k@${dom} (ไม่ใช่ตัวเลข)`;
    return '';
}

function isAnyAllowedEmail(email) {
    const p = emailParts(email);
    return !!p && (p.domain === STUDENT_EMAIL_DOMAIN || p.domain === TEACHER_EMAIL_DOMAIN);
}

// ปิดโปรไฟล์ก่อน แล้วค่อยเปิดหน้าต่างใหม่ (กันหน้าต่างซ้อนกัน)
function swapFromProfile(showFn) {
    const profileEl = document.getElementById('profileModal');
    const pm = bootstrap.Modal.getInstance(profileEl);
    if (pm && profileEl.classList.contains('show')) {
        profileEl.addEventListener('hidden.bs.modal', showFn, { once: true });
        pm.hide();
    } else {
        showFn();
    }
}

// =========================================================================
// 🚀 เริ่มต้น
// =========================================================================
window.onload = function() {
    initLeaves();

    let savedRole = 'student';
    try { savedRole = localStorage.getItem(AUTH_ROLE_KEY) || 'student'; } catch (e) {}
    setAuthRole(savedRole);

    const saved = localStorage.getItem('smartBinUser');
    let guestSaved = false;
    try { guestSaved = sessionStorage.getItem(GUEST_SESSION_KEY) === '1'; } catch (e) {}
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            showApp();
        } catch (e) {
            localStorage.removeItem('smartBinUser');
        }
    } else if (guestSaved) {
        enterGuestMode(true);
    }

    // รองรับการกดปุ่ม Enter
    const passInput = document.getElementById('logPass');
    if (passInput) {
        passInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') doLogin();
        });
    }
    const otpInput = document.getElementById('fgOtp');
    if (otpInput) {
        otpInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
        });
    }
    const fgEmail = document.getElementById('fgEmail');
    if (fgEmail) {
        fgEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') doRequestOtp(false);
        });
    }
};

// ปิดกล้องเมื่อสลับไปแอปอื่น / เปิดใหม่อัตโนมัติเมื่อกลับมา
document.addEventListener('visibilitychange', function() {
    if (!isAppVisible()) return;
    if (document.hidden) {
        if (cameraReady) stopLiveVideo();
    } else {
        setAppHeight();
        if (!isShowingCapture() && !cameraReady) startLiveVideo();
        refreshCampus();
    }
});

// วาดกรอบ/ตำแหน่งทัวร์ใหม่เมื่อหมุนจอ/ปรับขนาด
window.addEventListener('resize', function() {
    if (isShowingCapture() && currentDetectedItems.length > 0) renderBoxes(currentDetectedItems, false);
    if (tourActive) positionTour();
});

// ปิดคู่มือแล้ว ถ้าเปิดมาจากหน้าแก้ประเภท ให้กลับไปหน้าแก้ประเภท
document.getElementById('guideModal').addEventListener('hidden.bs.modal', function() {
    if (guideReturnToFix) {
        guideReturnToFix = false;
        openFixModal();
    }
});

// =========================================================================
// 🗣️ ปรับข้อความในแอปตามบทบาท
// =========================================================================
function applyRoleTexts() {
    const teacher = currentRole === 'teacher';
    const guest = currentRole === 'guest';
    document.body.classList.toggle('teacher-ui', teacher);
    document.body.classList.toggle('guest-mode', guest);
    document.getElementById('dispRole').classList.toggle('hidden', !teacher);
    document.getElementById('dispGuestLine').classList.toggle('hidden', !guest);
    document.getElementById('camGuideTitle').textContent = T('camTitle');
    document.getElementById('camGuideSub').textContent = T('camSub');
    document.getElementById('hintText').textContent = T('defaultHint');
    document.getElementById('scanLabelText').textContent = T('scanning');
    document.getElementById('campusLead').textContent = T('campusLead');
    document.getElementById('campusUnit').textContent = T('unit');
    document.getElementById('missionLabel').textContent = T('missionLabel');
    document.getElementById('guideHintBtn').textContent = T('guideHint');
    document.getElementById('profileTitle').textContent = T('profileTitle');
    document.getElementById('tierUpSub').textContent = T('tierUpSub');
}

// =========================================================================
// 🍃 ใบไม้ลอยพื้นหลัง
// =========================================================================
function initLeaves() {
    const layer = document.getElementById('leafLayer');
    if (!layer || REDUCED_MOTION) return;
    const icons = ['🍃', '🌿', '🍃', '🍀', '🍃'];
    let html = '';
    for (let i = 0; i < LEAF_COUNT; i++) {
        const x = Math.round(Math.random() * 100);
        const size = (0.9 + Math.random() * 0.9).toFixed(2);
        const dur = (14 + Math.random() * 12).toFixed(1);
        const delay = (-Math.random() * 26).toFixed(1);
        const sway = Math.round(20 + Math.random() * 40);
        const op = (0.18 + Math.random() * 0.22).toFixed(2);
        html += `<span class="leaf" style="--x:${x}%; --size:${size}rem; --dur:${dur}s; --delay:${delay}s; --sway:${sway}px; --op:${op};">${icons[i % icons.length]}</span>`;
    }
    layer.innerHTML = html;
}

// =========================================================================
// 💡 สลับข้อความ "กดชัตเตอร์" กับเคล็ดลับแยกขยะบนฝาถัง
// (ป้ายมีขนาดคงที่ เปลี่ยนเฉพาะข้อความด้านใน จึงไม่เกิดภาพซ้อนบน Safari)
// =========================================================================
function startTips() {
    stopTips();
    const label = document.getElementById('statusText');
    label.textContent = T('snapPrompt');
    tipShowing = false;
    tipTimer = setInterval(() => {
        label.classList.add('fade');
        setTimeout(() => {
            if (!tipTimer) return;
            const tips = T('tips');
            if (tipShowing) {
                label.classList.remove('tip-mode');
                label.textContent = T('snapPrompt');
            } else {
                label.classList.add('tip-mode');
                label.textContent = '💡 ' + tips[tipIdx % tips.length];
                tipIdx = (tipIdx + 1) % tips.length;
            }
            tipShowing = !tipShowing;
            label.classList.remove('fade');
        }, 300);
    }, TIP_INTERVAL_MS);
}

function stopTips() {
    clearInterval(tipTimer);
    tipTimer = null;
    tipShowing = false;
    document.getElementById('statusText').classList.remove('tip-mode', 'fade');
}

// =========================================================================
// 📘 คู่มือแยกขยะ
// =========================================================================
function textColorFor(cls) { return cls === 'Recyclable Waste' ? '#212121' : '#FFFFFF'; }

function renderGuideTabs() {
    document.getElementById('guideTabs').innerHTML = FIX_CLASSES.map(cls => {
        const info = WASTE_MAP[cls];
        return `<button type="button" class="guide-tab ${cls === guideActiveClass ? 'active' : ''}" style="--c:${info.color}; --fg:${textColorFor(cls)};" onclick="selectGuideTab('${cls}')"><span class="gt-dot"></span>${info.th}</button>`;
    }).join('');
}

function renderGuidePanel() {
    const cls = guideActiveClass;
    const info = WASTE_MAP[cls];
    const g = WASTE_GUIDE[cls];
    const li = arr => arr.map(x => `<li>${escapeHtml(x)}</li>`).join('');
    document.getElementById('guidePanel').innerHTML = `
        <div class="guide-head" style="--c:${info.color}; --fg:${textColorFor(cls)};">
            <div class="gh-title">${info.th} • ${info.binText}</div>
            <div class="gh-desc">${escapeHtml(g.desc)}</div>
        </div>
        <div class="guide-sec-title">✅ ตัวอย่างขยะประเภทนี้</div>
        <div class="guide-chips">${g.examples.map(x => `<span class="guide-chip">${escapeHtml(x)}</span>`).join('')}</div>
        <div class="guide-sec-title">🧽 เตรียมก่อนทิ้ง</div>
        <ul class="guide-list">${li(g.prep)}</ul>
        <div class="guide-sec-title">⚠️ มักแยกผิด</div>
        <div class="guide-mistake"><ul class="guide-list">${li(g.mistakes)}</ul></div>`;
}

function selectGuideTab(cls) {
    if (!WASTE_GUIDE[cls]) return;
    guideActiveClass = cls;
    renderGuideTabs();
    renderGuidePanel();
}

function renderGuideSearch(q) {
    const box = document.getElementById('guideSearchResults');
    const query = String(q || '').trim().toLowerCase();
    if (!query) { box.classList.add('hidden'); box.innerHTML = ''; return; }

    const hits = [];
    FIX_CLASSES.forEach(cls => {
        WASTE_GUIDE[cls].examples.forEach(name => {
            if (name.toLowerCase().indexOf(query) !== -1) hits.push({ cls, name });
        });
    });

    box.classList.remove('hidden');
    if (hits.length === 0) {
        box.innerHTML = '<div class="gs-empty">ไม่พบในคู่มือ ลองพิมพ์คำอื่น หรือดูจากแท็บด้านล่าง</div>';
        return;
    }
    box.innerHTML = hits.slice(0, 8).map(h => {
        const info = WASTE_MAP[h.cls];
        return `<div class="gs-row" onclick="selectGuideTab('${h.cls}')"><span>${escapeHtml(h.name)}</span><span class="gs-bin" style="--c:${info.color}; --fg:${textColorFor(h.cls)};">${info.binText}</span></div>`;
    }).join('');
}

function openGuide(cls, fromFix) {
    guideReturnToFix = !!fromFix;
    selectGuideTab(WASTE_GUIDE[cls] ? cls : (guideActiveClass || FIX_CLASSES[0]));
    const search = document.getElementById('guideSearch');
    search.value = '';
    renderGuideSearch('');
    document.getElementById('guideBackToFix').classList.toggle('hidden', !fromFix);
    new bootstrap.Modal(document.getElementById('guideModal')).show();
}

function openGuideForResult() {
    const first = currentDetectedItems && currentDetectedItems[0];
    openGuide(first ? first.className : null, false);
}

// เปิดคู่มือจากหน้าแก้ประเภท: จำค่าที่เลือกไว้ ปิดหน้าแก้ไข แล้วค่อยเปิดคู่มือ
function openGuideFromFix() {
    fixDraft = currentDetectedItems.map((it, idx) => {
        const s = document.getElementById('fixSel_' + idx);
        return s ? s.value : it.className;
    });
    const firstReal = fixDraft.find(v => WASTE_GUIDE[v]);
    const fixEl = document.getElementById('fixModal');
    const fm = bootstrap.Modal.getInstance(fixEl);
    if (fm) {
        fixEl.addEventListener('hidden.bs.modal', () => openGuide(firstReal, true), { once: true });
        fm.hide();
    } else {
        openGuide(firstReal, true);
    }
}

// =========================================================================
// 😊 อารมณ์ของน้องถัง: idle | thinking | happy | sad | angry
// =========================================================================
function setMood(mood) {
    const lid = document.getElementById('binLid');
    lid.classList.remove('mood-idle', 'mood-thinking', 'mood-happy', 'mood-sad', 'mood-angry');
    void lid.offsetWidth;
    lid.classList.add('mood-' + mood);
}

// =========================================================================
// ✨ เอฟเฟกต์: แจ้งเตือน, ตัวเลขนับขึ้น, +N ลอย, พลุ
// =========================================================================
function showToast(msg, ms) {
    const t = document.getElementById('appToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
}

function countUp(el, from, to, dur = 700, fmt) {
    if (!el) return;
    const f = fmt || (n => String(n));
    const prev = countAnims.get(el);
    if (prev) cancelAnimationFrame(prev);
    el.dataset.val = to;
    if (REDUCED_MOTION || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now();
    function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = f(Math.round(from + (to - from) * e));
        if (p < 1) countAnims.set(el, requestAnimationFrame(step));
    }
    countAnims.set(el, requestAnimationFrame(step));
}

function bump(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
}

function popBadge() {
    const badgeBox = document.getElementById('userBadgeBox');
    badgeBox.classList.remove('score-pop');
    void badgeBox.offsetWidth;
    badgeBox.classList.add('score-pop');
}

function flyPoints(n, fromEl, toEl) {
    return new Promise(resolve => {
        if (REDUCED_MOTION || !fromEl || !toEl || !document.body.animate) return resolve();
        const a = fromEl.getBoundingClientRect();
        const b = toEl.getBoundingClientRect();
        const sx = a.left + a.width / 2;
        const sy = a.top + a.height / 2;
        const dx = (b.left + b.width / 2) - sx;
        const dy = (b.top + b.height / 2) - sy;

        const el = document.createElement('div');
        el.className = 'fly-points';
        el.textContent = `+${n} ♻️`;
        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        document.body.appendChild(el);

        const anim = el.animate([
            { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
            { transform: 'translate(-50%, -160%) scale(1.25)', opacity: 1, offset: 0.3 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0.4 }
        ], { duration: 950, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });

        anim.onfinish = () => { el.remove(); resolve(); };
        anim.oncancel = () => { el.remove(); resolve(); };
    });
}

function fireConfetti(color, small) {
    if (REDUCED_MOTION || typeof confetti !== 'function') return;
    const colors = [color || '#22C55E', '#FFD700', '#22C55E', '#FFFFFF'];
    if (small) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 }, colors: colors, zIndex: 3000 });
        return;
    }
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: colors, zIndex: 3000 });
    setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: colors, zIndex: 3000 });
        confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: colors, zIndex: 3000 });
    }, 250);
}

function celebrateTierUp(tier) {
    pendingCelebrateTier = tier;
    document.getElementById('tierUpName').textContent = tier.name;
    document.getElementById('tierUpNameEn').textContent = tier.nameEn;
    document.getElementById('tierUpDesc').textContent = tier.desc;
    const art = document.getElementById('tierUpArt');
    art.classList.remove('hidden');
    art.src = tier.artImgUrl;
    new bootstrap.Modal(document.getElementById('tierUpModal')).show();
    fireConfetti(tier.primaryColor);
}

function openTierCertFromCelebration() {
    const m = bootstrap.Modal.getInstance(document.getElementById('tierUpModal'));
    if (m) m.hide();
    if (pendingCelebrateTier) {
        const t = pendingCelebrateTier;
        setTimeout(() => openCertificatePreview(t), 350);
    }
}

// 🗑️ ฝาเปิด → ขยะหล่นลงถัง → ฝาปิด → ถังเด้ง
async function playGulp() {
    const lid = document.getElementById('binLid');
    const body = document.getElementById('binBody');
    const wrap = document.getElementById('captureWrap');
    setMood('happy');
    if (REDUCED_MOTION) { wrap.classList.add('gone'); return; }
    lid.classList.add('lid-open');
    await sleep(220);
    wrap.classList.add('dropping');
    await sleep(600);
    lid.classList.remove('lid-open');
    body.classList.add('gulp');
    await sleep(450);
    body.classList.remove('gulp');
}

function restoreAfterFailedGulp() {
    const wrap = document.getElementById('captureWrap');
    wrap.classList.remove('dropping', 'gone');
    document.getElementById('binLid').classList.remove('lid-open');
    document.getElementById('binBody').classList.remove('gulp');
}

// 🔦 เลเซอร์สแกน + ตัวนับเวลา
function startScanFx() {
    const ov = document.getElementById('scanOverlay');
    const lbl = document.getElementById('scanTimer');
    ov.classList.remove('hidden');
    const t0 = performance.now();
    lbl.textContent = '0.0';
    clearInterval(scanTimerId);
    scanTimerId = setInterval(() => {
        lbl.textContent = ((performance.now() - t0) / 1000).toFixed(1);
    }, 100);
}

function stopScanFx() {
    clearInterval(scanTimerId);
    scanTimerId = null;
    document.getElementById('scanOverlay').classList.add('hidden');
}

// =========================================================================
// 🌏 ตัวเลขทั้งวิทยาลัย + 🎯 ภารกิจประจำวัน
// =========================================================================
function fmtNum(n) { return Number(n || 0).toLocaleString('th-TH'); }

function setCampusCount(n, animate = true) {
    const el = document.getElementById('campusCount');
    const from = Number(el.dataset.val || 0);
    countUp(el, animate ? from : n, n, 900, fmtNum);
    if (animate && n > from && el.dataset.loaded === '1') bump(el);
    el.dataset.loaded = '1';
}

function renderMission(m) {
    if (!m) return;
    const card = document.getElementById('missionCard');
    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
    document.getElementById('missionIcon').textContent = m.done ? '✅' : (m.icon || '🎯');
    document.getElementById('missionLabel').textContent = m.done ? T('missionDoneLabel') : T('missionLabel');
    document.getElementById('missionText').textContent = m.done ? T('missionDoneText') : (T('missionText') || m.text);
    document.getElementById('missionCount').textContent = `${m.progress}/${m.target}`;
    document.getElementById('missionFill').style.width = pct + '%';
    card.classList.toggle('done', !!m.done);
}

function applyCampus(res, fromSave) {
    setCampusCount(res.todayTotal);

    const sub = document.getElementById('campusSub');
    if (res.todayTotal === 0) {
        sub.textContent = T('campusNone');
    } else if (res.myToday > 0) {
        sub.textContent = T('campusMine')(fmtNum(res.myToday));
    } else {
        sub.textContent = T('campusJoin');
    }

    const m = res.mission;
    const before = campusState && campusState.mission;
    const wasDone = before && before.id === (m && m.id) && before.done;
    renderMission(m);

    if (fromSave && m && m.done && !wasDone && campusState) {
        setTimeout(() => {
            showToast(T('missionToast'));
            fireConfetti('#F59E0B', true);
        }, 2900);
    }
    campusState = res;
}

function refreshCampus(fromSave) {
    if (!currentUser || (campusLoading && !fromSave)) return Promise.resolve();
    campusLoading = true;
    return callApi('getCampusStats', [isGuest() ? '' : currentUser.studentId])
        .then(res => { if (res && res.success) applyCampus(res, !!fromSave); })
        .catch(err => console.warn('campus stats error:', err))
        .finally(() => { campusLoading = false; });
}

function startCampusPolling() {
    refreshCampus();
    clearInterval(campusTimer);
    campusTimer = setInterval(() => {
        if (!document.hidden && isAppVisible()) refreshCampus();
    }, CAMPUS_REFRESH_MS);
}

// =========================================================================
// 🧭 ทัวร์แนะนำการใช้งาน
// =========================================================================
function tourSteps() {
    if (currentRole === 'guest') return TOUR_STEPS_GUEST;
    return currentRole === 'teacher' ? TOUR_STEPS_TEACHER : TOUR_STEPS_STUDENT;
}

function startTour() {
    if (!isAppVisible()) return;
    tourActive = true;
    tourIndex = 0;
    document.getElementById('tourBlock').classList.remove('hidden');
    document.getElementById('tourSpot').classList.remove('hidden');
    document.getElementById('tourTip').classList.remove('hidden');
    document.getElementById('tourDots').innerHTML = tourSteps().map(() => '<span></span>').join('');
    showTourStep(0);
}

async function showTourStep(i) {
    const steps = tourSteps();
    while (i < steps.length) {
        const t = document.getElementById(steps[i].el);
        if (t && t.offsetParent !== null) break;
        i++;
    }
    if (i >= steps.length) { endTour(); return; }
    tourIndex = i;

    const step = steps[i];
    document.getElementById('tourTitle').textContent = step.title;
    document.getElementById('tourBody').textContent = step.body;
    document.getElementById('tourNext').textContent = (i === steps.length - 1) ? 'เริ่มใช้งาน' : 'ถัดไป';
    document.querySelectorAll('#tourDots span').forEach((d, k) => d.classList.toggle('on', k === i));

    positionTour();
    await sleep(380);
    if (tourActive && tourIndex === i) positionTour();
}

function positionTour() {
    if (!tourActive) return;
    const step = tourSteps()[tourIndex];
    const target = step && document.getElementById(step.el);
    if (!target) return;

    const spot = document.getElementById('tourSpot');
    const tip = document.getElementById('tourTip');
    const r = target.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let top = r.bottom + pad + 12;
    if (top + th > vh - 12) top = r.top - pad - 12 - th;
    if (top < 12) top = Math.min(vh - th - 12, r.bottom - th - 12);
    top = Math.max(12, top);
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(12, Math.min(vw - tw - 12, left));

    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
}

function nextTourStep() {
    if (tourIndex >= tourSteps().length - 1) { endTour(); return; }
    showTourStep(tourIndex + 1);
}

function endTour() {
    tourActive = false;
    document.getElementById('tourBlock').classList.add('hidden');
    document.getElementById('tourSpot').classList.add('hidden');
    document.getElementById('tourTip').classList.add('hidden');
    try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {}
}

function maybeStartFirstTour() {
    let seen = false;
    try { seen = !!localStorage.getItem(TOUR_KEY); } catch (e) {}
    if (!seen) {
        setTimeout(() => { if (!tourActive && isAppVisible()) startTour(); }, 1200);
    } else if (isGuest()) {
        setTimeout(() => {
            if (!tourActive && isAppVisible()) showToast(T('guestWelcome'), 3500);
        }, 1500);
    } else if (currentUser && !currentUser.email) {
        // เตือนบัญชีที่ยังไม่ผูกอีเมล
        setTimeout(() => {
            if (!tourActive && isAppVisible()) showToast(T('emailNudge'), 4500);
        }, 3500);
    }
}

// =========================================================================
// 🏅 ระดับการรับรอง + ปุ่มประกาศนียบัตร
// =========================================================================
function getRankInfo(score) {
    let currentTier = null;
    let nextTier = RANK_TIERS[0];
    for (let i = 0; i < RANK_TIERS.length; i++) {
        if (score >= RANK_TIERS[i].minScore) {
            currentTier = RANK_TIERS[i];
            nextTier = RANK_TIERS[i + 1] || null;
        }
    }
    return { currentTier, nextTier };
}

function refreshCertificateButtons(score, daysInactive) {
    userTotalScore = score;
    userDaysInactive = daysInactive || 0;
    scoreLoaded = true;

    const { currentTier, nextTier } = getRankInfo(score);
    const highestTier = currentTier || RANK_TIERS[0];
    selectedCertTier = highestTier;

    const flameOut = score === 0 || (userDaysInactive >= 3 && score > 0);
    const flameEl = document.getElementById('dispFlameIcon');
    flameEl.textContent = '🔥';
    flameEl.style.filter = '';
    flameEl.classList.add('flame');
    flameEl.classList.toggle('flame-out', flameOut);

    // 🏅 ปุ่มประกาศนียบัตรบนแถบบนสุด
    const certBtn = document.getElementById('btnCertTop');
    const certLabel = currentTier
        ? `ดาวน์โหลดประกาศนียบัตร (ระดับ${currentTier.name})`
        : 'ดูเกณฑ์การรับรองมาตรฐาน (ESG Tiers)';
    certBtn.classList.toggle('locked', !currentTier);
    certBtn.style.setProperty('--tier', currentTier ? currentTier.primaryColor : '#64748B');
    certBtn.title = certLabel;
    certBtn.setAttribute('aria-label', certLabel);

    // ปุ่มประกาศนียบัตรในหน้าโปรไฟล์ (2 บรรทัด)
    document.getElementById('modalCertLine1').textContent = currentTier ? 'ดาวน์โหลดประกาศนียบัตร' : 'ดูเกณฑ์การรับรองมาตรฐาน';
    document.getElementById('modalCertLine2').textContent = currentTier ? `ระดับ${currentTier.name}` : 'ESG Tiers • บันทึกรายการแรกเพื่อปลดล็อก';

    const streakCard = document.getElementById('modalStreakCard');
    const streakIcon = document.getElementById('modalStreakIcon');
    const streakTitle = document.getElementById('modalStreakTitle');
    const streakDesc = document.getElementById('modalStreakDesc');
    const rankTitle = document.getElementById('modalRankTitle');
    const rankBar = document.getElementById('modalRankBar');
    const rankSub = document.getElementById('modalRankSub');

    streakIcon.textContent = '🔥';
    streakIcon.classList.add('flame');
    streakIcon.classList.toggle('flame-out', flameOut);

    if (userDaysInactive >= 3 && score > 0) {
        streakCard.classList.remove('active');
        streakTitle.innerText = 'ขาดการบันทึกความต่อเนื่อง';
        streakDesc.innerText = `ไม่ได้บันทึกมา ${userDaysInactive} วัน — คัดแยกขยะ 1 รายการเพื่อกลับสู่สถานะต่อเนื่อง`;
        rankTitle.innerHTML = `ระดับปัจจุบัน: <span class="text-secondary">${highestTier.name} (${highestTier.nameEn})</span>`;
    } else if (score === 0) {
        streakCard.classList.remove('active');
        streakTitle.innerText = 'ยังไม่มีประวัติการบันทึก';
        streakDesc.innerText = 'เริ่มต้นคัดแยกขยะรายการแรกเพื่อรับการรับรองมาตรฐานขั้นแรก';
        rankTitle.innerText = 'ระดับการรับรอง: ยังไม่เข้าเกณฑ์ (ต้องมีอย่างน้อย 1 คะแนน)';
    } else {
        streakCard.classList.add('active');
        streakTitle.innerText = 'ความต่อเนื่องระดับมาตรฐาน (Active)';
        streakDesc.innerText = 'รักษามาตรฐานการคัดแยกอย่างสม่ำเสมอตามเกณฑ์ ESG';
        rankTitle.innerHTML = `ระดับการรับรอง: <span style="color:#0F172A; font-weight:800;">${highestTier.name} (${highestTier.nameEn})</span>`;
    }

    if (!nextTier && score >= RANK_TIERS[RANK_TIERS.length - 1].minScore) {
        rankBar.style.width = '100%';
        rankSub.innerText = 'บรรลุเกณฑ์การรับรองระดับสูงสุด (Excellence Level) เรียบร้อยแล้ว';
    } else if (nextTier) {
        const prevMin = currentTier ? currentTier.minScore : 0;
        const progress = Math.min(100, Math.round(((score - prevMin) / (nextTier.minScore - prevMin)) * 100));
        rankBar.style.width = `${progress}%`;
        rankSub.innerText = `ต้องการอีก ${nextTier.minScore - score} คะแนน เพื่อเลื่อนสู่ระดับ "${nextTier.name}" (${nextTier.nameEn})`;
    }
}
