/* ============================================================
   SUỐI TIÊN - Trang Chọn Vé
   app.js — Toàn bộ logic JavaScript
   ============================================================ */

/* =============================================================
   1. GLOBAL STATE & UTILITIES
   ============================================================= */
let D = [];                          // Danh sách combo đã map
let tag = 'tat-ca', srt = 'pop';    // Filter & sort hiện tại
let cur = null;                      // Combo đang xem chi tiết

/** Format số thành tiền VNĐ */
const f = n => n.toLocaleString('vi-VN') + 'đ';

/** Parse chuỗi giá tiền thành số, trả null nếu "không áp dụng" */
const parseMoney = v => {
  if (!v || /không áp dụng/i.test(v)) return null;
  return parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;
};

/** Chuyển tiếng Việt thành ASCII (bỏ dấu) */
const toAscii = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').replace(/đ/g, 'd');
const toCode = s => toAscii(s).toUpperCase();


/* =============================================================
   2. DATA MAPPING — Chuyển JSON thô thành object dùng trong app
   ============================================================= */

/** Lấy danh sách tags cho filter */
function getTags(name) {
  const tags = ['tat-ca'];
  if (name) tags.push(name);
  return [...new Set(tags)];
}

/** Xác định badge hiển thị trên card */
function getBadge(name) {
  if (/Go Kart/i.test(name)) return { text: 'TỐC ĐỘ', bb: '#263238', bt: '#fff' };
  if (/Thử Thách\s*&\s*Biển/i.test(name)) return { text: 'CẢM GIÁC MẠNH + BIỂN', bb: '#6a1b9a', bt: '#fff' };
  if (/Khám Phá\s*&\s*Biển/i.test(name)) return { text: 'TIẾT KIỆM', bb: '#e53935', bt: '#fff' };
  if (/Tham Quan\s*&\s*Biển|Biển Tiên Đồng/i.test(name)) return { text: 'CÓ BIỂN', bb: '#fff3e0', bt: '#e65100' };
  if (/Thử Thách/i.test(name)) return { text: 'CẢM GIÁC MẠNH', bb: '#6a1b9a', bt: '#fff' };
  if (/Khám Phá/i.test(name)) return { text: 'PHỔ BIẾN', bb: '#ff8f00', bt: '#fff' };
  return { text: 'GIA ĐÌNH', bb: '#ffffff', bt: '#1e7e3e' };
}

/** Chọn ảnh map theo kích thước màn hình */
function getComboMap(c) {
  return window.innerWidth <= 768
    ? (c.mapMobile || c.mapDesk || 'img/map/map_mobile.jpg')
    : (c.mapDesk || c.mapMobile || 'img/map/map_desk.jpg');
}

/** Map 1 item từ combos.json thành object combo */
function mapCombo(item, id) {
  const badge = getBadge(item.ten_combo);
  const services = item.chi_tiet_dich_vu || [];
  const isGoKart = /Go Kart/i.test(item.ten_combo);

  let nl, te, doi;
  if (isGoKart) {
    nl = parseMoney(item.gia_tien?.don_nguoi_lon) || 0;
    te = parseMoney(item.gia_tien?.don_tre_em);
    doi = parseMoney(item.gia_tien?.xe_doi);
  } else {
    nl = parseMoney(item.gia_tien?.nguoi_lon) || 0;
    te = parseMoney(item.gia_tien?.tre_em);
    doi = null;
  }

  const allPrices = [nl, te, doi].filter(p => p !== null && p > 0);
  const minPrice = allPrices.length ? Math.min(...allPrices) : nl;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : nl;

  return {
    id,
    ten: item.ten_combo,
    en: toCode(item.ten_combo),
    badge: badge.text,
    bb: badge.bb,
    bt: badge.bt,
    img: item.anh_nguoi_lon ? 'img/' + item.anh_nguoi_lon : 'img/map/map_desk.jpg',
    imgTe: item.anh_tre_em ? 'img/' + item.anh_tre_em : null,
    imgDoi: item.anh_xe_doi ? 'img/' + item.anh_xe_doi : null,
    images: [
      item.anh_nguoi_lon ? 'img/' + item.anh_nguoi_lon : null,
      item.anh_tre_em ? 'img/' + item.anh_tre_em : null,
      item.anh_xe_doi ? 'img/' + item.anh_xe_doi : null
    ].filter(Boolean),
    mapDesk: item.anh_map_desk ? 'img/map/' + item.anh_map_desk : 'img/map/map_desk.jpg',
    mapMobile: item.anh_map_mobile ? 'img/map/' + item.anh_map_mobile : 'img/map/map_mobile.jpg',
    nl, te, doi,
    minPrice, maxPrice,
    hsd: item.hsd || '',
    desc: item.description || '',
    tags: getTags(item.phan_loai),
    svcs: services,
    jny: services.map(s => ({ l: s, s: 'Bao gồm trong combo' })),
    isGoKart,
    labelNl: isGoKart ? 'Vé đơn NL' : 'Người lớn',
    labelTe: isGoKart ? 'Vé đơn TE' : 'Trẻ em',
    labelDoi: 'Xe đôi'
  };
}


