// Modal Management Library for CapamulCars 2.0

const MIN_DEPOSIT = 10000;
const SHOP_ADDRESS = "Purok 2, Dapdap, Barobo, Surigao del Sur";
const BUSINESS_PHONE = "09686995654";
const FACEBOOK_CONTACT_URL = "https://www.facebook.com/share/1Eq7cKc5uA/";

// Utility formatting functions
function formatPhp(n) {
  const v = Number(n ?? 0);
  return "₱ " + v.toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

function computeDp(price) {
  const v = Number(price ?? 0);
  if (isNaN(v) || v <= 0) return 0;
  const raw = v * 0.15;
  const rounded = Math.floor(raw / 5000) * 5000;
  return Math.max(50000, rounded);
}

function formatTime12(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Generate test drive timeslots
function generateTimeSlots() {
  const start = 9 * 60; // 09:00 AM
  const end = 17 * 60;  // 05:00 PM
  const slotMinutes = 30;
  const slots = [];
  const pad = (n) => String(n).padStart(2, "0");
  for (let t = start; t <= end; t += slotMinutes) {
    slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return slots;
}

// Create wrapper for the modal
function createModalWrapper(htmlContent, isLarge = false) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "global-modal";
  
  const content = document.createElement("div");
  content.className = `modal-content ${isLarge ? 'max-w-6xl' : ''}`;
  content.innerHTML = htmlContent;
  
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden"; // Lock page scroll

  // Close when clicking overlay background
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  return overlay;
}

function closeModal() {
  const modal = document.getElementById("global-modal");
  if (modal) {
    modal.remove();
  }
  document.body.style.overflow = ""; // Restore page scroll
}

// -------------------------------------------------------------
// 1. CAR DETAIL DIALOG
// -------------------------------------------------------------
window.openCarDetail = async function(carId) {
  // Show loading spinner immediately
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'modal-overlay';
  loadingOverlay.id = 'global-modal';
  loadingOverlay.innerHTML = '<div class="modal-content" style="display:flex;align-items:center;justify-content:center;min-height:200px"><div style="text-align:center;color:#6b7280"><div style="width:40px;height:40px;border:4px solid #dc2626;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px"></div>Loading...</div></div>';
  document.body.appendChild(loadingOverlay);
  document.body.style.overflow = 'hidden';
  loadingOverlay.addEventListener('click', e => { if (e.target === loadingOverlay) closeModal(); });

  const car = await window.api.getCarById(carId);
  if (!car) { closeModal(); return; }

  let activeImgIndex = 0;
  const isAvailable = (car.status||'').toLowerCase() === 'available';
  const dp = car.dp && car.dp > 0 ? car.dp : computeDp(car.price);

  const imagesHtml = car.images.map((img, i) => `
    <img src="${img}" alt="${car.name}" class="car-gallery-image absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${i === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}" data-index="${i}" />
  `).join('');

  const indicatorsHtml = car.images.map((_, i) => `
    <button class="gallery-indicator h-2 rounded-full transition-all ${i === 0 ? 'w-6 bg-white' : 'w-2 bg-white/60'}" data-index="${i}"></button>
  `).join('');

  const thumbnailsHtml = car.images.map((img, i) => `
    <button class="gallery-thumb shrink-0 w-20 h-16 rounded overflow-hidden border-2 ${i === 0 ? 'border-red-600' : 'border-transparent'}" data-index="${i}">
      <img src="${img}" alt="" class="w-full h-full object-cover" />
    </button>
  `).join('');

  const others = (await window.api.getCars()).filter(c => c.id !== car.id && (c.status||'').toLowerCase()==='available' && (c.make||'').toLowerCase() === (car.make||'').toLowerCase()).slice(0, 6);
  const othersHtml = others.map(o => {
    const oDp = o.dp && o.dp > 0 ? o.dp : computeDp(o.price);
    return `
      <button class="text-left group focus:outline-none" onclick="closeModal(); setTimeout(() => openCarDetail('${o.id}'), 100)">
        <div class="aspect-[16/10] bg-black/5 rounded overflow-hidden">
          <img src="${o.images[0]}" alt="${o.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        </div>
        <div class="mt-1.5 text-xs font-bold truncate text-gray-800">${o.name}</div>
        <div class="flex flex-col leading-tight mt-1">
          <div class="flex items-baseline gap-1 text-[10px] font-bold text-red-600">
            <span>DP</span><span>${formatPhp(oDp)}</span><span>only</span>
          </div>
          <div class="text-[10px] text-gray-500">SRP ${formatPhp(o.price)}</div>
        </div>
      </button>
    `;
  }).join('');

  const html = `
    <!-- Close Button -->
    <button onclick="closeModal()" class="absolute top-3 right-3 z-10 h-9 w-9 grid place-items-center rounded-full bg-white border border-black/10 shadow hover:bg-black/5">
      <i data-lucide="x" class="h-5 w-5 text-gray-800"></i>
    </button>

    <div class="grid lg:grid-cols-[1.3fr_1fr] gap-6 p-4 sm:p-6 text-gray-800">
      <!-- Left: images -->
      <div class="min-w-0">
        <div class="aspect-[4/3] bg-black/5 rounded-lg overflow-hidden relative">
          <div class="relative w-full h-full">
            ${imagesHtml}
          </div>
          <span class="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow-sm ${
            (car.status||'Available').toLowerCase() === 'available' ? 'bg-green-600 text-white' : (car.status||'Available').toLowerCase() === 'reserved' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'
          }">
            ${car.status}
          </span>
          
          ${car.images.length > 1 ? `
            <button id="prev-img-btn" class="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/90 hover:bg-white shadow border border-black/10">
              <i data-lucide="chevron-left" class="h-5 w-5"></i>
            </button>
            <button id="next-img-btn" class="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/90 hover:bg-white shadow border border-black/10">
              <i data-lucide="chevron-right" class="h-5 w-5"></i>
            </button>
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              ${indicatorsHtml}
            </div>
            <div class="absolute top-3 right-3 text-[11px] font-bold bg-black/60 text-white px-2 py-1 rounded">
              <span id="active-img-counter">1</span> / ${car.images.length}
            </div>
          ` : ''}
        </div>
        
        ${car.images.length > 1 ? `
          <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
            ${thumbnailsHtml}
          </div>
        ` : ''}
      </div>

      <!-- Right: info -->
      <div class="min-w-0 flex flex-col gap-4">
        <!-- Title & Basic Info (Keep this unboxed or subtly boxed) -->
        <div>
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            ${car.year} ${car.name ? `• Series: ${car.name}` : ''}
          </div>
          <h2 class="text-3xl sm:text-4xl font-black leading-tight text-gray-900 uppercase tracking-tighter">
            ${car.make} ${car.model}
          </h2>
        </div>

        <!-- Box 1: Price, Status & Actions -->
        <div class="border border-gray-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-1 items-start text-left mb-6">
            ${dp > 0 ? `
              <div class="flex items-baseline gap-1.5">
                <span class="text-[11px] font-black uppercase tracking-[0.15em] text-red-600/80">DP</span>
                <span class="text-red-600 font-black leading-none text-3xl">${formatPhp(dp)}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-red-600/70">only</span>
              </div>
            ` : ''}
            <div class="flex flex-wrap items-baseline gap-2 mt-1">
              ${dp > 0 ? `<span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">SRP</span>` : ''}
              <span class="${dp > 0 ? 'text-sm sm:text-base text-gray-800' : 'text-4xl text-red-600 tracking-tighter'} font-black">${formatPhp(car.price)}</span>
              ${car.original_price && car.original_price > car.price ? `
                <span class="text-xs text-gray-400 line-through">${formatPhp(car.original_price)}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 px-2 py-0.5 rounded shadow-sm">
                  Save ${formatPhp(car.original_price - car.price)}
                </span>
              ` : ''}
            </div>
            
            <div class="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] ${(car.status||'Available').toLowerCase() === 'available' ? 'text-green-500' : (car.status||'Available').toLowerCase() === 'reserved' ? 'text-yellow-500' : 'text-red-600'}">
              ${car.status}
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <button type="button" onclick="closeModal(); setTimeout(() => openReserveDialog('${car.id}'), 80)" ${!isAvailable ? 'disabled' : ''} class="w-full text-center text-sm font-bold uppercase tracking-widest py-3.5 bg-red-600 text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed">
              ${isAvailable ? 'Reserve' : car.status}
            </button>
            <button type="button" onclick="closeModal(); setTimeout(() => openTestDriveDialog('${car.id}'), 80)" ${!isAvailable ? 'disabled' : ''} class="w-full text-center text-sm font-bold uppercase tracking-widest py-3.5 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed">
              View Car &amp; Test Drive
            </button>
            <a href="${FACEBOOK_CONTACT_URL}" target="_blank" rel="noopener noreferrer" class="w-full text-center text-sm font-bold uppercase tracking-widest py-3.5 bg-[#1877F2] text-white hover:opacity-90 transition">
              Contact Us on Facebook
            </a>
          </div>
        </div>

        <!-- Box 2: Specs Table -->
        <div class="border border-gray-200 bg-white shadow-sm flex flex-col">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <span class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Body Type</span>
            <span class="text-sm font-semibold text-gray-900 text-right">${car.body_type ?? '—'}</span>
          </div>
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <span class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Mileage</span>
            <span class="text-sm font-semibold text-gray-900 text-right">${car.mileage ? Number(car.mileage).toLocaleString() + ' km' : '—'}</span>
          </div>
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <span class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Fuel</span>
            <span class="text-sm font-semibold text-gray-900 text-right">${car.fuel_type ?? '—'}</span>
          </div>
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <span class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Transmission</span>
            <span class="text-sm font-semibold text-gray-900 text-right">${car.transmission ?? '—'}</span>
          </div>
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <span class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Color</span>
            <span class="text-sm font-semibold text-gray-900 text-right">${car.color ?? '—'}</span>
          </div>
        </div>

        <!-- Box 3: Description -->
        ${car.description ? `
          <div class="border border-gray-200 bg-white p-5 shadow-sm">
            <div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${
              // Replace lines starting with checkmarks/emojis to styled checkboxes if possible, otherwise leave it
              car.description
            }</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Related vehicles -->
    <div class="border-t border-black/10 p-4 sm:p-6 bg-gray-50/50">
      <div class="text-xs uppercase tracking-widest text-red-600 font-bold mb-3">Other Available Cars</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        ${othersHtml}
      </div>
    </div>
  `;

  // Swap loading overlay content with the actual car detail
  loadingOverlay.innerHTML = '';
  const content = document.createElement('div');
  content.className = 'modal-content max-w-6xl';
  content.innerHTML = html;
  loadingOverlay.appendChild(content);
  lucide.createIcons();

  // Bind gallery functionality
  if (car.images.length > 1) {
    const images = document.querySelectorAll(".car-gallery-image");
    const indicators = document.querySelectorAll(".gallery-indicator");
    const thumbs = document.querySelectorAll(".gallery-thumb");
    const activeCounter = document.getElementById("active-img-counter");

    function setImg(index) {
      activeImgIndex = index;
      images.forEach((img, i) => {
        if (i === index) {
          img.classList.remove("opacity-0", "pointer-events-none");
          img.classList.add("opacity-100");
        } else {
          img.classList.remove("opacity-100");
          img.classList.add("opacity-0", "pointer-events-none");
        }
      });
      indicators.forEach((ind, i) => {
        if (i === index) {
          ind.classList.remove("w-2", "bg-white/60");
          ind.classList.add("w-6", "bg-white");
        } else {
          ind.classList.remove("w-6", "bg-white");
          ind.classList.add("w-2", "bg-white/60");
        }
      });
      thumbs.forEach((th, i) => {
        if (i === index) {
          th.classList.add("border-red-600");
          th.classList.remove("border-transparent");
        } else {
          th.classList.remove("border-red-600");
          th.classList.add("border-transparent");
        }
      });
      if (activeCounter) activeCounter.innerText = index + 1;
    }

    document.getElementById("prev-img-btn").addEventListener("click", () => {
      let idx = (activeImgIndex - 1 + car.images.length) % car.images.length;
      setImg(idx);
    });

    document.getElementById("next-img-btn").addEventListener("click", () => {
      let idx = (activeImgIndex + 1) % car.images.length;
      setImg(idx);
    });

    thumbs.forEach(thumb => {
      thumb.addEventListener("click", () => {
        setImg(Number(thumb.dataset.index));
      });
    });
  }
};

// -------------------------------------------------------------
// 2. RESERVE DIALOG
// -------------------------------------------------------------
window.openReserveDialog = async function(carId) {
  const car = await window.api.getCarById(carId);
  if (!car) return;

  const cms = await window.api.getCMSData();
  const gcashAccounts = (cms && cms.gcash && Array.isArray(cms.gcash) && cms.gcash.length > 0) 
    ? cms.gcash 
    : [{ name: "CapamulCars", number: BUSINESS_PHONE }];

  const isWaitlist = (car.status||'Available').toLowerCase() === "reserved";
  
  function renderWarning() {
    return `
      <div class="p-6 sm:p-10 flex flex-col items-center text-center">
        <div class="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-6">
          <i data-lucide="alert-triangle" class="h-8 w-8 sm:h-10 sm:w-10"></i>
        </div>
        
        <h3 class="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2">
          Reservation Notice
        </h3>
        <p class="text-sm sm:text-base text-gray-500 mb-8 max-w-md mx-auto">
          Please read our reservation policy carefully before proceeding to secure your vehicle.
        </p>
        
        <div class="w-full text-left bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-7 space-y-4 shadow-sm mb-8">
          <h4 class="font-bold text-gray-900 text-base sm:text-lg uppercase tracking-widest border-b border-gray-200 pb-3">Important Terms</h4>
          <ul class="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
            <li class="flex items-start gap-3">
              <i data-lucide="check-circle-2" class="h-5 w-5 text-red-600 shrink-0 mt-0.5"></i>
              <span>Minimum reservation deposit is <strong>${formatPhp(MIN_DEPOSIT)}</strong> via GCash.</span>
            </li>
            <li class="flex items-start gap-3">
              <i data-lucide="shield-alert" class="h-5 w-5 text-red-600 shrink-0 mt-0.5"></i>
              <span>All confirmed reservations are strictly <strong>non-refundable</strong>.</span>
            </li>
          </ul>
        </div>

        ${isWaitlist ? `
          <div class="w-full rounded-xl border border-blue-200 bg-blue-50/50 p-5 text-left flex items-start gap-4 mb-8 shadow-sm">
            <div class="bg-blue-100 text-blue-600 p-2.5 rounded-full shrink-0">
              <i data-lucide="users" class="h-6 w-6"></i>
            </div>
            <div>
              <p class="font-bold text-blue-900 text-base sm:text-lg mb-1">Unit is currently reserved</p>
              <p class="text-sm sm:text-base text-blue-800 leading-relaxed">
                You can still submit your reservation to be placed on the <strong>waitlist</strong>. If the current reservation falls through, you will be automatically promoted and notified.
              </p>
            </div>
          </div>
        ` : ''}
        
        <div class="w-full flex flex-col sm:flex-row justify-center gap-3 mt-2">
          <button onclick="closeModal()" class="w-full sm:w-auto px-8 py-3.5 sm:py-4 border-2 border-gray-200 rounded-lg text-sm sm:text-base font-bold text-gray-700 uppercase tracking-widest hover:bg-gray-50 transition">
            Cancel
          </button>
          <button id="proceed-reserve-btn" class="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-bold uppercase tracking-widest transition shadow-md hover:shadow-lg">
            ${isWaitlist ? 'Join Waitlist' : 'I Understand, Proceed'}
          </button>
        </div>
      </div>
    `;
  }

  function renderForm() {
    return `
      <div class="p-6 text-gray-800">
        <h3 class="text-lg font-bold border-b pb-3 mb-4 text-gray-900">Reserve: ${car.name}</h3>
        <p class="text-xs text-gray-500 mb-4">Fill out the form and upload your GCash payment screenshot.</p>
        
        <form id="reserve-submit-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name *</label>
            <input type="text" id="cust-name" required placeholder="Juan Dela Cruz" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
          </div>
          
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Contact Number *</label>
              <input type="tel" id="cust-phone" required placeholder="09XX XXX XXXX" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Email *</label>
              <input type="email" id="cust-email" required placeholder="you@email.com" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Address *</label>
            <textarea id="cust-addr" rows="2" required placeholder="Complete home address" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"></textarea>
          </div>

          <!-- Financing Alert button -->
          <button type="button" id="financing-toggle-btn" class="w-full flex items-center justify-between gap-3 rounded-lg border border-red-600/30 bg-red-500/5 hover:bg-red-500/10 transition px-4 py-3 text-left">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-full bg-red-600/15 grid place-items-center text-red-600">
                <i data-lucide="file-text" class="h-5 w-5"></i>
              </div>
              <div>
                <div class="font-semibold text-sm">We Offer Financing Options</div>
                <div class="text-xs text-gray-500">Click here to see the requirements</div>
              </div>
            </div>
            <span class="text-red-600 font-bold text-sm">View →</span>
          </button>

          <!-- GCash instructions -->
          <div class="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 to-white p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1">
                <div class="h-7 w-7 rounded-full bg-blue-600 grid place-items-center shadow-sm text-white font-black text-sm">G</div>
                <span class="font-black text-blue-600 tracking-tight text-base">GCash</span>
              </div>
              <span class="text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Payment</span>
            </div>
            
            <div class="text-xs text-gray-700 leading-normal">
              Send at least <strong>${formatPhp(MIN_DEPOSIT)}</strong> reservation fee to the account below:
            </div>

            <div class="space-y-2">
              ${gcashAccounts.map(acc => `
                <div class="flex items-center justify-between bg-white rounded-lg p-3 border shadow-sm">
                  <div class="min-w-0">
                    <div class="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Account Name</div>
                    <div class="font-semibold text-xs truncate">${acc.name || 'CapamulCars'}</div>
                    <div class="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mt-1">GCash Number</div>
                    <div class="font-mono font-bold text-sm tracking-wide">${acc.number || BUSINESS_PHONE}</div>
                  </div>
                  <button type="button" class="copy-gcash-btn shrink-0 border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-semibold" data-number="${acc.number || BUSINESS_PHONE}">
                    Copy
                  </button>
                </div>
              `).join('')}
            </div>

            <div class="mt-4">
              <label class="block text-xs font-bold text-gray-600 mb-1">Amount Sent (₱) *</label>
              <input type="number" id="cust-amount" min="${MIN_DEPOSIT}" value="${MIN_DEPOSIT}" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Payment Receipt Screenshot *</label>
            <label id="receipt-upload-box" class="mt-1 flex flex-col justify-center items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 cursor-pointer hover:bg-gray-50 text-gray-500 transition-colors">
              <i data-lucide="upload-cloud" class="h-6 w-6 text-gray-400"></i>
              <span id="screenshot-filename" class="text-xs truncate font-semibold">Click to upload GCash receipt (jpg/png)</span>
              <input type="file" id="cust-screenshot" accept="image/*" class="hidden" />
            </label>
            <p id="receipt-error-text" class="text-[11px] font-bold text-red-600 mt-2 hidden flex items-center gap-1.5"><i data-lucide="alert-circle" class="h-3.5 w-3.5"></i> Please upload your payment receipt.</p>
          </div>

          <div class="flex justify-end gap-2 border-t pt-4 mt-6">
            <button type="button" id="back-warning-btn" class="px-4 py-2 border rounded-md text-sm font-semibold hover:bg-gray-50">Back</button>
            <button type="submit" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">Submit Reservation</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderDone() {
    return `
      <div class="p-6 text-gray-800 text-center">
        <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="check-circle-2" class="h-8 w-8"></i>
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900">${isWaitlist ? 'Added to Waitlist' : 'Reservation Submitted'}</h3>
        
        <div class="text-sm text-gray-600 space-y-2 max-w-sm mx-auto mb-6 leading-relaxed">
          ${isWaitlist ? `
            <p>The unit <strong>${car.name}</strong> is currently reserved by another customer.</p>
            <p>You've been added to the <strong>waitlist</strong>. If the current reservation isn't completed within 24 hours, you'll be automatically promoted and notified.</p>
          ` : `
            <p>Thank you! Your reservation request for <strong>${car.name}</strong> has been received.</p>
            <p>The vehicle is now locked for you for <strong>24 hours</strong>. Our team will verify your payment and confirm shortly.</p>
          `}
        </div>
        
        <button onclick="closeModal()" class="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">Done</button>
      </div>
    `;
  }

  function renderRequirements() {
    return `
      <div class="text-gray-800">
        <div class="bg-red-600 text-white p-6 rounded-t-lg">
          <div class="flex items-center gap-3">
            <div class="h-11 w-11 rounded-full bg-white/20 grid place-items-center backdrop-blur text-white">
              <i data-lucide="file-text" class="h-6 w-6"></i>
            </div>
            <div>
              <h3 class="text-white text-xl font-black">Financing Requirements</h3>
              <p class="text-red-100 text-xs mt-0.5">Complete requirements checklist for loan approval</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="h-6 w-1 bg-red-600 rounded-full"></div>
              <h4 class="font-black text-sm uppercase tracking-wide">Maker (Primary Applicant)</h4>
            </div>
            <div class="grid sm:grid-cols-2 gap-2 text-xs">
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Loan Application Form</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> 2 Valid IDs (3 copies)</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Two 2x2 Pictures</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Barangay Clearance</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Cedula (2 copies)</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Proof of Billing</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Proof of Income</div>
            </div>
          </div>
          
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="h-6 w-1 bg-red-600 rounded-full"></div>
              <h4 class="font-black text-sm uppercase tracking-wide">Co-Maker (Guarantor)</h4>
            </div>
            <div class="grid sm:grid-cols-2 gap-2 text-xs">
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Valid IDs</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> 2x2 Picture</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Barangay Clearance</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Cedula</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Proof of Billing</div>
              <div class="border rounded p-2 flex items-center gap-2"><i data-lucide="check-square" class="text-red-600 w-4 h-4 shrink-0"></i> Proof of Income</div>
            </div>
          </div>

          <div class="rounded-xl border-2 border-red-600/30 bg-red-500/5 p-4 flex gap-3">
            <i data-lucide="map-pin" class="text-red-600 w-5 h-5 shrink-0 mt-0.5"></i>
            <div>
              <div class="font-black text-sm">Visit Our Shop</div>
              <div class="text-xs text-gray-600 mt-1">Submit your requirements in person at:</div>
              <div class="font-bold text-red-600 text-xs mt-1">${SHOP_ADDRESS}</div>
            </div>
          </div>
        </div>

        <div class="p-6 pt-0 border-t mt-4 flex justify-end">
          <button id="close-financing-btn" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">Got it</button>
        </div>
      </div>
    `;
  }

  const wrapper = createModalWrapper(renderWarning());
  lucide.createIcons();

  function bindWarningEvents() {
    document.getElementById("proceed-reserve-btn").addEventListener("click", () => {
      wrapper.querySelector(".modal-content").innerHTML = renderForm();
      lucide.createIcons();
      bindFormEvents();
    });
  }

  function bindFormEvents() {
    // Copy gcash
    const copyBtns = document.querySelectorAll(".copy-gcash-btn");
    copyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const num = btn.getAttribute("data-number");
        navigator.clipboard.writeText(num);
        alert("GCash number copied to clipboard!");
      });
    });

    // File name change & error reset
    const fileInput = document.getElementById("cust-screenshot");
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        document.getElementById("screenshot-filename").innerText = fileInput.files[0].name;
        // Reset error state if present
        const box = document.getElementById("receipt-upload-box");
        const errText = document.getElementById("receipt-error-text");
        if (box && errText) {
          box.classList.add("border-gray-300");
          box.classList.remove("border-red-500", "bg-red-50", "text-red-500");
          errText.classList.add("hidden");
        }
      }
    });

    // Back button
    document.getElementById("back-warning-btn").addEventListener("click", () => {
      wrapper.querySelector(".modal-content").innerHTML = renderWarning();
      lucide.createIcons();
      bindWarningEvents();
    });

    // Open requirements modal
    document.getElementById("financing-toggle-btn").addEventListener("click", () => {
      // Create sub modal for requirements
      const subOverlay = document.createElement("div");
      subOverlay.className = "modal-overlay";
      subOverlay.id = "financing-modal";
      subOverlay.style.zIndex = "110";
      
      const subContent = document.createElement("div");
      subContent.className = "modal-content max-w-2xl";
      subContent.innerHTML = renderRequirements();
      subOverlay.appendChild(subContent);
      document.body.appendChild(subOverlay);
      lucide.createIcons();

      subOverlay.addEventListener("click", (e) => {
        if(e.target === subOverlay) subOverlay.remove();
      });
      document.getElementById("close-financing-btn").addEventListener("click", () => {
        subOverlay.remove();
      });
    });

    // Form submit
    document.getElementById("reserve-submit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Perform simple validation and EXTRACT values before overwriting DOM
      const name = document.getElementById("cust-name").value.trim();
      const phone = document.getElementById("cust-phone").value.trim();
      const email = document.getElementById("cust-email").value.trim();
      const addr = document.getElementById("cust-addr").value.trim();
      const amount = document.getElementById("cust-amount").value;
      const screenshot = fileInput.files[0];

      if (!name || !phone || !email || !addr) {
        return; // Let native HTML5 validation handle the text inputs since they are visible and 'required'
      }
      
      if (!screenshot) {
        const box = document.getElementById("receipt-upload-box");
        const errText = document.getElementById("receipt-error-text");
        if (box && errText) {
          box.classList.remove("border-gray-300");
          box.classList.add("border-red-500", "bg-red-50", "text-red-500");
          errText.classList.remove("hidden");
          
          // CSS Shake animation manually via transform
          box.style.transition = "transform 0.1s ease";
          box.style.transform = "translateX(-5px)";
          setTimeout(() => box.style.transform = "translateX(5px)", 100);
          setTimeout(() => box.style.transform = "translateX(-5px)", 200);
          setTimeout(() => box.style.transform = "translateX(5px)", 300);
          setTimeout(() => box.style.transform = "translateX(0)", 400);
        }
        return;
      }

      // Real submitting (this destroys the form in the DOM)
      wrapper.querySelector(".modal-content").innerHTML = `
        <div class="p-16 text-center text-gray-500">
          <div class="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Submitting reservation...
        </div>
      `;

      (async () => {
        try {
          // Upload screenshot to Supabase Storage
          let screenshotUrl = null;
          const SUPABASE_URL = window.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
          const SUPABASE_KEY = window.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
          try {
            const ext = screenshot.name.split('.').pop() || 'jpg';
            const fileName = `reservations/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/car-images/${fileName}`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': screenshot.type || 'image/jpeg',
                'x-upsert': 'true'
              },
              body: screenshot
            });
            if (uploadRes.ok) {
              screenshotUrl = `${SUPABASE_URL}/storage/v1/object/public/car-images/${fileName}`;
            }
          } catch(uploadErr) {
            console.warn('Screenshot upload failed (non-fatal):', uploadErr);
          }

          // Submit data
          const res = await window.api.submitReservation({
            carId: car.id,
            carName: car.name,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            customerAddress: addr,
            amount: Number(amount),
            screenshotUrl: screenshotUrl,
            isWaitlist: isWaitlist
          });

          if (!res.success) {
            throw new Error(res.error?.message || "Failed to submit to database");
          }

          // Send confirmation email to customer via EmailJS REST API
          try {
            const emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
        Reservation Successfully Received!
      </h1>
      
      <p style="margin-bottom: 20px;">
        Dear <strong>${name}</strong>,
      </p>
      
      <p style="margin-bottom: 25px;">
        Thank you for choosing Capamul Cars. We have successfully received your ${isWaitlist ? 'Waitlist Reservation' : 'Direct Reservation'} request for the <strong>${car.name}</strong>.
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">What happens next?</h3>
        <p style="margin: 0; color: #555; font-size: 14px;">
          Our sales team is currently reviewing your submission. You will receive a follow-up email or phone call from us shortly once your reservation has been officially approved. 
        </p>
      </div>

      <p style="margin-bottom: 30px; color: #555;">
        If you have any immediate questions, please feel free to reply directly to this email or contact our support team.
      </p>
      
      <p style="margin: 0; font-weight: 600; color: #111;">Warm regards,</p>
      <p style="margin: 5px 0 0 0; color: #666;">The Capamul Cars Team</p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; border-top: 1px solid #eeeeee; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        Capamul Cars 2.0 &bull; Purok 2, Dapdap Barobo Surigao Del Sur<br>
        <a href="mailto:capamulcar2@gmail.com" style="color: #9f1c1c; text-decoration: none;">capamulcar2@gmail.com</a>
      </p>
    </div>

  </div>
</div>`;

            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: 'service_dgu0d2n',
                template_id: 'template_xzcf7bn', 
                user_id: '8bYgrl4zv7OqxBU8a',
                template_params: {
                  to_email: email,
                  subject: `Reservation Received - ${car.name}`,
                  html_message: emailHtml
                }
              })
            });
            console.log("Confirmation email sent to customer.");

            // Also send an alert email to the admin
            const adminHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #9f1c1c; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        NEW <span style="color: #ffcccc;">RESERVATION</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
        Action Required: New Reservation Received
      </h1>
      <p style="margin-bottom: 20px;">
        A new reservation has been submitted by <strong>${name}</strong> for the <strong>${car.name}</strong>.
      </p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">Reservation Details</h3>
        <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
          <li><strong>Customer Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Vehicle:</strong> ${car.name}</li>
          <li><strong>Type:</strong> ${isWaitlist ? 'Waitlist Reservation' : 'Direct Reservation'}</li>
        </ul>
      </div>
      <p style="margin-bottom: 30px; color: #555;">
        Please log into the Admin Dashboard to review and approve this reservation.
      </p>
    </div>
  </div>
</div>`;
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: 'service_dgu0d2n',
                template_id: 'template_xzcf7bn', 
                user_id: '8bYgrl4zv7OqxBU8a',
                template_params: {
                  to_email: 'vclumapac@nemsu.edu.ph, capamulcar2@gmail.com',
                  subject: `Action Required: New Reservation - ${car.name}`,
                  html_message: adminHtml
                }
              })
            });
            console.log("Alert email sent to admin.");
          } catch(emailErr) {
            console.error("Failed to send emails:", emailErr);
          }

          wrapper.querySelector(".modal-content").innerHTML = renderDone();
          if (window.lucide) window.lucide.createIcons();
        } catch (error) {
          console.error("Reservation error:", error);
          alert("Submission Error: " + error.message + "\n\n(If this says 'Failed to submit', please make sure you ran the SQL fix script in your Supabase dashboard!)");
          wrapper.querySelector(".modal-content").innerHTML = renderForm();
          if (window.lucide) window.lucide.createIcons();
          bindFormEvents();
        }
      })();
    });
  }

  bindWarningEvents();
};

// -------------------------------------------------------------
// 3. BOOK TEST DRIVE DIALOG
// -------------------------------------------------------------
window.openTestDriveDialog = async function(carId = null) {
  const allCars = await window.api.getCars();
  const cars = allCars.filter(c => (c.status||'').toLowerCase() === "available");
  let selectedCar = carId ? await window.api.getCarById(carId) : null;

  function renderForm() {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    const timeSlots = generateTimeSlots();

    const carSelectOptions = cars.map(c => `
      <option value="${c.id}" ${selectedCar && selectedCar.id === c.id ? 'selected' : ''}>${c.name}</option>
    `).join('');

    return `
      <div class="p-6 text-gray-800">
        <h3 class="text-lg font-bold flex items-center gap-2 border-b pb-3 mb-4 text-gray-900">
          <i data-lucide="calendar" class="h-5 w-5 text-red-600"></i> Book View Car &amp; Test Drive
        </h3>
        <p class="text-xs text-gray-500 mb-4">Choose a vehicle, then pick a date and time — our team will confirm shortly.</p>
        
        <form id="testdrive-submit-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Select Vehicle *</label>
            <select id="td-car-select" required class="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-600">
              <option value="" disabled ${!selectedCar ? 'selected' : ''}>-- Choose an Available Car --</option>
              ${carSelectOptions}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name *</label>
            <input type="text" id="td-cust-name" required placeholder="Juan Dela Cruz" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
          </div>
          
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Contact Number *</label>
              <input type="tel" id="td-cust-phone" required placeholder="09XX XXX XXXX" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Email *</label>
              <input type="email" id="td-cust-email" required placeholder="you@email.com" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600" />
            </div>
          </div>

          <div class="rounded-lg border border-red-600/20 bg-red-500/5 p-3 space-y-3">
            <div class="text-[11px] font-bold uppercase tracking-wider text-red-600">
              When would you like to come in?
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i> Preferred Date *
                </label>
                <input type="date" id="td-cust-date" min="${today}" max="${maxDate}" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white" />
                <span id="td-date-error" class="hidden text-[10px] text-red-600 mt-1">We're closed on Sundays. Please select a day Mon-Sat.</span>
              </div>
              
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <i data-lucide="clock" class="w-3.5 h-3.5"></i> Preferred Time *
                </label>
                <select id="td-cust-time" required class="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-red-600">
                  <option value="" disabled selected>Select a time</option>
                  ${timeSlots.map(s => `<option value="${s}">${formatTime12(s)}</option>`).join('')}
                </select>
              </div>
            </div>
            <p class="text-[10px] text-gray-500">
              Open: <strong>Mon, Tue, Wed, Thu, Fri, Sat</strong> · 09:00 AM – 05:00 PM
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-gray-600 mb-1">Notes (optional)</label>
            <textarea id="td-cust-notes" rows="2" placeholder="Anything we should know? (e.g. bringing a family member, financing questions)" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"></textarea>
          </div>

          <div class="flex justify-end gap-2 border-t pt-4 mt-6">
            <button type="button" onclick="closeModal()" class="px-4 py-2 border rounded-md text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">Book Slot</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderDone(custName, chosenDate, chosenTime) {
    const selectedCarName = selectedCar ? selectedCar.name : "Selected car";
    return `
      <div class="p-6 text-gray-800 text-center">
        <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="check-circle-2" class="h-8 w-8"></i>
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900">Booking Received</h3>
        
        <div class="text-sm text-gray-600 space-y-2 max-w-sm mx-auto mb-6 leading-relaxed">
          <p>Thank you, <strong>${custName}</strong>! We've received your request to <strong>view &amp; test drive</strong> <strong>${selectedCarName}</strong> on <strong>${chosenDate}</strong> at <strong>${formatTime12(chosenTime)}</strong>.</p>
          <p>Our team will reach out shortly to confirm your slot.</p>
          
          <div class="rounded-md border bg-gray-50 p-3 flex items-start gap-2 text-left mt-4">
            <i data-lucide="car" class="h-4 w-4 mt-0.5 shrink-0 text-red-600"></i>
            <div class="text-xs">
              <div class="font-semibold text-gray-800">${selectedCarName}</div>
              <div class="text-gray-500">Vehicle held for viewing &amp; test drive</div>
            </div>
          </div>
        </div>
        
        <button onclick="closeModal()" class="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition">Done</button>
      </div>
    `;
  }

  const wrapper = createModalWrapper(renderForm());
  lucide.createIcons();

  const carSelect = document.getElementById("td-car-select");
  carSelect.addEventListener("change", async () => {
    selectedCar = await window.api.getCarById(carSelect.value);
  });

  const dateInput = document.getElementById("td-cust-date");
  const dateError = document.getElementById("td-date-error");

  dateInput.addEventListener("change", () => {
    const val = dateInput.value;
    if(val) {
      const d = new Date(val);
      const dow = d.getDay(); // 0 = Sun
      if (dow === 0) { // Closed on Sundays
        dateError.classList.remove("hidden");
        dateInput.setCustomValidity("Closed on Sundays");
      } else {
        dateError.classList.add("hidden");
        dateInput.setCustomValidity("");
      }
    }
  });

  document.getElementById("testdrive-submit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const custName    = document.getElementById("td-cust-name").value.trim();
    const custPhone   = document.getElementById("td-cust-phone").value.trim();
    const custEmail   = document.getElementById("td-cust-email").value.trim();
    const custNotes   = document.getElementById("td-cust-notes").value.trim();
    const date        = dateInput.value;
    const time        = document.getElementById("td-cust-time").value;

    if (!selectedCar) {
      alert("Please select a car.");
      return;
    }

    // Show loading spinner
    wrapper.querySelector(".modal-content").innerHTML = `
      <div class="p-16 text-center text-gray-500">
        <div class="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Sending your booking...
      </div>
    `;

    try {
      // 1. Save to database as a lead
      // The leads table only supports name, email, message, status, created_at
      const leadData = {
        name: custName,
        email: custEmail,
        message: `[TEST DRIVE REQUEST] Vehicle: ${selectedCar.name} | Phone: ${custPhone} | Date: ${date} | Time: ${formatTime12(time)} | Notes: ${custNotes || 'None'}`,
        status: 'New'
      };
      
      const leadRes = await window.api.submitLead(leadData);
      if (leadRes && !leadRes.success) {
        console.error('Lead save error:', leadRes.error);
        throw new Error('Failed to save test drive record to database.');
      }

      // 2. Send confirmation email to customer
      if (custEmail) {
        try {
          const siteOrigin = window.location.origin;
          const tdEmailHtml = `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">CAPAMUL <span style="color: #9f1c1c;">CARS</span></h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px;">Test Drive Booking Received!</h1>
      <p>Dear <strong>${custName}</strong>,</p>
      <p>We have received your request to view &amp; test drive the <strong>${selectedCar.name}</strong>. Our team will reach out shortly to confirm your slot.</p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; color: #333;">
          <strong>Vehicle:</strong> ${selectedCar.name}<br>
          <strong>Preferred Date:</strong> ${date}<br>
          <strong>Preferred Time:</strong> ${formatTime12(time)}<br>
          ${custNotes ? `<strong>Notes:</strong> ${custNotes}` : ''}
        </p>
      </div>
      <p style="color: #555;">If you have any questions, feel free to contact us:</p>
      <p style="color: #555;">📍 Purok 2, Dapdap, Barobo, Surigao del Sur<br>📞 09686995654</p>
      <p>Warm regards,<br><strong>Capamul Cars Team</strong></p>
    </div>
  </div>
</div>`;
          await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: 'service_dgu0d2n',
              template_id: 'template_xzcf7bn',
              user_id: '8bYgrl4zv7OqxBU8a',
              template_params: {
                to_email: custEmail,
                subject: `Test Drive Booking Confirmed – ${selectedCar.name}`,
                html_message: tdEmailHtml
              }
            })
          });
        } catch(emailErr) {
          console.warn('Test drive email failed (non-fatal):', emailErr.message);
        }
      }

      // 3. Also notify admin
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_dgu0d2n',
            template_id: 'template_xzcf7bn',
            user_id: '8bYgrl4zv7OqxBU8a',
            template_params: {
              to_email: 'capamulcar2@gmail.com',
              subject: `New Test Drive Request – ${selectedCar.name}`,
              html_message: `<p><strong>Name:</strong> ${custName}</p><p><strong>Phone:</strong> ${custPhone}</p><p><strong>Email:</strong> ${custEmail}</p><p><strong>Car:</strong> ${selectedCar.name}</p><p><strong>Date:</strong> ${date}</p><p><strong>Time:</strong> ${formatTime12(time)}</p><p><strong>Notes:</strong> ${custNotes || 'None'}</p>`
            }
          })
        });
      } catch(adminEmailErr) {
        console.warn('Admin test drive notify failed (non-fatal):', adminEmailErr.message);
      }

      // 4. Show success screen
      wrapper.querySelector(".modal-content").innerHTML = renderDone(custName, date, time);
      lucide.createIcons();

    } catch(err) {
      console.error('Test drive booking error:', err);
      wrapper.querySelector(".modal-content").innerHTML = `
        <div class="p-10 text-center">
          <div class="text-red-600 text-4xl mb-4">&#x26A0;</div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Booking Failed</h3>
          <p class="text-sm text-gray-500 mb-4">Something went wrong. Please try again or contact us directly at 09686995654.</p>
          <button onclick="closeModal()" class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold">Close</button>
        </div>
      `;
      lucide.createIcons();
    }
  });
};
