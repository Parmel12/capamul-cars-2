import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Calculates Down Payment (DP) matching the Capamul Cars frontend rules.
 * If car.dp exists and > 0, returns car.dp.
 * Otherwise computes 15% of SRP rounded down to nearest 5,000 (Minimum PHP 50,000).
 */
export function computeDp(price, explicitDp) {
  if (explicitDp && Number(explicitDp) > 0) {
    return Number(explicitDp);
  }
  const v = Number(price ?? 0);
  if (isNaN(v) || v <= 0) return 50000;
  const raw = v * 0.15;
  const rounded = Math.floor(raw / 5000) * 5000;
  return Math.max(50000, rounded);
}

/**
 * Format currency to PHP standard string (e.g. ₱ 450,000)
 */
export function formatPhp(amount) {
  const v = Number(amount ?? 0);
  return '₱ ' + v.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

/**
 * Get all available & reserved cars from Supabase REST API
 */
export async function getAvailableCars() {
  try {
    const res = await axios.get(`${SUPABASE_URL}/rest/v1/cars?select=*&order=created_at.desc`, { headers });
    const data = res.data || [];

    // Filter out sold cars
    const activeCars = data.filter(c => 
      ['available', 'reserved'].includes((c.status || '').toLowerCase())
    );

    return activeCars.map(c => ({
      id: c.id,
      name: c.name || `${c.year || ''} ${c.make || ''} ${c.model || ''}`.trim(),
      make: c.make,
      model: c.model,
      year: c.year,
      price: Number(c.price || 0),
      priceFormatted: formatPhp(c.price),
      downPayment: computeDp(c.price, c.dp),
      downPaymentFormatted: formatPhp(computeDp(c.price, c.dp)),
      originalPrice: c.original_price ? Number(c.original_price) : null,
      status: c.status || 'Available',
      transmission: c.transmission || 'N/A',
      mileage: c.mileage ? `${Number(c.mileage).toLocaleString()} km` : 'N/A',
      fuelType: c.fuel_type || 'Gasoline',
      bodyType: c.body_type || 'N/A',
      imageUrl: Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null,
      webLink: `https://capamulcars.com/cars.html?id=${c.id}`
    }));
  } catch (err) {
    console.error('Error fetching cars from Supabase:', err.response?.data || err.message);
    return [];
  }
}

/**
 * Search cars matching keyword or budget parameters
 */
export async function searchInventory({ query, maxDp, maxPrice, brand }) {
  const allCars = await getAvailableCars();
  let results = allCars;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.make && c.make.toLowerCase().includes(q)) ||
      (c.model && c.model.toLowerCase().includes(q)) ||
      (c.bodyType && c.bodyType.toLowerCase().includes(q))
    );
  }

  if (brand) {
    const b = brand.toLowerCase();
    results = results.filter(c => c.make && c.make.toLowerCase().includes(b));
  }

  if (maxDp) {
    results = results.filter(c => c.downPayment <= Number(maxDp));
  }

  if (maxPrice) {
    results = results.filter(c => c.price <= Number(maxPrice));
  }

  return results;
}

/**
 * Get AI settings from Supabase settings table
 */
export async function getAISettingsFromDb() {
  try {
    const res = await axios.get(`${SUPABASE_URL}/rest/v1/settings?select=value&key=eq.ai_settings&limit=1`, { headers });
    if (res.data && res.data.length > 0 && res.data[0].value) {
      return res.data[0].value;
    }
    return { enabled: true, mode: 'ai' };
  } catch (err) {
    console.error('Error fetching AI settings from Supabase:', err.message);
    return { enabled: true, mode: 'ai' };
  }
}

/**
 * Update AI settings in Supabase settings table
 */
export async function updateAISettingsInDb(settings) {
  try {
    const res = await axios.post(`${SUPABASE_URL}/rest/v1/settings`, 
      { key: 'ai_settings', value: settings },
      { headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' } }
    );
    return { success: true, data: res.data };
  } catch (err) {
    console.error('Error updating AI settings in Supabase:', err.message);
    return { success: false, error: err.message };
  }
}