/* =============================================================
   3. RENDER CARD LIST — Hiển thị danh sách combo
   ============================================================= */

function render() {
  let data = D.filter(c => c.tags.includes(tag));
  if (srt === 'asc') data.sort((a, b) => a.minPrice - b.minPrice);
  else if (srt === 'desc') data.sort((a, b) => b.maxPrice - a.maxPrice);
  const g = document.getElementById('cgrid');
  g.innerHTML = '';
  if (!data.length) {
    g.innerHTML = '<div class="dsec">Không có combo phù hợp.</div>';
    return;
  }
  data.forEach(c => {
    const d = document.createElement('div');
    d.className = 'card';

    // Giá hiển thị dạng [min] ~ [max]
    let priceHTML;
    if (c.minPrice === c.maxPrice) {
      priceHTML = '<span class="cprice-range">' + f(c.minPrice) + '</span>';
    } else {
      priceHTML = '<span class="cprice-range">' + f(c.minPrice) + '<span class="cprice-sep">~</span>' + f(c.maxPrice) + '</span>';
    }

    // Slider ảnh
    const imgs = c.images.length ? c.images : ['img/map/map_desk.jpg'];
    const sliderImgs = imgs.map(src => '<img src="' + src + '" alt="' + c.ten + '">').join('');
    const dots = imgs.length > 1 ? '<div class="cdots">' + imgs.map((_, i) => '<span class="cdot' + (i === 0 ? ' on' : '') + '"></span>').join('') + '</div>' : '';

    d.innerHTML = '<div class="cimg"><div class="cslider">' + sliderImgs + '</div>' + dots + '</div>' +
    '<div class="cbody">' +
      '<div>' + priceHTML + '<span class="cpricelbl">' + (c.minPrice !== c.maxPrice ? 'Giá theo loại vé' : '/ ' + c.labelNl.toLowerCase()) + '</span></div>' +
      '<div class="cname">' + c.ten + '</div>' +
      '<div class="chsd"><div class="hd"></div>HSD: ' + c.hsd + '</div>' +
      '<div class="cqty">' +
        '<div class="cqtyl">Số lượng vé</div>' +
        '<div class="qc"><button class="qb" onclick="event.stopPropagation();adj(this,-1)">-</button><input class="qn" type="number" value="1" min="1" max="99" onclick="event.stopPropagation()"><button class="qb" onclick="event.stopPropagation();adj(this,1)">+</button></div>' +
      '</div>' +
      '<div class="cacts">' +
        '<button class="bdet" onclick="event.stopPropagation();openD(' + c.id + ')">Xem chi tiết</button>' +
        '<button class="bbuy" onclick="event.stopPropagation();openD(' + c.id + ')">Chọn mua</button>' +
      '</div>' +
    '</div>';
    g.appendChild(d);
  });
  startCardSliders();
}


