// =========================================================================
// 📷 น้องถังช่วยทิ้ง • หน้าหลัก: กล้อง / ผลสแกน / บันทึกคะแนน / ประวัติ / อันดับ
// (ต้องโหลดหลัง app.js)
// =========================================================================

// =========================================================================
// 📱 แสดงหน้าแอปหลังล็อกอิน
// =========================================================================
function showApp() {
    if (isGuest()) currentRole = 'guest';
    else currentRole = currentUser && currentUser.role === 'teacher' ? 'teacher' : 'student';
    applyRoleTexts();
    setAppHeight();
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('topBar').classList.remove('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('dispName').innerText = currentUser.name;
    document.getElementById('userAvatar').src = currentUser.avatar || defaultAvatar;
    if (!isGuest()) updateScore();
    startCampusPolling();
    loadAIModel();
    startLiveVideo();
    maybeStartFirstTour();
}

// =========================================================================
// 📷 ระบบกล้องสด (Live Camera)
// =========================================================================
function isInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /Line\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|TikTok/i.test(ua);
}

function setCameraUI(state, message, detail) {
    const statusBox = document.getElementById('camStatus');
    const spinner = document.getElementById('camSpinner');
    const errIcon = document.getElementById('camErrIcon');
    const statusTextEl = document.getElementById('camStatusText');
    const detailEl = document.getElementById('camStatusDetail');
    const retryBtn = document.getElementById('btnCamRetry');
    const altBtn = document.getElementById('btnCamAlt');
    const overlay = document.getElementById('overlayGrid');
    const liveBadge = document.getElementById('liveBadge');
    const snapBtn = document.getElementById('btnSnap');
    const lidText = document.getElementById('statusText');

    if (state === 'live') {
        statusBox.classList.add('hidden');
        overlay.classList.remove('hidden');
        overlay.classList.add('is-live');
        liveBadge.classList.remove('hidden');
        snapBtn.disabled = false;
        lidText.style.color = "#333";
        setMood('idle');
        startTips();
        return;
    }

    stopTips();
    statusBox.classList.remove('hidden');
    overlay.classList.add('hidden');
    liveBadge.classList.add('hidden');
    snapBtn.disabled = true;

    spinner.classList.toggle('hidden', state !== 'loading');
    errIcon.classList.toggle('hidden', state !== 'error');
    retryBtn.classList.toggle('hidden', state !== 'error');
    altBtn.classList.toggle('hidden', !(state === 'error' && ALLOW_CAMERA_APP_FALLBACK));
    statusTextEl.innerText = message || (state === 'loading' ? 'กำลังเปิดกล้อง...' : '');

    if (detail) {
        detailEl.innerText = detail;
        detailEl.classList.remove('hidden');
    } else {
        detailEl.classList.add('hidden');
    }

    lidText.innerText = state === 'loading' ? 'กำลังเปิดกล้อง...' : 'ต้องเปิดกล้องก่อนสแกน';
    lidText.style.color = "#333";
    setMood(state === 'error' ? 'sad' : 'idle');
}

function cameraErrorMessage(err) {
    const name = err && err.name ? err.name : '';
    const msg = err && err.message ? err.message : '';

    if (isInAppBrowser()) {
        return 'เบราว์เซอร์ในแอป (LINE / Facebook) ใช้กล้องไม่ได้\nกดเมนู ⋮ หรือ ⋯ แล้วเลือก "เปิดใน Chrome / Safari"';
    }
    if (/by system/i.test(msg)) {
        return 'ระบบเครื่องปิดสิทธิ์กล้องของเบราว์เซอร์ไว้\nMac: System Settings > Privacy > Camera > เปิด Chrome\nWindows: Settings > Privacy > Camera > เปิดให้แอปใช้กล้อง';
    }
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
        return 'ยังไม่ได้อนุญาตให้ใช้กล้อง\nกดไอคอน 🔒 หรือไอคอนกล้องข้างช่องที่อยู่เว็บ\n> อนุญาต "กล้อง" แล้วกดปุ่มด้านล่าง';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
        return 'ไม่พบกล้องบนอุปกรณ์นี้';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'กล้องกำลังถูกใช้งานโดยแอปอื่น\nปิดแอปนั้นก่อน แล้วกดปุ่มด้านล่าง';
    }
    return 'เปิดกล้องไม่สำเร็จ\nกดปุ่มด้านล่างเพื่อลองใหม่';
}

