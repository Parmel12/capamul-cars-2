// ============================================================
//  CAPAMUL CARS – Data Layer (Supabase)
//  Database: Supabase (PostgreSQL REST API)
// ============================================================

const SUPABASE_URL    = 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
const SUPABASE_BUCKET = 'car-images';

// Make Supabase config globally available for admin.js image uploads
window.SUPABASE_URL    = SUPABASE_URL;
window.SUPABASE_ANON   = SUPABASE_ANON;
window.SUPABASE_BUCKET = SUPABASE_BUCKET;

// ── Base headers ──────────────────────────────────────────────
const BASE_HEADERS = {
  'apikey':        SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Content-Type':  'application/json',
};

// ── Low-level REST helpers ────────────────────────────────────
const sb = {
  async get(table, params = '') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`,
      { headers: BASE_HEADERS }
    );
    if (!res.ok) throw new Error(`[GET ${table}] ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async post(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[POST ${table}] ${res.status}: ${await res.text()}`);
    return res.json(); // returns array of inserted rows
  },

  async patch(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:  'PATCH',
      headers: { ...BASE_HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[PATCH ${table}] ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:  'DELETE',
      headers: BASE_HEADERS,
    });
    if (!res.ok) throw new Error(`[DELETE ${table}] ${res.status}: ${await res.text()}`);
    return true;
  },

  async upsert(table, data, onConflict = 'key') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: {
        ...BASE_HEADERS,
        'Prefer': `resolution=merge-duplicates,return=representation`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[UPSERT ${table}] ${res.status}: ${await res.text()}`);
    return res.json();
  },
};

