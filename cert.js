// =========================================================================
// 🎓 น้องถังช่วยทิ้ง • วาดและดาวน์โหลดประกาศนียบัตร (Canvas 1490x1055)
// (ต้องโหลดหลัง app.js)
// =========================================================================

const CERT_TEXT_MAX_W = 1270;            // ความกว้างสูงสุดของข้อความ (กันล้นขอบ)
const CERT_FONTS = [
    '800 64px "Prompt"', '700 22px "Prompt"', '600 24px "Prompt"', '500 24px "Prompt"',
    '800 56px "Cinzel"', '700 32px "Cinzel"'
];
let certBlob = null;                     // ไฟล์ PNG ที่เตรียมไว้ล่วงหน้า (กดบันทึกแล้วใช้ได้ทันที)
let certImgUrl = null;
let certDrawSeq = 0;
let certSkipImages = false;              // ถ้ารูปจากภายนอกทำให้ส่งออกไม่ได้ จะวาดใหม่โดยไม่ใส่รูป
let certMeasureEl = null;

// 🌐 ลายจุดเชื่อมต่อเทคโนโลยีด้านหลังประกาศนียบัตร
function drawTechNetwork(ctx, W, H) {
    ctx.save();

    const leftNodes = [
        [35, 220], [110, 270], [45, 360], [130, 420], [60, 520],
        [145, 580], [70, 680], [125, 750], [50, 830]
    ];
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < leftNodes.length; i++) {
        ctx.beginPath();
        ctx.arc(leftNodes[i][0], leftNodes[i][1], 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(leftNodes[i - 1][0], leftNodes[i - 1][1]);
            ctx.lineTo(leftNodes[i][0], leftNodes[i][1]);
            ctx.stroke();
        }
        if (i > 1) {
            ctx.beginPath();
            ctx.moveTo(leftNodes[i - 2][0], leftNodes[i - 2][1]);
            ctx.lineTo(leftNodes[i][0], leftNodes[i][1]);
            ctx.stroke();
        }
    }

    const rightNodes = [
        [W - 55, 190], [W - 130, 250], [W - 60, 340], [W - 150, 410],
        [W - 90, 500], [W - 180, 560], [W - 270, 640], [W - 380, 710],
        [W - 470, 770], [W - 320, 820], [W - 420, 880]
    ];
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';

    for (let i = 0; i < rightNodes.length; i++) {
        ctx.beginPath();
        ctx.arc(rightNodes[i][0], rightNodes[i][1], 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightNodes[i][0], rightNodes[i][1], 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.18)';
        ctx.stroke();

        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(rightNodes[i - 1][0], rightNodes[i - 1][1]);
            ctx.lineTo(rightNodes[i][0], rightNodes[i][1]);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)';
            ctx.stroke();
        }
        if (i > 1 && i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(rightNodes[i - 2][0], rightNodes[i - 2][1]);
            ctx.lineTo(rightNodes[i][0], rightNodes[i][1]);
            ctx.stroke();
        }
    }

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.22)';
    ctx.lineWidth = 1;
    const gx = W - 520, gy = H - 260;
    for (let r = 0; r <= 5; r++) {
        ctx.beginPath();
        ctx.moveTo(gx + r * 35, gy + r * 20);
        ctx.lineTo(gx + 320 + r * 35, gy + r * 20);
        ctx.stroke();
    }
    for (let c = 0; c <= 6; c++) {
        ctx.beginPath();
        ctx.moveTo(gx + c * 50, gy);
        ctx.lineTo(gx + 175 + c * 50, gy + 100);
        ctx.stroke();
    }

    ctx.restore();
}