function waitForVideoReady(video, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        if (video.videoWidth > 0) return resolve();
        const timer = setTimeout(() => { cleanup(); reject(new Error('VideoTimeout')); }, timeoutMs);
        function onReady() {
            if (video.videoWidth > 0) { cleanup(); resolve(); }
        }
        function cleanup() {
            clearTimeout(timer);
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('playing', onReady);
        }
        video.addEventListener('loadedmetadata', onReady);
        video.addEventListener('playing', onReady);
    });
}

function stopLiveVideo() {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
    cameraReady = false;
    const video = document.getElementById('webcam-video');
    if (video) video.srcObject = null;
}

async function startLiveVideo() {
    if (cameraStarting) return;
    cameraStarting = true;

    const video = document.getElementById('webcam-video');
    stopLiveVideo();
    setCameraUI('loading');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraUI('error', isInAppBrowser()
            ? cameraErrorMessage({})
            : 'เบราว์เซอร์นี้ไม่รองรับกล้อง\nกรุณาเปิดลิงก์ด้วย Chrome หรือ Safari',
            window.isSecureContext ? 'mediaDevices unavailable' : 'not a secure context');
        cameraStarting = false;
        return;
    }

    try {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false
            });
        } catch (e1) {
            if (e1 && (e1.name === 'NotAllowedError' || e1.name === 'SecurityError')) throw e1;
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        video.srcObject = mediaStream;
        video.setAttribute('playsinline', '');
        video.muted = true;

        try {
            await video.play();
        } catch (playErr) {
            cameraReady = false;
            setCameraUI('error', 'แตะปุ่ม "เปิดกล้องอีกครั้ง" เพื่อเริ่มแสดงภาพจากกล้อง', playErr.name + ': ' + playErr.message);
            return;
        }

        await waitForVideoReady(video);
        cameraReady = true;

        if (!isShowingCapture()) setCameraUI('live');
    } catch (err) {
        console.warn("Camera error:", err);
        stopLiveVideo();
        const detail = (err && err.name ? err.name : 'Error') + (err && err.message ? ': ' + err.message : '');
        setCameraUI('error', cameraErrorMessage(err), detail);
    } finally {
        cameraStarting = false;
    }
}

function onCameraFrameTap() {
    if (!document.getElementById('ctrlAction').classList.contains('hidden')) return;
    if (isAnalyzing) return;
    if (!cameraReady) {
        startLiveVideo();
        return;
    }
    snapCurrentFrame();
}

// 📱 ทางสำรอง: ถ่ายด้วยแอปกล้อง (ปิดอยู่ ตามค่า ALLOW_CAMERA_APP_FALLBACK)
function openCameraApp() {
    if (!ALLOW_CAMERA_APP_FALLBACK) return;
    const input = document.getElementById('cameraAppInput');
    input.value = '';
    input.click();
}

function handleCameraAppFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !ALLOW_CAMERA_APP_FALLBACK) return;

    const ageMs = Date.now() - (file.lastModified || 0);
    if (!file.lastModified || ageMs > FRESH_PHOTO_MAX_AGE_MS || ageMs < -60000) {
        alert("⛔ ต้องเป็นรูปที่เพิ่งถ่ายจากกล้องเท่านั้น (ไม่เกิน 2 นาที)\nไม่สามารถใช้รูปเก่าจากแกลลอรี่ได้");
        return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async function() {
        URL.revokeObjectURL(url);
        const fullCanvas = makeCanvasCopy(img, 1280);
        isAnalyzing = true;
        try {
            const startTime = performance.now();
            displayCapturedImage(fullCanvas.toDataURL('image/jpeg', 0.85));
            await analyzeFrame(fullCanvas, startTime);
        } catch (err) {
            console.warn("Analyze error:", err);
            renderMultiWasteResult([], false, '0s');
        } finally {
            isAnalyzing = false;
        }
    };
    img.onerror = function() {
        URL.revokeObjectURL(url);
        alert("❌ อ่านรูปไม่สำเร็จ กรุณาถ่ายใหม่อีกครั้ง");
    };
    img.src = url;
}

