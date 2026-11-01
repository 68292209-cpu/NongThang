// =========================================================================
// 🔐 น้องถังช่วยทิ้ง • บัญชีผู้ใช้: เข้าสู่ระบบ / สมัคร / ลืมรหัสผ่าน / โปรไฟล์ / ประกาศนียบัตร
// (ต้องโหลดหลัง app.js)
// =========================================================================


// =========================================================================
// 🔐 ระบบ AUTHENTICATION & LOGIN
// =========================================================================
function setAuthRole(role) {
    authRole = role === 'teacher' ? 'teacher' : 'student';
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === authRole));
    document.getElementById('authCard').classList.toggle('teacher-mode', authRole === 'teacher');

    const A = AUTH_TEXTS[authRole];
    document.getElementById('loginNote').textContent = A.loginNote;
    document.getElementById('regLinkText').textContent = A.regLink;
    document.getElementById('regTitle').textContent = A.regTitle;
    document.getElementById('regAvatarHint').textContent = A.avatarHint;
    document.getElementById('regId').placeholder = A.idPh;
    document.getElementById('regName').placeholder = A.namePh;
    document.getElementById('regEmail').placeholder = A.emailPh;
    document.getElementById('regEmailNote').textContent = A.emailNote;
    document.getElementById('fgNote').textContent = A.fgNote;
    const regBtn = document.getElementById('btnRegSubmit');
    if (!regBtn.disabled) regBtn.textContent = A.regBtn;

    try { localStorage.setItem(AUTH_ROLE_KEY, authRole); } catch (e) {}
}

function showAuthForm(which) {
    const map = { login: 'loginForm', register: 'regForm', forgot: 'forgotForm' };
    Object.keys(map).forEach(k => {
        document.getElementById(map[k]).classList.toggle('hidden', k !== which);
    });
    if (which === 'forgot') {
        backToOtpStep1();
        const lu = document.getElementById('logUser').value.trim();
        if (lu && !document.getElementById('fgUser').value) document.getElementById('fgUser').value = lu;
    }
}

// (เก็บชื่อเดิมไว้ เผื่อมีจุดที่ยังเรียกใช้)
function toggleAuth(showReg) { showAuthForm(showReg ? 'register' : 'login'); }

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewAvatar').src = e.target.result;
            document.getElementById('previewAvatar').classList.remove('hidden');
            document.getElementById('uploadIcon').classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function doLogin() {
    const u = document.getElementById('logUser').value.trim();
    const p = document.getElementById('logPass').value.trim();
    const btn = document.getElementById('btnLoginSubmit');

    if (!u || !p) {
        alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
        return;
    }

    setBtnLoading(btn, true, 'กำลังเข้าสู่ระบบ...');

    google.script.run
        .withSuccessHandler(res => {
            if (res && res.success && res.role === 'admin') {
                // 🛠️ ผู้ดูแลระบบ -> ไปหน้า admin.html
                try { sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ token: res.token, at: Date.now() })); } catch (e) {}
                location.href = 'admin.html';
                return;
            }
            setBtnLoading(btn, false);
            if (res && res.success) {
                currentUser = res;
                localStorage.setItem('smartBinUser', JSON.stringify(res));
                showApp();
            } else {
                alert(res && res.message ? res.message : "❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
            }
        })
        .withFailureHandler(err => {
            setBtnLoading(btn, false);
            alert("❌ เชื่อมต่อกับระบบเซิร์ฟเวอร์ไม่สำเร็จ:\n" + err.message);
        })
        .loginUser(u, p);
}

