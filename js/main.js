// Main UI logic for CapamulCars 2.0

// Initialize UI when DOM is loaded and API is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.api) {
    initApp();
    populateCompanyInfo();
  } else {
    window.addEventListener('api-ready', () => {
      initApp();
      populateCompanyInfo();
    });
  }
});

async function populateCompanyInfo() {
  if (!window.api) return;
  try {
    const settings = await window.api.getSettingsData();
    if (settings && settings.company) {
      const { address, phone, email, facebook, hours } = settings.company;
      
      const footerAddress = document.getElementById('site-footer-address');
      const footerEmail = document.getElementById('site-footer-email');
      const footerPhone = document.getElementById('site-footer-phone');
      
      if (footerAddress && address) footerAddress.innerText = address;
      if (footerEmail && email) {
        footerEmail.innerText = email;
        footerEmail.href = `mailto:${email}`;
      }
      if (footerPhone && phone) {
        footerPhone.innerText = phone;
        footerPhone.href = `tel:${phone.replace(/\s+/g, '')}`;
      }

      // New generic site info elements (used in Financing, Contact, etc)
      const siteLoc = document.getElementById('site-loc');
      const sitePhone = document.getElementById('site-phone');
      const siteEmail = document.getElementById('site-email');
      const siteFb = document.getElementById('site-fb');
      const siteHours = document.getElementById('site-hours');

      if (siteLoc && address) siteLoc.innerText = address;
      if (sitePhone && phone) sitePhone.innerText = phone;
      if (siteEmail && email) siteEmail.innerText = email;
      if (siteFb && facebook) {
        siteFb.href = facebook;
        // Optionally update text if it's currently hardcoded to Facebook: CapamulCars
      }
      if (siteHours && hours) siteHours.innerText = hours;

      // Export globally for modals to use if needed
      window.COMPANY_PHONE = phone;
      window.COMPANY_EMAIL = email;
      window.COMPANY_ADDRESS = address;
      window.COMPANY_FACEBOOK = facebook;
      window.COMPANY_HOURS = hours;
    }
  } catch (e) {
    console.error('Failed to populate company info:', e);
  }
}

async function initApp() {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  
  if (mobileMenuBtn && mobileMenu) {
    const overlay = mobileMenu.querySelector('.bg-black\\/40');
    
    function toggleMenu(forceClose = false) {
      if (forceClose) {
        mobileMenu.classList.add('hidden');
      } else {
        mobileMenu.classList.toggle('hidden');
      }
      
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenuBtn.innerHTML = isOpen ? '<i data-lucide="x" class="h-6 w-6"></i>' : '<i data-lucide="menu" class="h-6 w-6"></i>';
      if (window.lucide) window.lucide.createIcons({ root: mobileMenuBtn });
    }

    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        toggleMenu(true);
      });
    }
  }

  // Global test drive trigger from nav menu
  const testDriveNavBtns = document.querySelectorAll('.test-drive-nav-btn');
  testDriveNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof toggleMenu === 'function') toggleMenu(true); // Close mobile menu completely (fixes overflow lock)
      if (window.openTestDriveDialog) {
        window.openTestDriveDialog(null);
      }
    });
  });
}

// Render individual CarCard (vertical structure used in carousels)
function getCarCardHtml(car) {
  const status = car.status || "Available";
  const isAvailable = status.toLowerCase() === "available";
  const dp = car.dp && car.dp > 0 ? car.dp : computeDp(car.price);
  const hasDiscount = !!car.original_price && car.original_price > car.price;

  let statusClass = "bg-black text-white";
  if (status.toLowerCase() === "available") statusClass = "bg-green-600 text-white";
  else if (status.toLowerCase() === "reserved") statusClass = "bg-amber-500 text-white";
  else if (status.toLowerCase() === "sold") statusClass = "bg-red-600 text-white";

  return `
    <div class="group overflow-hidden bg-white hover:bg-gray-50 border border-gray-100 transition-all duration-300 flex flex-col w-[78vw] xs:w-[280px] sm:w-[290px] shrink-0 text-gray-900 shadow-sm hover:shadow-md">
      <!-- Image / Link to Detail -->
      <button type="button" onclick="openCarDetail('${car.id}')" class="h-[200px] relative overflow-hidden block w-full text-left focus:outline-none bg-gray-100">
        ${car.images && car.images[0] ? `<img src="${car.images[0]}" alt="${car.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">` : '<div class="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100"><svg xmlns=\'http://www.w3.org/2000/svg\' class=\'h-12 w-12\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'><path stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1\' d=\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\'/></svg></div>'}
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-3 px-4 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <span class="text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">View Details <i data-lucide="arrow-right" class="h-3 w-3"></i></span>
        </div>
        ${hasDiscount ? `
          <span class="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-red-600 text-white">
            −${Math.round(((car.original_price - car.price) / car.original_price) * 100)}%
          </span>
        ` : ''}
        <span class="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${statusClass}">
          ${status}
        </span>
      </button>

      <!-- Details Box -->
      <div class="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <h3 class="font-black text-xl sm:text-2xl uppercase tracking-tighter text-gray-900 mb-2">${car.year} ${car.make}</h3>
          <p class="text-sm text-gray-600 leading-relaxed">${car.model} ${car.name ? `- ${car.name}` : ''}</p>
        </div>

        <div class="mt-2">
          <div class="flex items-baseline gap-2 mb-3">
            <span class="font-black text-2xl sm:text-3xl text-[#e32626] tracking-tighter leading-none">${formatPhp(car.price)}</span>
            ${hasDiscount ? `<span class="text-[10px] text-gray-400 line-through font-semibold">${formatPhp(car.original_price)}</span>` : ''}
          </div>
          
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-3">
            ${car.mileage ? Number(car.mileage).toLocaleString() + ' km' : "—"} • ${car.transmission || "—"}
          </div>
        </div>
      </div>
    </div>
  `;
}