// 📸 ถ่ายภาพจากกล้องสด (การวิเคราะห์อยู่ในไฟล์ ai.js)
async function snapCurrentFrame() {
    if (isAnalyzing) return;
    const video = document.getElementById('webcam-video');

    if (!cameraReady || !mediaStream || video.videoWidth === 0) {
        startLiveVideo();
        return;
    }

    isAnalyzing = true;
    document.getElementById('btnSnap').disabled = true;

    try {
        const startTime = performance.now();
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = video.videoWidth;
        fullCanvas.height = video.videoHeight;
        fullCanvas.getContext('2d').drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);

        displayCapturedImage(fullCanvas.toDataURL('image/jpeg', 0.85));
        await analyzeFrame(fullCanvas, startTime);
    } catch (err) {
        console.warn("Analyze error:", err);
        renderMultiWasteResult([], false, '0s');
    } finally {
        isAnalyzing = false;
        document.getElementById('btnSnap').disabled = !cameraReady;
    }
}

function displayCapturedImage(src) {
    const video = document.getElementById('webcam-video');
    const wrap = document.getElementById('captureWrap');
    const overlay = document.getElementById('overlayGrid');

    stopTips();
    document.getElementById('captured-image').src = src;
    document.getElementById('boxLayer').innerHTML = '';
    wrap.classList.remove('hidden', 'dropping', 'gone');
    video.classList.add('hidden');
    overlay.classList.add('hidden');
    document.getElementById('camStatus').classList.add('hidden');
    document.getElementById('liveBadge').classList.add('hidden');
    document.getElementById('statusText').innerText = T('analyzing');
    startScanFx();
    setMood('thinking');
}

function setActionButtonsDisabled(disabled) {
    ['btnRetry', 'btnFix', 'btnConfirm'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.disabled = disabled;
    });
}

function showScanControls(showAction) {
    document.getElementById('ctrlScan').classList.toggle('hidden', showAction);
    document.getElementById('ctrlAction').classList.toggle('hidden', !showAction);
}

function renderMultiWasteResult(items, isLivingBeing, extraInfo) {
    currentDetectedItems = items || [];
    stopScanFx();
    stopTips();

    const badge = document.getElementById('statusText');
    const hint = document.getElementById('hintText');
    const lid = document.getElementById('binLid');
    const confirmBtn = document.getElementById('btnConfirm');
    const fixBtn = document.getElementById('btnFix');
    const pointsBadge = document.getElementById('confirmPointsBadge');
    const colorBar = document.getElementById('colorBar');

    document.getElementById('btnRetry').disabled = false;
    fixBtn.disabled = false;
    document.getElementById('guideHintBtn').classList.remove('hidden');

    if (isLivingBeing || currentDetectedItems.length === 0) {
        badge.innerText = T('notWaste');
        badge.style.color = "#D32F2F";
        lid.style.backgroundColor = isLivingBeing ? "#E91E63" : "#9E9E9E";
        setMood(isLivingBeing ? 'angry' : 'sad');

        colorBar.style.backgroundColor = "#D32F2F";
        colorBar.innerText = "❌ ไม่ใช่ขยะ ห้ามทิ้งลงถัง";
        colorBar.classList.remove('hidden');

        hint.innerText = isLivingBeing
            ? `${T('livingHint')} (${extraInfo})`
            : `${T('noWasteHint')} (${extraInfo})`;
        confirmBtn.disabled = true;
        fixBtn.classList.add('hidden');
        pointsBadge.classList.add('hidden');
    } else if (currentDetectedItems.length === 1) {
        const item = currentDetectedItems[0];
        const info = WASTE_MAP[item.className];

        badge.innerText = `${info.th}${T('pointSuffix')}`;
        badge.style.color = info.color;
        lid.style.backgroundColor = info.color;
        setMood('happy');

        colorBar.style.backgroundColor = info.color;
        colorBar.innerText = `ทิ้งลง${info.binText}`;
        colorBar.classList.remove('hidden');

        hint.innerText = `${T('foundOneHint')} ${item.itemName} • ${info.hint} (${extraInfo})`;
        confirmBtn.disabled = false;
        fixBtn.classList.remove('hidden');
        pointsBadge.innerText = "+1";
        pointsBadge.classList.toggle('hidden', isGuest());
    } else {
        const count = currentDetectedItems.length;
        const firstInfo = WASTE_MAP[currentDetectedItems[0].className];

        badge.innerText = T('foundMany')(count);
        badge.style.color = "#15803D";
        lid.style.backgroundColor = firstInfo.color;
        setMood('happy');

        const summaryList = currentDetectedItems.map((it, idx) => `#${idx + 1} ${WASTE_MAP[it.className].th}`).join(' | ');

        colorBar.style.backgroundColor = "#1E293B";
        colorBar.innerText = T('sortMany')(count);
        colorBar.classList.remove('hidden');

        hint.innerText = `${summaryList} (${extraInfo})`;
        confirmBtn.disabled = false;
        fixBtn.classList.remove('hidden');
        pointsBadge.innerText = `+${count}`;
        pointsBadge.classList.toggle('hidden', isGuest());
    }

    showScanControls(true);
}