/* =============================================================
   4. CARD AUTO-SLIDE — Tự chuyển ảnh trên card list
   ============================================================= */

let cardTimers = [];
function startCardSliders() {
  cardTimers.forEach(t => clearInterval(t));
  cardTimers = [];
  document.querySelectorAll('.cimg').forEach(cimg => {
    const slider = cimg.querySelector('.cslider');
    const dots = cimg.querySelectorAll('.cdot');
    if (!slider || dots.length < 2) return;
    const count = dots.length;
    let idx = 0;
    const go = () => {
      idx = (idx + 1) % count;
      slider.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    };
    cardTimers.push(setInterval(go, 3000));
  });
}


/* =============================================================
   5. DETAIL GALLERY — Slider ảnh combo ở sidebar
   ============================================================= */

let galIdx = 0, galImages = [], galTimer = null;

function buildGallery(images) {
  galImages = images.length ? images : ['img/map/map_desk.jpg'];
  galIdx = 0;
  const gal = document.getElementById('dgal');
  const dots = document.getElementById('dgalDots');
  gal.innerHTML = galImages.map(src => '<img src="' + src + '" alt="Combo">').join('');
  dots.innerHTML = galImages.length > 1 ? galImages.map((_, i) => '<button class="dgal-dot' + (i === 0 ? ' on' : '') + '" onclick="galGo(' + i + ')"></button>').join('') : '';
  gal.style.transform = 'translateX(0)';
  var arrows = document.querySelectorAll('.dgal-arr');
  arrows.forEach(a => a.style.display = galImages.length > 1 ? 'flex' : 'none');
  if (galTimer) clearInterval(galTimer);
  if (galImages.length > 1) {
    galTimer = setInterval(() => galNav(1), 4000);
  }
}

function galGo(i) {
  galIdx = i;
  document.getElementById('dgal').style.transform = 'translateX(-' + (galIdx * 100) + '%)';
  document.querySelectorAll('.dgal-dot').forEach((d, j) => d.classList.toggle('on', j === galIdx));
  if (galTimer) clearInterval(galTimer);
  galTimer = setInterval(() => galNav(1), 4000);
}

function galNav(dir) {
  galGo((galIdx + dir + galImages.length) % galImages.length);
}


/* =============================================================
   6. QUANTITY HELPERS — Tăng giảm số lượng vé
   ============================================================= */

/** Tăng/giảm số lượng trên card list */
function adj(btn, d) {
  const i = btn.parentElement.querySelector('.qn');
  i.value = Math.max(1, Math.min(99, (parseInt(i.value) || 1) + d));
}

/** Tăng/giảm số lượng trên detail page */
function chQ(t, d) {
  const map = { nl: 'qnl', te: 'qte', doi: 'qdoi' };
  const i = document.getElementById(map[t]);
  if (!i) return;
  i.value = Math.max(0, Math.min(99, (parseInt(i.value) || 0) + d));
  calc();
}

/** Tính tổng tiền */
function calc() {
  if (!cur) return;
  const nl = parseInt(document.getElementById('qnl').value) || 0;
  const te = parseInt(document.getElementById('qte').value) || 0;
  const doiEl = document.getElementById('qdoi');
  const doiQty = doiEl ? (parseInt(doiEl.value) || 0) : 0;
  const tot = nl * cur.nl + ((cur.te || 0) * te) + ((cur.doi || 0) * doiQty);
  document.getElementById('stot').textContent = tot.toLocaleString('vi-VN') + ' đ';
}


/* =============================================================
   7. FILTER & SORT — Bộ lọc và sắp xếp combo
   ============================================================= */

document.querySelectorAll('.fchip').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    tag = b.dataset.tag;
    render();
  });
});
document.getElementById('fsort').addEventListener('change', e => { srt = e.target.value; render(); });


/* =============================================================
   8. MAP HOTSPOTS — Điểm chạm VR 360 trên bản đồ (load từ hotspots.json)
   ============================================================= */

let MAP_SPOTS = [];

