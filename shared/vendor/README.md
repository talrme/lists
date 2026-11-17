# Vendored browser libraries

- Marked 18.2.1: `marked-18.2.1.js`, MIT, upstream npm `marked`; license in MARKED-LICENSE.txt. https://marked.js.org/
- DOMPurify 3.4.18: `purify-3.4.18.min.js`, Apache-2.0 OR MPL-2.0; upstream npm `dompurify`; license in DOMPURIFY-LICENSE.txt. https://github.com/cure53/DOMPurify
- Lucide: https://lucide.dev/ — icon library, ISC; Lucide-LICENSE.txt.
- QRCode.js: https://github.com/davidshimjs/qrcodejs — local QR rendering, MIT; QRCode-LICENSE.txt.
- SortableJS 1.15.6: https://github.com/SortableJS/Sortable — touch/desktop drag sorting, MIT; Sortable-LICENSE.txt. Copied from Preferences with its license; no CDN request.

Lucide and QRCode were copied from the user's existing Preferences website with their upstream licenses. QR contents are never sent to a remote service. Firebase is separately imported from the official Google CDN only in configured live mode.

Pinned distributable assets, downloaded from their upstream npm distributions via jsDelivr. No runtime CDN dependency for description formatting. Always sanitize parsed Markdown; raw parser output is not trusted. Keep the allowlist and safe-link/input normalization in shared/task-fields.js. Update versions deliberately and rerun the description XSS tests when upgrading.
