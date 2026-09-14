import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function compressBase64Image(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    const buffer = Buffer.from(parts[1], 'base64');
    
    // Resize image to max 800px width/height and compress JPEG quality 70
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    return compressedBase64;
  } catch (err) {
    console.warn('Failed to compress base64 image:', err.message);
    return dataUrl;
  }
}

async function runOptimization() {
  console.log('Fetching list of car IDs...');
  const { data: idList, error: idErr } = await supabase
    .from('cars')
    .select('id, name');

  if (idErr) {
    console.error('Error fetching car list:', idErr);
    return;
  }

  console.log(`Found ${idList.length} cars. Starting image optimization...`);
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let updatedCount = 0;

  for (let i = 0; i < idList.length; i++) {
    const carRef = idList[i];
    const { data: rows, error } = await supabase
      .from('cars')
      .select('id, name, images')
      .eq('id', carRef.id);

    if (error || !rows || rows.length === 0) {
      console.warn(`[${i+1}/${idList.length}] Failed to fetch car ${carRef.id}:`, error?.message);
      continue;
    }

    const car = rows[0];
    const origImages = car.images || [];
    const origStr = JSON.stringify(origImages);
    const origSize = origStr.length;
    totalOriginalSize += origSize;

    let needsUpdate = false;
    const newImages = [];

    for (const img of origImages) {
      if (typeof img === 'string' && img.startsWith('data:image/')) {
        needsUpdate = true;
        const compressed = await compressBase64Image(img);
        newImages.push(compressed);
      } else {
        newImages.push(img);
      }
    }

    const newStr = JSON.stringify(newImages);
    const newSize = newStr.length;
    totalOptimizedSize += newSize;

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('cars')
        .update({ images: newImages })
        .eq('id', car.id);

      if (updateErr) {
        console.error(`[${i+1}/${idList.length}] Error updating car ${car.name}:`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`[${i+1}/${idList.length}] Optimized "${car.name}": ${(origSize / 1024 / 1024).toFixed(2)} MB -> ${(newSize / 1024 / 1024).toFixed(2)} MB`);
      }
    } else {
      console.log(`[${i+1}/${idList.length}] "${car.name}" already clean (${(origSize / 1024).toFixed(1)} KB)`);
    }
  }

  console.log('\n=== OPTIMIZATION SUMMARY ===');
  console.log(`Updated cars: ${updatedCount} / ${idList.length}`);
  console.log(`Total Original Size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Optimized Size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Space Saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`);
}

runOptimization();