// ลำดับการวาด: พื้นหลัง → ลวดลาย/โลโก้/รูปประกอบ → พื้นขาวเบลอ → ข้อความทั้งหมด (อยู่บนสุดเสมอ)
function renderCertificate(tier) {
    const canvas = document.getElementById('certCanvas');
    const ctx = canvas.getContext('2d');
    const W = 1490;
    const H = 1055;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    drawTechNetwork(ctx, W, H);

    // กรอบทอง
    ctx.save();
    ctx.strokeStyle = '#E5C05B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(36, 36);
    ctx.lineTo(W - 36, 36);
    ctx.lineTo(W - 36, H - 320);
    ctx.lineTo(W - 305, H - 36);
    ctx.lineTo(36, H - 36);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // มุมซ้ายบน
    ctx.save();
    ctx.fillStyle = '#0B1E36';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(260, 0);
    ctx.lineTo(0, 210);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(270, 0);
    ctx.lineTo(0, 220);
    ctx.stroke();

    ctx.fillStyle = '#1A365D';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(170, 0);
    ctx.lineTo(0, 135);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // มุมซ้ายล่าง
    ctx.save();
    ctx.fillStyle = '#0B1E36';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(260, H);
    ctx.lineTo(0, H - 210);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(270, H);
    ctx.lineTo(0, H - 220);
    ctx.stroke();

    ctx.fillStyle = '#1A365D';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(170, H);
    ctx.lineTo(0, H - 135);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // โลโก้
    const siamtechImg = getOrLoadImage(SIAMTECH_LOGO_URL);
    if (!certSkipImages && siamtechImg && siamtechImg.complete && siamtechImg.naturalWidth > 0) {
        const scaleL = Math.min(150 / siamtechImg.naturalWidth, 130 / siamtechImg.naturalHeight);
        ctx.drawImage(siamtechImg, 80, 75, siamtechImg.naturalWidth * scaleL, siamtechImg.naturalHeight * scaleL);
    }

    const itmImg = getOrLoadImage(ITM_LOGO_URL);
    if (!certSkipImages && itmImg && itmImg.complete && itmImg.naturalWidth > 0) {
        const scaleI = Math.min(150 / itmImg.naturalWidth, 130 / itmImg.naturalHeight);
        const iw = itmImg.naturalWidth * scaleI;
        ctx.drawImage(itmImg, W - 80 - iw, 75, iw, itmImg.naturalHeight * scaleI);
    }

    // รูปประกอบประจำระดับ (มุมขวาล่าง)
    const tierArtImg = getOrLoadImage(tier.artImgUrl);
    if (!certSkipImages && tierArtImg && tierArtImg.complete && tierArtImg.naturalWidth > 0) {
        const imgScale = Math.min(460 / tierArtImg.naturalWidth, 440 / tierArtImg.naturalHeight);
        const drawW = tierArtImg.naturalWidth * imgScale;
        const drawH = tierArtImg.naturalHeight * imgScale;
        ctx.drawImage(tierArtImg, W - 50 - drawW, H - 55 - drawH, drawW, drawH);
    }

    // พื้นขาวเบลอด้านหลังข้อความระดับ (วาดก่อนข้อความทั้งหมด จะได้ไม่บังรหัส)
    const backdropCY = 670;
    ctx.save();
    const whiteBackdrop = ctx.createRadialGradient(W / 2, backdropCY, 60, W / 2, backdropCY, 540);
    whiteBackdrop.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    whiteBackdrop.addColorStop(0.55, 'rgba(255, 255, 255, 0.82)');
    whiteBackdrop.addColorStop(0.85, 'rgba(255, 255, 255, 0.35)');
    whiteBackdrop.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = whiteBackdrop;
    ctx.beginPath();
    ctx.ellipse(W / 2, backdropCY, 580, 115, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // มุมขวาล่าง
    ctx.save();
    ctx.fillStyle = '#0B1E36';
    ctx.beginPath();
    ctx.moveTo(W, H);
    ctx.lineTo(W - 275, H);
    ctx.lineTo(W, H - 290);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W - 285, H);
    ctx.lineTo(W, H - 300);
    ctx.stroke();

    ctx.fillStyle = '#1A365D';
    ctx.beginPath();
    ctx.moveTo(W, H);
    ctx.lineTo(W - 180, H);
    ctx.lineTo(W, H - 195);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // วาดข้อความกึ่งกลางด้วยการคำนวณตำแหน่งเอง (ไม่พึ่ง textAlign = 'center'
    // เพราะ Safari บน iPhone บางรุ่นจัดกึ่งกลางข้อความภาษาไทยบน canvas ผิด)
    function centeredBox(text, cx, font) {
        ctx.font = font;
        const w = measureCertText(ctx, text, font);
        const fitW = Math.min(w, CERT_TEXT_MAX_W);
        return { x: cx - fitW / 2, maxW: w > CERT_TEXT_MAX_W ? CERT_TEXT_MAX_W : undefined };
    }
    function fillAt(text, b, y) {
        if (b.maxW) ctx.fillText(text, b.x, y, b.maxW); else ctx.fillText(text, b.x, y);
    }
    function strokeAt(text, b, y) {
        if (b.maxW) ctx.strokeText(text, b.x, y, b.maxW); else ctx.strokeText(text, b.x, y);
    }

    function fillGlowingText(text, x, y, font, fillStyle, glowRadius = 30) {
        ctx.save();
        ctx.textAlign = 'left';
        const b = centeredBox(text, x, font);
        ctx.fillStyle = fillStyle;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowBlur = glowRadius;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        fillAt(text, b, y);
        ctx.shadowBlur = 0;
        fillAt(text, b, y);
        ctx.restore();
    }

    function fillFadedWhiteBorderText(text, x, y, font, fillStyle, strokeWidth = 10, blurRadius = 20) {
        ctx.save();
        ctx.textAlign = 'left';
        const b = centeredBox(text, x, font);
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowBlur = blurRadius;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = strokeWidth + 4;
        strokeAt(text, b, y);

        ctx.shadowBlur = Math.round(blurRadius / 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = strokeWidth;
        strokeAt(text, b, y);

        ctx.shadowBlur = 0;
        ctx.fillStyle = fillStyle;
        fillAt(text, b, y);
        ctx.restore();
    }

    ctx.textAlign = 'center';

    fillGlowingText('วิทยาลัยเทคโนโลยีสยาม (สยามเทค)', W / 2, 105, '800 38px "Prompt", sans-serif', '#0F172A', 8);
    fillGlowingText('แผนกเทคโนโลยีสารสนเทศและสื่อดิจิทัล (ITM) • โครงการน้องถังช่วยทิ้ง', W / 2, 155, '600 24px "Prompt", sans-serif', '#0284C7', 8);

    fillGlowingText(tier.certTitleEn, W / 2, 250, '800 56px "Cinzel", serif', '#0B1E36', 12);
    fillGlowingText(tier.certSubtitleEn || 'IN SUSTAINABILITY', W / 2, 305, '700 32px "Cinzel", serif', '#C29B38', 10);

    ctx.save();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 240, 295);
    ctx.lineTo(W / 2 - 160, 295);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + 160, 295);
    ctx.lineTo(W / 2 + 240, 295);
    ctx.stroke();

    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.ellipse(W / 2, 340, 14, 7, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    fillGlowingText('ประกาศนียบัตรฉบับนี้ให้ไว้เพื่อรับรองว่า', W / 2, 400, '500 24px "Prompt", sans-serif', '#475569', 10);

    const recipientName = currentUser ? currentUser.name : 'ผู้เข้าร่วมโครงการ';
    fillGlowingText(recipientName, W / 2, 485, '800 64px "Prompt", sans-serif', '#0B1E36', 20);

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.moveTo(W / 2, 504);
    ctx.lineTo(W / 2 + 7, 511);
    ctx.lineTo(W / 2, 518);
    ctx.lineTo(W / 2 - 7, 511);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, 511);
    ctx.lineTo(W / 2 - 18, 511);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + 18, 511);
    ctx.lineTo(W * 0.72, 511);
    ctx.stroke();
    ctx.restore();

    fillGlowingText(`${T('idLabel')}: ${currentUser ? currentUser.studentId : '-'}`, W / 2, 558, '600 26px "Prompt", sans-serif', '#0F172A', 12);

    let nextTextY = 625;

    if (tier.id === 'participation') {
        fillFadedWhiteBorderText(`ผ่านเกณฑ์การประเมินระดับ "${tier.name}" (${tier.nameEn})`, W / 2, nextTextY, '800 32px "Prompt", sans-serif', '#0F172A', 10, 22);
        nextTextY += 52;
    } else {
        fillFadedWhiteBorderText(`ผ่านเกณฑ์การประเมินระดับ "${tier.name}"`, W / 2, nextTextY, '800 33px "Prompt", sans-serif', '#0F172A', 11, 24);
        fillFadedWhiteBorderText(`(${tier.nameEn})`, W / 2, nextTextY + 42, '700 26px "Cinzel", "Prompt", serif', '#1E3A8A', 9, 20);
        nextTextY += 94;
    }

    fillFadedWhiteBorderText(`มีส่วนร่วมในการคัดแยกขยะต้นทางตามเกณฑ์ ESG รวมทั้งสิ้น ${userTotalScore} หน่วยบันทึก`, W / 2, nextTextY, '500 24px "Prompt", sans-serif', '#1E293B', 8, 18);

    const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    fillGlowingText(`ให้ไว้ ณ วันที่ ${todayStr}`, W / 2, nextTextY + 65, '600 22px "Prompt", sans-serif', '#0F172A', 12);

    // ลายเซ็น
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#0B1E36';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(655, 865);
    ctx.bezierCurveTo(685, 810, 645, 800, 665, 845);
    ctx.bezierCurveTo(685, 885, 735, 830, 765, 840);
    ctx.bezierCurveTo(795, 850, 845, 835, 875, 845);
    ctx.moveTo(715, 855);
    ctx.lineTo(865, 855);
    ctx.stroke();

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(605, 885);
    ctx.lineTo(885, 885);
    ctx.stroke();
    ctx.restore();

    fillGlowingText('(อาจารย์ศักดิ์ดา ฟักขาว)', W / 2, 925, '700 22px "Prompt", sans-serif', '#0F172A', 10);
    fillGlowingText('หัวหน้าแผนกเทคโนโลยีสารสนเทศและสื่อดิจิทัล', W / 2, 955, '500 17px "Prompt", sans-serif', '#475569', 10);
}

