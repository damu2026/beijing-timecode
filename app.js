(() => {
  const stage = document.querySelector('#stage');
  const canvas = document.querySelector('#canvas');
  const artboard = document.querySelector('#artboard');
  const image = document.querySelector('#background');
  const contentImage = document.querySelector('#contentImage');
  const empty = document.querySelector('#emptyState');
  const top = document.querySelector('#topTime');
  const bottom = document.querySelector('#bottomTime');
  const status = document.querySelector('#status');
  const controls = document.querySelector('#controls');
  const root = document.documentElement;
  const fields = { topX: '--top-x', topY: '--top-y', bottomX: '--bottom-x', bottomY: '--bottom-y' };
  // All adjustment values are stored in the original 1206 × 2622 image coordinate system.
  // This lets the live time move and scale exactly with a "cover" background image.
  const original = { width: 1206, height: 2622 };
  // Measured from the supplied 1206 × 2622 original: every value is the text centre.
  const defaults = { topX: 14.35, topY: 2.6, bottomX: 34.2, bottomY: 11.71, topSize: 48, bottomSize: 60 };
  const defaultImage = '3382.jpg';
  let offset = 0;
  let calibratedAt = null;
  let dragging = null;

  const stored = JSON.parse(localStorage.getItem('beijing-timecode-settings') || '{}');
  // Reset older manual coordinates once so existing phones pick up the calibrated overlay.
  const settings = stored.layoutVersion === 10 ? { ...defaults, ...stored } : { ...defaults, layoutVersion: 10 };
  function coverMetrics() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(rect.width / original.width, rect.height / original.height);
    // The background is horizontally centered but anchored to the top edge.
    return { rect, scale, offsetX: (rect.width - original.width * scale) / 2, offsetY: 0 };
  }
  function applySettings() {
    const { scale, offsetX, offsetY } = coverMetrics();
    Object.entries(fields).forEach(([id, property]) => {
      const value = settings[id];
      root.style.setProperty(property, `${value}%`);
      document.getElementById(id).value = value;
    });
    artboard.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    root.style.setProperty('--top-size', `${settings.topSize}px`);
    root.style.setProperty('--bottom-size', `${settings.bottomSize}px`);
    document.getElementById('topSize').value = settings.topSize;
    document.getElementById('bottomSize').value = settings.bottomSize;
    localStorage.setItem('beijing-timecode-settings', JSON.stringify(settings));
  }
  function pad(v) { return String(v).padStart(2, '0'); }
  function now() { return new Date(Date.now() + offset); }
  function updateClock() {
    const d = now();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
    top.textContent = `${parts.hour}:${parts.minute}`;
    bottom.textContent = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }
  function setStatus(message) { status.textContent = message; }
  async function calibrate() {
    setStatus('正在尝试网络校准…');
    const sources = [
      { url: 'https://timeapi.io/api/time/current/zone?timeZone=Asia%2FShanghai', parse: x => x.dateTime },
      { url: 'https://worldtimeapi.org/api/timezone/Asia/Shanghai', parse: x => x.datetime }
    ];
    for (const source of sources) {
      try {
        const sent = Date.now();
        const res = await fetch(source.url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
        const received = Date.now();
        if (!res.ok) continue;
        const serverMs = Date.parse(source.parse(await res.json()));
        if (!Number.isFinite(serverMs)) continue;
        offset = serverMs + (received - sent) / 2 - received;
        calibratedAt = new Date();
        setStatus(`已网络校准 · ${calibratedAt.toLocaleTimeString('zh-CN', { hour12: false })}`);
        return;
      } catch (_) { /* try the next independent source */ }
    }
    offset = 0;
    setStatus('离线模式 · 使用设备时间（未校准）');
  }
  function setImage(src, persist) { image.onload = () => { stage.classList.add('has-image'); empty.hidden = true; }; image.onerror = () => { stage.classList.remove('has-image'); empty.hidden = false; }; image.src = src; if (persist) localStorage.setItem('beijing-timecode-image-v2', src); }
  function setContentImage(src, persist) { contentImage.onload = () => stage.classList.add('has-content-image'); contentImage.onerror = () => stage.classList.remove('has-content-image'); contentImage.src = src; if (persist) localStorage.setItem('beijing-timecode-content-image-v2', src); }
  document.querySelector('#imageInput').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(reader.result, true); reader.readAsDataURL(file); });
  document.querySelector('#contentImageInput').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setContentImage(reader.result, true); reader.readAsDataURL(file); });
  document.querySelector('#clearContentImage').onclick = () => { localStorage.removeItem('beijing-timecode-content-image-v2'); contentImage.removeAttribute('src'); stage.classList.remove('has-content-image'); document.querySelector('#contentImageInput').value = ''; };
  document.querySelector('#openControls').onclick = () => { controls.hidden = false; };
  document.querySelector('#closeControls').onclick = () => { controls.hidden = true; };
  document.querySelector('#fullScreen').onclick = async () => {
    try { await (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()); }
    catch (_) {
      const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setStatus(isApple ? 'iPhone：Safari 点“分享”→“添加到主屏幕”，即可全屏打开' : '此浏览器不支持网页全屏');
    }
  };
  document.querySelector('#calibrate').onclick = calibrate;
  [...Object.keys(fields), 'topSize', 'bottomSize'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', e => { settings[id] = Number(e.target.value); applySettings(); }));
  [top, bottom].forEach(el => el.addEventListener('pointerdown', e => { dragging = el.id === 'topTime' ? ['topX', 'topY'] : ['bottomX', 'bottomY']; el.setPointerCapture(e.pointerId); }));
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const { rect, scale, offsetX, offsetY } = coverMetrics();
    settings[dragging[0]] = Math.max(0, Math.min(100, (e.clientX - rect.left - offsetX) / (original.width * scale) * 100));
    settings[dragging[1]] = Math.max(0, Math.min(100, (e.clientY - rect.top - offsetY) / (original.height * scale) * 100));
    applySettings();
  });
  stage.addEventListener('pointerup', () => { dragging = null; });
  applySettings(); window.addEventListener('resize', applySettings);
  setImage(localStorage.getItem('beijing-timecode-image-v2') || defaultImage, false);
  const savedContentImage = localStorage.getItem('beijing-timecode-content-image-v2'); if (savedContentImage) setContentImage(savedContentImage, false);
  updateClock(); setInterval(updateClock, 250); calibrate(); setInterval(calibrate, 30 * 60 * 1000);
})();