async function loadHotspots() {
  try {
    const res = await fetch('hotspots.json');
    if (res.ok) MAP_SPOTS = await res.json();
  } catch (e) { console.warn('hotspots.json not loaded', e); }
}

/** Render hotspot vào zoom overlay, chọn tọa độ desktop/mobile */
function renderHotspots() {
  const container = document.getElementById('hotspots');
  if (!MAP_SPOTS.length) { container.innerHTML = ''; return; }
  const mobile = window.innerWidth <= 768;
  container.innerHTML = MAP_SPOTS.map(s => {
    const px = mobile && s.mx != null ? s.mx : s.x;
    const py = mobile && s.my != null ? s.my : s.y;
    const sz = mobile && s.msize != null ? s.msize : (s.size || 14);
    return '<a class="hotspot" href="' + (s.link || '#') + '" target="_blank" rel="noopener" style="left:' + px + '%;top:' + py + '%;--hs:' + sz + '%"></a>';
  }).join('');
}


/* =============================================================
   9. DETAIL PAGE — Mở / đóng trang chi tiết combo
   ============================================================= */

function openD(id) {
  cur = D.find(c => c.id === id);
  if (!cur) return;
  document.getElementById('dbc').textContent = cur.ten;
  document.getElementById('dphoto').src = getComboMap(cur);
  buildGallery(cur.images);
  renderHotspots();
  document.getElementById('ditl').textContent = cur.ten.toUpperCase();
  document.getElementById('ddesc').textContent = cur.desc;
  document.getElementById('djny').innerHTML = cur.jny.map((j, i) => '<div class="tli" id="jny-' + i + '"><div class="tln">' + (i + 1) + '</div><div><div class="tlm">' + j.l + '</div><div class="tls">' + j.s + '</div></div></div>').join('');
  document.getElementById('snl').textContent = f(cur.nl);
  document.querySelector('#sterow .sprl').textContent = cur.labelTe;
  document.querySelector('.spr .sprl').textContent = cur.labelNl;

  // Handle trẻ em row
  const teRow = document.getElementById('sterow');
  if (cur.te === null) {
    teRow.style.display = 'none';
  } else {
    teRow.style.display = 'flex';
    document.getElementById('ste').textContent = f(cur.te);
  }

  // Handle xe đôi row (Go Kart)
  const doiRow = document.getElementById('sdoirow');
  if (cur.doi !== null && cur.doi > 0) {
    doiRow.style.display = 'flex';
    document.getElementById('sdoi').textContent = f(cur.doi);
  } else {
    doiRow.style.display = 'none';
  }

  document.getElementById('qibt').textContent = 'Hạn sử dụng';
  document.getElementById('qibs').textContent = cur.hsd;
  document.getElementById('qibi').textContent = (cur.hsd.match(/\d+/) || ['90'])[0];
  document.getElementById('shsdi').textContent = (cur.hsd.match(/\d+/) || ['90'])[0];
  document.getElementById('shsdText').textContent = 'HSD: ' + cur.hsd;
  document.getElementById('qnl').value = 1;
  document.getElementById('qte').value = 0;
  if (document.getElementById('qdoi')) document.getElementById('qdoi').value = 0;
  calc();
  document.getElementById('pg-list').classList.remove('active');
  document.getElementById('pg-detail').classList.add('active');
  window.scrollTo(0, 0);
}

function goBack() {
  document.getElementById('pg-detail').classList.remove('active');
  document.getElementById('pg-list').classList.add('active');
}


/* =============================================================
   10. ACCORDION — Quy định & chính sách
   ============================================================= */

function toggleAcc(h) {
  const b = h.nextElementSibling, a = h.querySelector('.acca');
  b.classList.toggle('on');
  a.style.transform = b.classList.contains('on') ? 'rotate(180deg)' : '';
}


/* =============================================================
   11. ZOOM — Phóng to bản đồ với hotspot VR 360
   ============================================================= */

const Z = { s: 1, x: 0, y: 0, drag: false, sx: 0, sy: 0, moved: false };

