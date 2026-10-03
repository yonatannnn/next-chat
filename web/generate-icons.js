const fs = require('fs');
const path = require('path');

// The correct bubble chat icon SVG
const bubbleIconSVG = `<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="24" fill="#3B82F6"/>
  <path d="M48 64C48 50.7452 58.7452 40 72 40H120C133.255 40 144 50.7452 144 64V128C144 141.255 133.255 152 120 152H72C58.7452 152 48 141.255 48 64Z" fill="white"/>
  <path d="M64 80C64 72.268 70.268 66 78 66H114C121.732 66 128 72.268 128 80V112C128 119.732 121.732 126 114 126H78C70.268 126 64 119.732 64 112V80Z" fill="#3B82F6"/>
  <circle cx="84" cy="96" r="4" fill="white"/>
  <circle cx="108" cy="96" r="4" fill="white"/>
  <path d="M84 108C84 104.686 86.6863 102 90 102H102C105.314 102 108 104.686 108 108V110C108 113.314 105.314 116 102 116H90C86.6863 116 84 113.314 84 110V108Z" fill="white"/>
</svg>`;

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Update the main icon.svg
fs.writeFileSync(path.join(__dirname, 'public/icons/icon.svg'), bubbleIconSVG);

console.log('✅ Updated icon.svg with correct bubble chat icon');
console.log('📝 Note: PNG files need to be regenerated from the updated SVG');
console.log('🔧 You can use an online SVG to PNG converter or image editing software to generate the PNG files from the updated icon.svg');
console.log('📱 After updating PNG files, clear browser cache and reinstall the PWA to see the correct icon');