// วัดความกว้างข้อความด้วย DOM (แม่นกว่าบน Safari iOS) และใช้ค่าของ canvas เป็นสำรอง
function measureCertText(ctx, text, font) {
    let dom = 0;
    try {
        if (!certMeasureEl) {
            certMeasureEl = document.createElement('span');
            certMeasureEl.setAttribute('aria-hidden', 'true');
            certMeasureEl.style.cssText = 'position:absolute; left:-99999px; top:0; white-space:pre; visibility:hidden; letter-spacing:normal; pointer-events:none;';
            document.body.appendChild(certMeasureEl);
        }
        certMeasureEl.style.font = font;
        certMeasureEl.textContent = text;
        dom = certMeasureEl.getBoundingClientRect().width;
    } catch (e) {}
    const cw = ctx.measureText(text).width;
    return dom > 0 ? Math.max(dom, cw) : cw;
}

function waitImageLoaded(img) {
    if (!img || img.complete) return Promise.resolve();
    return new Promise(r => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
    });
}

// รอฟอนต์ Prompt/Cinzel (ทั้งอักษรไทยและอังกฤษ) และรูปโลโก้ให้โหลดเสร็จก่อนวาดจริง
function certAssetsReady(tier) {
    const jobs = [];
    if (document.fonts && document.fonts.load) {
        CERT_FONTS.forEach(f => jobs.push(document.fonts.load(f, 'กขคศษสัตน์ ABCabc 0123').catch(() => {})));
    }
    [SIAMTECH_LOGO_URL, ITM_LOGO_URL, tier.artImgUrl].forEach(u => jobs.push(waitImageLoaded(getOrLoadImage(u))));
    return Promise.race([Promise.all(jobs), sleep(4000)]);
}

