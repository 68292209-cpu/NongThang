// =========================================================================
// 🧠 น้องถังช่วยทิ้ง • การวิเคราะห์ภาพ
// Gemini (หลัก) + โมเดลในเครื่อง COCO-SSD/Teachable Machine (สำรอง) ทำงานพร้อมกัน
// (ต้องโหลดหลัง app.js)
// =========================================================================

async function loadAIModel() {
    try {
        const promises = [];
        if (!model) {
            promises.push(
                tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json").then(m => {
                    model = m;
                    maxPredictions = model.getTotalClasses();
                })
            );
        }
        if (!cocoModel && typeof cocoSsd !== 'undefined') {
            promises.push(
                cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(cm => {
                    cocoModel = cm;
                })
            );
        }
        await Promise.all(promises);
    } catch (e) {
        console.warn("Model loading error:", e);
    }
}

function makeCanvasCopy(src, maxDim) {
    let w = src.naturalWidth || src.width;
    let h = src.naturalHeight || src.height;
    if (maxDim && (w > maxDim || h > maxDim)) {
        const s = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * s);
        h = Math.round(h * s);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    return c;
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(null), ms))
    ]);
}

// ครอปเป็นสี่เหลี่ยมจัตุรัสรอบวัตถุ (ไม่บีบภาพ) ก่อนส่งให้ Teachable Machine
function cropRegionToCanvas(sourceCanvas, x, y, w, h) {
    const pad = 0.08;
    const cx = x + w / 2;
    const cy = y + h / 2;
    let side = Math.max(w, h) * (1 + pad * 2);
    side = Math.min(side, sourceCanvas.width, sourceCanvas.height);
    const sx = Math.min(Math.max(0, cx - side / 2), sourceCanvas.width - side);
    const sy = Math.min(Math.max(0, cy - side / 2), sourceCanvas.height - side);

    const out = document.createElement('canvas');
    out.width = 224;
    out.height = 224;
    out.getContext('2d').drawImage(sourceCanvas, sx, sy, side, side, 0, 0, 224, 224);
    return out;
}

// 🟩 วาดกรอบขยะเป็น element บนภาพ (เด้งขึ้นทีละชิ้น)
function renderBoxes(items, animate = true) {
    const layer = document.getElementById('boxLayer');
    layer.innerHTML = '';
    if (!lastRawCanvas || !items || items.length === 0) return;

    const fw = layer.clientWidth;
    const fh = layer.clientHeight;
    if (!fw || !fh) return;
    const iw = lastRawCanvas.width;
    const ih = lastRawCanvas.height;
    const s = Math.max(fw / iw, fh / ih);
    const ox = (fw - iw * s) / 2;
    const oy = (fh - ih * s) / 2;

    items.forEach((it, i) => {
        const info = WASTE_MAP[it.className] || WASTE_MAP["General Waste"];
        const [x, y, w, h] = it.bbox;
        const L = x * s + ox;
        const T0 = y * s + oy;
        const l = Math.max(2, L);
        const t = Math.max(2, T0);
        const r = Math.min(fw - 2, L + w * s);
        const b = Math.min(fh - 2, T0 + h * s);
        if (r - l < 8 || b - t < 8) return;

        const el = document.createElement('div');
        el.className = 'det-box' + (t < 26 ? ' label-inside' : '');
        el.style.left = l + 'px';
        el.style.top = t + 'px';
        el.style.width = (r - l) + 'px';
        el.style.height = (b - t) + 'px';
        el.style.setProperty('--c', info.color);
        el.style.setProperty('--bg', info.color + '22');
        el.style.setProperty('--fg', textColorFor(it.className));
        if (animate) {
            el.style.animationDelay = (i * 180) + 'ms';
        } else {
            el.style.animation = 'none';
            el.style.opacity = '1';
            el.style.transform = 'none';
        }

        const lab = document.createElement('span');
        lab.className = 'det-label';
        lab.textContent = `#${i + 1} ${info.th}`;
        el.appendChild(lab);
        layer.appendChild(el);
    });
}

