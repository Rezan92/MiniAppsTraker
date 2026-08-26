const fs = require('fs');
const path = require('path');

const builderPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'invoices', 'InvoiceBuilder.jsx');

let builder = fs.readFileSync(builderPath, 'utf8');

// Safely remove syncConfirmOpen state
builder = builder.replace(/const \[syncConfirmOpen, setSyncConfirmOpen\] = useState\(false\);\n/g, '');

// Safely remove syncStatus useQuery
builder = builder.replace(/\/\/ Fetch sync status if editing a draft linked to a job\n\s*const \{ data: syncStatus, refetch: refetchSyncStatus \} = useQuery\(\{[\s\S]*?\}\);\n\n\s*useEffect\(\(\) => \{\n\s*if \(isEditing && formData\.job_id\) \{\n\s*refetchSyncStatus\(\);\n\s*\}\n\s*\}, \[isEditing, formData\.job_id, refetchSyncStatus\]\);/g, '');

// Safely remove syncMutation
builder = builder.replace(/const syncMutation = useMutation\(\{[\s\S]*?onError: \(err\) => \{\n\s*showError\(err\.message\);\n\s*\}\n\s*\}\);\n/g, '');

// Safely remove syncStatus UI banner block using string index instead of regex to prevent greedy matching
const bannerStart = '{syncStatus?.outOfSync && (';
const startIdx = builder.indexOf(bannerStart);
if (startIdx !== -1) {
  // Find the matching end of the banner block. It ends with: `)}`
  // And it is followed by `<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">`
  const bannerEndString = '<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">';
  const endIdx = builder.indexOf(bannerEndString, startIdx);
  if (endIdx !== -1) {
    builder = builder.substring(0, startIdx) + builder.substring(endIdx);
  }
}

// Safely remove ConfirmModal for sync
const modalStart = '<ConfirmModal\n        open={syncConfirmOpen}';
const mStartIdx = builder.indexOf(modalStart);
if (mStartIdx !== -1) {
  const mEndString = '/>';
  const mEndIdx = builder.indexOf(mEndString, mStartIdx);
  if (mEndIdx !== -1) {
    builder = builder.substring(0, mStartIdx) + builder.substring(mEndIdx + 2);
  }
}

fs.writeFileSync(builderPath, builder);