function getCarListItemHtml(car) {
  const status = car.status || "Available";
  const isAvailable = status.toLowerCase() === "available";
  const dp = car.dp && car.dp > 0 ? car.dp : computeDp(car.price);
  const hasDiscount = !!car.original_price && car.original_price > car.price;

  let statusClass = "bg-green-600 text-white"; // Green for available
  if (status.toLowerCase() === "reserved") statusClass = "bg-amber-500 text-white";
  else if (status.toLowerCase() === "sold") statusClass = "bg-red-600 text-white";

  return `
    <div class="group flex flex-col bg-white border border-gray-200 overflow-hidden hover:shadow-md transition duration-300 text-gray-800 w-full">
      <!-- Image / Link to Detail -->
      <button type="button" onclick="openCarDetail('${car.id}')" class="relative shrink-0 block text-left focus:outline-none w-full bg-gray-100 overflow-hidden pb-[66%] sm:pb-[60%] lg:pb-[56.25%]">
        ${car.images && car.images[0] ? `<img src="${car.images[0]}" alt="${car.name}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">` : '<div class="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300 bg-gray-100"><svg xmlns=\'http://www.w3.org/2000/svg\' class=\'h-12 w-12\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'><path stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1\' d=\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\'/></svg></div>'}
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-3 px-4 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <span class="text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">View Details <i data-lucide="arrow-right" class="h-3 w-3"></i></span>
        </div>
        ${hasDiscount ? `
          <span class="absolute top-0 left-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-[#e32626] text-white shadow-sm z-10">
            −${Math.round(((car.original_price - car.price) / car.original_price) * 100)}% OFF
          </span>
        ` : ''}
        <span class="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${statusClass} shadow-sm z-10">
          ${status}
        </span>
      </button>

      <!-- Details Box -->
      <div class="flex-1 p-5 sm:p-6 flex flex-col min-w-0 justify-start text-left relative">
        <h3 class="font-black text-2xl sm:text-[22px] uppercase tracking-tighter text-gray-900 leading-tight mb-1 truncate">${car.year} ${car.make}</h3>
        <p class="text-sm text-gray-500 uppercase tracking-wide truncate mb-3">${car.model} ${car.name ? `- ${car.name}` : ''}</p>

        <div class="mt-auto flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 pt-4 border-t border-gray-100">
          <div>
            ${dp > 0 ? `
              <div class="flex items-baseline gap-1 mb-0.5">
                <span class="text-[10px] font-black uppercase tracking-widest text-[#e32626]/80">DP</span>
                <span class="font-black text-2xl sm:text-[26px] text-[#e32626] tracking-tighter leading-none">${formatPhp(dp)}</span>
              </div>
              <div class="flex items-baseline gap-1.5 mb-2">
                <span class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">SRP</span>
                <span class="text-xs font-bold text-gray-600">${formatPhp(car.price)}</span>
                ${hasDiscount ? `<span class="text-[9px] text-gray-400 line-through ml-1">${formatPhp(car.original_price)}</span>` : ''}
              </div>
            ` : `
              <div class="font-black text-2xl sm:text-[26px] text-[#e32626] tracking-tighter leading-none mb-2">
                ${formatPhp(car.price)}
              </div>
            `}
            <div class="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">
              ${car.mileage ? Number(car.mileage).toLocaleString() + ' KM' : '—'}
            </div>
          </div>
          <div class="flex gap-2 w-full xl:w-auto">
            <a href="contact.html?car=${car.id}" class="flex-1 xl:flex-none flex items-center justify-center text-center bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition">
              Contact Us
            </a>
            <button type="button" onclick="openReserveDialog('${car.id}')" ${!isAvailable ? 'disabled' : ''} class="flex-1 xl:flex-none flex items-center justify-center bg-[#e32626] text-white px-5 py-2 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
              ${isAvailable ? "Reserve" : status}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render helper functions remain available for dynamic uses if needed.

async function loadCarsList() {
  const container = document.getElementById('cars-list-items');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-10"><i data-lucide="loader-2" class="h-8 w-8 animate-spin mx-auto text-primary"></i><p class="mt-2 text-gray-500">Loading vehicles...</p></div>';
  if(window.lucide) window.lucide.createIcons();

  try {
    const cars = await window.api.getCars();
    // Show available and reserved cars; hide only sold ones
    const visibleCars = cars.filter(c => ['available','reserved'].includes((c.status||'').toLowerCase()));
    if (visibleCars.length === 0) {
      container.innerHTML = '<div class="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300"><p class="text-gray-500">No vehicles currently available. Check back soon!</p></div>';
      return;
    }

    container.innerHTML = visibleCars.map(car => getCarListItemHtml(car)).join('');
    if(window.lucide) window.lucide.createIcons();
  } catch(e) {
    container.innerHTML = '<div class="text-center py-10 bg-red-50 text-red-600 rounded-xl"><p>Failed to load vehicles. Please try again later.</p></div>';
  }
}

// Helper: render a single card inside a carousel slot
function getCarouselCardHtml(car) {
  return `<div class="snap-start shrink-0 w-[78vw] xs:w-[70%] sm:w-[45%] md:w-[32%] lg:w-[23.5%]">${getCarCardHtml(car)}</div>`;
}

async function loadFeaturedCars() {
  const container = document.getElementById('featured-cars-grid');
  if (!container) return;

  container.innerHTML = '<div class="py-12 text-center text-gray-400 w-full"><i data-lucide="loader-2" class="h-8 w-8 animate-spin mx-auto mb-2"></i><p class="text-sm">Loading...</p></div>';
  if (window.lucide) window.lucide.createIcons();

  try {
    const cars = await window.api.getFeaturedCars();
    if (cars.length === 0) {
      container.innerHTML = '<div class="py-12 text-center text-gray-400 border border-dashed rounded-xl w-full"><p class="text-sm">No featured vehicles set yet. Add some in the admin Content Management tab.</p></div>';
      return;
    }
    container.innerHTML = cars.map(car => getCarouselCardHtml(car)).join('');
    if (window.lucide) window.lucide.createIcons();
  } catch(e) {
    container.innerHTML = '<div class="py-10 text-center text-red-500 text-sm w-full">Failed to load featured vehicles.</div>';
  }
}

async function loadNewArrivals() {
  const container = document.getElementById('new-arrivals-grid');
  if (!container) return;

  try {
    const cars = await window.api.getNewArrivals(6);
    if (cars.length === 0) {
      container.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm w-full border border-dashed rounded-xl">No new arrivals yet.</div>';
    } else {
      container.innerHTML = cars.map(car => getCarouselCardHtml(car)).join('');
    }
    if (window.lucide) window.lucide.createIcons();
  } catch(e) {
    container.innerHTML = '<div class="text-center py-10 text-red-500 text-sm w-full">Failed to load new arrivals.</div>';
  }
}

async function loadDiscountedCars() {
  const section   = document.getElementById('section-discounted');
  const container = document.getElementById('discounted-cars-grid');
  if (!container) return;

  try {
    const cars = await window.api.getDiscountedCars(6);
    if (cars.length === 0) {
      // Hide the section entirely when there are no discounts
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';  // Show the section
    container.innerHTML = cars.map(car => getCarouselCardHtml(car)).join('');
    if (window.lucide) window.lucide.createIcons();
  } catch(e) {
    if (section) section.style.display = 'none';
  }
}

async function loadHeroImage() {
  const heroImg = document.getElementById('hero-background-image');
  const authBody = document.getElementById('auth-body');
  const heroDesc = document.getElementById('hero-description');
  try {
    const cms = await window.api.getCMSData();
    if (cms && cms.hero) {
      if (cms.hero.bgUrl) {
        if (heroImg) {
          heroImg.onload = () => heroImg.classList.remove('opacity-0');
          heroImg.src = cms.hero.bgUrl;
        }
        if (authBody) authBody.style.backgroundImage = `url('${cms.hero.bgUrl}')`;
      }
      if (cms.hero.description && heroDesc) {
        heroDesc.textContent = cms.hero.description;
      }
    }
  } catch (e) {
    console.error('Failed to load custom hero image:', e);
  }
}

// Attach to initApp
const originalInitApp = initApp;
initApp = async function() {
  await originalInitApp();
  loadHeroImage();
  loadCarsList();
  loadFeaturedCars();
  loadNewArrivals();
  loadDiscountedCars();
};

window.addEventListener('cars-updated', () => {
  loadCarsList();
  loadFeaturedCars();
  loadNewArrivals();
  loadDiscountedCars();
});