function certDownloadButton() {
    return document.querySelector('#certPreviewModal .btn-cert-corporate');
}

function setCertDownloadBusy(busy) {
    const b = certDownloadButton();
    if (!b) return;
    b.disabled = busy;
    b.style.opacity = busy ? '0.6' : '';
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        } catch (e) {
            reject(e);
        }
    });
}

// แสดงประกาศนียบัตรเป็นรูปภาพ (บน iPhone กดค้างที่รูปเพื่อบันทึกได้)
function showCertImage(blob) {
    const canvas = document.getElementById('certCanvas');
    let img = document.getElementById('certImage');
    if (!img) {
        img = document.createElement('img');
        img.id = 'certImage';
        img.alt = 'ประกาศนียบัตร';
        img.style.cssText = 'width:100%; height:auto; display:block; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.2);';
        canvas.parentNode.insertBefore(img, canvas.nextSibling);
    }
    if (certImgUrl) URL.revokeObjectURL(certImgUrl);
    certImgUrl = URL.createObjectURL(blob);
    img.src = certImgUrl;
    img.classList.remove('hidden');
    canvas.classList.add('hidden');
}

async function prepareCertBlob(tier, seq) {
    const canvas = document.getElementById('certCanvas');
    try {
        const blob = await canvasToBlob(canvas);
        if (seq !== certDrawSeq) return;
        certBlob = blob;
        showCertImage(blob);
    } catch (e) {
        if (!certSkipImages && e && e.name === 'SecurityError') {
            certSkipImages = true;
            renderCertificate(tier);
            return prepareCertBlob(tier, seq);
        }
        console.warn('เตรียมไฟล์ประกาศนียบัตรไม่สำเร็จ:', e);
    }
}