// =========================================================================
// ✏️ แก้ประเภทขยะ (เปลี่ยนประเภท / ลบชิ้นได้ แต่เพิ่มชิ้นไม่ได้)
// =========================================================================
function openFixModal() {
    if (!currentDetectedItems || currentDetectedItems.length === 0) return;
    const draft = fixDraft;
    fixDraft = null;

    let html = '';
    currentDetectedItems.forEach((it, idx) => {
        const chosen = (draft && draft[idx]) ? draft[idx] : it.className;
        const info = WASTE_MAP[it.className] || WASTE_MAP["General Waste"];
        let options = FIX_CLASSES.map(cls => {
            const inf = WASTE_MAP[cls];
            return `<option value="${cls}" ${cls === chosen ? 'selected' : ''}>${inf.th} (${inf.binText})</option>`;
        }).join('');
        options += `<option value="__remove" ${chosen === '__remove' ? 'selected' : ''}>❌ ไม่ใช่ขยะ (ลบออก)</option>`;
        html += `
        <div class="fix-row">
            <div class="fix-swatch" style="background:${info.color};"></div>
            <div class="flex-grow-1">
                <div class="fw-bold small">#${idx + 1} ${escapeHtml(it.itemName)}</div>
                <select class="form-select form-select-sm mt-1 rounded-3" id="fixSel_${idx}">${options}</select>
            </div>
        </div>`;
    });
    document.getElementById('fixList').innerHTML = html;
    new bootstrap.Modal(document.getElementById('fixModal')).show();
}

function applyFixes() {
    const newItems = [];
    let changed = false;
    currentDetectedItems.forEach((it, idx) => {
        const sel = document.getElementById('fixSel_' + idx);
        const v = sel ? sel.value : it.className;
        if (v === '__remove') { changed = true; return; }
        if (v !== it.className) {
            changed = true;
            newItems.push({ ...it, className: v });
        } else {
            newItems.push(it);
        }
    });

    const modal = bootstrap.Modal.getInstance(document.getElementById('fixModal'));
    if (modal) modal.hide();

    if (changed) {
        itemsCorrected = true;
        showDetectionResult(newItems);
    }
}

function resetCamera() {
    currentDetectedItems = [];
    lastRawCanvas = null;
    itemsCorrected = false;
    fixDraft = null;
    stopScanFx();

    const wrap = document.getElementById('captureWrap');
    wrap.classList.add('hidden');
    wrap.classList.remove('dropping', 'gone');
    document.getElementById('boxLayer').innerHTML = '';
    document.getElementById('webcam-video').classList.remove('hidden');
    document.getElementById('binLid').classList.remove('lid-open');

    document.getElementById('statusText').style.color = "#333";
    document.getElementById('binLid').style.backgroundColor = "#4CAF50";
    document.getElementById('hintText').innerText = T('defaultHint');
    document.getElementById('colorBar').classList.add('hidden');
    document.getElementById('confirmPointsBadge').classList.add('hidden');
    document.getElementById('btnFix').classList.add('hidden');
    document.getElementById('guideHintBtn').classList.add('hidden');
    setActionButtonsDisabled(false);
    showScanControls(false);
    document.getElementById('cameraAppInput').value = '';

    if (cameraReady && mediaStream) {
        setCameraUI('live');
    } else {
        startLiveVideo();
    }
}

