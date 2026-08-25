const fs = require('fs');
const path = require('path');

const taskPath = 'c:\\Users\\syria\\.gemini\\antigravity\\brain\\1d2c7cb4-5f34-43e3-ab9a-14474585cac5\\task.md';
let content = fs.readFileSync(taskPath, 'utf8');

content = content.replace(/- \[ \] Phase 2/g, '- [x] Phase 2');
content = content.replace(/- \[ \] Delete `GET \/:id\/sync-status/g, '- [x] Delete `GET /:id/sync-status');
content = content.replace(/- \[ \] Delete "Sweep" logic/g, '- [x] Delete "Sweep" logic');
content = content.replace(/- \[ \] Delete `syncJobToDraftInvoice/g, '- [x] Delete `syncJobToDraftInvoice');
content = content.replace(/- \[ \] Delete frontend `syncStatus`/g, '- [x] Delete frontend `syncStatus`');

content = content.replace(/- \[ \] Phase 3/g, '- [x] Phase 3');
content = content.replace(/- \[ \] Create CRUD endpoints/g, '- [x] Create CRUD endpoints');
content = content.replace(/- \[ \] Enforce security checks/g, '- [x] Enforce security checks');
content = content.replace(/- \[ \] Implement multi-draft check/g, '- [x] Implement multi-draft check');
content = content.replace(/- \[ \] Modify `jobs.js`/g, '- [x] Modify `jobs.js`');

content = content.replace(/- \[ \] Phase 4/g, '- [x] Phase 4');
content = content.replace(/- \[ \] Require `reason`/g, '- [x] Require `reason`');
content = content.replace(/- \[ \] Save reason/g, '- [x] Save reason');

fs.writeFileSync(taskPath, content);