// ส่งภาพย่อไปให้ Gemini ผ่าน Apps Script — คืน null ถ้าใช้ไม่ได้ (ไม่มี key / โควตาหมด / error)
function detectWithGemini(rawCanvas) {
    if (!USE_GEMINI) return Promise.resolve(null);
    const W = rawCanvas.width;
    const H = rawCanvas.height;
    const small = makeCanvasCopy(rawCanvas, GEMINI_IMAGE_MAX);
    const dataUrl = small.toDataURL('image/jpeg', 0.7);

    return callApi('analyzeWithGemini', [dataUrl])
        .then(res => {
            if (!res || !res.success) {
                if (res && res.reason) console.info('Gemini ไม่พร้อม:', res.reason, res.detail || '');
                return null;
            }
            if (res.isLivingBeing) {
                return { living: res.livingName || 'สิ่งมีชีวิต/บุคคล', items: [] };
            }
            const items = (res.items || []).slice(0, 6).map(it => {
                const [ymin, xmin, ymax, xmax] = it.box_2d || [150, 150, 850, 850];
                const safeClass = WASTE_MAP[it.className] ? it.className : "General Waste";
                return {
                    className: safeClass,
                    itemName: it.itemName || WASTE_MAP[safeClass].th,
                    bbox: [
                        (xmin / 1000) * W,
                        (ymin / 1000) * H,
                        (Math.max(0, xmax - xmin) / 1000) * W,
                        (Math.max(0, ymax - ymin) / 1000) * H
                    ]
                };
            }).filter(it => it.bbox[2] > 4 && it.bbox[3] > 4);
            return { living: null, items: items };
        })
        .catch(err => {
            console.warn('Gemini error:', err);
            return null;
        });
}