async function doRegister() {
    const btn = document.getElementById('btnRegSubmit');

    const data = {
        username: document.getElementById('regUser').value.trim(),
        password: document.getElementById('regPass').value.trim(),
        studentId: document.getElementById('regId').value.trim(),
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim().toLowerCase(),
        role: authRole,
        profileImage: ''
    };

    if (!data.username || !data.password || !data.studentId || !data.name || !data.email) {
        alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
    }
    if (data.username.toLowerCase() === 'admin') {
        alert("ชื่อผู้ใช้นี้สงวนไว้สำหรับระบบ กรุณาใช้ชื่ออื่น");
        return;
    }
    if (data.password.length < MIN_PASSWORD_LENGTH) {
        alert(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
        return;
    }
    const er = emailError(data.email, data.role);
    if (er) { alert(er); return; }

    setBtnLoading(btn, true, 'กำลังบันทึก...');

    const fileInput = document.getElementById('regFile');
    if (fileInput.files.length > 0) {
        try {
            data.profileImage = await resizeProfileImage(fileInput.files[0], AVATAR_SIZE);
        } catch (e) {
            data.profileImage = "";
        }
    }

    google.script.run
        .withSuccessHandler(res => {
            setBtnLoading(btn, false);
            alert(res.message);
            if (res.success) {
                document.getElementById('logUser').value = data.username;
                showAuthForm('login');
            }
        })
        .withFailureHandler(err => {
            setBtnLoading(btn, false);
            alert("❌ เกิดข้อผิดพลาดในการลงทะเบียน: " + err.message);
        })
        .registerUser(data);
}

// =========================================================================
// 🔑 ลืมรหัสผ่าน: OTP ทางอีเมล
// =========================================================================
function backToOtpStep1() {
    document.getElementById('fgStep1').classList.remove('hidden');
    document.getElementById('fgStep2').classList.add('hidden');
    ['fgOtp', 'fgPass', 'fgPass2'].forEach(id => document.getElementById(id).value = '');
    clearInterval(otpCooldownTimer);
    const rb = document.getElementById('btnResendOtp');
    rb.disabled = false;
    rb.textContent = 'ส่งรหัสอีกครั้ง';
}

function startOtpCooldown(sec) {
    const b = document.getElementById('btnResendOtp');
    let s = Math.max(1, Math.round(sec || 60));
    clearInterval(otpCooldownTimer);
    b.disabled = true;
    const tick = () => {
        if (s <= 0) {
            clearInterval(otpCooldownTimer);
            b.disabled = false;
            b.textContent = 'ส่งรหัสอีกครั้ง';
            return;
        }
        b.textContent = `ส่งรหัสอีกครั้งได้ใน ${s} วิ`;
        s--;
    };
    tick();
    otpCooldownTimer = setInterval(tick, 1000);
}

function doRequestOtp(isResend) {
    const u = isResend ? otpUser : document.getElementById('fgUser').value.trim();
    const em = isResend ? otpEmail : document.getElementById('fgEmail').value.trim().toLowerCase();

    if (!u || !em) { alert('กรุณากรอกชื่อผู้ใช้และอีเมล'); return; }
    if (!isAnyAllowedEmail(em)) { alert('กรุณาใช้อีเมลของวิทยาลัย'); return; }

    const sendBtn = document.getElementById('btnSendOtp');
    const resendBtn = document.getElementById('btnResendOtp');
    if (isResend) {
        resendBtn.disabled = true;
        resendBtn.textContent = 'กำลังส่ง...';
    } else {
        setBtnLoading(sendBtn, true, 'กำลังส่งอีเมล...');
    }

    google.script.run
        .withSuccessHandler(res => {
            if (!isResend) setBtnLoading(sendBtn, false);
            if (res && res.success) {
                otpUser = u;
                otpEmail = em;
                document.getElementById('fgStep1').classList.add('hidden');
                document.getElementById('fgStep2').classList.remove('hidden');
                const mins = Math.round((res.expiresIn || 600) / 60);
                document.getElementById('fgOtpInfo').innerHTML =
                    `📧 ส่งรหัสไปที่ <b>${escapeHtml(res.maskedEmail)}</b> แล้ว (ใช้ได้ ${mins} นาที)<br>หากไม่พบในกล่องจดหมาย กรุณาตรวจสอบโฟลเดอร์ <b>สแปม / จดหมายขยะ</b>`;
                document.getElementById('fgOtp').value = '';
                document.getElementById('fgOtp').focus();
                startOtpCooldown(res.cooldown || 60);
                if (isResend) showToast('📧 ส่งรหัสใหม่แล้ว');
            } else {
                alert(res && res.message ? res.message : '❌ ส่งรหัสไม่สำเร็จ');
                if (isResend) {
                    if (res && res.cooldown) startOtpCooldown(res.cooldown);
                    else { resendBtn.disabled = false; resendBtn.textContent = 'ส่งรหัสอีกครั้ง'; }
                }
            }
        })
        .withFailureHandler(err => {
            if (!isResend) setBtnLoading(sendBtn, false);
            else { resendBtn.disabled = false; resendBtn.textContent = 'ส่งรหัสอีกครั้ง'; }
            alert('❌ เชื่อมต่อระบบไม่สำเร็จ: ' + err.message);
        })
        .requestPasswordOtp(u, em);
}

function doResetWithOtp() {
    const otp = document.getElementById('fgOtp').value.trim();
    const p1 = document.getElementById('fgPass').value;
    const p2 = document.getElementById('fgPass2').value;
    const btn = document.getElementById('btnResetSubmit');

    if (!/^\d{6}$/.test(otp)) { alert('กรุณากรอกรหัส OTP 6 หลักจากอีเมล'); return; }
    if (p1.length < MIN_PASSWORD_LENGTH) { alert(`รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`); return; }
    if (p1 !== p2) { alert('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'); return; }

    setBtnLoading(btn, true, 'กำลังตรวจสอบ...');
    google.script.run
        .withSuccessHandler(res => {
            setBtnLoading(btn, false);
            alert(res && res.message ? res.message : '❌ ดำเนินการไม่สำเร็จ');
            if (res && res.success) {
                const u = otpUser;
                otpUser = '';
                otpEmail = '';
                ['fgUser', 'fgEmail'].forEach(id => document.getElementById(id).value = '');
                backToOtpStep1();
                document.getElementById('logUser').value = u;
                document.getElementById('logPass').value = '';
                showAuthForm('login');
                document.getElementById('logPass').focus();
            } else if (res && res.expired) {
                document.getElementById('fgOtp').value = '';
                clearInterval(otpCooldownTimer);
                const rb = document.getElementById('btnResendOtp');
                rb.disabled = false;
                rb.textContent = 'ส่งรหัสอีกครั้ง';
            }
        })
        .withFailureHandler(err => {
            setBtnLoading(btn, false);
            alert('❌ เชื่อมต่อระบบไม่สำเร็จ: ' + err.message);
        })
        .resetPasswordWithOtp(otpUser, otp, p1);
}

// 🔑 เปลี่ยนรหัสผ่าน (จากหน้าโปรไฟล์)
function openChangePassword() {
    ['cpOld', 'cpNew', 'cpNew2'].forEach(id => document.getElementById(id).value = '');
    swapFromProfile(() => new bootstrap.Modal(document.getElementById('changePwModal')).show());
}

function doChangePassword() {
    const oldPw = document.getElementById('cpOld').value;
    const p1 = document.getElementById('cpNew').value;
    const p2 = document.getElementById('cpNew2').value;
    const btn = document.getElementById('btnChangePw');

    if (!oldPw || !p1 || !p2) { alert('กรุณากรอกข้อมูลให้ครบทุกช่อง'); return; }
    if (p1.length < MIN_PASSWORD_LENGTH) { alert(`รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`); return; }
    if (p1 !== p2) { alert('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'); return; }

    setBtnLoading(btn, true, 'กำลังบันทึก...');
    google.script.run
        .withSuccessHandler(res => {
            setBtnLoading(btn, false);
            if (res && res.success) {
                const m = bootstrap.Modal.getInstance(document.getElementById('changePwModal'));
                if (m) m.hide();
                showToast(res.message);
            } else {
                alert(res && res.message ? res.message : '❌ เปลี่ยนรหัสผ่านไม่สำเร็จ');
            }
        })
        .withFailureHandler(err => {
            setBtnLoading(btn, false);
            alert('❌ เชื่อมต่อระบบไม่สำเร็จ: ' + err.message);
        })
        .changePassword(currentUser.studentId, oldPw, p1);
}

// 📧 ตั้งค่าอีเมล (จากหน้าโปรไฟล์)
function openEmailSettings() {
    const dom = currentRole === 'teacher' ? TEACHER_EMAIL_DOMAIN : STUDENT_EMAIL_DOMAIN;
    document.getElementById('emInput').value = (currentUser && currentUser.email) || '';
    document.getElementById('emInput').placeholder = currentRole === 'teacher' ? `อีเมลอาจารย์ (เช่น somchai.k@${dom})` : `อีเมล (@${dom})`;
    document.getElementById('emPass').value = '';
    swapFromProfile(() => new bootstrap.Modal(document.getElementById('emailModal')).show());
}

function doUpdateEmail() {
    const em = document.getElementById('emInput').value.trim().toLowerCase();
    const pw = document.getElementById('emPass').value;
    const btn = document.getElementById('btnSaveEmail');

    if (!em || !pw) { alert('กรุณากรอกอีเมลและรหัสผ่านปัจจุบัน'); return; }
    const er = emailError(em, currentRole);
    if (er) { alert(er); return; }

    setBtnLoading(btn, true, 'กำลังบันทึก...');
    google.script.run
        .withSuccessHandler(res => {
            setBtnLoading(btn, false);
            if (res && res.success) {
                currentUser.email = res.email;
                localStorage.setItem('smartBinUser', JSON.stringify(currentUser));
                const m = bootstrap.Modal.getInstance(document.getElementById('emailModal'));
                if (m) m.hide();
                showToast(res.message);
            } else {
                alert(res && res.message ? res.message : '❌ บันทึกอีเมลไม่สำเร็จ');
            }
        })
        .withFailureHandler(err => {
            setBtnLoading(btn, false);
            alert('❌ เชื่อมต่อระบบไม่สำเร็จ: ' + err.message);
        })
        .updateEmail(currentUser.studentId, pw, em);
}

function logout() {
    if (confirm(T('logoutConfirm'))) {
        stopLiveVideo();
        stopTips();
        clearInterval(campusTimer);
        localStorage.removeItem('smartBinUser');
        location.reload();
    }
}

// =========================================================================
// 👤 โปรไฟล์ (รูปย่อเหลือ 200px เก็บใน Sheet ได้ แสดงผลได้เสมอ)
// =========================================================================
function triggerProfileUpload() {
    const fileInput = document.getElementById('editProfileInput');
    if (fileInput) fileInput.click();
}

function resizeProfileImage(file, maxDimension = AVATAR_SIZE) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const maxDim = maxDimension;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const cvs = document.createElement('canvas');
                cvs.width = w;
                cvs.height = h;
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(cvs.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleProfileUpdate(input) {
    if (!(input.files && input.files[0])) return;
    const file = input.files[0];
    const modalImg = document.getElementById('modalProfileImg');
    const headerImg = document.getElementById('userAvatar');
    if (modalImg) modalImg.style.opacity = '0.4';

    try {
        const base64Img = await resizeProfileImage(file, AVATAR_SIZE);
        google.script.run
            .withSuccessHandler(res => {
                if (modalImg) modalImg.style.opacity = '1';
                input.value = '';
                if (res && res.success) {
                    currentUser.avatar = res.newUrl;
                    localStorage.setItem('smartBinUser', JSON.stringify(currentUser));
                    if (modalImg) modalImg.src = res.newUrl;
                    if (headerImg) headerImg.src = res.newUrl;
                    showToast("✅ อัปเดตรูปโปรไฟล์แล้ว");
                } else {
                    alert("❌ " + (res && res.message ? res.message : "อัปโหลดรูปไม่สำเร็จ"));
                }
            })
            .withFailureHandler(err => {
                if (modalImg) modalImg.style.opacity = '1';
                input.value = '';
                alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message);
            })
            .updateProfileImage(currentUser.studentId, base64Img);
    } catch (err) {
        if (modalImg) modalImg.style.opacity = '1';
        input.value = '';
        alert("❌ ไม่สามารถประมวลผลรูปภาพได้: " + err.message);
    }
}

function openProfileModal() {
    new bootstrap.Modal(document.getElementById('profileModal')).show();
    document.getElementById('modalProfileImg').src = currentUser.avatar || defaultAvatar;
    document.getElementById('modalProfileName').innerText = currentUser.name;
    document.getElementById('modalStudentId').innerText = T('idLabel') + ": " + currentUser.studentId;

    const emailEl = document.getElementById('modalEmail');
    if (currentUser.email) {
        emailEl.textContent = '📧 ' + currentUser.email;
        emailEl.classList.remove('missing');
        emailEl.classList.add('text-muted');
    } else {
        emailEl.textContent = T('emailMissing');
        emailEl.classList.add('missing');
        emailEl.classList.remove('text-muted');
    }

    document.getElementById('statsContent').innerHTML = '<div class="text-center py-3"><div class="spinner-border text-success" role="status"></div></div>';

    google.script.run.withSuccessHandler(data => {
        document.getElementById('modalTotalScore').innerText = data.total;
        document.getElementById('dispScore').innerText = data.total;
        refreshCertificateButtons(data.total, data.daysInactive);

        let html = '';
        if (!data.breakdown || data.breakdown.length === 0) {
            html = '<div class="text-center text-muted small py-2">ยังไม่มีประวัติการคัดแยกขยะ</div>';
        } else {
            data.breakdown.forEach(item => {
                let color = "#999";
                for (let key in WASTE_MAP) {
                    if (WASTE_MAP[key].th === item.category) { color = WASTE_MAP[key].color; break; }
                }
                html += `<div class="stat-bar-container"><div class="stat-label"><span>${escapeHtml(item.category)}</span><span>${item.count} ${T('unit')} (${item.percent}%)</span></div><div class="progress"><div class="progress-bar" role="progressbar" style="width: ${item.percent}%; background-color: ${color};"></div></div></div>`;
            });
        }
        document.getElementById('statsContent').innerHTML = html;
    }).withFailureHandler(err => {
        document.getElementById('statsContent').innerHTML = `<div class="text-center text-danger small py-2">โหลดสถิติไม่สำเร็จ: ${escapeHtml(err.message)}</div>`;
    }).getUserStats(currentUser.studentId);
}

// =========================================================================
// 🎓 ประกาศนียบัตร (การวาดอยู่ในไฟล์ cert.js)
// =========================================================================
function handleCertAction() {
    const { currentTier } = getRankInfo(userTotalScore);
    const pm = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
    if (!currentTier) {
        // ยังไม่มีคะแนน -> เปิดหน้าเกณฑ์การรับรองให้ดูแทน
        if (pm) pm.hide();
        openMyCertificatesModal();
        return;
    }
    openCertificatePreview(currentTier);
}

function openCertificatePreview(tier) {
    selectedCertTier = tier;
    drawCertificateOnCanvas(tier);
    new bootstrap.Modal(document.getElementById('certPreviewModal')).show();
}

function openMyCertificatesModal() {
    const body = document.getElementById('myCertsListBody');
    let html = '';
    RANK_TIERS.forEach((tier, idx) => {
        const unlocked = userTotalScore >= tier.minScore;
        html += `
        <div class="cert-tier-item ${unlocked ? 'unlocked' : ''}">
            <div>
                <div class="fw-bold" style="color:#0F172A; font-size:1rem;">
                    ${tier.name} <span class="badge bg-light text-dark border ms-1" style="font-size:0.75rem;">${tier.nameEn}</span>
                </div>
                <div class="small text-muted mt-1">${tier.desc}</div>
                <div class="small fw-semibold mt-1" style="color:#0284C7;"><i class="fas fa-check-circle me-1"></i>เกณฑ์ขั้นต่ำ: ${tier.minScore} คะแนน</div>
            </div>
            <div class="ms-3 text-nowrap">
                ${unlocked
                    ? `<button class="btn btn-sm btn-dark rounded-pill px-3 fw-bold" onclick="openCertFromList(${idx})"><i class="fas fa-eye me-1"></i> ดูใบรับรอง</button>`
                    : `<span class="badge bg-secondary rounded-pill py-2 px-3"><i class="fas fa-lock me-1"></i> ยังไม่ถึงเกณฑ์</span>`
                }
            </div>
        </div>`;
    });
    body.innerHTML = html;
    new bootstrap.Modal(document.getElementById('myCertsListModal')).show();
}

function openCertFromList(tierIndex) {
    const listModal = bootstrap.Modal.getInstance(document.getElementById('myCertsListModal'));
    if (listModal) listModal.hide();
    openCertificatePreview(RANK_TIERS[tierIndex]);
}
