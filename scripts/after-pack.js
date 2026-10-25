// electron-builder afterPack hook: embeds the icon and version info into the app exe.
// Used instead of electron-builder's own exe editing ("signAndEditExecutable"), which
// crashes with "Array buffer allocation failed" on Node 24.
const fs = require('fs');
const path = require('path');
const { rcedit } = require('rcedit');

// Wraps a 256x256 PNG into a single-image .ico (PNG-compressed icons are valid since Vista).
function pngToIco(pngPath, icoPath) {
  const png = fs.readFileSync(pngPath);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  fs.writeFileSync(icoPath, Buffer.concat([header, png]));
}

module.exports = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const info = packager.appInfo;
  const exe = path.join(appOutDir, `${info.productFilename}.exe`);
  const ico = path.join(__dirname, '..', 'build', 'icon.ico');
  pngToIco(path.join(__dirname, '..', 'build', 'icon-256.png'), ico);
  await rcedit(exe, {
    icon: ico,
    'file-version': info.version,
    'product-version': info.version,
    'version-string': {
      ProductName: info.productName,
      FileDescription: info.productName,
      CompanyName: info.companyName || 'Banzamel',
      LegalCopyright: `© ${new Date().getFullYear()} Banzamel`,
      OriginalFilename: `${info.productFilename}.exe`,
    },
  });
};
