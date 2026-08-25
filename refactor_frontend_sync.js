const fs = require('fs');
const path = require('path');

const builderPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'invoices', 'InvoiceBuilder.jsx');
const detailsPath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'invoices', 'InvoiceDetails.jsx');

let builder = fs.readFileSync(builderPath, 'utf8');
let details = fs.readFileSync(detailsPath, 'utf8');

// 1. Remove syncStatus and refetch from Details
details = details.replace(/const \{ data: syncStatus, refetch: refetchSyncStatus \} = useQuery\(\{[\s\S]*?\}\);\n/g, '');
details = details.replace(/useEffect\(\(\) => \{[\s\S]*?refetchSyncStatus\(\);[\s\S]*?\}\);/g, '');
details = details.replace(/\{syncStatus\?\.outOfSync && \([\s\S]*?\}\)\}/g, '');
fs.writeFileSync(detailsPath, details);

// 2. Remove sync logic from Builder
builder = builder.replace(/const \[syncConfirmOpen, setSyncConfirmOpen\] = useState\(false\);\n/g, '');
builder = builder.replace(/\/\/ Fetch sync status.*?const \{ data: syncStatus, refetch: refetchSyncStatus \} = useQuery\(\{[\s\S]*?\}\);\n/s, '');
builder = builder.replace(/const syncMutation = useMutation\(\{[\s\S]*?\}\);\n/s, '');
builder = builder.replace(/\{syncStatus\?\.outOfSync && \([\s\S]*?\}\)\}/g, '');
builder = builder.replace(/<ConfirmModal[\s\S]*?open=\{syncConfirmOpen\}[\s\S]*?\/>/g, '');
fs.writeFileSync(builderPath, builder);