// ข้อมูลที่ส่งไปบันทึก (ใช้ร่วมกันทั้งผู้ใช้ทั่วไปและผู้เยี่ยมชม)
function buildSavePayload() {
    return {
        categories: currentDetectedItems.map(it => WASTE_MAP[it.className].th),
        meta: {
            source: lastAnalysisSource,
            corrected: itemsCorrected,
            itemNames: currentDetectedItems.map(it => it.itemName || '')
        },
        image: lastRawCanvas
            ? makeCanvasCopy(lastRawCanvas, 1024).toDataURL('image/jpeg', 0.8)
            : document.getElementById('captured-image').src
    };
}

// 👀 ผู้เยี่ยมชม: บันทึกภาพ + ประเภทขยะ โดยไม่มีคะแนน
let guestSaveCount = 0;
async function confirmSaveGuest() {
    setActionButtonsDisabled(true);
    const addedItems = currentDetectedItems.length;
    const p = buildSavePayload();

    const savePromise = new Promise(resolve => {
        google.script.run
            .withSuccessHandler(res => resolve({ res: res }))
            .withFailureHandler(err => resolve({ err: err }))
            .logGuestWaste(getGuestId(), p.categories, p.image, p.meta);
    });

    const [saved] = await Promise.all([savePromise, playGulp()]);
    const res = saved.res;

    if (res && res.success) {
        const campusEl = document.getElementById('campusCount');
        setCampusCount(Number(campusEl.dataset.val || 0) + addedItems);
        refreshCampus(true);
        guestSaveCount++;
        showToast(res.message || T('saveToast'));
        resetCamera();
        if (guestSaveCount === 2 || guestSaveCount % 5 === 0) {
            setTimeout(() => showToast(T('registerNudge'), 4000), 2900);
        }
    } else {
        restoreAfterFailedGulp();
        setActionButtonsDisabled(false);
        setMood('sad');
        const msg = res && res.message ? res.message : ('❌ บันทึกไม่สำเร็จ: ' + (saved.err ? saved.err.message : ''));
        alert(msg);
    }
}

// ✅ ยืนยันบันทึก: น้องถังงับขยะ + คะแนนลอยไปเข้ากระเป๋า (เล่นพร้อมกับการส่งข้อมูล)
async function confirmSave() {
    if (!currentDetectedItems || currentDetectedItems.length === 0) {
        alert(T('notWasteAlert'));
        return;
    }
    if (isGuest()) return confirmSaveGuest();
    setActionButtonsDisabled(true);

    const confirmBtn = document.getElementById('btnConfirm');
    const badgeBox = document.getElementById('userBadgeBox');
    const scoreEl = document.getElementById('dispScore');

    const addedPoints = currentDetectedItems.length;
    const payload = buildSavePayload();
    const prevShown = parseInt(scoreEl.textContent) || 0;
    const prevTierScore = userTotalScore;
    const wasLoaded = scoreLoaded;

    const savePromise = new Promise(resolve => {
        google.script.run
            .withSuccessHandler(res => resolve({ res: res }))
            .withFailureHandler(err => resolve({ err: err }))
            .logWasteData(currentUser.studentId, payload.categories, payload.image, payload.meta);
    });

    const gulpPromise = playGulp();
    const flyPromise = sleep(REDUCED_MOTION ? 0 : 450)
        .then(() => flyPoints(addedPoints, confirmBtn, badgeBox))
        .then(() => {
            popBadge();
            countUp(scoreEl, prevShown, prevShown + addedPoints);
        });

    const [saved] = await Promise.all([savePromise, gulpPromise, flyPromise]);
    const res = saved.res;

    if (res && res.success) {
        const newScore = (typeof res.newScore === 'number') ? res.newScore : prevShown + addedPoints;
        if (newScore !== prevShown + addedPoints) {
            countUp(scoreEl, parseInt(scoreEl.textContent) || 0, newScore);
        }

        const campusEl = document.getElementById('campusCount');
        setCampusCount(Number(campusEl.dataset.val || 0) + addedPoints);
        refreshCampus(true);

        const beforeTier = getRankInfo(prevTierScore).currentTier;
        refreshCertificateButtons(newScore, 0);
        const afterTier = getRankInfo(newScore).currentTier;

        showToast(res.message || T('saveToast'));
        resetCamera();

        if (wasLoaded && afterTier && (!beforeTier || beforeTier.id !== afterTier.id)) {
            setTimeout(() => celebrateTierUp(afterTier), 300);
        }
    } else {
        countUp(scoreEl, parseInt(scoreEl.textContent) || 0, prevShown);
        restoreAfterFailedGulp();
        setActionButtonsDisabled(false);
        setMood('sad');
        const msg = res && res.message ? res.message : ('❌ บันทึกไม่สำเร็จ: ' + (saved.err ? saved.err.message : ''));
        alert(msg);
    }
}