function applyZ() {
  const box = document.getElementById('zoomMap');
  if (box) box.style.transform = 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')';
}

function openZoom() {
  document.getElementById('zoomImg').src = (cur && getComboMap(cur)) || 'img/map/map_desk.jpg';
  renderHotspots();
  Z.s = 1; Z.x = 0; Z.y = 0; Z.drag = false;
  const box = document.getElementById('zoomMap');
  box.classList.remove('dragging');
  box.style.transform = '';
  document.getElementById('zoom').classList.add('on');
  document.body.style.overflow = 'hidden';
  // Reset hint animation
  const hint = document.getElementById('zoomHint');
  hint.style.animation = 'none';
  hint.offsetHeight;
  hint.style.animation = '';
}

function closeZoom() {
  document.getElementById('zoom').classList.remove('on');
  document.body.style.overflow = '';
}

/* ----- Zoom event listeners (drag, wheel, pinch) ----- */
(function() {
  const overlay = document.getElementById('zoom');
  const box = document.getElementById('zoomMap');
  if (!overlay || !box) return;

  // Pointer down — close nếu click nền, bắt đầu drag nếu click map
  overlay.addEventListener('pointerdown', function(e) {
    if (e.target === overlay) { closeZoom(); return; }
    if (e.target.closest('.hotspot') || e.target.closest('.zoom-close')) return;
    e.preventDefault();
    Z.drag = true; Z.moved = false;
    Z.sx = e.clientX - Z.x;
    Z.sy = e.clientY - Z.y;
    box.classList.add('dragging');
    box.setPointerCapture(e.pointerId);
  });

  // Pointer move — kéo map
  overlay.addEventListener('pointermove', function(e) {
    if (!Z.drag) return;
    e.preventDefault();
    if (Math.abs(e.clientX - Z.sx - Z.x) > 3 || Math.abs(e.clientY - Z.sy - Z.y) > 3) Z.moved = true;
    Z.x = e.clientX - Z.sx;
    Z.y = e.clientY - Z.sy;
    applyZ();
  });

  // Pointer up — kết thúc drag
  overlay.addEventListener('pointerup', function(e) {
    if (!Z.drag) return;
    Z.drag = false;
    box.classList.remove('dragging');
  });

  overlay.addEventListener('pointercancel', function() {
    Z.drag = false; box.classList.remove('dragging');
  });

  // Scroll wheel — zoom in/out
  overlay.addEventListener('wheel', function(e) {
    e.preventDefault();
    Z.s = Math.max(0.5, Math.min(5, Z.s + (e.deltaY < 0 ? 0.3 : -0.3)));
    if (Z.s <= 1) { Z.x = 0; Z.y = 0; }
    applyZ();
  }, { passive: false });

  // Pinch-to-zoom (mobile)
  let lastDist = 0;
  overlay.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  overlay.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      Z.s = Math.max(0.5, Math.min(5, Z.s + (d - lastDist) * 0.008));
      lastDist = d;
      applyZ();
    }
  }, { passive: false });
})();


/* =============================================================
   12. KEYBOARD & RESIZE HANDLERS
   ============================================================= */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeZoom();
});

window.addEventListener('resize', () => {
  if (!cur) return;
  document.getElementById('dphoto').src = getComboMap(cur);
  if (document.getElementById('zoom').classList.contains('on')) {
    document.getElementById('zoomImg').src = getComboMap(cur);
    renderHotspots();
  }
});


/* =============================================================
   13. INIT — Khởi tạo ứng dụng, load dữ liệu
   ============================================================= */

async function init() {
  try {
    const [comboRes] = await Promise.all([fetch('combos.json'), loadHotspots()]);
    if (!comboRes.ok) throw new Error('Failed to load combos.json');
    const raw = await comboRes.json();
    D = raw.map(mapCombo);
    render();
  } catch (err) {
    console.error(err);
    document.getElementById('cgrid').innerHTML = '<div class="dsec">Không tải được dữ liệu combo. Hãy mở trang qua local server để đọc file JSON.</div>';
  }
}
init();