// เรียกจาก account.js: วาดทันที แล้ววาดซ้ำเมื่อฟอนต์/รูปพร้อม จากนั้นเตรียมไฟล์ PNG
function drawCertificateOnCanvas(tier) {
    const seq = ++certDrawSeq;
    certBlob = null;
    const canvas = document.getElementById('certCanvas');
    canvas.classList.remove('hidden');
    const img = document.getElementById('certImage');
    if (img) img.classList.add('hidden');

    renderCertificate(tier);
    setCertDownloadBusy(true);

    certAssetsReady(tier)
        .then(() => {
            if (seq !== certDrawSeq) return;
            renderCertificate(tier);
            return prepareCertBlob(tier, seq);
        })
        .finally(() => { if (seq === certDrawSeq) setCertDownloadBusy(false); });
}

function certFileName() {
    const safeName = (currentUser && currentUser.studentId) ? currentUser.studentId : 'user';
    return `Certificate_ESG_${selectedCertTier.id}_${safeName}.png`;
}

// 💾 บันทึกไฟล์
// - มือถือ: เปิดเมนูแชร์ของระบบ (iPhone เลือก "บันทึกรูปภาพ" ได้)
// - คอมพิวเตอร์: ดาวน์โหลดไฟล์ .png ตามปกติ
function downloadCanvasAsPNG() {
    if (!certBlob) {
        showToast('⏳ กำลังเตรียมไฟล์ กรุณารอสักครู่แล้วกดอีกครั้ง');
        return;
    }
    const name = certFileName();
    let file = null;
    try { file = new File([certBlob], name, { type: 'image/png' }); } catch (e) {}

    const isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (isTouch && file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'ประกาศนียบัตร น้องถังช่วยทิ้ง' })
            .catch(err => {
                if (err && err.name === 'AbortError') return;   // ผู้ใช้กดยกเลิกเอง
                saveCertBlob(name);
            });
        return;
    }
    saveCertBlob(name);
}

function saveCertBlob(name) {
    const url = URL.createObjectURL(certBlob);
    const a = document.createElement('a');
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if ('download' in a) {
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (isIOS) showToast('📥 ถ้าไม่มีหน้าต่างบันทึกขึ้นมา ให้กดค้างที่รูปประกาศนียบัตร แล้วเลือก "บันทึกรูปภาพ"', 5000);
    } else {
        // iOS รุ่นเก่า: เปิดรูปในแท็บใหม่ให้กดค้างบันทึก
        window.open(url, '_blank');
        showToast('📥 กดค้างที่รูป แล้วเลือก "บันทึกรูปภาพ"', 5000);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