function updateScore() {
    google.script.run
        .withSuccessHandler(stats => {
            document.getElementById('dispScore').innerText = stats.total;
            const modalScore = document.getElementById('modalTotalScore');
            if (modalScore) modalScore.innerText = stats.total;
            refreshCertificateButtons(stats.total, stats.daysInactive);
        })
        .withFailureHandler(err => console.warn('score error:', err))
        .getUserStats(currentUser.studentId);
}

function openHistory() {
    new bootstrap.Modal(document.getElementById('historyModal')).show();
    const box = document.getElementById('historyList');
    box.innerHTML = 'Loading...';
    google.script.run
        .withSuccessHandler(d => {
            let h = '';
            if (d && d.length > 0) {
                d.forEach(i => h += `<div class="p-2 border-bottom d-flex justify-content-between"><span>${escapeHtml(i.category)}</span><small class="text-muted">${escapeHtml(i.time)}</small></div>`);
            }
            box.innerHTML = h || '<div class="text-center p-3 text-muted">ยังไม่มีประวัติการคัดแยกขยะ</div>';
        })
        .withFailureHandler(err => {
            box.innerHTML = `<div class="text-center p-3 text-danger">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</div>`;
        })
        .getUserHistory(currentUser.studentId);
}

// =========================================================================
// 🏆 ทำเนียบผู้นำ (มีแอนิเมชัน)
// =========================================================================
// ตรวจว่าแถวนี้เป็นตัวเราเองหรือไม่ (เทียบชื่อ และรูปถ้ามี)
function isMeOnBoard(u) {
    if (!currentUser || !u) return false;
    if (String(u.name || '').trim() !== String(currentUser.name || '').trim()) return false;
    return !u.avatar || !currentUser.avatar || u.avatar === currentUser.avatar;
}

function leaderSkeleton() {
    return `
    <div class="d-flex justify-content-center align-items-end gap-3 pt-4 pb-3">
        <div class="lb-skel" style="width:70px; height:110px;"></div>
        <div class="lb-skel" style="width:92px; height:150px;"></div>
        <div class="lb-skel" style="width:70px; height:95px;"></div>
    </div>
    <div class="lb-skel mb-2" style="height:46px;"></div>
    <div class="lb-skel mb-2" style="height:46px;"></div>`;
}