// โมเดลในเครื่อง: COCO-SSD หาตำแหน่งวัตถุ + Teachable Machine จำแนกประเภท
async function detectLocal(fullCanvas) {
    const W = fullCanvas.width;
    const H = fullCanvas.height;

    if (!model) await loadAIModel();
    if (!cocoModel && typeof cocoSsd !== 'undefined') {
        try { cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' }); } catch (e) {}
    }

    let cocoDetections = [];
    if (cocoModel) {
        try { cocoDetections = await cocoModel.detect(fullCanvas, 10, 0.35); } catch (e) {}
    }

    let foundLiving = null;
    const candidateBoxes = [];

    for (const d of cocoDetections) {
        const [bx, by, bw, bh] = d.bbox;
        const areaRatio = (bw * bh) / (W * H);

        if (LIVING_CLASSES[d.class] && d.score > 0.45) {
            if (d.class !== 'person' || areaRatio > 0.12) {
                foundLiving = LIVING_CLASSES[d.class];
            }
        } else if (d.class !== 'person' && areaRatio > 0.02 && areaRatio < 0.90) {
            candidateBoxes.push({ bbox: [bx, by, bw, bh], cocoClass: d.class, cocoScore: d.score });
        }
    }

    if (foundLiving && candidateBoxes.length === 0) {
        return { living: foundLiving, items: [] };
    }

    let finalItems = [];

    if (candidateBoxes.length > 0 && model) {
        const filteredBoxes = [];
        for (const c of candidateBoxes) {
            if (!filteredBoxes.some(f => getIoU(f.bbox, c.bbox) > 0.45)) filteredBoxes.push(c);
        }

        const boxPromises = filteredBoxes.slice(0, 5).map(async (c) => {
            const cropCanv = cropRegionToCanvas(fullCanvas, c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3]);
            const preds = await model.predict(cropCanv);
            let best = { className: "General Waste", probability: 0 };
            preds.forEach(p => { if (p.probability > best.probability) best = p; });

            const hintObj = COCO_WASTE_HINT[c.cocoClass];
            if ((best.className === "Non Waste" || best.probability < 0.55) && hintObj) {
                return { className: hintObj.className, itemName: hintObj.itemName, bbox: c.bbox, prob: 0.85 };
            }
            if (best.className !== "Non Waste" && best.probability >= 0.45 && WASTE_MAP[best.className]) {
                return {
                    className: best.className,
                    itemName: hintObj ? hintObj.itemName : WASTE_MAP[best.className].th,
                    bbox: c.bbox,
                    prob: best.probability
                };
            }
            return null;
        });

        finalItems = (await Promise.all(boxPromises)).filter(Boolean);
    }

    if (finalItems.length === 0 && model) {
        const zones = [
            { name: 'left',   bbox: [W * 0.04, H * 0.18, W * 0.44, H * 0.55] },
            { name: 'right',  bbox: [W * 0.52, H * 0.18, W * 0.44, H * 0.55] },
            { name: 'center', bbox: [W * 0.15, H * 0.15, W * 0.70, H * 0.62] }
        ];

        const zonePreds = await Promise.all(
            zones.map(async z => {
                const crop = cropRegionToCanvas(fullCanvas, z.bbox[0], z.bbox[1], z.bbox[2], z.bbox[3]);
                const p = await model.predict(crop);
                let best = { className: "Non Waste", probability: 0 };
                p.forEach(item => { if (item.probability > best.probability) best = item; });
                return { ...z, best };
            })
        );

        const [leftZone, rightZone, centerZone] = zonePreds;
        const valid = (z, min) => z.best.className !== "Non Waste" && z.best.probability > min && WASTE_MAP[z.best.className];
        const toItem = z => ({ className: z.best.className, itemName: WASTE_MAP[z.best.className].th, bbox: z.bbox, prob: z.best.probability });

        if (valid(leftZone, 0.72) && valid(rightZone, 0.72) && leftZone.best.className !== rightZone.best.className) {
            finalItems.push(toItem(leftZone), toItem(rightZone));
        } else if (valid(centerZone, 0.48)) {
            finalItems.push(toItem(centerZone));
        }
    }

    if (finalItems.length === 0 && foundLiving) {
        return { living: foundLiving, items: [] };
    }
    return { living: null, items: finalItems };
}

function getIoU(boxA, boxB) {
    const xA = Math.max(boxA[0], boxB[0]);
    const yA = Math.max(boxA[1], boxB[1]);
    const xB = Math.min(boxA[0] + boxA[2], boxB[0] + boxB[2]);
    const yB = Math.min(boxA[1] + boxA[3], boxB[1] + boxB[3]);
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA[2] * boxA[3];
    const boxBArea = boxB[2] * boxB[3];
    return interArea / (boxAArea + boxBArea - interArea + 0.0001);
}

function sourceLabel() {
    const src = lastAnalysisSource === 'gemini' ? 'Gemini AI' : 'AI ในเครื่อง';
    return `${lastElapsed}s • ${src}${itemsCorrected ? ' • แก้ไขแล้ว' : ''}`;
}

function showDetectionResult(items) {
    renderMultiWasteResult(items, false, sourceLabel());
    renderBoxes(items, true);
}

async function analyzeFrame(rawCanvas, startTime) {
    lastRawCanvas = rawCanvas;
    itemsCorrected = false;

    const localPromise = detectLocal(rawCanvas).catch(err => {
        console.warn('Local model error:', err);
        return { living: null, items: [] };
    });

    let result = await withTimeout(detectWithGemini(rawCanvas), GEMINI_TIMEOUT_MS);
    lastAnalysisSource = 'gemini';
    if (!result) {
        lastAnalysisSource = 'local';
        result = await localPromise;
    }

    lastElapsed = ((performance.now() - startTime) / 1000).toFixed(1);

    if (result.living && (!result.items || result.items.length === 0)) {
        renderMultiWasteResult([], true, `ตรวจพบ: ${result.living} • ${sourceLabel()}`);
        return;
    }
    showDetectionResult(result.items || []);
}
