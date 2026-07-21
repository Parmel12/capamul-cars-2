const fs = require('fs');
const files = ['index.html', 'cars.html', 'financing.html', 'reviews.html', 'about.html', 'contact.html'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Desktop Active
  content = content.replace(
    /class="px-3 py-2 text-\[13px\] font-bold uppercase tracking-wider text-primary bg-primary\/10 border border-primary\/25 rounded-lg backdrop-blur-sm transition-all duration-200"/g,
    'class="px-3 py-2 text-[13px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary transition-all duration-200"'
  );
  
  // Desktop Inactive
  content = content.replace(
    /class="px-3 py-2 text-\[13px\] font-bold uppercase tracking-wider text-gray-600 hover:text-primary hover:bg-gray-100\/80 rounded-lg backdrop-blur-sm transition-all duration-200"/g,
    'class="px-3 py-2 text-[13px] font-bold uppercase tracking-wider text-gray-600 hover:text-primary hover:border-b-2 hover:border-primary transition-all duration-200"'
  );
  
  // Desktop Button (Book Test Drive)
  content = content.replace(
    /class="test-drive-nav-btn px-3 py-2 text-\[13px\] font-bold uppercase tracking-wider text-gray-600 hover:text-primary hover:bg-gray-100\/80 rounded-lg backdrop-blur-sm transition-all duration-200 inline-flex items-center gap-1.5"/g,
    'class="test-drive-nav-btn px-3 py-2 text-[13px] font-bold uppercase tracking-wider text-gray-600 hover:text-primary hover:border-b-2 hover:border-primary transition-all duration-200 inline-flex items-center gap-1.5"'
  );

  fs.writeFileSync(file, content);
}
console.log('done');