function openLeaderboard() {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('leaderModal')).show();
    const box = document.getElementById('leaderList');
    box.innerHTML = leaderSkeleton();

    google.script.run
        .withSuccessHandler(data => {
            if (!data || data.length === 0) {
                box.innerHTML = "<div class='text-center p-4 text-muted'>ยังไม่มีข้อมูล</div>";
                return;
            }

            // เด้งขึ้นตามลำดับ: อันดับ 3 → 2 → 1
            const delays = { 1: 0.55, 2: 0.3, 3: 0.1 };
            let html = '<div class="podium-container">';
            if (data[1]) html += createPodium(data[1], 2, delays[2]);
            if (data[0]) html += createPodium(data[0], 1, delays[1]);
            if (data[2]) html += createPodium(data[2], 3, delays[3]);
            html += '</div>';

            if (data.length > 3) {
                const top = Math.max(1, data[0].score || 1);
                html += '<div class="lb-list">';
                data.slice(3).forEach((u, i) => {
                    const me = isMeOnBoard(u);
                    const icon = u.role === 'teacher' ? '👩‍🏫 ' : '';
                    const d = 0.9 + i * 0.08;
                    const pct = Math.max(4, Math.round((u.score / top) * 100));
                    html += `
                    <div class="normal-rank-item ${me ? 'is-me' : ''}" style="--d:${d.toFixed(2)}s;">
                        <div class="rank-num">${i + 4}</div>
                        <div class="lb-info">
                            <div class="lb-name">${icon}${escapeHtml(u.name)}${me ? '<span class="me-chip">คุณ</span>' : ''}</div>
                            <div class="lb-bar"><div class="lb-bar-fill" data-w="${pct}"></div></div>
                        </div>
                        <div class="lb-score"><span class="flame">🔥</span> <span data-count="${u.score}" data-delay="${Math.round(d * 1000)}">0</span></div>
                    </div>`;
                });
                html += '</div>';
            }

            box.innerHTML = html;
            animateLeaderboard(box, data);
        })
        .withFailureHandler(err => {
            box.innerHTML = `<div class='text-center p-4 text-danger'>โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(err.message)}</div>`;
        })
        .getLeaderboard();
}

// คะแนนนับขึ้น + แถบคะแนนวิ่ง + พลุถ้าเราติด 3 อันดับแรก
function animateLeaderboard(box, data) {
    box.querySelectorAll('[data-count]').forEach(el => {
        const to = Number(el.dataset.count) || 0;
        const delay = REDUCED_MOTION ? 0 : Number(el.dataset.delay || 0);
        setTimeout(() => countUp(el, 0, to, 1100, fmtNum), delay);
    });

    const fills = box.querySelectorAll('.lb-bar-fill');
    setTimeout(() => fills.forEach(f => { f.style.width = f.dataset.w + '%'; }), REDUCED_MOTION ? 0 : 950);

    const myRank = data.findIndex(u => isMeOnBoard(u));
    if (myRank >= 0 && myRank < 3) setTimeout(() => fireConfetti('#FFD700', true), 1100);
}

function createPodium(u, rank, delay) {
    const medal = { 1: '👑', 2: '🥈', 3: '🥉' }[rank];
    const me = isMeOnBoard(u);
    const roleIcon = u.role === 'teacher' ? '👩‍🏫 ' : '';
    const scoreDelay = Math.round((delay + 0.35) * 1000);
    const sparkles = rank === 1
        ? '<span class="sparkle" style="top:-6px; left:-14px; --sd:0s;">✨</span>' +
          '<span class="sparkle" style="top:22px; right:-18px; --sd:0.8s;">✨</span>' +
          '<span class="sparkle" style="bottom:4px; left:-16px; --sd:1.6s;">⭐</span>'
        : '';

    return `
    <div class="podium-rank rank-${rank} ${me ? 'is-me' : ''}" style="--d:${delay}s;">
        <div class="avatar-wrapper">
            <img src="${escapeHtml(u.avatar || defaultAvatar)}" class="rank-avatar" alt="" onerror="this.onerror=null; this.src='${defaultAvatar}'">
            <div class="rank-status-icon">${medal}</div>
            ${sparkles}
        </div>
        <div class="rank-name">${roleIcon}${escapeHtml(u.name)}</div>
        ${me ? '<span class="me-chip">คุณ</span>' : ''}
        <div><div class="rank-score"><span class="flame">🔥</span> <span data-count="${u.score}" data-delay="${scoreDelay}">0</span></div></div>
        <div class="podium-step" style="--d:${delay}s;">${rank}</div>
    </div>`;
}