// ── Public API ─────────────────────────────────────────────────
const api = {

  _carsPromise: null,
  _cmsPromise: null,

  _requireAdmin() {
    if (localStorage.getItem('admin_token') !== 'capamul_admin_session') {
      throw new Error('Unauthorized action: Admin privileges required.');
    }
  },

  // ── Cars ────────────────────────────────────────────────────
  async getCars(forceRefresh = false) {
    try {
      const CACHE_KEY = 'capamul_cache_cars';
      const cached = localStorage.getItem(CACHE_KEY);

      if (forceRefresh) this._carsPromise = null;

      if (!this._carsPromise) {
        this._carsPromise = sb.get('cars', 'select=*&order=created_at.desc').then(data => {
          const newDataStr = JSON.stringify(data);
          if (cached !== newDataStr) {
            localStorage.setItem(CACHE_KEY, newDataStr);
            // Optionally notify the app that fresh data arrived
            window.dispatchEvent(new CustomEvent('cars-updated'));
          }
          return data;
        }).catch(err => {
          console.error('getCars fetch error:', err);
          this._carsPromise = null;
          if (cached) return JSON.parse(cached);
          return [];
        });
      }

      if (cached && !forceRefresh) {
        return JSON.parse(cached);
      }

      return await this._carsPromise;
    } catch (err) {
      console.error('getCars outer error:', err);
      this._carsPromise = null;
      return [];
    }
  },

  async getFeaturedCars() {
    try {
      // Read featured IDs from CMS settings
      const cms = await this.getCMSData();
      const ids = (cms && cms.featured && Array.isArray(cms.featured)) ? cms.featured : [];
      if (ids.length > 0) {
        const all = await this.getCars();
        // Preserve admin-defined order, show available and reserved cars
        const byId = Object.fromEntries(all.map(c => [c.id, c]));
        const ordered = ids.map(id => byId[id]).filter(Boolean);
        return ordered.filter(c => ['available','reserved'].includes((c.status||'').toLowerCase())).slice(0, 10);
      }
      // Fallback: show first 6 available + reserved cars
      const all = await this.getCars();
      return all.filter(c => ['available','reserved'].includes((c.status||'').toLowerCase())).slice(0, 6);
    } catch (err) {
      console.error('getFeaturedCars:', err);
      return [];
    }
  },

  async getNewArrivals(limit = 6) {
    try {
      // Newest cars first (getCars already returns created_at DESC)
      const all = await this.getCars();
      return all.filter(c => ['available','reserved'].includes((c.status||'').toLowerCase())).slice(0, limit);
    } catch (err) {
      console.error('getNewArrivals:', err);
      return [];
    }
  },

  async getDiscountedCars(limit = 6) {
    try {
      const all = await this.getCars();
      return all
        .filter(c =>
          (c.status||'').toLowerCase() === 'available' &&
          c.original_price && Number(c.original_price) > Number(c.price)
        )
        .slice(0, limit);
    } catch (err) {
      console.error('getDiscountedCars:', err);
      return [];
    }
  },

  async getCarById(id) {
    try {
      const rows = await sb.get('cars', `select=*&id=eq.${id}&limit=1`);
      return rows[0] || null;
    } catch (err) {
      console.error('getCarById:', err);
      return null;
    }
  },

  async addCar(carData) {
    try {
      this._requireAdmin();
      const rows = await sb.post('cars', carData);
      this._carsPromise = null;
      localStorage.removeItem('capamul_cache_cars');
      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('addCar:', err);
      return { success: false, error: err };
    }
  },

  async updateCar(id, carData) {
    try {
      this._requireAdmin();
      await sb.patch('cars', id, carData);
      this._carsPromise = null;
      localStorage.removeItem('capamul_cache_cars');
      return { success: true };
    } catch (err) {
      console.error('updateCar:', err);
      return { success: false, error: err };
    }
  },

  async deleteCar(id) {
    try {
      this._requireAdmin();
      await sb.delete('cars', id);
      this._carsPromise = null;
      localStorage.removeItem('capamul_cache_cars');
      return { success: true };
    } catch (err) {
      console.error('deleteCar:', err);
      return { success: false, error: err };
    }
  },

  // ── Search ──────────────────────────────────────────────────
  async searchCars(query) {
    const cars = await this.getCars();
    if (!query) return cars;
    const q = query.toLowerCase();
    return cars.filter(c =>
      [c.name, c.make, c.model, c.body_type].some(f => (f||'').toLowerCase().includes(q))
    );
  },

  // ── Reservations ────────────────────────────────────────────
  async submitReservation(data) {
    try {
      const dbData = {
        car_id: data.carId,
        car_name: data.carName,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        customer_address: data.customerAddress,
        amount: data.amount,
        screenshot_url: data.screenshotUrl,
        is_waitlist: data.isWaitlist || false,
        status: 'Pending'
      };
      const rows = await sb.post('reservations', dbData);

      // Automatically mark the car as Reserved if it's the primary reservation
      if (!data.isWaitlist && data.carId) {
        await sb.patch('cars', data.carId, { status: 'Reserved' });
      }

      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('submitReservation:', err);
      return { success: false, error: err };
    }
  },

  async getReservations() {
    try {
      const rows = await sb.get('reservations', 'select=*&order=created_at.desc');
      return rows.map(r => ({
        id: r.id,
        carId: r.car_id,
        carName: r.car_name,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        customerAddress: r.customer_address,
        amount: r.amount,
        screenshotUrl: r.screenshot_url,
        isWaitlist: r.is_waitlist,
        status: r.status,
        created_at: r.created_at
      }));
    } catch (err) {
      console.error('getReservations:', err);
      return [];
    }
  },

  async deleteReservation(id) {
    try {
      this._requireAdmin();
      await sb.delete('reservations', id);
      return { success: true };
    } catch (err) {
      console.error('deleteReservation:', err);
      return { success: false, error: err };
    }
  },

  async updateReservationStatus(id, status, carId = null) {
    try {
      this._requireAdmin();
      await sb.patch('reservations', id, { status });

      // Sync car status if the reservation is declined or completed
      if (carId) {
        if (status === 'Declined' || status === 'Cancelled') {
          await sb.patch('cars', carId, { status: 'Available' });
        } else if (status === 'Approved') {
          await sb.patch('cars', carId, { status: 'Reserved' });
        } else if (status === 'Completed' || status === 'Closed') {
          await sb.patch('cars', carId, { status: 'Sold' });
        }
      }

      return { success: true };
    } catch (err) {
      console.error('updateReservationStatus:', err);
      return { success: false, error: err };
    }
  },

  async deleteReservation(id) {
    try {
      this._requireAdmin();
      await sb.delete('reservations', id);
      return { success: true };
    } catch (err) {
      console.error('deleteReservation:', err);
      return { success: false, error: err };
    }
  },

  // ── Leads ───────────────────────────────────────────────────
  async submitLead(data) {
    try {
      const rows = await sb.post('leads', { ...data, status: 'New' });
      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('submitLead:', err);
      return { success: false, error: err };
    }
  },

  async deleteLead(id) {
    try {
      await sb.delete('leads', id);
      return { success: true };
    } catch (err) {
      console.error('deleteLead:', err);
      return { success: false, error: err };
    }
  },

  async getLeads() {
    try {
      return await sb.get('leads', 'select=*&order=created_at.desc');
    } catch (err) {
      console.error('getLeads:', err);
      return [];
    }
  },

  async updateLeadStatus(id, status) {
    try {
      await sb.patch('leads', id, { status });
      return { success: true };
    } catch (err) {
      console.error('updateLeadStatus:', err);
      return { success: false, error: err };
    }
  },

  // ── Customers (derived from reservations + leads) ────────────
  async getCustomers() {
    try {
      const [reservations, leads] = await Promise.all([
        this.getReservations(),
        this.getLeads(),
      ]);

      const map = new Map();

      const process = (email, name, phone, type, amount, date, status) => {
        if (!email) return;
        const key = email.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name, email, phone, reservations: 0, purchases: 0, totalSpend: 0, lastActivity: date, status: 'Lead' });
        }
        const c = map.get(key);
        if (date > c.lastActivity) c.lastActivity = date;
        if (type === 'reservation') {
          c.reservations += 1;
          c.status = 'Active';
          if (['Approved', 'Confirmed', 'Completed'].includes(status)) {
            c.purchases   += 1;
            c.totalSpend  += (amount || 0);
            c.status       = 'Buyer';
          }
        }
      };

      reservations.forEach(r => {
        process(r.customer_email, r.customer_name, r.customer_phone, 'reservation', r.amount, new Date(r.created_at || 0), r.status);
      });
      leads.forEach(l => {
        process(l.email, l.name, l.phone, 'lead', 0, new Date(l.created_at || 0), l.status);
      });

      return Array.from(map.values()).sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (err) {
      console.error('getCustomers:', err);
      return [];
    }
  },

  // ── Settings / CMS ──────────────────────────────────────────
  async getCMSData() {
    try {
      if (!this._cmsPromise) {
        this._cmsPromise = sb.get('settings', 'select=value&key=eq.cms&limit=1').then(rows => rows[0]?.value || null);
      }
      return await this._cmsPromise;
    } catch (err) {
      console.error('getCMSData:', err);
      this._cmsPromise = null;
      return null;
    }
  },

  async updateCMSData(data) {
    try {
      this._requireAdmin();
      await sb.upsert('settings', { key: 'cms', value: data });
      this._cmsPromise = null; // Invalidate cache
      return { success: true };
    } catch (err) {
      console.error('updateCMSData:', err);
      return { success: false, error: err };
    }
  },

  async getVerifiedDevices() {
    try {
      const rows = await sb.get('settings', 'select=value&key=eq.devices&limit=1');
      return rows[0]?.value || [];
    } catch (err) {
      console.error('getVerifiedDevices:', err);
      return [];
    }
  },

  async updateVerifiedDevices(devicesList) {
    try {
      await sb.upsert('settings', { key: 'devices', value: devicesList });
      return { success: true };
    } catch (err) {
      console.error('updateVerifiedDevices:', err);
      return { success: false, error: err };
    }
  },

  async getSettingsData() {
    try {
      const rows = await sb.get('settings', 'select=value&key=eq.general&limit=1');
      return rows[0]?.value || null;
    } catch (err) {
      console.error('getSettingsData:', err);
      return null;
    }
  },

  async updateSettingsData(data) {
    try {
      this._requireAdmin();
      await sb.upsert('settings', { key: 'general', value: data });
      return { success: true };
    } catch (err) {
      console.error('updateSettingsData:', err);
      return { success: false, error: err };
    }
  },

  // ── Reviews ─────────────────────────────────────────────────
  async getReviews() {
    try {
      return await sb.get('reviews', 'select=*&order=created_at.desc');
    } catch (err) {
      return [];
    }
  },

  async addReview(reviewData) {
    try {
      // Allow adding reviews without admin role
      const rows = await sb.post('reviews', reviewData);
      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('addReview:', err);
      return { success: false, error: err };
    }
  },

  async deleteReview(id) {
    try {
      this._requireAdmin();
      await sb.delete('reviews', id);
      return { success: true };
    } catch (err) {
      console.error('deleteReview:', err);
      return { success: false, error: err };
    }
  },

  // ── Financing Clients ───────────────────────────────────────
  async getFinancedClients() {
    try {
      const rows = await sb.get('financed_clients', 'select=*&order=created_at.desc');
      return rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        address: r.address,
        contactNumber: r.contact_number,
        email: r.email,
        carId: r.car_id,
        carName: r.car_name,
        downpayment: r.downpayment,
        monthlyPayment: r.monthly_payment,
        termMonths: r.term_months || 0,
        monthsPaid: r.months_paid || 0,
        paymentHistory: r.payment_history || [],
        status: r.status,
        createdAt: r.created_at
      }));
    } catch (err) {
      console.error('getFinancedClients:', err);
      return [];
    }
  },

  async addFinancedClient(data) {
    try {
      this._requireAdmin();
      const dbData = {
        full_name: data.fullName,
        address: data.address,
        contact_number: data.contactNumber,
        email: data.email,
        car_id: data.carId,
        car_name: data.carName,
        downpayment: data.downpayment,
        monthly_payment: data.monthlyPayment,
        term_months: data.termMonths,
        months_paid: 0,
        payment_history: [],
        status: data.status || 'Active'
      };
      const rows = await sb.post('financed_clients', dbData);
      
      // Auto mark car as Sold if linked
      if (data.carId) {
        await sb.patch('cars', data.carId, { status: 'Sold' });
      }
      
      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('addFinancedClient:', err);
      return { success: false, error: err };
    }
  },

  async toggleFinancingPayment(id, newPaymentHistory, termMonths) {
    try {
      this._requireAdmin();
      const newPaid = newPaymentHistory.length;
      let status = 'Active';
      if (newPaid >= termMonths) status = 'Completed';
      
      await sb.patch('financed_clients', id, { 
        payment_history: newPaymentHistory, 
        months_paid: newPaid,
        status: status 
      });
      return { success: true };
    } catch (err) {
      console.error('toggleFinancingPayment:', err);
      return { success: false, error: err };
    }
  },

  async updateFinancedClientStatus(id, status) {
    try {
      this._requireAdmin();
      await sb.patch('financed_clients', id, { status });
      return { success: true };
    } catch (err) {
      console.error('updateFinancedClientStatus:', err);
      return { success: false, error: err };
    }
  },

  async deleteFinancedClient(id) {
    try {
      this._requireAdmin();
      await sb.delete('financed_clients', id);
      return { success: true };
    } catch (err) {
      console.error('deleteFinancedClient:', err);
      return { success: false, error: err };
    }
  },

  // ── Transactions (Supabase) ──────────────────────────────
  async getTransactions() {
    try {
      return await sb.get('transactions', 'select=*&order=created_at.desc');
    } catch (err) {
      console.error('getTransactions:', err);
      return [];
    }
  },

  async addTransaction(transactionData) {
    try {
      this._requireAdmin();
      const rows = await sb.post('transactions', transactionData);
      return { success: true, id: rows[0]?.id };
    } catch (err) {
      console.error('addTransaction:', err);
      return { success: false, error: err };
    }
  },

  async deleteTransaction(id) {
    try {
      this._requireAdmin();
      await sb.delete('transactions', id);
      return { success: true };
    } catch (err) {
      console.error('deleteTransaction:', err);
      return { success: false, error: err };
    }
  }
};

window.api = api;
window.dispatchEvent(new Event('api-ready'));
