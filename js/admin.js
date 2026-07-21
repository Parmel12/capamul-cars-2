// ============================================================
//  CAPAMUL CARS – Admin Panel JavaScript
//  All code is wrapped in DOMContentLoaded so the DOM exists
//  when we try to find elements.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // ─── CUSTOM TOAST NOTIFICATIONS ──────────────────────────────
  window.showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    const isError = type === 'error';
    const bgColor = isError ? 'bg-red-600' : 'bg-[#e32626]';
    const icon = isError 
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    
    toast.innerHTML = `<div class="flex items-center text-white text-sm font-semibold tracking-wide">${icon} <span>${message}</span></div>`;
    toast.className = `fixed top-6 right-6 ${bgColor} shadow-xl shadow-black/10 rounded-lg px-5 py-4 z-[9999] transform transition-all duration-300 opacity-0 translate-y-[-20px]`;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-[-20px]');
        toast.classList.add('opacity-100', 'translate-y-0');
      }, 10);
    });

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-[-20px]');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // ─── NAVIGATION ────────────────────────────────────────────
  const navBtns   = document.querySelectorAll('.nav-btn');
  const pageTitle = document.getElementById('page-title');
  const logoutBtn = document.getElementById('logout-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarNav = document.getElementById('sidebar-nav');
  const sidebarFooter = document.getElementById('sidebar-footer');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      if (sidebarNav) {
        sidebarNav.classList.toggle('hidden');
        sidebarNav.classList.toggle('flex');
      }
      if (sidebarFooter) {
        sidebarFooter.classList.toggle('hidden');
        sidebarFooter.classList.toggle('block');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('admin_token');
      window.location.href = 'auth.html';
    });
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      const target = btn.dataset.target;
      if (pageTitle) pageTitle.innerText = btn.innerText.trim();

      const pageSubtitle = document.getElementById('page-subtitle');
      if (pageSubtitle) {
        const subtitles = {
          inventory:    'Manage your vehicle inventory',
          reservations: 'Manage customer reservations',
          bookings:     'Manage test drive bookings',
          reviews:      'All reviews from your customers',
          transactions: 'Sales records, financing status, and reports',
          financing:    'Manage financed clients and monthly payments',
          customers:    'Customer directory',
          leads:        'Sales inquiries',
          cms:          'Manage website content',
          analytics:    'Dashboard metrics',
          users:        'Staff and roles',
          settings:     'Platform settings'
        };
        pageSubtitle.innerText = subtitles[target] || '';
      }

      document.querySelectorAll('.view-section').forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('active', 'block');
      });

      const targetView = document.getElementById(`view-${target}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active', 'block');
        
        // Lazy load the content for the selected tab
        if (target === 'inventory' && typeof renderInventory === 'function') renderInventory();
        else if (target === 'reservations' && typeof renderReservations === 'function') renderReservations();
        else if (target === 'bookings' && typeof renderBookings === 'function') renderBookings();
        else if (target === 'reviews' && typeof renderReviews === 'function') renderReviews();
        else if (target === 'transactions' && typeof renderTransactions === 'function') renderTransactions();
        else if (target === 'cms' && typeof renderCMS === 'function') renderCMS();
        else if (target === 'users' && typeof renderStaffAccounts === 'function') renderStaffAccounts();
        else if (target === 'settings' && typeof renderSettings === 'function') renderSettings();
        else if (target === 'customers' && typeof renderCustomers === 'function') renderCustomers();
        else if (target === 'financing' && typeof renderFinancingClients === 'function') renderFinancingClients();
      } else {
        const placeholder = document.getElementById('view-placeholder');
        if (placeholder) {
          placeholder.classList.remove('hidden');
          placeholder.classList.add('active', 'block');
        }
      }

      // Hide sidebar on mobile after clicking a link
      if (window.innerWidth < 768) {
        if (sidebarNav) {
          sidebarNav.classList.add('hidden');
          sidebarNav.classList.remove('flex');
        }
        if (sidebarFooter) {
          sidebarFooter.classList.add('hidden');
          sidebarFooter.classList.remove('block');
        }
      }
    });
  });

  // ─── ADD / EDIT VEHICLE MODAL ───────────────────────────────
  let editingCarId = null;

  const addCarModalBtn = document.getElementById('open-add-car-modal-btn');
  const addCarModal    = document.getElementById('add-car-modal');
  const closeModalBtn  = document.getElementById('close-modal-btn');
  const cancelCarBtn   = document.getElementById('cancel-car-btn');
  const addCarForm     = document.getElementById('add-car-form');
  const submitCarBtn   = document.getElementById('submit-car-btn');

  const showModal = () => {
    if (!addCarModal) return;
    addCarModal.classList.remove('hidden');
    addCarModal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
  };

  const closeModal = () => {
    if (addCarModal) {
      addCarModal.classList.add('hidden');
      addCarModal.style.display = 'none';
    }
    if (addCarForm) addCarForm.reset();
    // Reset image preview
    window.selectedCarFiles = [];
    renderImagePreviews();
    editingCarId = null;
  };

  if (addCarModalBtn) {
    addCarModalBtn.addEventListener('click', () => {
      editingCarId = null;
      const h = addCarModal ? addCarModal.querySelector('h3') : null;
      if (h) h.innerText = 'Add Vehicle';
      if (addCarForm) addCarForm.reset();
      window.selectedCarFiles = [];
      renderImagePreviews();
      showModal();
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelCarBtn)  cancelCarBtn.addEventListener('click', closeModal);

  // Close modal on backdrop click
  if (addCarModal) {
    addCarModal.addEventListener('click', (e) => {
      if (e.target === addCarModal) closeModal();
    });
  }

  // Image preview state
  window.selectedCarFiles = [];
  
  window.removeSelectedImage = (index) => {
    window.selectedCarFiles.splice(index, 1);
    renderImagePreviews();
  };

  function renderImagePreviews() {
    const countEl = document.getElementById('img-count');
    const preview = document.getElementById('img-preview');
    if (countEl) countEl.innerText = window.selectedCarFiles.length;
    if (preview) {
      if (window.selectedCarFiles.length > 0) {
        preview.classList.remove('hidden');
        preview.innerHTML = window.selectedCarFiles.map((f, i) => {
          const url = URL.createObjectURL(f);
          return `
            <div class="relative group">
              <img src="${url}" class="w-16 h-16 object-cover rounded border border-gray-200">
              <button type="button" onclick="window.removeSelectedImage(${i})" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>`;
        }).join('');
      } else {
        preview.classList.add('hidden');
        preview.innerHTML = '';
      }
    }
  }

  const carImagesInput = document.getElementById('car-images');
  if (carImagesInput) {
    carImagesInput.addEventListener('change', () => {
      const newFiles = Array.from(carImagesInput.files);
      for (const file of newFiles) {
        if (window.selectedCarFiles.length < 12) {
          window.selectedCarFiles.push(file);
        }
      }
      renderImagePreviews();
      // Reset input so selecting the same file again works
      carImagesInput.value = '';
    });
  }


  // ─── TIMEOUT HELPER ────────────────────────────────────────
  const withTimeout = (promise, ms, label = 'Operation') => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // ─── SUPABASE CONFIG (from data.js globals) ─────────────────
  // SUPABASE_URL, SUPABASE_ANON, SUPABASE_BUCKET are set in data.js
  const supabaseConfigured = () =>
    !!(window.SUPABASE_URL && window.SUPABASE_ANON);

  const compressImageToBlob = (file, maxDim = 2048, quality = 0.95) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = evt => {
        const img = new Image();
        img.src = evt.target.result;
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
          else       { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('Image load error'));
      };
      reader.onerror = () => reject(new Error('FileReader error'));
    });
  };

  // ─── UPLOAD IMAGES TO SUPABASE STORAGE & SAVE URLs ────────
  const uploadImagesInBackground = async (files, carId) => {
    if (!supabaseConfigured()) {
      console.warn('⚠️ Supabase not configured. Check data.js.');
      return;
    }

    const SB_URL    = window.SUPABASE_URL;
    const SB_ANON   = window.SUPABASE_ANON;
    const SB_BUCKET = window.SUPABASE_BUCKET || 'car-images';

    // ── Step 1: Ensure bucket exists (create if not) ──────────
    try {
      const bucketCheck = await fetch(`${SB_URL}/storage/v1/bucket/${SB_BUCKET}`, {
        headers: { 'Authorization': `Bearer ${SB_ANON}`, 'apikey': SB_ANON }
      });
      if (bucketCheck.status === 400 || bucketCheck.status === 404) {
        // Bucket doesn't exist — create it as public
        const createRes = await fetch(`${SB_URL}/storage/v1/bucket`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SB_ANON}`,
            'apikey': SB_ANON,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: SB_BUCKET, name: SB_BUCKET, public: true }),
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error('Could not create bucket:', errText);
          // Fall back to base64
          await saveImagesAsBase64(files, carId);
          return;
        }
        console.log('✅ Created bucket:', SB_BUCKET);
      }
    } catch (err) {
      console.warn('Bucket check failed, trying upload anyway:', err.message);
    }

    // ── Step 2: Upload each image ─────────────────────────────
    const imageUrls = [];
    const errors    = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const blob     = await compressImageToBlob(files[i]);
        const fileName = `${carId}/img_${Date.now()}_${i}.jpg`;

        const uploadRes = await fetch(
          `${SB_URL}/storage/v1/object/${SB_BUCKET}/${fileName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SB_ANON}`,
              'apikey':        SB_ANON,
              'Content-Type':  'image/jpeg',
              'x-upsert':      'true',
            },
            body: blob,
          }
        );

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          errors.push(`Image ${i + 1}: ${uploadRes.status} – ${errText}`);
          console.warn(`⚠️ Image ${i + 1} upload failed (${uploadRes.status}):`, errText);
          continue;
        }

        const publicUrl = `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${fileName}`;
        imageUrls.push(publicUrl);
        console.log(`✅ Image ${i + 1} uploaded:`, publicUrl);
      } catch (err) {
        errors.push(`Image ${i + 1}: ${err.message}`);
        console.warn(`⚠️ Image ${i + 1} upload error:`, err.message);
      }
    }

    // ── Step 3: Save URLs or fall back to base64 ─────────────
    if (imageUrls.length > 0) {
      const result = await window.api.updateCar(carId, { images: imageUrls });
      if (result.success) {
        console.log(`✅ ${imageUrls.length} image URL(s) saved for car ${carId}`);
        // IMPORTANT: Re-render the inventory to instantly show the newly uploaded images without refreshing!
        if (typeof window.renderInventory === 'function') {
          window.renderInventory();
        }
        
        // Show a small toast so the user knows images are ready
        const toast = document.createElement('div');
        toast.textContent = `✅ ${imageUrls.length} photo(s) uploaded successfully!`;
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      } else {
        console.error('Failed to save image URLs:', result.error);
      }
      if (errors.length > 0) {
        console.warn('Some images failed:\n' + errors.join('\n'));
      }
    } else if (errors.length > 0) {
      // All uploads failed — fall back to base64
      console.warn('All uploads failed. Falling back to base64. Errors:\n', errors.join('\n'));
      alert('⚠️ Could not upload to Supabase Storage.\n\nReason: ' + errors[0] + '\n\nImages will be heavily compressed and saved as base64 (up to 12 photos).\n\nFix: In Supabase dashboard → Storage → create a public bucket called "car-images" and allow all uploads.');
      await saveImagesAsBase64(files, carId);
    }
  };

      // ── Base64 fallback (for when storage isn't configured) ─────
  const saveImagesAsBase64 = async (files, carId) => {
    try {
      const toDataUrl = file => new Promise((resolve, reject) => {
        // Compress heavily before base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = evt => {
          const img = new Image();
          img.src = evt.target.result;
          img.onload = () => {
            const MAX = 1920; // High resolution limit requested by user
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
            else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.92)); // High quality
          };
          img.onerror = () => reject(new Error('img load'));
        };
        reader.onerror = () => reject(new Error('reader error'));
      });

      // Save up to 12 images as base64 (since they requested 1-12)
      const base64Urls = [];
      for (let i = 0; i < Math.min(files.length, 12); i++) {
        try {
          base64Urls.push(await toDataUrl(files[i]));
        } catch (err) {
          console.warn('base64 fallback failed for image', i, err.message);
        }
      }

      if (base64Urls.length > 0) {
        const result = await window.api.updateCar(carId, { images: base64Urls });
        if (result.success) {
          console.log(`✅ ${base64Urls.length} base64 image(s) saved for car ${carId}`);
          renderInventory();
        }
      }
    } catch (err) {
      console.error('saveImagesAsBase64:', err);
    }
  };


  // ─── FORM SUBMIT (Add / Edit Vehicle) ──────────────────────
  if (addCarForm) {
    addCarForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const prevHTML = submitCarBtn.innerHTML;
      submitCarBtn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin inline-block mr-1"></i> Saving...';
      submitCarBtn.disabled = true;
      if (window.lucide) window.lucide.createIcons();

      try {
        if (!window.api) throw new Error('API not ready — refresh the page.');

        const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        const getNum = id => {
          const v = getVal(id);
          if (v === '') return null;
          const n = parseFloat(v);
          return isNaN(n) ? 0 : n;
        };

        const nameVal   = getVal('car-name');
        const yearVal   = getVal('car-year');
        const makeVal   = getVal('car-make');
        const price     = getNum('car-price') ?? 0;
        const origPrice = getNum('car-original-price');
        let   parsedYear = parseInt(yearVal);
        if (isNaN(parsedYear)) parsedYear = 0;

        const carData = {
          name:           nameVal || `${yearVal} ${makeVal}`,
          year:           parsedYear,
          make:           makeVal,
          model:          getVal('car-series') || '',
          series:         getVal('car-series'),
          color:          getVal('car-color'),
          body_type:      getVal('car-body-type'),
          price:          price,
          original_price: origPrice,
          transmission:   getVal('car-transmission'),
          fuel_type:      getVal('car-fuel-type'),
          mileage:        getNum('car-mileage'),
          dp:             getNum('car-dp'),
          status:         getVal('car-status') || 'Available',
          description:    getVal('car-description'),
          condition:      'Used',
          location:       'Barobo',
        };

        let savedId;
        if (editingCarId) {
          const res = await window.api.updateCar(editingCarId, carData);
          if (!res.success) throw new Error(res.error?.message || 'Update failed');
          savedId = editingCarId;
        } else {
          carData.images = [];
          const res = await window.api.addCar(carData);
          if (!res.success) throw new Error(res.error?.message || 'Insert failed');
          savedId = res.id;
        }

        // ⚠️ MUST capture files BEFORE closeModal() — it resets the form!
        const filesToUpload = window.selectedCarFiles && window.selectedCarFiles.length > 0 
          ? [...window.selectedCarFiles] 
          : [];

        // Close modal & refresh
        closeModal();
        renderInventory();
        window.showToast(editingCarId ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');

        // Upload images in background (non-blocking)
        if (filesToUpload.length > 0) {
          uploadImagesInBackground(filesToUpload, savedId);
        }


      } catch (err) {
        console.error('Save vehicle error:', err);
        window.showToast('Failed to save vehicle: ' + (err.message || 'Unknown error.'), 'error');
      } finally {
        if (submitCarBtn) {
          submitCarBtn.innerHTML = prevHTML;
          submitCarBtn.disabled  = false;
        }
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ─── RENDER INVENTORY ──────────────────────────────────────
  const renderInventory = async () => {
    const gridBody = document.getElementById('inventory-grid-body');
    if (!gridBody) return;

    gridBody.innerHTML = '<div class="col-span-full py-12 text-center text-gray-500"><i data-lucide="loader-2" class="h-8 w-8 animate-spin mx-auto mb-3"></i><p>Loading inventory...</p></div>';
    if (window.lucide) window.lucide.createIcons();
    if (!window.api) return;

    try {
      let cars = await window.api.getCars();

      const total     = cars.length;
      const available = cars.filter(c => (c.status||'').toLowerCase() === 'available').length;
      const reserved  = cars.filter(c => (c.status||'').toLowerCase() === 'reserved').length;
      const sold      = cars.filter(c => (c.status||'').toLowerCase() === 'sold').length;

      const el = id => document.getElementById(id);
      if (el('inv-stat-total'))     el('inv-stat-total').innerText     = total;
      if (el('inv-stat-available')) el('inv-stat-available').innerText = available;
      if (el('inv-stat-reserved'))  el('inv-stat-reserved').innerText  = reserved;
      if (el('inv-stat-sold'))      el('inv-stat-sold').innerText      = sold;

      const makeSelect = el('filter-make');
      if (makeSelect && makeSelect.options.length <= 1) {
        const makes = [...new Set(cars.map(c => c.make))].filter(Boolean).sort();
        makes.forEach(make => {
          const opt = document.createElement('option');
          opt.value = make;
          opt.innerText = make;
          makeSelect.appendChild(opt);
        });
      }

      const makeFilter = makeSelect ? makeSelect.value : '';
      const statusFilter = el('filter-status') ? el('filter-status').value : '';
      const searchFilter = el('inv-search-input') ? el('inv-search-input').value.toLowerCase().trim() : '';

      if (searchFilter) {
        cars = cars.filter(c => 
          (c.name || '').toLowerCase().includes(searchFilter) ||
          (c.make || '').toLowerCase().includes(searchFilter) ||
          (c.model || '').toLowerCase().includes(searchFilter) ||
          (c.year || '').toString().toLowerCase().includes(searchFilter)
        );
      }
      if (makeFilter) {
        cars = cars.filter(c => c.make === makeFilter);
      }
      if (statusFilter) {
        cars = cars.filter(c => (c.status || '').toLowerCase() === statusFilter.toLowerCase());
      }

      if (cars.length === 0) {
        gridBody.innerHTML = '<div class="col-span-full py-12 text-center text-gray-500">No vehicles in inventory. Click "Add Vehicle" to create one.</div>';
        return;
      }

      gridBody.innerHTML = cars.map(car => {
        let sc = "bg-black/70 text-white";
        if ((car.status||'').toLowerCase() === "available") sc = "bg-green-600 text-white";
        else if ((car.status||'').toLowerCase() === "reserved") sc = "bg-amber-500 text-white";
        else if ((car.status||'').toLowerCase() === "sold") sc = "bg-red-600 text-white";

        const hasDiscount = !!car.original_price && Number(car.original_price) > Number(car.price);
        const discPct     = hasDiscount ? Math.round(((car.original_price - car.price) / car.original_price) * 100) : 0;
        const imgSrc      = car.images && car.images[0] ? car.images[0] : '';
        const dp          = car.dp && car.dp > 0 ? car.dp : null;

        return `
          <div class="group rounded-xl overflow-hidden bg-white border border-black/10 shadow-sm hover:shadow-md transition duration-300 flex flex-col">
            <!-- Image -->
            <div class="aspect-[16/10] bg-black/5 relative overflow-hidden">
              ${imgSrc
                ? `<img src="${imgSrc}" alt="${car.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy">`
                : '<div class="w-full h-full flex items-center justify-center text-gray-300"><i data-lucide="image-off" class="h-10 w-10"></i></div>'}
              ${hasDiscount ? `<span class="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-red-600 text-white shadow-sm">−${discPct}% OFF</span>` : ''}
              <span class="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${sc} shadow-sm">${car.status}</span>
            </div>

            <!-- Info -->
            <div class="p-4 flex-1 flex flex-col gap-2">
              <div>
                <h3 class="font-bold text-gray-900 leading-tight truncate">${car.name}</h3>
                <p class="text-xs text-gray-500">${[car.make, car.model, car.year].filter(Boolean).join(' • ')}</p>
              </div>

              <!-- Pricing -->
              <div class="flex flex-col gap-0.5">
                ${dp ? `
                  <div class="flex items-baseline gap-1">
                    <span class="text-[10px] font-black uppercase tracking-[0.12em] text-red-600/80">DP</span>
                    <span class="text-red-600 font-black leading-none text-xl">₱ ${Number(dp).toLocaleString()}</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-red-600/70">only</span>
                  </div>` : ''}
                <div class="flex flex-wrap items-baseline gap-1.5">
                  <span class="text-[9px] font-semibold uppercase tracking-wider text-gray-400">SRP</span>
                  <span class="text-xs font-semibold text-gray-700">₱ ${Number(car.price||0).toLocaleString()}</span>
                  ${hasDiscount ? `
                    <span class="text-[10px] text-gray-400 line-through">₱ ${Number(car.original_price).toLocaleString()}</span>
                    <span class="text-[9px] font-bold uppercase text-red-600">Save ₱ ${Number(car.original_price - car.price).toLocaleString()}</span>` : ''}
                </div>
              </div>

              <!-- Specs -->
              <div class="grid grid-cols-2 gap-y-1 text-xs text-gray-600 border-t pt-2 mt-auto">
                <span class="flex items-center gap-1"><i data-lucide="gauge" class="h-3 w-3 text-red-600"></i> ${car.mileage ? Number(car.mileage).toLocaleString() + ' km' : '—'}</span>
                <span class="flex items-center gap-1"><i data-lucide="fuel" class="h-3 w-3 text-red-600"></i> ${car.fuel_type || '—'}</span>
                <span class="flex items-center gap-1"><i data-lucide="settings-2" class="h-3 w-3 text-red-600"></i> ${car.transmission || '—'}</span>
                <span class="flex items-center gap-1"><i data-lucide="map-pin" class="h-3 w-3 text-red-600"></i> ${car.location || 'Barobo'}</span>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 border-t border-black/5 pt-3">
                <button onclick="window.editVehicle('${car.id}')" class="flex-1 flex items-center justify-center gap-2 border border-black/10 hover:border-black/20 rounded-lg py-2 text-xs font-bold text-gray-700 transition">
                  <i data-lucide="pencil" class="h-3 w-3"></i> Edit
                </button>
                <button onclick="window.deleteVehicle('${car.id}', '${(car.name||'').replace(/'/g,'')}')" class="w-9 flex items-center justify-center border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-2 text-red-600 transition">
                  <i data-lucide="trash-2" class="h-3 w-3"></i>
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      gridBody.innerHTML = '<div class="col-span-full py-12 text-center text-red-500">Failed to load inventory.</div>';
    }
  };
  window.renderInventory = renderInventory;

  window.setInventoryStatusFilter = (status) => {
    const filterStatusEl = document.getElementById('filter-status');
    if (filterStatusEl) {
      filterStatusEl.value = status;
      window.renderInventory();
    }
  };

  // ─── RENDER DASHBOARD ──────────────────────────────────────
  const renderDashboard = async () => {
    if (!window.api) return;
    try {
      const [cars, leads, reservations] = await Promise.all([
        window.api.getCars(),
        window.api.getLeads(),
        window.api.getReservations()
      ]);
      const el = id => document.getElementById(id);
      if (el('stat-vehicles'))    el('stat-vehicles').innerText    = cars.length;
      if (el('stat-leads'))       el('stat-leads').innerText       = leads.length;
      if (el('stat-reservations'))el('stat-reservations').innerText= reservations.length;
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  };

  // ─── RENDER RESERVATIONS ───────────────────────────────────
  let currentResFilter = 'All';

  // Set up reservation tab click listeners
  const resTabs = document.querySelectorAll('.res-filter-tab');
  resTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      resTabs.forEach(t => {
        t.classList.remove('font-bold', 'border-black', 'text-black');
        t.classList.add('font-medium', 'border-transparent', 'text-gray-500');
      });
      e.target.classList.remove('font-medium', 'border-transparent', 'text-gray-500');
      e.target.classList.add('font-bold', 'border-black', 'text-black');
      
      currentResFilter = e.target.getAttribute('data-res-filter');
      renderReservations();
    });
  });

  const renderReservations = async () => {
    const tbody = document.getElementById('reservations-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">Loading...</td></tr>';
    if (!window.api) return;
    try {
      const reservations = await window.api.getReservations();

      const pending  = reservations.filter(r => r.status === 'Pending').length;
      const approved = reservations.filter(r => ['Approved','Confirmed'].includes(r.status)).length;
      const completed = reservations.filter(r => r.status === 'Completed').length;

      const el = id => document.getElementById(id);
      if (el('res-stat-pending'))  el('res-stat-pending').innerText  = pending;
      if (el('res-stat-approved')) el('res-stat-approved').innerText = approved;
      if (el('res-stat-completed'))el('res-stat-completed').innerText = completed;

      const sidebarBadge = el('sidebar-pending-badge');
      if (sidebarBadge) {
        sidebarBadge.innerText = pending;
        if (pending > 0) sidebarBadge.classList.remove('hidden');
        else sidebarBadge.classList.add('hidden');
      }

      const tabBadge = el('tab-pending-badge');
      if (tabBadge) {
        tabBadge.innerText = pending;
        if (pending > 0) tabBadge.classList.remove('hidden');
        else tabBadge.classList.add('hidden');
      }

      if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">No reservations yet.</td></tr>';
        return;
      }

      let filteredRes = reservations;
      if (currentResFilter !== 'All') {
        filteredRes = reservations.filter(r => {
          if (currentResFilter === 'Completed') return r.status === 'Completed';
          if (currentResFilter === 'Pending') return r.status === 'Pending';
          if (currentResFilter === 'Approved') return r.status === 'Approved' || r.status === 'Confirmed';
          return true;
        });
      }

      if (filteredRes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">No reservations found for this filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filteredRes.map(r => {
        const statusClass = ['Approved','Confirmed'].includes(r.status)
          ? 'bg-green-50 text-green-700 border-green-200'
          : (['Closed','Completed','Cancelled'].includes(r.status)
            ? 'bg-gray-50 text-gray-600 border-gray-200'
            : 'bg-amber-50 text-amber-700 border-amber-200');
        return `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-4 py-3">
              <button onclick="window.openReservationModal('${r.id}')" class="group flex items-center gap-3 text-left w-full hover:bg-gray-100 p-2 rounded-xl transition-all border border-transparent hover:border-gray-200">
                <div class="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                  ${(r.customerName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="font-bold text-gray-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                    ${r.customerName || 'Unknown'} 
                    <i data-lucide="external-link" class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </div>
                  <div class="text-[11px] text-gray-500 font-medium">${r.customerPhone || 'No phone'}</div>
                  <div class="text-[11px] text-gray-400 truncate max-w-[150px]" title="${r.customerEmail || ''}">${r.customerEmail || 'No email'}</div>
                </div>
              </button>
            </td>
            <td class="px-6 py-4"><div class="font-medium text-gray-900">${r.carName||r.carId||''}</div>${r.isWaitlist ? '<span class="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase mt-1 inline-block">Waitlist</span>' : ''}</td>
            <td class="px-6 py-4 font-bold">₱ ${(r.amount||0).toLocaleString()}</td>
            <td class="px-6 py-4">
              ${r.screenshotUrl 
                ? `<a href="${r.screenshotUrl}" target="_blank" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 px-3 py-1.5 rounded-md transition-all shadow-sm"><i data-lucide="receipt" class="h-3.5 w-3.5"></i> View Receipt</a>` 
                : '<span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md"><i data-lucide="ban" class="h-3.5 w-3.5"></i> No payment</span>'}
            </td>
            <td class="px-6 py-4">
              <select onchange="window.updateReservationStatus('${r.id}', this.value, '${r.carId}', '${r.customerEmail || ''}', '${(r.customerName || '').replace(/'/g, "\\'")}', '${(r.carName || '').replace(/'/g, "\\'")}')" class="text-xs font-bold border-2 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer transition-colors shadow-sm focus:ring-2 focus:ring-primary/20 ${statusClass}">
                <option value="Pending"   ${r.status==='Pending'   ? 'selected':''}>Pending</option>
                <option value="Approved"  ${r.status==='Approved'  ? 'selected':''}>Approved</option>
                <option value="Declined"  ${r.status==='Declined'  ? 'selected':''}>Declined</option>
                <option value="Completed" ${r.status==='Completed' ? 'selected':''}>Completed</option>
              </select>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1">
                <button onclick="window.openReservationModal('${r.id}')" class="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Reservation">
                  <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="window.cancelReservation('${r.id}', '${r.carId}')" class="text-gray-400 hover:text-orange-500 transition-colors p-1" title="Cancel Reservation">
                  <i data-lucide="x-circle" class="h-4 w-4"></i>
                </button>
                <button onclick="window.deleteReservation('${r.id}')" class="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete Reservation Permanently">
                  <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-red-500">Failed to load reservations.</td></tr>';
    }
  };

  window.updateReservationStatus = async (id, status, carId, email, name, carName) => {
    try {
      const res = await window.api.updateReservationStatus(id, status, carId);
      if (!res.success) throw new Error(res.error?.message);

      // Send email notification for Approve/Decline/Completed
      if ((status === 'Approved' || status === 'Declined' || status === 'Completed') && email) {
        try {
          const isApproved = status === 'Approved';
          const isCompleted = status === 'Completed';
          
          // Use hardcoded URL on production to avoid CORS/origin issues on Netlify
          const siteOrigin = window.location.origin;
          
          let emailHtml = '';
          if (isApproved) {
            emailHtml = `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #16a34a; margin-top: 0; margin-bottom: 20px;">
        Great news! Your Reservation is Approved
      </h1>
      <p>Dear <strong>${name || 'Valued Customer'}</strong>,</p>
      <p>We are thrilled to inform you that your reservation for the <strong>${carName || 'your requested car'}</strong> has been officially approved!</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>Next Steps:</strong> One of our sales representatives will contact you shortly via phone or email to finalize your paperwork and schedule your visit.
        </p>
      </div>
      <h3 style="margin-top: 30px; font-size: 16px; color: #111;">How was your experience?</h3>
      <p style="margin-bottom: 20px; color: #555;">We value your business and would love to hear about your experience with our reservation process. Your feedback helps us improve our service!</p>
      <div style="text-align: center; margin-bottom: 35px;">
        <a href="${siteOrigin}/reviews.html" style="background-color: #9f1c1c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Leave Feedback</a>
      </div>
      <p>Warm regards,<br>The Capamul Cars Team</p>
    </div>
  </div>
</div>`;
          } else if (isCompleted) {
            emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
        Thank You for Your Purchase!
      </h1>
      <p style="margin-bottom: 20px;">Dear <strong>${name || 'Valued Customer'}</strong>,</p>
      <p style="margin-bottom: 25px;">Congratulations on your successful purchase of the <strong>${carName || 'vehicle'}</strong>! We sincerely appreciate your business and trust in Capamul Cars.</p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">Leave a Review</h3>
        <p style="margin: 0; color: #555; font-size: 14px; margin-bottom: 15px;">
          Your feedback is incredibly valuable to us and to future customers. Please take a brief moment to share your experience with us!
        </p>
        <div style="text-align: left;">
          <a href="${siteOrigin}/reviews.html" style="background-color: #9f1c1c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Leave Feedback</a>
        </div>
      </div>

      <p style="margin-bottom: 30px; color: #555;">If you have any questions regarding your new vehicle or paperwork, please do not hesitate to contact us.</p>
      <p style="margin: 0; font-weight: 600; color: #111;">Safe driving and warm regards,</p>
      <p style="margin: 5px 0 0 0; color: #666;">The Capamul Cars Team</p>
    </div>
    <div style="background-color: #f8f9fa; border-top: 1px solid #eeeeee; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        Capamul Cars 2.0 &bull; Purok 2, Dapdap Barobo Surigao Del Sur<br>
        <a href="mailto:capamulcar2@gmail.com" style="color: #9f1c1c; text-decoration: none;">capamulcar2@gmail.com</a>
      </p>
    </div>
  </div>
</div>`;
          } else {
            emailHtml = `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px;">
        Reservation Update
      </h1>
      <p>Dear <strong>${name || 'Valued Customer'}</strong>,</p>
      <p>We are writing to update you regarding your reservation request for the <strong>${carName || 'your requested car'}</strong>.</p>
      <p>Unfortunately, we are unable to approve your reservation at this time. This may be due to the vehicle no longer being available, or issues verifying your submitted details.</p>
      <p>If you have any questions or would like to look at other available vehicles in our inventory, please don't hesitate to reply to this email or visit our dealership.</p>
      <p>Best regards,<br>The Capamul Cars Team</p>
    </div>
  </div>
</div>`;
          }

          let subjectText = `Update on your Reservation - ${carName}`;
          if (isApproved) subjectText = `Reservation Approved! - ${carName}`;
          if (isCompleted) subjectText = `Thank You for Your Purchase! - ${carName}`;

          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: 'service_dgu0d2n',
              template_id: 'template_xzcf7bn',
              user_id: '8bYgrl4zv7OqxBU8a',
              template_params: {
                to_email: email,
                subject: subjectText,
                html_message: emailHtml
              }
            })
          });
          
          if (!emailRes.ok) {
            const errText = await emailRes.text();
            console.warn("EmailJS Error (non-fatal):", errText);
          } else {
            console.log("Reservation status email sent successfully!");
          }
        } catch(e) {
          console.warn("Failed to send status email (non-fatal):", e.message);
        }
      }

      renderReservations();
      if (typeof renderInventory === 'function') {
        renderInventory();
      }
    } catch (err) {
      alert('Failed to update reservation: ' + err.message);
    }
  };

  window.cancelReservation = async (id, carId) => {
    if (!confirm('Are you sure you want to cancel this reservation? The car will be made available again.')) return;
    
    const btn = event.currentTarget;
    const origHtml = btn.innerHTML;
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin text-gray-400"></i>';

    const res = await window.api.updateReservationStatus(id, 'Cancelled', carId);
    if (!res.success) {
      alert('Error cancelling reservation');
      if (btn) btn.innerHTML = origHtml;
      if (window.lucide) window.lucide.createIcons();
    } else {
      renderReservations();
      if (typeof renderInventory === 'function') renderInventory();
    }
  };

  window.deleteReservation = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this reservation? This cannot be undone.')) return;
    
    const btn = event.currentTarget;
    const origHtml = btn.innerHTML;
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin text-gray-400"></i>';

    const res = await window.api.deleteReservation(id);
    if (!res.success) {
      alert('Error deleting reservation');
      if (btn) btn.innerHTML = origHtml;
      if (window.lucide) window.lucide.createIcons();
    } else {
      renderReservations();
    }
  };

  let editingReservationId = null;
  let allCarsForDropdown = [];

  window.toggleCarDropdown = () => {
    const dropdown = document.getElementById('res-car-dropdown');
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      document.getElementById('res-car-search').focus();
    }
  };

  window.filterCarDropdown = () => {
    const term = document.getElementById('res-car-search').value.toLowerCase();
    const list = document.getElementById('res-car-list');
    
    const filtered = allCarsForDropdown.filter(c => 
      `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(term)
    );
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">No cars found</div>';
      return;
    }

    list.innerHTML = filtered.map(c => `
      <div onclick="window.selectCarForReservation('${c.id}', '${c.make} ${c.model}', '${c.thumbnail_url || (c.images && c.images.length ? c.images[0] : '')}', ${c.price})" class="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
        <img src="${c.thumbnail_url || (c.images && c.images.length ? c.images[0] : 'https://via.placeholder.com/150')}" class="w-12 h-8 object-cover rounded shadow-sm border border-black/10" onerror="this.src='https://via.placeholder.com/150'" />
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-gray-900 truncate">${c.make} ${c.model} (${c.year})</div>
          <div class="text-[10px] text-gray-500">₱${(c.price||0).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  };

  window.selectCarForReservation = (id, name, imgUrl, price) => {
    document.getElementById('res-car-id').value = id;
    document.getElementById('res-car-name').value = name;
    
    const display = document.getElementById('res-car-select-display');
    display.innerHTML = `
      <img src="${imgUrl || 'https://via.placeholder.com/150'}" class="w-8 h-6 object-cover rounded" onerror="this.src='https://via.placeholder.com/150'" />
      <span class="text-sm font-bold text-gray-900 truncate">${name}</span>
    `;
    
    document.getElementById('res-car-dropdown').classList.add('hidden');
  };

  // Close dropdown if clicked outside
  document.addEventListener('click', (e) => {
    const container = document.getElementById('res-car-dropdown-container');
    if (container && !container.contains(e.target)) {
      const dropdown = document.getElementById('res-car-dropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
      }
    }
  });

  window.openReservationModal = async (resId = null) => {
    editingReservationId = resId;
    const modal = document.getElementById('add-reservation-modal');
    const form = document.getElementById('add-reservation-form');
    const title = modal.querySelector('h3');
    const btn = document.getElementById('save-res-btn');
    
    if (form) form.reset();
    
    title.innerHTML = `<i data-lucide="${resId ? 'edit' : 'plus-circle'}" class="h-5 w-5 text-primary"></i> ${resId ? 'Edit Reservation' : 'New Reservation'}`;
    btn.innerHTML = resId ? 'Save Changes' : 'Submit Reservation';
    
    const display = document.getElementById('res-car-select-display');
    display.innerHTML = `<span class="text-gray-400 italic">Loading cars...</span>`;
    document.getElementById('res-car-list').innerHTML = '<div class="p-4 text-center text-xs text-gray-400">Loading cars...</div>';
    document.getElementById('res-car-search').value = '';
    document.getElementById('res-car-id').value = '';
    document.getElementById('res-car-name').value = '';
    
    let currentCarId = null;
    if (resId && window.api) {
      const allRes = await window.api.getReservations();
      const res = allRes.find(r => r.id === resId);
      if (res) {
        currentCarId = res.carId;
        document.getElementById('res-customer-name').value = res.customerName || '';
        document.getElementById('res-customer-phone').value = res.customerPhone || '';
        document.getElementById('res-customer-email').value = res.customerEmail || '';
        
        let address = res.customerAddress || '';
        const paymentMethodEl = document.getElementById('res-payment-method');
        const paymentRefEl = document.getElementById('res-payment-ref');
        
        if (paymentRefEl) paymentRefEl.value = '';
        if (paymentMethodEl) paymentMethodEl.value = 'Cash';

        const paymentMatch = address.match(/Paid via (.*?) \(Ref: (.*?)\)|Paid via (.*?)$|\(Paid via (.*?)\)/);
        if (paymentMatch) {
           const method = paymentMatch[1] || paymentMatch[3] || paymentMatch[4];
           const ref = paymentMatch[2] || '';
           
           if (paymentMethodEl && method) {
              const matchedVal = Array.from(paymentMethodEl.options).find(o => o.value === method);
              if (matchedVal) paymentMethodEl.value = method;
           }
           if (paymentRefEl) paymentRefEl.value = ref;
           
           address = address.replace(/\s*-?\s*\(?Paid via.*$/, '').trim();
        }
        document.getElementById('res-customer-address').value = address;
      }
    }

    if (window.api) {
      const allCars = await window.api.getCars();
      // Only show Available cars OR the car currently attached to this reservation
      allCarsForDropdown = allCars.filter(c => 
        (c.status || '').toLowerCase() === 'available' || (currentCarId && c.id === currentCarId)
      );

      if (allCarsForDropdown.length > 0) {
        display.innerHTML = `<span class="text-gray-400 italic">Select a car...</span>`;
        window.filterCarDropdown();
        
        // If editing, auto-select the current car
        if (currentCarId) {
          const car = allCarsForDropdown.find(c => c.id === currentCarId);
          if (car) {
            window.selectCarForReservation(car.id, `${car.make} ${car.model}`, car.thumbnail_url || (car.images && car.images.length ? car.images[0] : ''), car.price);
          }
        }
      } else {
        display.innerHTML = `<span class="text-gray-400 italic">No cars available</span>`;
        document.getElementById('res-car-list').innerHTML = '<div class="p-4 text-center text-xs text-gray-400">No cars available</div>';
      }
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  };

  window.saveAdminReservation = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-res-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    try {
      // res-car-id is now a hidden input, not a select element.
      const baseAddress = document.getElementById('res-customer-address').value.trim();
      const paymentMethod = document.getElementById('res-payment-method').value;
      const paymentRefEl = document.getElementById('res-payment-ref');
      const paymentRef = paymentRefEl ? paymentRefEl.value.trim() : '';
      
      const paymentStr = paymentRef ? `Paid via ${paymentMethod} (Ref: ${paymentRef})` : `Paid via ${paymentMethod}`;
      const fullAddress = baseAddress ? `${baseAddress} - ${paymentStr}` : paymentStr;

      const resData = {
        carId: document.getElementById('res-car-id').value,
        carName: document.getElementById('res-car-name').value,
        customerName: document.getElementById('res-customer-name').value,
        customerPhone: document.getElementById('res-customer-phone').value,
        customerEmail: document.getElementById('res-customer-email').value,
        customerAddress: fullAddress,
        amount: 10000,
        screenshotUrl: null, // Admin manually adding, no screenshot needed
        isWaitlist: false
      };

      let res;
      if (editingReservationId) {
        res = await window.api.updateReservation(editingReservationId, resData);
      } else {
        res = await window.api.submitReservation(resData);
      }
      
      if (!res.success) throw new Error(res.error?.message || "Failed to submit");
      
      // If it's a new reservation, send alert to admins and confirmation to customer
      if (!editingReservationId) {
        try {
          // --- Customer Email HTML ---
          const emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
        Reservation Successfully Received!
      </h1>
      <p style="margin-bottom: 20px;">Dear <strong>${resData.customerName}</strong>,</p>
      <p style="margin-bottom: 25px;">
        Thank you for choosing Capamul Cars. We have successfully received your Reservation request for the <strong>${resData.carName}</strong>.
      </p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">What happens next?</h3>
        <p style="margin: 0; color: #555; font-size: 14px;">
          Our sales team has recorded your submission. You will receive a follow-up once your reservation has been officially approved. 
        </p>
      </div>
      <p style="margin-bottom: 30px; color: #555;">
        If you have any immediate questions, please feel free to reply directly to this email or contact our support team.
      </p>
      <p style="margin: 0; font-weight: 600; color: #111;">Warm regards,</p>
      <p style="margin: 5px 0 0 0; color: #666;">The Capamul Cars Team</p>
    </div>
    <div style="background-color: #f8f9fa; border-top: 1px solid #eeeeee; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        Capamul Cars 2.0 &bull; Purok 2, Dapdap Barobo Surigao Del Sur<br>
        <a href="mailto:capamulcar2@gmail.com" style="color: #9f1c1c; text-decoration: none;">capamulcar2@gmail.com</a>
      </p>
    </div>
  </div>
</div>`;

          // --- Admin Alert HTML ---
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
        A new reservation has been recorded by Admin for <strong>${resData.customerName}</strong> for the <strong>${resData.carName}</strong>.
      </p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">Reservation Details</h3>
        <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
          <li><strong>Customer Name:</strong> ${resData.customerName}</li>
          <li><strong>Email:</strong> ${resData.customerEmail}</li>
          <li><strong>Phone:</strong> ${resData.customerPhone}</li>
          <li><strong>Vehicle:</strong> ${resData.carName}</li>
          <li><strong>Type:</strong> Direct Reservation (Admin Created)</li>
        </ul>
      </div>
    </div>
  </div>
</div>`;

          // Send to Customer
          if (resData.customerEmail) {
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: 'service_dgu0d2n',
                template_id: 'template_xzcf7bn',
                user_id: '8bYgrl4zv7OqxBU8a',
                template_params: {
                  to_email: resData.customerEmail,
                  subject: `Reservation Received - ${resData.carName}`,
                  html_message: emailHtml
                }
              })
            });
          }

          // Send to Admin
          await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: 'service_dgu0d2n',
              template_id: 'template_xzcf7bn',
              user_id: '8bYgrl4zv7OqxBU8a',
              template_params: {
                to_email: 'vclumapac@nemsu.edu.ph, capamulcar2@gmail.com',
                subject: `Admin Created Reservation - ${resData.carName}`,
                html_message: adminHtml
              }
            })
          });
        } catch(e) {
          console.error("Failed to send reservation emails:", e);
        }
      }

      document.getElementById('add-reservation-modal').classList.add('hidden');
      editingReservationId = null;
      renderReservations();
      if (typeof renderInventory === 'function') renderInventory();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  };

  // ─── RENDER LEADS ──────────────────────────────────────────
  const renderLeads = async () => {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">Loading...</td></tr>';
    if (!window.api) return;
    try {
      const leads = await window.api.getLeads();
      if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">No leads yet.</td></tr>';
        return;
      }
      tbody.innerHTML = leads.map(l => {
        const sc = l.status === 'Contacted' ? 'bg-blue-50 text-blue-700 border-blue-200'
                 : l.status === 'Closed'    ? 'bg-gray-100 text-gray-700 border-gray-300'
                 : 'bg-green-50 text-green-700 border-green-200';
        return `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-4 py-3 font-medium text-gray-900">${l.name||''}</td>
            <td class="px-4 py-3 text-gray-500"><a href="mailto:${l.email}" class="hover:underline">${l.email||''}</a></td>
            <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title="${l.message||''}">${l.message||''}</td>
            <td class="px-4 py-3 text-xs text-gray-500">${l.created_at ? new Date(l.created_at).toLocaleDateString() : 'Unknown'}</td>
            <td class="px-4 py-3">
              <select onchange="window.updateLeadStatus('${l.id}', this.value)" class="text-xs border rounded px-2 py-1 ${sc}">
                <option value="New"       ${l.status==='New'       ? 'selected':''}>New</option>
                <option value="Contacted" ${l.status==='Contacted' ? 'selected':''}>Contacted</option>
                <option value="Closed"    ${l.status==='Closed'    ? 'selected':''}>Closed</option>
              </select>
            </td>
            <td class="px-4 py-3 text-right flex justify-end items-center gap-3">
              <a href="mailto:${l.email}" class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Reply</a>
              <button onclick="window.deleteLeadRow('${l.id}')" class="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50" title="Delete Message"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
            </td>
          </tr>`;
      }).join('');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-red-500">Failed to load leads.</td></tr>';
    }
  };

  window.deleteLeadRow = async (id) => {
    if (!confirm('Are you sure you want to delete this customer message? This action cannot be undone.')) return;
    try {
      const res = await window.api.deleteLead(id);
      if (!res.success) throw new Error(res.error?.message);
      renderLeads();
    } catch (err) {
      alert('Failed to delete message: ' + err.message);
    }
  };

  // ─── RENDER BOOKINGS (TEST DRIVES) ──────────────────────────────
  window.currentBookingFilter = 'All';

  window.filterBookings = (status) => {
    window.currentBookingFilter = status;
    
    // Update button styling
    document.querySelectorAll('.booking-filter-btn').forEach(btn => {
      if (btn.id === `booking-filter-${status.toLowerCase()}`) {
        btn.className = 'booking-filter-btn bg-primary text-white border border-primary px-3 py-1 rounded-full whitespace-nowrap transition-colors';
      } else {
        btn.className = 'booking-filter-btn border border-black/10 bg-white text-gray-600 px-3 py-1 rounded-full hover:bg-gray-50 whitespace-nowrap transition-colors';
      }
    });

    renderBookings();
  };

  const renderBookings = async () => {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">Loading...</td></tr>';
    if (!window.api) return;
    try {
      const allLeads = await window.api.getLeads();
      let bookings = allLeads.filter(l => l.message && l.message.includes('[TEST DRIVE REQUEST]'));
      
      // Update stats
      const total = bookings.length;
      const counts = {
        pending: bookings.filter(b => b.status === 'New').length,
        confirmed: bookings.filter(b => b.status === 'Contacted').length,
        completed: bookings.filter(b => b.status === 'Closed').length
      };

      const el = id => document.getElementById(id);
      if (el('view-bookings')) {
        const statEls = el('view-bookings').querySelectorAll('.text-2xl.font-black');
        if (statEls.length >= 4) {
          statEls[0].innerText = counts.pending;
          statEls[1].innerText = counts.confirmed;
          statEls[2].innerText = counts.completed;
          statEls[3].innerText = total;
        }
      }

      if (window.currentBookingFilter !== 'All') {
        bookings = bookings.filter(b => b.status === window.currentBookingFilter);
      }
      
      if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">No bookings found.</td></tr>';
        return;
      }
      
      tbody.innerHTML = bookings.map(l => {
        let vehicle = '-', phone = '-', date = '-', time = '-', notes = '';
        const parts = l.message.split(' | ');
        parts.forEach(p => {
          if (p.includes('Vehicle:')) vehicle = p.replace('Vehicle:', '').replace('[TEST DRIVE REQUEST]', '').trim();
          else if (p.includes('Phone:')) phone = p.replace('Phone:', '').trim();
          else if (p.includes('Date:')) date = p.replace('Date:', '').trim();
          else if (p.includes('Time:')) time = p.replace('Time:', '').trim();
          else if (p.includes('Notes:')) notes = p.replace('Notes:', '').trim();
        });
        
        const sc = l.status === 'Contacted' ? 'bg-blue-50 text-blue-700 border-blue-200'
                 : l.status === 'Closed'    ? 'bg-gray-100 text-gray-700 border-gray-300'
                 : 'bg-green-50 text-green-700 border-green-200';
                 
        return `
          <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 font-bold text-gray-900 text-xs tracking-wider">TEST DRIVE</td>
            <td class="px-6 py-4 text-sm font-bold text-gray-800">${vehicle}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${l.name||''}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium">${date} <br> <span class="text-[11px] text-gray-500 font-normal">${time}</span></td>
            <td class="px-6 py-4 text-sm text-gray-500">
              <a href="tel:${phone}" class="block hover:text-primary transition-colors font-medium">${phone}</a>
              <a href="mailto:${l.email}" class="text-xs text-blue-500 hover:underline block mt-0.5">${l.email||''}</a>
            </td>
            <td class="px-6 py-4">
              <select onchange="window.updateLeadStatus('${l.id}', this.value); setTimeout(() => window.renderBookings(), 500);" class="text-[11px] font-bold uppercase tracking-wider border rounded px-2 py-1 ${sc} focus:outline-none focus:ring-1 focus:ring-black/10">
                <option value="New"       ${l.status==='New'       ? 'selected':''}>NEW</option>
                <option value="Contacted" ${l.status==='Contacted' ? 'selected':''}>CONTACTED</option>
                <option value="Closed"    ${l.status==='Closed'    ? 'selected':''}>CLOSED</option>
              </select>
            </td>
            <td class="px-6 py-4 text-right flex justify-end gap-2">
              ${notes && notes !== 'None' ? `<button onclick="alert('Customer Notes:\\n\\n${notes.replace(/'/g,"")}')" class="text-xs font-semibold border px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-700 transition-colors shadow-sm">View Notes</button>` : ''}
              <button onclick="window.deleteBooking('${l.id}')" class="text-xs font-semibold border px-3 py-1.5 rounded-lg bg-red-50 border-red-200 hover:bg-red-100 text-red-600 transition-colors shadow-sm" title="Delete Booking"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
            </td>
          </tr>`;
      }).join('');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-red-500">Failed to load bookings.</td></tr>';
    }
  };
  window.renderBookings = renderBookings;

  window.deleteBooking = async (id) => {
    if (!confirm('Are you sure you want to delete this test drive booking? This action cannot be undone.')) return;
    try {
      const res = await window.api.deleteLead(id);
      if (!res.success) throw new Error(res.error?.message);
      renderBookings();
    } catch (err) {
      alert('Failed to delete booking: ' + err.message);
    }
  };

  window.updateLeadStatus = async (id, status) => {
    try {
      const res = await window.api.updateLeadStatus(id, status);
      if (!res.success) throw new Error(res.error?.message);
      renderLeads();
    } catch (err) {
      alert('Failed to update lead: ' + err.message);
    }
  };

  // ─── RENDER REVIEWS ──────────────────────────────────────
  window.reviewGalleries = {};

  window.openReviewLightbox = function(galleryId, index) {
    const urls = window.reviewGalleries[galleryId];
    if (!urls || !urls.length) return;
    let currentIndex = index || 0;
    
    let overlay = document.getElementById('review-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center';
      overlay.id = 'review-lightbox';
      document.body.appendChild(overlay);
    }
    
    window.updateReviewLightbox = function(dir) {
      currentIndex = (currentIndex + dir + urls.length) % urls.length;
      window.openReviewLightbox(galleryId, currentIndex);
    };
    
    overlay.innerHTML = `
      <button onclick="document.getElementById('review-lightbox').remove()" class="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-50">
        <i data-lucide="x" class="h-8 w-8"></i>
      </button>
      ${urls.length > 1 ? `
      <div class="absolute top-6 left-1/2 -translate-x-1/2 text-white/70 font-bold tracking-widest text-sm z-50">
        ${currentIndex + 1} / ${urls.length}
      </div>
      <button onclick="window.updateReviewLightbox(-1)" class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-2 sm:p-4 focus:outline-none z-50">
        <i data-lucide="chevron-left" class="h-10 w-10 sm:h-12 sm:w-12"></i>
      </button>
      <button onclick="window.updateReviewLightbox(1)" class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-2 sm:p-4 focus:outline-none z-50">
        <i data-lucide="chevron-right" class="h-10 w-10 sm:h-12 sm:w-12"></i>
      </button>
      ` : ''}
      <div class="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center">
        <img src="${urls[currentIndex]}" class="max-w-full max-h-[90vh] object-contain rounded shadow-2xl">
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  };

  window.renderReviews = async () => {
    const tbody = document.getElementById('admin-reviews-table-body');
    if (!tbody) return;
    
    try {
      const reviews = await window.api.getReviews();
      
      const total = reviews.length;
      const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
      const fiveStar = reviews.filter(r => r.rating === 5).length;
      
      if (document.getElementById('admin-rev-total')) document.getElementById('admin-rev-total').innerText = total;
      if (document.getElementById('admin-rev-avg')) document.getElementById('admin-rev-avg').innerText = avg.toFixed(1);
      if (document.getElementById('admin-rev-5star')) document.getElementById('admin-rev-5star').innerText = fiveStar;
      
      if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-24 text-center text-gray-500">No customer feedback yet.</td></tr>';
        return;
      }
      
      tbody.innerHTML = reviews.map(r => {
        const imageUrl = r.image_url || r.image;
        const author = r.author || r.name || 'Anonymous';
        const body = r.message || r.body || r.comment || '';
        const dateStr = r.created_at || r.date || new Date().toISOString();
        
        let urls = [];
        if (imageUrl) {
          try { urls = imageUrl.startsWith('[') ? JSON.parse(imageUrl) : [imageUrl]; } catch { urls = [imageUrl]; }
          urls = urls.filter(Boolean);
        }

        let photoHtml = '';
        if (urls.length > 0) {
          const galleryId = 'gal-' + Math.random().toString(36).substring(2, 9);
          window.reviewGalleries[galleryId] = urls; // Store globally for lightbox
          
          photoHtml = `
            <div class="relative w-32 group">
              <style>.hide-scrollbar::-webkit-scrollbar { display: none; }</style>
              <div id="${galleryId}" class="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar" style="scrollbar-width: none; -ms-overflow-style: none;">
                ${urls.map((u, i) => `
                  <button type="button" onclick="window.openReviewLightbox('${galleryId}', ${i})" class="shrink-0 block w-32 h-24 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden snap-center hover:opacity-80 transition-opacity relative focus:outline-none" title="View full image ${i+1}">
                    <img src="${u}" class="w-full h-full object-cover">
                    ${urls.length > 1 ? `<div class="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full z-0 font-bold">${i+1}/${urls.length}</div>` : ''}
                  </button>
                `).join('')}
              </div>
              ${urls.length > 1 ? `
                <button onclick="document.getElementById('${galleryId}').scrollBy({left: -136, behavior: 'smooth'})" class="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-white/90 rounded-full shadow-sm border border-gray-200 flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white focus:outline-none"><i data-lucide="chevron-left" class="h-3 w-3"></i></button>
                <button onclick="document.getElementById('${galleryId}').scrollBy({left: 136, behavior: 'smooth'})" class="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-white/90 rounded-full shadow-sm border border-gray-200 flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white focus:outline-none"><i data-lucide="chevron-right" class="h-3 w-3"></i></button>
              ` : ''}
            </div>
          `;
        } else {
          photoHtml = `<div class="w-32 h-24 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-400 text-[10px] uppercase font-bold tracking-wider"><i data-lucide="image-off" class="h-4 w-4 mb-1 opacity-50"></i>None</div>`;
        }
          
        return `
        <tr class="hover:bg-gray-50/50 transition-colors">
          <td class="px-6 py-4">${photoHtml}</td>
          <td class="px-6 py-4 font-bold text-gray-900">${author}</td>
          <td class="px-6 py-4 text-amber-500 text-lg tracking-widest">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</td>
          <td class="px-6 py-4">
            <div class="text-sm font-bold text-gray-900 mb-0.5">${r.title || 'Review'}</div>
            <div class="text-xs text-gray-600 max-w-xs truncate" title="${body.replace(/"/g, '&quot;')}">${body}</div>
          </td>
          <td class="px-6 py-4 text-xs text-gray-500">${new Date(dateStr).toLocaleDateString()}</td>
          <td class="px-6 py-4 text-right">
            <button onclick="window.deleteReview('${r.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          </td>
        </tr>`;
      }).join('');
      
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="6" class="py-24 text-center text-red-500">Failed to load reviews.</td></tr>';
    }
  };

  window.deleteReview = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await window.api.deleteReview(id);
      if (res && !res.success) throw res.error;
      window.renderReviews();
    } catch (err) {
      alert("Failed to delete review.");
      console.error(err);
    }
  };

  // ─── RENDER CUSTOMERS ──────────────────────────────────────
  const renderCustomers = async () => {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">Loading...</td></tr>';
    if (!window.api) return;
    try {
      const customers = await window.api.getCustomers();
      let buyers = 0, activeRes = 0, revenue = 0;
      customers.forEach(c => {
        if (c.purchases > 0) buyers++;
        if (c.status === 'Active') activeRes++;
        revenue += c.totalSpend || 0;
      });
      const el = id => document.getElementById(id);
      if (el('cust-stat-total'))        el('cust-stat-total').innerText        = customers.length;
      if (el('cust-stat-buyers'))       el('cust-stat-buyers').innerText       = buyers;
      if (el('cust-stat-reservations')) el('cust-stat-reservations').innerText = activeRes;
      if (el('cust-stat-revenue'))      el('cust-stat-revenue').innerText      = '₱ ' + revenue.toLocaleString();

      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-gray-500">No customers yet.</td></tr>';
        return;
      }
      tbody.innerHTML = customers.map(c => `
        <tr class="hover:bg-gray-50/50 transition-colors">
          <td class="px-6 py-4 font-bold text-gray-900">${c.name||'Unknown'}</td>
          <td class="px-6 py-4"><div class="text-sm text-gray-600">${c.email||''}</div><div class="text-xs text-gray-400">${c.phone||'No phone'}</div></td>
          <td class="px-6 py-4 font-bold text-gray-700">${c.reservations||0}</td>
          <td class="px-6 py-4 font-bold text-gray-700">${c.purchases||0}</td>
          <td class="px-6 py-4 font-bold text-gray-900">₱ ${(c.totalSpend||0).toLocaleString()}</td>
          <td class="px-6 py-4 text-xs text-gray-500">${c.lastActivity ? c.lastActivity.toLocaleDateString() : 'Unknown'}</td>
          <td class="px-6 py-4 text-right"><button class="text-gray-400 hover:text-black p-1"><i data-lucide="more-vertical" class="h-4 w-4"></i></button></td>
        </tr>`).join('');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-24 text-center text-red-500">Failed to load customers.</td></tr>';
    }
  };

  // ─── DELETE / EDIT VEHICLE ─────────────────────────────────
  window.deleteVehicle = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await window.api.deleteCar(id);
      if (!res.success) throw new Error(res.error?.message);
      renderInventory();
    } catch (err) {
      alert('Failed to delete vehicle: ' + err.message);
    }
  };

  window.editVehicle = async (id) => {
    if (!window.api) return alert('API not ready.');
    const car = await window.api.getCarById(id);
    if (!car) return alert("Vehicle not found!");

    editingCarId = id;
    const h = addCarModal ? addCarModal.querySelector('h3') : null;
    if (h) h.innerText = 'Edit Vehicle';

    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
    setVal('car-name',           car.name);
    setVal('car-year',           car.year);
    setVal('car-make',           car.make);
    setVal('car-original-price', car.original_price);
    setVal('car-body-type',      car.body_type);
    setVal('car-series',         car.series || car.model);
    setVal('car-color',          car.color);
    setVal('car-price',          car.price);
    setVal('car-transmission',   car.transmission);
    setVal('car-fuel-type',      car.fuel_type);
    setVal('car-mileage',        car.mileage);
    setVal('car-dp',             car.dp);
    setVal('car-status',         car.status || 'Available');
    setVal('car-description',    car.description);

    // Show existing images in preview
    const countEl = document.getElementById('img-count');
    if (countEl) countEl.innerText = '0';
    const preview = document.getElementById('img-preview');
    if (preview) {
      const existingImgs = car.images && car.images.length > 0 ? car.images : [];
      if (existingImgs.length > 0) {
        preview.classList.remove('hidden');
        preview.innerHTML =
          '<p class="w-full text-[10px] text-gray-400 mb-1">Current photos (uploading new ones will replace these):</p>' +
          existingImgs.map(url =>
            `<img src="${url}" class="w-16 h-12 object-cover rounded border border-gray-200" onerror="this.style.display='none'">`
          ).join('');
      } else {
        preview.classList.add('hidden');
        preview.innerHTML = '';
      }
    }

    showModal();
  };

  // ─── CMS ───────────────────────────────────────────────────
  const renderCMS = async () => {
    if (!window.api) return;
    const data = await window.api.getCMSData() || {};
    const el = id => document.getElementById(id);

    if (data.hero) {
      if (el('cms-hero-title'))    el('cms-hero-title').value    = data.hero.title    || '';
      if (el('cms-hero-subtitle')) el('cms-hero-subtitle').value = data.hero.subtitle || '';
      if (el('cms-hero-cta'))      el('cms-hero-cta').value      = data.hero.cta      || '';
      if (el('cms-hero-bg'))       el('cms-hero-bg').value       = data.hero.bgUrl    || '';
      if (el('cms-hero-desc'))     el('cms-hero-desc').value     = data.hero.description || 'Quality pre-owned cars in excellent condition — right here in Barobo, Surigao del Sur. Inspected, documented, and priced honestly.';
      if (data.hero.bgUrl && el('cms-hero-img-preview')) {
        el('cms-hero-img-preview').src = data.hero.bgUrl;
      }
    }
    if (data.stats) {
      if (el('cms-stats-cars'))       el('cms-stats-cars').value       = data.stats.carsSold         || '';
      if (el('cms-stats-customers'))  el('cms-stats-customers').value  = data.stats.happyCustomers   || '';
      if (el('cms-stats-years'))      el('cms-stats-years').value      = data.stats.yearsInBusiness  || '';
    }
    if (data.alert) {
      if (el('cms-alert-text'))   el('cms-alert-text').value   = data.alert.text  || '';
      if (el('cms-alert-active')) el('cms-alert-active').checked = !!data.alert.active;
    }
    if (data.about) {
      if (el('cms-about-headline')) el('cms-about-headline').value = data.about.headline || '';
      if (el('cms-about-sub'))      el('cms-about-sub').value      = data.about.sub || '';
      if (el('cms-about-stat1'))    el('cms-about-stat1').value    = data.about.stat1 || '';
      if (el('cms-about-stat2'))    el('cms-about-stat2').value    = data.about.stat2 || '';
      if (el('cms-about-stat3'))    el('cms-about-stat3').value    = data.about.stat3 || '';
      if (el('cms-about-stat4'))    el('cms-about-stat4').value    = data.about.stat4 || '';
      if (el('cms-about-stat1-label')) el('cms-about-stat1-label').value = data.about.stat1Label || '';
      if (el('cms-about-stat2-label')) el('cms-about-stat2-label').value = data.about.stat2Label || '';
      if (el('cms-about-stat3-label')) el('cms-about-stat3-label').value = data.about.stat3Label || '';
      if (el('cms-about-stat4-label')) el('cms-about-stat4-label').value = data.about.stat4Label || '';
      
      if (el('cms-about-story-head'))  el('cms-about-story-head').value  = data.about.storyHead || '';
      if (el('cms-about-story-text'))  el('cms-about-story-text').value  = data.about.storyText || '';
      if (el('cms-about-story-badge')) el('cms-about-story-badge').value = data.about.storyBadge || '';
      
      if (data.about.award1 && el('cms-about-award1-preview')) {
        el('cms-about-award1-preview').src = data.about.award1;
        el('cms-about-award1-preview').classList.remove('hidden');
      }
      if (data.about.award2 && el('cms-about-award2-preview')) {
        el('cms-about-award2-preview').src = data.about.award2;
        el('cms-about-award2-preview').classList.remove('hidden');
      }
      if (data.about.storyImg && el('cms-about-story-img-preview')) {
        el('cms-about-story-img-preview').src = data.about.storyImg;
        el('cms-about-story-img-preview').classList.remove('hidden');
      }

      if (el('cms-about-ceo-name'))  el('cms-about-ceo-name').value  = data.about.ceoName || '';
      if (el('cms-about-ceo-title'))  el('cms-about-ceo-title').value  = data.about.ceoTitle || '';
      if (el('cms-about-ceo-bio'))  el('cms-about-ceo-bio').value  = data.about.ceoBio || '';
      if (el('cms-about-ceo-img-preview') && data.about.ceoImg) {
        el('cms-about-ceo-img-preview').src = data.about.ceoImg;
        el('cms-about-ceo-img-preview').classList.remove('hidden');
      }
    }

    const hoursContainer = el('cms-business-hours-container');
    if (hoursContainer) {
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const h    = data.hours || {};
      hoursContainer.innerHTML = days.map(d => `
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-700 w-24">${d}</span>
          <input type="text" id="cms-hour-${d.toLowerCase()}" value="${h[d.toLowerCase()]||''}" class="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary">
        </div>`).join('');
    }

    window.cmsGCashAccounts = data.gcash || [];
    renderGCashAccounts();

    const cars = await window.api.getCars();
    window.cmsNewArrivals = data.newArrivals || [];
    window.cmsFeatured    = data.featured    || [];
    window.cmsAllCars     = cars;

    const naList = el('cms-new-arrivals-list');
    if (naList) {
      const newest = cars.filter(c => (c.status||'').toLowerCase() === 'available').slice(0, 6);
      naList.innerHTML = newest.length === 0
        ? '<div class="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">No available cars yet. Add a car to inventory to see it here.</div>'
        : newest.map(c => `
            <div class="flex items-center gap-3 py-2 border-b last:border-0">
              ${c.images&&c.images[0] ? `<img src="${c.images[0]}" class="w-12 h-8 object-cover rounded shrink-0">` : '<div class="w-12 h-8 bg-gray-100 rounded shrink-0 flex items-center justify-center"><i data-lucide="image-off" class="h-4 w-4 text-gray-300"></i></div>'}
              <div class="min-w-0">
                <div class="text-sm font-bold text-gray-800 truncate">${c.name}</div>
                <div class="text-[10px] text-gray-400">${c.year||''} · ₱${Number(c.price||0).toLocaleString()}</div>
              </div>
              <span class="ml-auto text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">NEW</span>
            </div>`).join('');
      if (window.lucide) window.lucide.createIcons();
    }

    renderFeaturedVehicles();
  };

  const renderGCashAccounts = () => {
    const list  = document.getElementById('cms-gcash-list');
    const count = document.getElementById('cms-gcash-count');
    if (!list) return;

    // If completely empty, seed it with the default so it's not confusing
    if (!window.cmsGCashAccounts || window.cmsGCashAccounts.length === 0) {
      window.cmsGCashAccounts = [{ name: "CapamulCars", number: window.BUSINESS_PHONE || "09686995654" }];
    }

    if (count) count.innerText = `${window.cmsGCashAccounts.length}/3`;
    
    list.innerHTML = window.cmsGCashAccounts.map((acc, idx) => `
      <div class="border rounded-lg p-3 bg-gray-50">
        <div class="flex justify-between items-center mb-2">
          <span class="text-[10px] font-bold text-gray-500 uppercase">ACCOUNT #${idx+1}</span>
          <button onclick="window.removeGCashAccount(${idx})" class="text-gray-400 hover:text-red-500"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
        </div>
        <div class="space-y-2">
          <div><label class="block text-[10px] text-gray-500 mb-1">Account Name</label><input type="text" id="cms-gcash-name-${idx}" value="${acc.name||''}" class="w-full border rounded px-2 py-1 text-sm bg-white"></div>
          <div><label class="block text-[10px] text-gray-500 mb-1">GCash Number</label><input type="text" id="cms-gcash-num-${idx}" value="${acc.number||''}" class="w-full border rounded px-2 py-1 text-sm bg-white"></div>
        </div>
      </div>`).join('');
    if (window.lucide) window.lucide.createIcons();
  };
  window.renderGCashAccounts = renderGCashAccounts;

  window.addGCashAccount = () => {
    if (!window.cmsGCashAccounts) window.cmsGCashAccounts = [];
    if (window.cmsGCashAccounts.length >= 3) { alert('Max 3 GCash accounts.'); return; }
    window.cmsGCashAccounts.push({ name: '', number: '' });
    renderGCashAccounts();
  };

  window.removeGCashAccount = (idx) => {
    window.cmsGCashAccounts.splice(idx, 1);
    renderGCashAccounts();
  };

  const renderFeaturedVehicles = () => {
    const list    = document.getElementById('cms-featured-list');
    const count   = document.getElementById('cms-featured-count');
    const results = document.getElementById('cms-featured-search-results');
    if (!list) return;

    if (count) count.innerText = `${(window.cmsFeatured||[]).length}/10`;

    if (!window.cmsFeatured || window.cmsFeatured.length === 0) {
      list.innerHTML = '<div class="text-sm text-gray-500 text-center py-4 border border-dashed rounded-lg">No featured vehicles selected.</div>';
    } else {
      list.innerHTML = window.cmsFeatured.map((carId, idx) => {
        const c = (window.cmsAllCars||[]).find(x => x.id === carId);
        if (!c) return '';
        return `
          <div class="flex items-center justify-between border rounded-lg p-2 bg-white mb-2 shadow-sm">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-gray-400 w-4">${idx+1}</span>
              ${c.images&&c.images[0] ? `<img src="${c.images[0]}" class="w-12 h-8 object-cover rounded">` : ''}
              <div><div class="text-sm font-bold text-gray-900">${c.name}</div><div class="text-[10px] text-gray-500">${c.year} ${c.make}</div></div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex flex-col border rounded overflow-hidden">
                <button onclick="window.moveFeatured(${idx},-1)" class="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-500"><i data-lucide="chevron-up" class="h-3 w-3"></i></button>
                <button onclick="window.moveFeatured(${idx},1)"  class="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-500 border-t"><i data-lucide="chevron-down" class="h-3 w-3"></i></button>
              </div>
              <button onclick="window.removeFeatured('${carId}')" class="text-xs font-bold text-red-500 hover:text-red-700 px-2">Remove</button>
            </div>
          </div>`;
      }).join('');
    }

    if (results) {
      const available = (window.cmsAllCars||[]).filter(c => !(window.cmsFeatured||[]).includes(c.id));
      results.innerHTML = available.length === 0
        ? '<div class="text-sm text-gray-500 text-center py-4">All vehicles are already featured.</div>'
        : available.map(c => `
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <div class="flex items-center gap-3">
                ${c.images&&c.images[0] ? `<img src="${c.images[0]}" class="w-10 h-6 object-cover rounded">` : ''}
                <div class="text-xs font-medium text-gray-700">${c.name}</div>
              </div>
              <button onclick="window.addFeatured('${c.id}')" class="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">Add</button>
            </div>`).join('');
    }
    if (window.lucide) window.lucide.createIcons();
  };
  window.renderFeaturedVehicles = renderFeaturedVehicles;

  window.addFeatured = (carId) => {
    if (!window.cmsFeatured) window.cmsFeatured = [];
    if (window.cmsFeatured.length >= 10) { alert('Max 10 featured vehicles.'); return; }
    window.cmsFeatured.push(carId);
    renderFeaturedVehicles();
  };

  window.removeFeatured = (carId) => {
    window.cmsFeatured = (window.cmsFeatured||[]).filter(id => id !== carId);
    renderFeaturedVehicles();
  };

  window.moveFeatured = (idx, dir) => {
    const f = window.cmsFeatured || [];
    if (idx + dir < 0 || idx + dir >= f.length) return;
    [f[idx], f[idx+dir]] = [f[idx+dir], f[idx]];
    renderFeaturedVehicles();
  };

  // Wire search box to filter the "Add from Inventory" list
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'cms-featured-search') {
      const q = e.target.value.trim().toLowerCase();
      const results = document.getElementById('cms-featured-search-results');
      if (!results) return;
      const available = (window.cmsAllCars||[]).filter(c => !(window.cmsFeatured||[]).includes(c.id));
      const filtered  = q ? available.filter(c =>
        [c.name, c.make, c.model, String(c.year)].some(f => (f||'').toLowerCase().includes(q))
      ) : available;
      results.innerHTML = filtered.length === 0
        ? '<div class="text-sm text-gray-500 text-center py-4">No matching cars.</div>'
        : filtered.map(c => `
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <div class="flex items-center gap-3">
                ${c.images&&c.images[0] ? `<img src="${c.images[0]}" class="w-10 h-6 object-cover rounded">` : ''}
                <div class="text-xs font-medium text-gray-700">${c.name} <span class="text-gray-400">${c.year||''} · ${c.status||''}</span></div>
              </div>
              <button onclick="window.addFeatured('${c.id}')" class="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">Add</button>
            </div>`).join('');
    }
  });

  window.saveCMSSection = async (section) => {
    if (!window.api) return alert('API not ready.');
    // Load existing CMS data first so we don't overwrite other sections
    const existing = await window.api.getCMSData() || {};
    const data = { ...existing };
    const el = id => document.getElementById(id);

    if (section === 'hero') {
      data.hero = { 
        title: el('cms-hero-title').value, 
        subtitle: el('cms-hero-subtitle').value, 
        cta: el('cms-hero-cta').value,
        bgUrl: el('cms-hero-bg') ? el('cms-hero-bg').value : '' 
      };
    } else if (section === 'stats') {
      data.stats = { carsSold: el('cms-stats-cars').value, happyCustomers: el('cms-stats-customers').value, yearsInBusiness: el('cms-stats-years').value };
    } else if (section === 'alert') {
      data.alert = { text: el('cms-alert-text').value, active: el('cms-alert-active').checked };
    } else if (section === 'hours') {
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      data.hours = {};
      days.forEach(d => { data.hours[d] = el(`cms-hour-${d}`) ? el(`cms-hour-${d}`).value : ''; });
    } else if (section === 'gcash') {
      (window.cmsGCashAccounts||[]).forEach((acc, idx) => {
        if (el(`cms-gcash-name-${idx}`)) acc.name   = el(`cms-gcash-name-${idx}`).value;
        if (el(`cms-gcash-num-${idx}`))  acc.number = el(`cms-gcash-num-${idx}`).value;
      });
      data.gcash = window.cmsGCashAccounts;
    } else if (section === 'featured') {
      data.featured = window.cmsFeatured || [];
    } else if (section === 'newArrivals') {
      data.newArrivals = Array.from(document.querySelectorAll('[id^="cms-na-"]:checked')).map(cb => cb.value);
    } else if (section === 'heroImage') {
      const fileInput = el('cms-hero-img-upload');
      if (fileInput && fileInput.files[0]) {
        try {
          const file = fileInput.files[0];
          const SB_URL = window.SUPABASE_URL;
          const SB_ANON = window.SUPABASE_ANON;
          const SB_BUCKET = window.SUPABASE_BUCKET || 'car-images';
          
          const fileName = `hero/bg_${Date.now()}.jpg`;
          const uploadRes = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${fileName}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SB_ANON}`,
              'apikey': SB_ANON,
              'Content-Type': file.type,
            },
            body: file,
          });

          if (!uploadRes.ok) throw new Error(await uploadRes.text());

          const publicUrl = `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${fileName}`;
          data.hero = data.hero || {};
          data.hero.bgUrl = publicUrl;
        } catch (e) {
          console.error("Hero upload failed:", e);
          alert('❌ Failed to upload background. ' + e.message);
          return;
        }
      }
    } else if (section === 'heroDesc') {
      data.hero = data.hero || {};
      data.hero.description = el('cms-hero-desc') ? el('cms-hero-desc').value : '';
    }

    const btn = document.querySelector(`[onclick="window.saveCMSSection('${section}')"]`);
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const res = await window.api.updateCMSData(data);

    if (btn) { btn.disabled = false; btn.textContent = section === 'featured' ? 'Save Featured' : 'Save'; }

    if (res.success) {
      // Show a green toast instead of an alert
      const toast = document.createElement('div');
      toast.textContent = '✅ Saved successfully!';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } else {
      alert('❌ Failed to save. Please try again.');
    }
  };

  window.saveAboutSettings = async () => {
    if (!window.api) return alert('API not ready.');
    const existing = await window.api.getCMSData() || {};
    const data = { ...existing };
    const el = id => document.getElementById(id);
    
    data.about = data.about || {};
    data.about.headline = el('cms-about-headline').value;
    data.about.sub = el('cms-about-sub').value;
    data.about.stat1 = el('cms-about-stat1').value;
    data.about.stat2 = el('cms-about-stat2').value;
    data.about.stat3 = el('cms-about-stat3').value;
    data.about.stat4 = el('cms-about-stat4').value;
    data.about.stat1Label = el('cms-about-stat1-label') ? el('cms-about-stat1-label').value : '';
    data.about.stat2Label = el('cms-about-stat2-label') ? el('cms-about-stat2-label').value : '';
    data.about.stat3Label = el('cms-about-stat3-label') ? el('cms-about-stat3-label').value : '';
    data.about.stat4Label = el('cms-about-stat4-label') ? el('cms-about-stat4-label').value : '';
    data.about.storyHead = el('cms-about-story-head') ? el('cms-about-story-head').value : '';
    data.about.storyText = el('cms-about-story-text') ? el('cms-about-story-text').value : '';
    data.about.storyBadge = el('cms-about-story-badge') ? el('cms-about-story-badge').value : '';

    const uploadImage = async (fileInputId) => {
      const input = el(fileInputId);
      if (input && input.files[0]) {
        try {
          const file = input.files[0];
          const fileName = `about/${fileInputId}_${Date.now()}.jpg`;
          const uploadRes = await fetch(`${window.SUPABASE_URL}/storage/v1/object/${window.SUPABASE_BUCKET || 'car-images'}/${fileName}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.SUPABASE_ANON}`,
              'apikey': window.SUPABASE_ANON,
              'Content-Type': file.type,
            },
            body: file,
          });
          if (!uploadRes.ok) throw new Error(await uploadRes.text());
          return `${window.SUPABASE_URL}/storage/v1/object/public/${window.SUPABASE_BUCKET || 'car-images'}/${fileName}`;
        } catch(e) {
          console.error("Upload failed", e);
        }
      }
      return null;
    };

    const btn = el('btn-save-about');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const award1Url = await uploadImage('cms-about-award1');
    if (award1Url) data.about.award1 = award1Url;

    const award2Url = await uploadImage('cms-about-award2');
    if (award2Url) data.about.award2 = award2Url;

    const storyImgUrl = await uploadImage('cms-about-story-img');
    if (storyImgUrl) data.about.storyImg = storyImgUrl;

    data.about.ceoName = el('cms-about-ceo-name') ? el('cms-about-ceo-name').value : '';
    data.about.ceoTitle = el('cms-about-ceo-title') ? el('cms-about-ceo-title').value : '';
    data.about.ceoBio = el('cms-about-ceo-bio') ? el('cms-about-ceo-bio').value : '';
    
    const ceoImg = await uploadImage('cms-about-ceo-img');
    if (ceoImg) data.about.ceoImg = ceoImg;

    const res = await window.api.updateCMSData(data);
    
    if (btn) { btn.disabled = false; btn.textContent = 'Save About Page'; }
    if (res.success) {
      const toast = document.createElement('div');
      toast.textContent = '✅ About settings saved!';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      if (el('cms-about-award1')) el('cms-about-award1').value = '';
      if (el('cms-about-award2')) el('cms-about-award2').value = '';
      if (el('cms-about-story-img')) el('cms-about-story-img').value = '';
    } else {
      alert('❌ Failed to save.');
    }
  };

  window.removeCMSHeroImage = async () => {
    if (!confirm("Are you sure you want to remove the custom background and revert to default?")) return;
    
    let data = await window.api.getCMSData();
    if (!data) data = {};
    if (data.hero) {
      data.hero.bgUrl = "";
      const res = await window.api.updateCMSData(data);
      if (res.success) {
        document.getElementById('cms-hero-img-preview').src = 'img/bg1.jpg';
        if (document.getElementById('cms-hero-img-upload')) {
          document.getElementById('cms-hero-img-upload').value = '';
        }
        alert("Removed successfully! The default background will now be used.");
      } else {
        alert("Failed to remove background.");
      }
    }
  };


  // ─── SETTINGS ──────────────────────────────────────────────
  const renderSettings = async () => {
    if (!window.api) return;
    const data = await window.api.getSettingsData() || {};
    const el   = id => document.getElementById(id);
    if (data.company) {
      if (el('settings-biz-name'))    el('settings-biz-name').value    = data.company.name    || '';
      if (el('settings-biz-address')) el('settings-biz-address').value = data.company.address || '';
      if (el('settings-biz-phone'))   el('settings-biz-phone').value   = data.company.phone   || '';
      if (el('settings-biz-email'))   el('settings-biz-email').value   = data.company.email   || '';
      if (el('settings-biz-facebook')) el('settings-biz-facebook').value = data.company.facebook || '';
      if (el('settings-biz-hours'))   el('settings-biz-hours').value   = data.company.hours   || '';
    }
    if (data.security) {
      if (el('settings-sec-timeout')) el('settings-sec-timeout').value  = data.security.timeout   || '';
      if (el('settings-sec-2fa'))     el('settings-sec-2fa').checked    = !!data.security.twoFactor;
    }
    if (data.notifications) {
      if (el('settings-notif-email')) el('settings-notif-email').checked = !!data.notifications.email;
      if (el('settings-notif-res'))   el('settings-notif-res').checked   = !!data.notifications.reservations;
      if (el('settings-notif-lead'))  el('settings-notif-lead').checked  = !!data.notifications.leads;
    }
    
    if (typeof renderDevicesList === 'function') renderDevicesList();
  };

  window.saveSettingsSection = async (section) => {
    if (!window.api) return alert('API not ready.');
    const el = id => document.getElementById(id);
    const data = await window.api.getSettingsData() || {};
    
    if (section === 'company') {
      data.company = { 
        name: el('settings-biz-name').value, 
        address: el('settings-biz-address').value, 
        phone: el('settings-biz-phone').value, 
        email: el('settings-biz-email').value,
        facebook: el('settings-biz-facebook').value,
        hours: el('settings-biz-hours').value
      };
    } else if (section === 'security') {
      data.security = { timeout: el('settings-sec-timeout').value, twoFactor: el('settings-sec-2fa').checked };
    } else if (section === 'notifications') {
      data.notifications = { email: el('settings-notif-email').checked, reservations: el('settings-notif-res').checked, leads: el('settings-notif-lead').checked };
    }
    
    const btn = event && event.target ? event.target : null;
    if (btn) btn.innerText = 'Saving...';
    
    const res = await window.api.updateSettingsData(data);
    
    if (btn) btn.innerText = 'Save';
    alert(res.success ? 'Settings saved!' : 'Failed to save settings.');
  };

  let generatedPasswordOTP = null;
  let pendingNewPassword = null;

  async function sendPasswordChangeOTP(otp) {
    const serviceID = "service_dgu0d2n";
    const templateID = "template_qa2655a";
    const templateParams = {
      to_email: 'capamulcar2@gmail.com,vclumapac@nemsu.edu.ph',
      otp_code: otp,
      message: 'A request was made to change the Capamul Cars admin password. Use this code to verify the change.'
    };

    try {
      if (typeof emailjs === 'undefined') {
        alert('EmailJS is not loaded.');
        return false;
      }
      await emailjs.send(serviceID, templateID, templateParams);
      return true;
    } catch (err) {
      console.error("Failed to send OTP:", err);
      alert("Failed to send verification email. Please check your network connection.");
      return false;
    }
  }

  window.updatePassword = async () => {
    const el = document.getElementById('settings-new-password');
    const pwd = el ? el.value.trim() : '';
    if (!pwd || pwd.length < 6) { alert('Password must be at least 6 characters.'); return; }
    
    generatedPasswordOTP = Math.floor(100000 + Math.random() * 900000).toString();
    pendingNewPassword = pwd;
    
    // Change button to "Sending..."
    const btn = el.parentElement.nextElementSibling;
    let oldText = 'Update Password';
    if (btn) {
      oldText = btn.innerText;
      btn.innerText = 'Sending Code...';
      btn.disabled = true;
    }

    const sent = await sendPasswordChangeOTP(generatedPasswordOTP);
    
    if (sent) {
      document.getElementById('otp-password-modal').classList.remove('hidden');
    }
    
    if (btn) {
      btn.innerText = oldText;
      btn.disabled = false;
    }
  };

  // Attach listener to verify OTP button
  const verifyPwdBtn = document.getElementById('verify-password-otp-btn');
  if (verifyPwdBtn) {
    verifyPwdBtn.addEventListener('click', () => {
      const entered = document.getElementById('password-otp-input').value.trim();
      if (entered === generatedPasswordOTP) {
        localStorage.setItem('admin_password', pendingNewPassword);
        alert('Password has been successfully updated!');
        document.getElementById('otp-password-modal').classList.add('hidden');
        document.getElementById('settings-new-password').value = '';
        generatedPasswordOTP = null;
        pendingNewPassword = null;
      } else {
        alert('Invalid or incorrect verification code.');
      }
    });
  }

  // ─── DEVICE MANAGEMENT & CONTINUOUS SECURITY ───────────────────────────

  // Auto-register this device in the DB when admin panel loads.
  // Without this, the device is never in the list and revoke never works.
  const registerCurrentDevice = async () => {
    if (!window.api) return;
    const deviceId = localStorage.getItem('device_id');
    if (!deviceId) return; // No device_id means auth.html didn't set it yet

    try {
      const devices = await window.api.getVerifiedDevices();
      const already = devices.some(d => d.id === deviceId);
      if (!already) {
        const newDevice = {
          id: deviceId,
          userAgent: navigator.userAgent,
          addedAt: new Date().toISOString()
        };
        await window.api.updateVerifiedDevices([...devices, newDevice]);
      }
    } catch(e) {
      console.error('Failed to register device:', e);
    }
  };

  // Run registration once on load
  registerCurrentDevice();

  const renderDevicesList = async () => {
    if (!window.api) return;
    const listEl = document.getElementById('devices-list');
    if (!listEl) return;
    
    try {
      const devices = await window.api.getVerifiedDevices();
      const currentDeviceId = localStorage.getItem('device_id');
      
      if (!devices || devices.length === 0) {
        listEl.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">No authorized devices found.</div>';
        return;
      }

      listEl.innerHTML = devices.map(d => {
        const isCurrent = d.id === currentDeviceId;
        const dateStr = new Date(d.addedAt).toLocaleString();
        const deviceLabel = getDeviceLabel(d.userAgent);
        const browserName = getBrowserName(d.userAgent);
        const osName = getOSName(d.userAgent);
        const deviceIcon = getDeviceIcon(d.userAgent);
        const customName = d.customName || '';
        
        return `
          <div class="flex items-start justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors gap-3" id="device-row-${d.id}">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div class="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
                ${deviceIcon}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-bold text-gray-900">${customName || deviceLabel}</p>
                  ${isCurrent ? '<span class="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">● Current</span>' : ''}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span class="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-medium">${osName}</span>
                  <span class="text-gray-300 text-[10px]">·</span>
                  <span class="text-[10px] text-gray-500">${browserName}</span>
                </div>
                <p class="text-[10px] text-gray-400 mt-1">Added: ${dateStr}</p>
                <!-- Inline rename -->
                <div class="mt-2 hidden" id="rename-row-${d.id}">
                  <div class="flex items-center gap-1.5">
                    <input type="text" id="rename-input-${d.id}" value="${customName || deviceLabel}"
                      placeholder="e.g. Acer Laptop, Lenovo PC…"
                      class="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary" />
                    <button onclick="window.saveDeviceName('${d.id}')" class="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg hover:opacity-90">Save</button>
                    <button onclick="window.cancelRename('${d.id}')" class="text-gray-400 hover:text-gray-600 text-xs px-1.5 py-1 rounded-lg hover:bg-gray-100">✕</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="window.startRename('${d.id}', '${(customName || deviceLabel).replace(/'/g, '\\&apos;')}')" class="text-gray-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Rename Device">
                <i data-lucide="pencil" class="h-3.5 w-3.5"></i>
              </button>
              ${!isCurrent ? `
                <button onclick="window.revokeDevice('${d.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Revoke Access">
                  <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error('Failed to load devices:', e);
      listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Failed to load devices.</div>';
    }
  };

  // ── Device label helpers ──────────────────────────────────────
  function getDeviceLabel(ua) {
    if (!ua) return 'Unknown Device';
    const u = ua.toLowerCase();

    // ── iPhone / iPad ──
    if (u.includes('iphone'))                                    return 'iPhone';
    if (u.includes('ipad'))                                      return 'iPad';

    // ── Android phones & tablets (brand detection) ──
    if (u.includes('android')) {
      const isMobile = u.includes('mobile');
      // Samsung
      if (u.includes('samsung') || u.includes('sm-'))          return isMobile ? 'Samsung Phone' : 'Samsung Tablet';
      // Huawei
      if (u.includes('huawei') || u.includes('honor'))          return isMobile ? 'Huawei Phone' : 'Huawei Tablet';
      // Xiaomi / Redmi / POCO
      if (u.includes('xiaomi') || u.includes('redmi') || u.includes('poco'))  return isMobile ? 'Xiaomi Phone' : 'Xiaomi Tablet';
      // OPPO / Realme / OnePlus
      if (u.includes('oppo'))                                   return 'OPPO Phone';
      if (u.includes('realme'))                                 return 'Realme Phone';
      if (u.includes('oneplus'))                                return 'OnePlus Phone';
      // Vivo
      if (u.includes('vivo'))                                   return 'Vivo Phone';
      // Tecno / Infinix / itel
      if (u.includes('tecno'))                                  return 'Tecno Phone';
      if (u.includes('infinix'))                                return 'Infinix Phone';
      // LG
      if (u.includes('lg-') || u.includes('lm-'))              return isMobile ? 'LG Phone' : 'LG Tablet';
      // Google Pixel
      if (u.includes('pixel'))                                  return 'Google Pixel';
      // Generic
      return isMobile ? 'Android Phone' : 'Android Tablet';
    }

    // ── Windows laptop/desktop brands ──
    if (u.includes('windows')) {
      if (u.includes('acer'))                                   return 'Acer Laptop';
      if (u.includes('asus') || u.includes('asustek'))         return 'ASUS Laptop';
      if (u.includes('lenovo'))                                 return 'Lenovo Laptop';
      if (u.includes('hewlett') || u.includes('hp-'))          return 'HP Laptop';
      if (u.includes('dell'))                                   return 'Dell Laptop';
      if (u.includes('toshiba'))                                return 'Toshiba Laptop';
      if (u.includes('sony') || u.includes('vaio'))            return 'Sony Laptop';
      if (u.includes('msi'))                                    return 'MSI Laptop';
      if (u.includes('razer'))                                  return 'Razer Laptop';
      if (u.includes('surface'))                                return 'Microsoft Surface';
      return 'Windows PC';
    }

    // ── Mac ──
    if (u.includes('macintosh') || u.includes('mac os x'))     return 'MacBook / iMac';

    // ── Linux ──
    if (u.includes('linux'))                                    return 'Linux PC';

    // ── Chrome OS ──
    if (u.includes('cros'))                                     return 'Chromebook';

    return 'Unknown Device';
  }

  function getOSName(ua) {
    if (!ua) return 'Unknown OS';
    const u = ua.toLowerCase();
    if (u.includes('iphone os') || u.includes('cpu iphone')) {
      const m = ua.match(/OS (\d+_\d+)/);
      return m ? `iOS ${m[1].replace('_', '.')}` : 'iOS';
    }
    if (u.includes('ipad')) {
      const m = ua.match(/OS (\d+_\d+)/);
      return m ? `iPadOS ${m[1].replace('_', '.')}` : 'iPadOS';
    }
    if (u.includes('android')) {
      const m = ua.match(/Android (\d+\.?\d*)/);
      return m ? `Android ${m[1]}` : 'Android';
    }
    if (u.includes('windows nt')) {
      const versions = { '10.0': 'Windows 11/10', '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7', '6.0': 'Vista' };
      const m = ua.match(/Windows NT (\d+\.\d+)/);
      return m ? (versions[m[1]] || `Windows NT ${m[1]}`) : 'Windows';
    }
    if (u.includes('mac os x')) {
      const m = ua.match(/Mac OS X (\d+[_.]\d+)/);
      return m ? `macOS ${m[1].replace('_', '.')}` : 'macOS';
    }
    if (u.includes('linux'))   return 'Linux';
    if (u.includes('cros'))    return 'Chrome OS';
    return 'Unknown OS';
  }

  function getBrowserName(ua) {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Edg'))                                     return 'Microsoft Edge';
    if (ua.includes('OPR') || ua.includes('Opera'))            return 'Opera';
    if (ua.includes('Chrome') && !ua.includes('Chromium'))     return 'Google Chrome';
    if (ua.includes('Chromium'))                               return 'Chromium';
    if (ua.includes('Firefox'))                                return 'Mozilla Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome'))       return 'Apple Safari';
    return 'Browser';
  }

  function getDeviceIcon(ua) {
    if (!ua) return '🖥️';
    const u = ua.toLowerCase();
    if (u.includes('iphone'))                                    return '📱';
    if (u.includes('ipad'))                                      return '📱';
    if (u.includes('android') && u.includes('mobile'))          return '📱';
    if (u.includes('android'))                                   return '📱';
    if (u.includes('macintosh') || u.includes('mac os x'))      return '💻';
    if (u.includes('windows'))                                   return '💻';
    if (u.includes('linux'))                                     return '🖥️';
    if (u.includes('cros'))                                      return '💻';
    return '🖥️';
  }

  // ── Inline rename helpers ───────────────────────────────────
  window.startRename = (id, currentName) => {
    const row = document.getElementById(`rename-row-${id}`);
    if (row) {
      row.classList.remove('hidden');
      const inp = document.getElementById(`rename-input-${id}`);
      if (inp) { inp.value = currentName; inp.focus(); inp.select(); }
    }
  };

  window.cancelRename = (id) => {
    const row = document.getElementById(`rename-row-${id}`);
    if (row) row.classList.add('hidden');
  };

  window.saveDeviceName = async (id) => {
    const inp = document.getElementById(`rename-input-${id}`);
    if (!inp) return;
    const name = inp.value.trim();
    try {
      const devices = await window.api.getVerifiedDevices();
      const updated = devices.map(d => d.id === id ? { ...d, customName: name } : d);
      await window.api.updateVerifiedDevices(updated);
      window.showToast(`Device renamed to "${name || 'default'}".`);
      renderDevicesList();
    } catch(e) {
      alert('Failed to rename device.');
    }
  };

  window.revokeDevice = async (id) => {
    if (!confirm("Are you sure you want to revoke access for this device? It will be logged out immediately.")) return;
    try {
      const devices = await window.api.getVerifiedDevices();
      const updated = devices.filter(d => d.id !== id);
      await window.api.updateVerifiedDevices(updated);
      renderDevicesList();
    } catch(e) {
      alert("Failed to revoke device.");
    }
  };

  // Continuous security check loop
  setInterval(async () => {
    const currentDeviceId = localStorage.getItem('device_id');
    if (!currentDeviceId || !window.api) return;
    
    try {
      const devices = await window.api.getVerifiedDevices();
      const stillAuthorized = devices.some(d => d.id === currentDeviceId);
      if (!stillAuthorized) {
        localStorage.removeItem('device_id');
        localStorage.removeItem('device_verified');
        localStorage.removeItem('admin_token');
        alert("Your session has been revoked by an administrator.");
        window.location.replace('auth.html');
      }
    } catch (e) {
      console.error("Security check failed:", e);
    }
  }, 5000); // Check every 5 seconds for fast revoke response

  // ─── FINANCING CLIENTS ──────────────────────────────────────────
  const drawFinancingTable = () => {
    const tbody = document.getElementById('financing-table-body');
    if (!tbody) return;
    const clients = window.financingClientsCache || [];
    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-24 text-center text-gray-500">No financed clients yet.</td></tr>';
      return;
    }
    
    tbody.innerHTML = clients.map(c => {
      const mailto = `mailto:${c.email}?subject=CapamulCars%20-%20Payment%20Reminder&body=Hi%20${encodeURIComponent(c.fullName)},%0D%0A%0D%0AThis%20is%20a%20friendly%20reminder%20for%20your%20upcoming%20monthly%20payment%20of%20PHP%20${c.monthlyPayment.toLocaleString()}%20for%20the%20${encodeURIComponent(c.carName)}.%0D%0A%0D%0AThank%20you!`;
      const pct = c.termMonths > 0 ? Math.min(100, Math.round((c.monthsPaid / c.termMonths) * 100)) : 0;
      
      return `
        <tr class="hover:bg-gray-50/50 transition-colors">
          <td class="px-6 py-4">
            <div class="font-bold text-gray-900">${c.fullName}</div>
            <div class="text-xs text-gray-500">${c.contactNumber} | ${c.email}</div>
          </td>
          <td class="px-6 py-4"><div class="font-medium text-gray-900">${c.carName}</div></td>
          <td class="px-6 py-4">
            <div class="font-bold text-red-600">PHP ${Number(c.monthlyPayment).toLocaleString()} / mo</div>
            <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5 mb-1.5">DP: PHP ${Number(c.downpayment).toLocaleString()}</div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 mb-1">
              <div class="bg-primary h-1.5 rounded-full" style="width: ${pct}%"></div>
            </div>
            <div class="text-[9px] text-gray-500 uppercase font-bold tracking-wider text-right">${c.monthsPaid} / ${c.termMonths} Paid</div>
          </td>
          <td class="px-6 py-4">
            <select onchange="window.updateFinancingStatus('${c.id}', this.value)" class="text-xs font-bold border rounded px-2 py-1 outline-none ${c.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}">
              <option value="Active" ${c.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Completed" ${c.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Defaulted" ${c.status === 'Defaulted' ? 'selected' : ''}>Defaulted</option>
            </select>
          </td>
          <td class="px-6 py-4 text-right space-x-1">
            <button onclick="window.openLedger('${c.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-bold transition" title="Payment Schedule">
              <i data-lucide="calendar-days" class="h-3 w-3"></i> Payments
            </button>
            <a href="${mailto}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition">
              <i data-lucide="mail" class="h-3 w-3"></i> Remind
            </a>
          </td>
        </tr>
      `;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  };

  const renderFinancingClients = async () => {
    const tbody = document.getElementById('financing-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="py-24 text-center text-gray-500">Loading...</td></tr>';
    try {
      const clients = await window.api.getFinancedClients();
      window.financingClientsCache = clients;
      drawFinancingTable();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-24 text-center text-red-500">Failed to load clients.</td></tr>';
    }
  };

  window.openLedger = (clientId) => {
    const client = (window.financingClientsCache || []).find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('ledger-client-name').innerText = client.fullName + ' - ' + client.carName;
    const modal = document.getElementById('payment-ledger-modal');
    const tbody = document.getElementById('ledger-table-body');
    
    // Calculate the schedule
    const startDate = new Date(client.createdAt);
    const history = client.paymentHistory || [];
    
    let html = '';
    for (let i = 1; i <= client.termMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isPaid = history.includes(i);
      
      const dueStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      let statusHtml, actionHtml;
      if (isPaid) {
        statusHtml = '<span class="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded">Paid</span>';
        actionHtml = `<button onclick="window.toggleLedgerPayment('${client.id}', ${i}, false)" class="text-xs font-bold text-red-500 hover:text-red-700 hover:underline">Cancel</button>`;
      } else {
        statusHtml = '<span class="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded">Pending</span>';
        actionHtml = `<button onclick="window.toggleLedgerPayment('${client.id}', ${i}, true)" class="px-3 py-1 bg-primary text-white text-xs font-bold rounded hover:opacity-90 transition">Mark Paid</button>`;
      }
      
      html += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4 font-bold text-gray-900">Month ${i}</td>
          <td class="px-6 py-4 text-gray-600">${dueStr}</td>
          <td class="px-6 py-4">${statusHtml}</td>
          <td class="px-6 py-4 text-right">${actionHtml}</td>
        </tr>
      `;
    }
    
    tbody.innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
  };

  window.toggleLedgerPayment = async (clientId, monthNum, markingPaid) => {
    const client = (window.financingClientsCache || []).find(c => c.id === clientId);
    if (!client) return;
    
    // Get button element if it exists in the modal to show a loading state
    const btn = event?.currentTarget;
    if (btn) btn.innerHTML = '...';
    
    let history = [...(client.paymentHistory || [])];
    if (markingPaid) {
      if (!history.includes(monthNum)) history.push(monthNum);
    } else {
      history = history.filter(m => m !== monthNum);
    }
    history.sort((a,b) => a-b);
    
    // Update local cache instantly
    client.paymentHistory = history;
    client.monthsPaid = history.length;
    
    // Save to DB first to prevent race condition with table re-fetch
    await window.api.toggleFinancingPayment(clientId, history, client.termMonths);
    
    // Re-render modal and table with fresh data instantly from cache
    window.openLedger(clientId);
    drawFinancingTable();
  };

  window.updateFinancingStatus = async (id, status) => {
    await window.api.updateFinancedClientStatus(id, status);
    renderFinancingClients();
  };

  const ledgerModalBtn = document.getElementById('close-ledger-modal-btn');
  if (ledgerModalBtn) {
    ledgerModalBtn.addEventListener('click', () => {
      document.getElementById('payment-ledger-modal').style.display = 'none';
      document.getElementById('payment-ledger-modal').classList.add('hidden');
    });
  }

  const addFinancingModal = document.getElementById('add-financing-modal');
  const addFinancingForm = document.getElementById('add-financing-form');
  const fcCarSelect = document.getElementById('fc-car');

  if (document.getElementById('open-add-financing-btn')) {
    document.getElementById('open-add-financing-btn').addEventListener('click', async () => {
      addFinancingModal.style.display = 'flex';
      addFinancingModal.classList.remove('hidden');
      const cars = await window.api.getCars();
      const available = cars.filter(c => c.status === 'Available' || c.status === 'Reserved');
      fcCarSelect.innerHTML = '<option value="">— Select Vehicle —</option>' + available.map(c => `<option value="${c.id}">${c.name} (PHP ${c.price.toLocaleString()})</option>`).join('');
    });
  }
  const closeFinancingModal = () => { 
    if(addFinancingModal) {
      addFinancingModal.style.display = 'none'; 
      addFinancingModal.classList.add('hidden');
    }
    if(addFinancingForm) addFinancingForm.reset(); 
  };
  if (document.getElementById('close-financing-modal-btn')) {
    document.getElementById('close-financing-modal-btn').addEventListener('click', closeFinancingModal);
  }
  if (document.getElementById('cancel-financing-btn')) {
    document.getElementById('cancel-financing-btn').addEventListener('click', closeFinancingModal);
  }

  if (addFinancingForm) {
    addFinancingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = addFinancingForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Saving...';
      
      const selectedOption = fcCarSelect.options[fcCarSelect.selectedIndex];
      const carName = selectedOption.text.split(' (PHP')[0];

      const data = {
        fullName: document.getElementById('fc-name').value.trim(),
        contactNumber: document.getElementById('fc-phone').value.trim(),
        email: document.getElementById('fc-email').value.trim(),
        address: document.getElementById('fc-address').value.trim(),
        carId: fcCarSelect.value,
        carName: carName,
        downpayment: Number(document.getElementById('fc-dp').value),
        monthlyPayment: Number(document.getElementById('fc-monthly').value),
        termMonths: Number(document.getElementById('fc-term').value)
      };

      const res = await window.api.addFinancedClient(data);
      btn.disabled = false;
      btn.innerHTML = originalText;

      if (res.success) {
        closeFinancingModal();
        renderFinancingClients();
        renderInventory(); // Update inventory since car is now Sold
      } else {
        alert('Failed to save client: ' + (res.error?.message || 'Unknown error'));
      }
    });
  }

  // Attach hero image preview listener
  const heroUploadEl = document.getElementById('cms-hero-img-upload');
  if (heroUploadEl) {
    heroUploadEl.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('cms-hero-img-preview');
          if (preview) preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ─── STAFF ACCOUNTS (RBAC UI) ──────────────────────────────
  const renderStaffAccounts = async () => {
    if (!window.api) return;
    const settings = await window.api.getSettingsData() || {};
    window.staffAccounts = settings.staffAccounts || [];

    const tbody = document.getElementById('staff-table-body');
    const countEl = document.getElementById('staff-count');
    if (!tbody) return;

    if (countEl) countEl.innerText = window.staffAccounts.length;

    if (window.staffAccounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">No staff accounts found.</td></tr>';
      return;
    }

    tbody.innerHTML = window.staffAccounts.map((staff, idx) => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">
          <div class="font-semibold text-gray-900">${staff.name}</div>
        </td>
        <td class="px-6 py-4 text-gray-600">${staff.email}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
            ${staff.role === 'Encoder' ? 'bg-blue-50 text-blue-700' : 
              staff.role === 'Accountant' ? 'bg-purple-50 text-purple-700' : 
              'bg-amber-50 text-amber-700'}">
            ${staff.role}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button onclick="window.deleteStaffAccount(${idx})" class="text-gray-400 hover:text-red-600 transition-colors" title="Delete Account">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  };

  window.addStaffAccount = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Creating...';

    const newStaff = {
      name: document.getElementById('staff-name').value.trim(),
      email: document.getElementById('staff-email').value.trim(),
      password: document.getElementById('staff-password').value,
      role: document.getElementById('staff-role').value
    };

    let settings = await window.api.getSettingsData();
    if (!settings) settings = {};
    if (!settings.staffAccounts) settings.staffAccounts = [];
    
    settings.staffAccounts.push(newStaff);

    const res = await window.api.updateSettingsData(settings);
    btn.disabled = false;
    btn.innerText = originalText;

    if (res.success) {
      e.target.reset();
      renderStaffAccounts();
    } else {
      alert('Failed to create account.');
    }
  };

  window.deleteStaffAccount = async (idx) => {
    if (!confirm('Are you sure you want to delete this staff account?')) return;
    
    let settings = await window.api.getSettingsData();
    if (!settings || !settings.staffAccounts) return;

    settings.staffAccounts.splice(idx, 1);
    
    const res = await window.api.updateSettingsData(settings);
    if (res.success) {
      renderStaffAccounts();
    } else {
      alert('Failed to delete account.');
    }
  };

  // ─── TRANSACTIONS (MOCK REALTIME) ───────────────────────────
  window.renderTransactions = async () => {
    if (!window.api) return;
    window.transactions = await window.api.getTransactions() || [];

    const searchStr = (document.getElementById('trans-search')?.value || '').toLowerCase();
    const paymentFilter = document.getElementById('trans-payment-filter')?.value || '';
    const statusFilter = document.getElementById('trans-status-filter')?.value || '';
    const dateFrom = document.getElementById('trans-date-from')?.value;
    const dateTo = document.getElementById('trans-date-to')?.value;

    let filtered = window.transactions.filter(t => {
      const customerName = t.customer_name || '';
      const carNumber = t.car_number || '';
      const plateNo = t.plate_number || '';
      
      const matchSearch = customerName.toLowerCase().includes(searchStr) || carNumber.toLowerCase().includes(searchStr) || plateNo.toLowerCase().includes(searchStr);
      const matchPayment = paymentFilter ? t.payment_method === paymentFilter : true;
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      
      let matchDate = true;
      if (dateFrom || dateTo) {
        const tDate = t.created_at ? new Date(t.created_at) : (t.date ? new Date(t.date) : null);
        if (tDate) {
          tDate.setHours(0,0,0,0);
          if (dateFrom) {
            const fDate = new Date(dateFrom);
            fDate.setHours(0,0,0,0);
            if (tDate < fDate) matchDate = false;
          }
          if (dateTo) {
            const tDateObj = new Date(dateTo);
            tDateObj.setHours(0,0,0,0);
            if (tDate > tDateObj) matchDate = false;
          }
        }
      }

      return matchSearch && matchPayment && matchStatus && matchDate;
    });
    
    window.currentFilteredTransactions = filtered;

    // Stat Cards
    const total = window.transactions.length;
    const cashCount = window.transactions.filter(t => t.payment_method === 'Cash').length;
    const instCount = window.transactions.filter(t => t.payment_method === 'Installment').length;
    const pendingCount = window.transactions.filter(t => ['Pending', 'Processing'].includes(t.status)).length;
    const completedCount = window.transactions.filter(t => t.status === 'Completed').length;
    
    let totalSales = 0;
    window.transactions.forEach(t => {
      const car = (window.cars || []).find(c => c.id == t.car_id);
      const sellingPrice = t.selling_price || (car ? car.price : 0);
      if (t.status === 'Completed' || t.status === 'Processing') {
        const price = Number(sellingPrice);
        if (!isNaN(price)) totalSales += price;
      }
    });

    const el = id => document.getElementById(id);
    if (el('trans-stat-total')) el('trans-stat-total').innerText = total;
    if (el('trans-stat-cash')) el('trans-stat-cash').innerText = cashCount;
    if (el('trans-stat-installment')) el('trans-stat-installment').innerText = completedCount;
    if (el('trans-stat-pending')) el('trans-stat-pending').innerText = pendingCount;
    if (el('trans-stat-completed')) el('trans-stat-completed').innerText = completedCount;
    if (el('trans-stat-sales')) el('trans-stat-sales').innerText = `₱ ${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    const tbody = el('trans-table-body');
    const pageInfo = el('trans-pagination-info');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="py-16 text-center text-gray-500 font-medium">No transactions found matching your criteria.</td></tr>';
      if (pageInfo) pageInfo.innerText = `Showing 0 entries`;
    } else {
      tbody.innerHTML = filtered.map((t) => {
        const car = (window.cars || []).find(c => c.id == t.car_id);
        const sellingPrice = t.selling_price || (car ? car.price : 0);
        const plateNumber = t.plate_number || (car ? car.plate_number : 'No Plate');
        let remainingBalance = t.remaining_balance || 0;
        if (t.payment_method === 'Installment' && !t.remaining_balance) {
           remainingBalance = Number(sellingPrice) - Number((t.down_payment || '').toString().replace(/,/g, '') || 0);
        }

        let statusBadge = '';
        if (t.status === 'Completed') statusBadge = '<span class="px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200 shadow-sm flex items-center gap-1 w-max"><div class="h-1.5 w-1.5 rounded-full bg-green-600"></div>Completed</span>';
        else if (t.status === 'Processing') statusBadge = '<span class="px-2.5 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm flex items-center gap-1 w-max"><div class="h-1.5 w-1.5 rounded-full bg-blue-600"></div>Processing</span>';
        else if (t.status === 'Pending') statusBadge = '<span class="px-2.5 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 shadow-sm flex items-center gap-1 w-max"><div class="h-1.5 w-1.5 rounded-full bg-amber-600"></div>Pending</span>';
        else statusBadge = '<span class="px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200 shadow-sm flex items-center gap-1 w-max"><div class="h-1.5 w-1.5 rounded-full bg-red-600"></div>Cancelled</span>';

        const pTypeBadge = t.payment_method === 'Cash' 
          ? '<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Cash</span>'
          : '<span class="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">Installment</span>';

        let displayDate = t.date;
        if (!displayDate && t.created_at) {
          displayDate = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        
        const priceFmt = '₱ ' + Number(sellingPrice).toLocaleString(undefined, {minimumFractionDigits: 2});
        const amountPaid = t.amount_paid || t.down_payment || 0;
        let downBalanceFmt = '-';
        if (t.payment_method === 'Installment') {
          downBalanceFmt = `<div class="text-[11px]"><span class="text-gray-500">DP:</span> <span class="font-bold text-gray-900">₱${Number(t.down_payment || 0).toLocaleString()}</span></div>
                            <div class="text-[11px]"><span class="text-gray-500">Bal:</span> <span class="font-bold text-red-600">₱${remainingBalance.toLocaleString()}</span></div>`;
        } else {
          const paidAmt = Number(amountPaid);
          downBalanceFmt = `<div class="text-xs font-bold text-green-600">₱ ${paidAmt.toLocaleString()}</div><div class="text-[10px] text-gray-400">Amount Paid</div>`;
        }

        return `
          <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <td class="px-6 py-4 font-mono text-xs text-gray-500">#${(t.id || '').substring(0,8)}</td>
            <td class="px-6 py-4">
              <div class="font-bold text-gray-900 text-sm">${t.customer_name || 'Unknown'}</div>
              <div class="text-xs text-gray-500">${t.customer_phone || ''}</div>
            </td>
            <td class="px-6 py-4">
              <div class="font-bold text-gray-900 text-sm">${t.car_number || ''}</div>
              <div class="text-xs text-gray-500 font-mono">${t.plate_number || 'No Plate'}</div>
            </td>
            <td class="px-6 py-4">${pTypeBadge}</td>
            <td class="px-6 py-4 font-bold text-gray-900 text-sm">${priceFmt}</td>
            <td class="px-6 py-4">${downBalanceFmt}</td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${displayDate || ''}</td>
            <td class="px-6 py-4 text-center">
              <div class="flex items-center justify-center gap-2">
                <button onclick="window.viewTransaction('${t.id}')" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-1">
                  <i data-lucide="eye" class="h-3.5 w-3.5"></i> View
                </button>
                <button onclick="window.deleteTransaction('${t.id}')" class="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Delete Transaction">
                  <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      if (pageInfo) pageInfo.innerText = `Showing 1 to ${filtered.length} of ${total} entries`;
      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.exportTransactionsCSV = () => {
    const data = window.currentFilteredTransactions || [];
    if (data.length === 0) {
      alert("No transactions to export.");
      return;
    }
    
    // We generate an HTML table and export it as .xls to force Excel to auto-expand columns and preserve formatting natively.
    let tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th style="background-color: #f3f4f6; font-weight: bold;">ID</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Customer Name</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Customer Phone</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Car Number</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Payment Type</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Selling Price</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Down Payment</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Remaining Balance</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Status</th>
              <th style="background-color: #f3f4f6; font-weight: bold;">Date</th>
            </tr>
          </thead>
          <tbody>`;

    let counter = 1;
    data.forEach(t => {
      const car = (window.cars || []).find(c => c.id == t.car_id);
      const sellingPrice = t.selling_price || (car ? car.price : 0);
      let remainingBalance = t.remaining_balance || 0;
      let downPayment = t.down_payment || 0;

      if (t.payment_method === 'Cash') {
         downPayment = '-';
         remainingBalance = '-';
      } else if (t.payment_method === 'Installment' && !t.remaining_balance) {
         remainingBalance = Number(sellingPrice) - Number((t.down_payment || '').toString().replace(/,/g, '') || 0);
      }

      let displayDate = t.date || '';
      if (!displayDate && t.created_at) {
        displayDate = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      const formattedId = String(counter).padStart(4, '0');
      
      tableHtml += `
        <tr>
          <td style="text-align: center;">${formattedId}</td>
          <td>${t.customer_name || ''}</td>
          <td style="mso-number-format:'\\@';">${t.customer_phone || ''}</td>
          <td>${t.car_number || ''}</td>
          <td>${t.payment_method || 'Cash'}</td>
          <td style="text-align: right;">${Number(sellingPrice).toLocaleString()}</td>
          <td style="text-align: right;">${t.payment_method === 'Cash' ? '-' : Number(downPayment).toLocaleString()}</td>
          <td style="text-align: right;">${t.payment_method === 'Cash' ? '-' : Number(remainingBalance).toLocaleString()}</td>
          <td>${t.status || ''}</td>
          <td>${displayDate}</td>
        </tr>`;
        
      counter++;
    });
    
    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions_export.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  window.deleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this transaction? This cannot be undone.')) return;
    
    const btn = event.currentTarget;
    const origHtml = btn.innerHTML;
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin text-gray-400"></i>';

    const res = await window.api.deleteTransaction(id);
    if (!res.success) {
      alert('Error deleting transaction');
      if (btn) btn.innerHTML = origHtml;
      if (window.lucide) window.lucide.createIcons();
    } else {
      window.renderTransactions();
    }
  };

  let currentTransStep = 1;
  const maxTransStep = 4;
  let transSelectedCarData = null;

  window.openTransactionModal = async () => {
    document.getElementById('add-transaction-form').reset();
    document.getElementById('add-transaction-modal').classList.remove('hidden');
    document.getElementById('trans-car').value = '';
    transSelectedCarData = null;
    currentTransStep = 1;
    
    // reset UI
    document.getElementById('trans-plate').value = '';
    document.getElementById('trans-price').value = '';
    
    window.updateTransStepUI();
    window.togglePaymentTypeUI();

    const dropdown = document.getElementById('trans-car-dropdown');
    const searchInput = document.getElementById('trans-car-search');
    
    if (dropdown && searchInput) {
      dropdown.innerHTML = '<div class="p-4 text-sm text-gray-500 text-center">Loading available cars...</div>';
      searchInput.value = '';
      
      const cars = await window.api.getCars();
      window.currentAvailableCars = cars.filter(c => (c.status || '').toLowerCase() !== 'sold');
      window.filterTransCars('');
    }
  };

  window.closeTransactionModal = () => {
    document.getElementById('add-transaction-modal').classList.add('hidden');
  };

  window.filterTransCars = (query) => {
    const dropdown = document.getElementById('trans-car-dropdown');
    if (!dropdown) return;
    
    const q = (query || '').toLowerCase();
    const filtered = window.currentAvailableCars.filter(c => 
      (c.make || '').toLowerCase().includes(q) || 
      (c.model || '').toLowerCase().includes(q) ||
      (c.year && c.year.toString().includes(q)) ||
      (c.plate_number || '').toLowerCase().includes(q)
    );
    
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="p-4 text-sm text-gray-500 text-center">No cars found matching your search.</div>';
    } else {
      dropdown.innerHTML = filtered.map(c => {
        const displayText = `${c.year} ${c.make} ${c.model} - ₱${Number(c.price).toLocaleString()}`;
        const imgUrl = (c.images && c.images.length > 0) ? c.images[0] : 'https://placehold.co/100x75?text=No+Image';
        return `
          <div class="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors" onclick="window.selectTransCar('${c.id}')">
            <img src="${imgUrl}" class="w-12 h-9 object-cover rounded shadow-sm" alt="Car thumbnail">
            <div>
              <div class="text-sm font-bold text-gray-900">${c.year} ${c.make} ${c.model}</div>
              <div class="text-[10px] text-gray-500 font-mono mb-0.5">${c.plate_number || 'No Plate'}</div>
              <div class="text-xs text-blue-600 font-semibold">₱${Number(c.price).toLocaleString()}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  };

  window.selectTransCar = (id) => {
    const c = window.currentAvailableCars.find(x => x.id === id);
    if (!c) return;
    transSelectedCarData = c;
    document.getElementById('trans-car').value = id;
    document.getElementById('trans-car-search').value = `${c.year} ${c.make} ${c.model}`;
    document.getElementById('trans-plate').value = c.plate_number || 'No Plate';
    document.getElementById('trans-price').value = Number(c.price).toLocaleString();
    
    // Copy price over to payment fields
    document.getElementById('trans-cash-price').value = Number(c.price).toLocaleString();
    document.getElementById('trans-inst-price').value = Number(c.price).toLocaleString();
    
    document.getElementById('trans-car-dropdown').classList.add('hidden');
    window.calcCash();
    window.calcInstallment();
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('trans-car-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      const dropdown = document.getElementById('trans-car-dropdown');
      if (dropdown) dropdown.classList.add('hidden');
    }
  });

  window.togglePaymentTypeUI = () => {
    const type = document.querySelector('input[name="payment_type"]:checked').value;
    if (type === 'Cash') {
      document.getElementById('trans-cash-fields').classList.remove('hidden');
      document.getElementById('trans-installment-fields').classList.add('hidden');
    } else {
      document.getElementById('trans-cash-fields').classList.add('hidden');
      document.getElementById('trans-installment-fields').classList.remove('hidden');
    }
  };

  window.calcCash = () => {
    if (!transSelectedCarData) return;
    const price = Number(transSelectedCarData.price || 0);
    const disc = Number(document.getElementById('trans-discount').value || 0);
    const paid = Number(document.getElementById('trans-amount-paid').value || 0);
    
    const totalToPay = price - disc;
    const change = paid - totalToPay;
    
    document.getElementById('trans-change').value = change >= 0 ? change.toLocaleString() : 'Insufficient';
  };

  window.calcInstallment = () => {
    if (!transSelectedCarData) return;
    const price = Number(transSelectedCarData.price || 0);
    const dp = Number(document.getElementById('trans-downpayment').value || 0);
    
    const bal = price - dp;
    document.getElementById('trans-balance').value = bal > 0 ? bal.toLocaleString() : '0';
    
    const term = Number(document.getElementById('trans-loan-term').value || 12);
    // Simple mock calculation: flat 10% interest total over the term
    const interest = bal * 0.10;
    const monthly = bal > 0 ? (bal + interest) / term : 0;
    
    document.getElementById('trans-monthly').value = monthly > 0 ? monthly.toLocaleString(undefined, {maximumFractionDigits:2}) : '0';
  };

  window.updateTransStepUI = () => {
    for (let i = 1; i <= maxTransStep; i++) {
      document.getElementById(`trans-step-${i}`).classList.add('hidden');
      const ind = document.getElementById(`step-indicator-${i}`);
      if (!ind) continue;
      if (i < currentTransStep) {
        ind.className = 'h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold transition-colors';
        ind.innerHTML = '<i data-lucide="check" class="h-4 w-4"></i>';
      } else if (i === currentTransStep) {
        ind.className = 'h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold transition-colors shadow-lg shadow-blue-600/30';
        ind.innerHTML = i;
      } else {
        ind.className = 'h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold transition-colors';
        ind.innerHTML = i;
      }
    }
    document.getElementById(`trans-step-${currentTransStep}`).classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    // Titles
    const titles = ["Customer Info", "Vehicle Selection", "Payment Details", "Review & Save"];
    document.getElementById('step-title').innerText = titles[currentTransStep - 1];

    // Buttons
    document.getElementById('trans-btn-back').classList.toggle('hidden', currentTransStep === 1);
    document.getElementById('trans-btn-next').classList.toggle('hidden', currentTransStep === maxTransStep);
    document.getElementById('trans-btn-save').classList.toggle('hidden', currentTransStep !== maxTransStep);
    
    // Auto-update review on step 4
    if (currentTransStep === 4) window.populateTransReview();
  };

  window.transNextStep = () => {
    // Basic validation
    if (currentTransStep === 1) {
      if(!document.getElementById('trans-name').value || !document.getElementById('trans-phone').value || !document.getElementById('trans-address').value) {
        return alert("Please fill all required customer fields.");
      }
    }
    if (currentTransStep === 2) {
      if(!document.getElementById('trans-car').value) return alert("Please select a vehicle.");
    }
    if (currentTransStep === 3) {
      const type = document.querySelector('input[name="payment_type"]:checked');
      const typeVal = type ? type.value : 'Cash';
      if (typeVal === 'Cash') {
        const amt = document.getElementById('trans-amount-paid').value;
        if(!amt) {
          return alert("Please enter the Down Payment / Amount Paid.");
        }
        if (document.getElementById('trans-change').value === 'Insufficient') {
          return alert("Amount paid is insufficient.");
        }
      } else {
        const dpEl = document.getElementById('trans-downpayment');
        const finEl = document.getElementById('trans-finance-co');
        if(!(dpEl && dpEl.value) || !(finEl && finEl.value)) {
          return alert("Please enter Down Payment and Financing Company.");
        }
      }
    }
    
    if (currentTransStep < maxTransStep) {
      currentTransStep++;
      window.updateTransStepUI();
    }
  };

  window.transPrevStep = () => {
    if (currentTransStep > 1) {
      currentTransStep--;
      window.updateTransStepUI();
    }
  };

  window.populateTransReview = () => {
    const cName = document.getElementById('trans-name').value;
    const cPhone = document.getElementById('trans-phone').value;
    const cEmail = document.getElementById('trans-email') ? document.getElementById('trans-email').value : '';
    document.getElementById('rev-customer').innerText = cName + ' (' + cPhone + ')' + (cEmail ? ' - ' + cEmail : '');
    document.getElementById('rev-vehicle').innerText = document.getElementById('trans-car-search').value + ' [' + document.getElementById('trans-plate').value + ']';
    
    const type = document.querySelector('input[name="payment_type"]:checked').value;
    document.getElementById('rev-type').innerText = type;
    document.getElementById('rev-price').innerText = '₱ ' + document.getElementById('trans-price').value;
    
    if (type === 'Cash') {
      document.getElementById('rev-cash-block').classList.remove('hidden');
      document.getElementById('rev-inst-block').classList.add('hidden');
      
      document.getElementById('rev-paid').innerText = '₱ ' + Number(document.getElementById('trans-amount-paid').value).toLocaleString();
      document.getElementById('rev-or').innerText = document.getElementById('trans-or-number').value;
      document.getElementById('rev-status').innerText = 'Completed';
      document.getElementById('rev-status').className = 'text-sm font-bold px-2 py-0.5 rounded bg-green-100 text-green-700';
    } else {
      document.getElementById('rev-cash-block').classList.add('hidden');
      document.getElementById('rev-inst-block').classList.remove('hidden');
      
      document.getElementById('rev-dp').innerText = '₱ ' + Number(document.getElementById('trans-downpayment').value).toLocaleString();
      document.getElementById('rev-bal').innerText = '₱ ' + document.getElementById('trans-balance').value;
      document.getElementById('rev-monthly').innerText = '₱ ' + document.getElementById('trans-monthly').value + ' (' + document.getElementById('trans-loan-term').value + ' mos)';
      document.getElementById('rev-finance').innerText = document.getElementById('trans-finance-co').value;
      
      const st = document.getElementById('trans-finance-status').value;
      document.getElementById('rev-status').innerText = st;
      if (st === 'Completed') document.getElementById('rev-status').className = 'text-sm font-bold px-2 py-0.5 rounded bg-green-100 text-green-700';
      else if (st === 'Processing') document.getElementById('rev-status').className = 'text-sm font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700';
      else document.getElementById('rev-status').className = 'text-sm font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700';
    }
  };

  window.submitTransaction = async () => {
    const btn = document.getElementById('trans-btn-save');
    const carId = document.getElementById('trans-car').value;

    if (!carId) {
      alert("Please select a vehicle from the list.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> Saving...';
    if (window.lucide) window.lucide.createIcons();

    // Always Cash now — type determined by hidden radio
    const typeEl = document.querySelector('input[name="payment_type"]:checked');
    const type = typeEl ? typeEl.value : 'Cash';
    
    const customerEmail = document.getElementById('trans-email') ? document.getElementById('trans-email').value.trim() : '';
    const carPrice = transSelectedCarData ? Number(transSelectedCarData.price || 0) : 0;
    const discountVal = Number(document.getElementById('trans-discount')?.value || 0);
    const amtPaid = Number(document.getElementById('trans-amount-paid')?.value || 0);
    const orNumber = document.getElementById('trans-or-number')?.value?.trim() || '';
    const plateNo = document.getElementById('trans-plate')?.value || '';
    const carName = document.getElementById('trans-car-search')?.value || '';

    const newTrans = {
      customer_name: document.getElementById('trans-name').value.trim(),
      customer_phone: document.getElementById('trans-phone').value.trim(),
      address: document.getElementById('trans-address').value.trim(),
      payment_method: 'Cash',
      car_id: carId,
      car_number: carName,
      down_payment: amtPaid,
      status: 'Completed'
    };

    // Also build the full payload with extended fields
    const newTransFull = {
      ...newTrans,
      plate_number: plateNo,
      selling_price: carPrice,
      discount: discountVal,
      amount_paid: amtPaid,
      or_number: orNumber,
      remaining_balance: 0
    };

    // Auto-mark the selected car as Sold
    if (carId) {
      await window.api.updateCar(carId, { status: 'Sold' });
    }

    // Try full payload first; if Supabase rejects unknown columns, fall back to minimal
    let res = await window.api.addTransaction(newTransFull);
    if (!res.success) {
      // Fallback: save with only the original safe columns
      res = await window.api.addTransaction(newTrans);
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" class="h-4 w-4"></i> Save Transaction';
    if (window.lucide) window.lucide.createIcons();

    if (res.success) {
      // Send email to customer if email provided
      if (customerEmail) {
        try {
          const siteOrigin = window.location.origin;
          const customerName = newTrans.customer_name;
          const emailHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333; background-color: #f4f4f5; padding: 40px 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; background-color: #111111; padding: 30px 20px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">
        CAPAMUL <span style="color: #9f1c1c;">CARS</span>
      </h2>
    </div>
    <div style="padding: 40px 30px;">
      <h1 style="font-size: 22px; color: #111; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
        Thank You for Your Purchase!
      </h1>
      <p style="margin-bottom: 20px;">Dear <strong>${customerName || 'Valued Customer'}</strong>,</p>
      <p style="margin-bottom: 25px;">Congratulations on your successful purchase of the <strong>${carName || 'vehicle'}</strong>! We sincerely appreciate your business and trust in Capamul Cars.</p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">Transaction Summary</h3>
        <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
          <li><strong>Vehicle:</strong> ${carName}</li>
          <li><strong>Amount Paid:</strong> ₱ ${amtPaid.toLocaleString()}</li>
          ${orNumber ? `<li><strong>O.R. Number:</strong> ${orNumber}</li>` : ''}
        </ul>
      </div>
      <div style="background-color: #f8f9fa; border-left: 4px solid #9f1c1c; padding: 20px; margin-bottom: 30px; border-radius: 0 6px 6px 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #111;">Leave a Review</h3>
        <p style="margin: 0; color: #555; font-size: 14px; margin-bottom: 15px;">
          Your feedback is incredibly valuable to us and to future customers. Please take a brief moment to share your experience!
        </p>
        <div style="text-align: left;">
          <a href="${siteOrigin}/reviews.html" style="background-color: #9f1c1c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Leave Feedback</a>
        </div>
      </div>
      <p style="margin-bottom: 30px; color: #555;">If you have any questions, please do not hesitate to contact us.</p>
      <p style="margin: 0; font-weight: 600; color: #111;">Safe driving and warm regards,</p>
      <p style="margin: 5px 0 0 0; color: #666;">The Capamul Cars Team</p>
    </div>
    <div style="background-color: #f8f9fa; border-top: 1px solid #eeeeee; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        Capamul Cars 2.0 &bull; Purok 2, Dapdap Barobo Surigao Del Sur<br>
        <a href="mailto:capamulcar2@gmail.com" style="color: #9f1c1c; text-decoration: none;">capamulcar2@gmail.com</a>
      </p>
    </div>
  </div>
</div>`;
          const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: 'service_dgu0d2n',
              template_id: 'template_xzcf7bn',
              user_id: '8bYgrl4zv7OqxBU8a',
              template_params: {
                to_email: customerEmail,
                subject: `Thank You for Your Purchase! - ${carName}`,
                html_message: emailHtml
              }
            })
          });
          if (!emailRes.ok) {
            console.warn('Transaction email failed:', await emailRes.text());
          } else {
            console.log('Transaction confirmation email sent.');
          }
        } catch (e) {
          console.warn("Failed to send transaction email (non-fatal):", e.message);
        }
      }

      window.closeTransactionModal();
      window.renderTransactions();
      if (typeof window.renderInventory === 'function') window.renderInventory();
    } else {
      alert('Failed to save transaction.');
    }
  };

  window.viewTransaction = (id) => {
    const t = window.transactions.find(x => x.id === id);
    if (!t) return;
    
    const printArea = document.getElementById('print-transaction-area');

    const car = (window.cars || []).find(c => c.id == t.car_id);
    const sellingPrice = t.selling_price || (car ? car.price : 0);
    const plateNumber = t.plate_number || (car ? car.plate_number : 'No Plate');
    let remainingBalance = t.remaining_balance || 0;
    if (t.payment_method === 'Installment' && !t.remaining_balance) {
       remainingBalance = Number(sellingPrice) - Number((t.down_payment || '').toString().replace(/,/g, '') || 0);
    }
    
    let displayDate = t.date;
    if (!displayDate && t.created_at) {
      displayDate = new Date(t.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    let statusBadge = '';
    if (t.status === 'Completed') statusBadge = '<span class="px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200 uppercase tracking-wider">Completed</span>';
    else if (t.status === 'Processing') statusBadge = '<span class="px-2.5 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 uppercase tracking-wider">Processing</span>';
    else if (t.status === 'Pending') statusBadge = '<span class="px-2.5 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 uppercase tracking-wider">Pending</span>';
    else statusBadge = '<span class="px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200 uppercase tracking-wider">Cancelled</span>';

    const pTypeBadge = t.payment_method === 'Cash' 
          ? '<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Cash</span>'
          : '<span class="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">Installment</span>';

    let detailsHtml = '';
    if (t.payment_method === 'Cash') {
      detailsHtml = `
        <div class="grid grid-cols-2 gap-y-4 gap-x-8">
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Selling Price</div><div class="font-bold text-gray-900 text-lg">₱ ${Number(sellingPrice).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Discount</div><div class="font-bold text-gray-900 text-lg">₱ ${Number(t.discount || 0).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Amount Paid</div><div class="font-bold text-green-600 text-lg">₱ ${Number(t.amount_paid || 0).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">O.R. Number</div><div class="font-bold text-gray-900 text-lg">${t.or_number || 'N/A'}</div></div>
        </div>
      `;
    } else {
      detailsHtml = `
        <div class="grid grid-cols-2 gap-y-4 gap-x-8">
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Selling Price</div><div class="font-bold text-gray-900 text-lg">₱ ${Number(sellingPrice).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Down Payment</div><div class="font-bold text-green-600 text-lg">₱ ${Number(t.down_payment || 0).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Remaining Balance</div><div class="font-bold text-red-600 text-lg">₱ ${Number(remainingBalance).toLocaleString()}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Finance Company</div><div class="font-bold text-gray-900 text-lg">${t.finance_company || 'N/A'}</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Loan Term</div><div class="font-bold text-gray-900 text-lg">${t.loan_term || 0} Months</div></div>
          <div><div class="text-xs text-gray-500 font-semibold mb-1">Monthly Amortization</div><div class="font-bold text-purple-600 text-lg">₱ ${Number(t.monthly_amortization || 0).toLocaleString()}</div></div>
        </div>
      `;
    }

    printArea.innerHTML = `
      <div class="bg-white m-6 p-8 rounded-2xl shadow-sm border border-gray-200" id="receipt-content">
        <div class="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            <h1 class="text-2xl font-black text-gray-900 mb-1">TRANSACTION RECEIPT</h1>
            <p class="text-sm text-gray-500 font-mono">ID: #${t.id}</p>
          </div>
          <div class="text-right">
            <div class="mb-2">${statusBadge}</div>
            <p class="text-sm font-semibold text-gray-700">${displayDate}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8 mb-8">
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Details</h3>
            <p class="font-bold text-gray-900 text-lg mb-1">${t.customer_name || 'N/A'}</p>
            <p class="text-sm text-gray-600 mb-1"><i data-lucide="phone" class="h-3 w-3 inline mr-1"></i> ${t.customer_phone || 'N/A'}</p>
            <p class="text-sm text-gray-600"><i data-lucide="map-pin" class="h-3 w-3 inline mr-1"></i> ${t.address || 'N/A'}</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Vehicle Details</h3>
            <p class="font-bold text-gray-900 text-lg mb-1">${t.car_number || 'N/A'}</p>
            <p class="text-sm text-gray-600 font-mono mb-2">Plate: ${plateNumber}</p>
            <div>${pTypeBadge}</div>
          </div>
        </div>

        <div class="mb-4">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Payment Breakdown</h3>
          ${detailsHtml}
        </div>
      </div>
    `;

    document.getElementById('view-transaction-modal').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  };

  window.printTransaction = () => {
    const printContent = document.getElementById('receipt-content').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = '<div class="p-8">' + printContent + '</div>';
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Quick way to restore events and DOM state after print override
  };



  // ─── BOOTSTRAP: wait for api-ready then render everything ──
  const initAll = () => {
    // Only render the default active view on load to prevent database overload
    renderInventory();
    
    // Wait for a split second before fetching dashboard stats
    setTimeout(() => {
      if (typeof renderDashboard === 'function') renderDashboard();
    }, 500);
  };

  if (window.api) {
    initAll();
  } else {
    window.addEventListener('api-ready', initAll);
  }

}); // end DOMContentLoaded
