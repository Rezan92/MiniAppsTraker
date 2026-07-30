const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'Users', 'syria', 'Documents', 'WebProjects', 'MiniAppsTraker', 'apps', 'web', 'src');

// 1. Create useDebounce
const hooksDir = path.join(baseDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir);
fs.writeFileSync(path.join(hooksDir, 'useDebounce.js'), `import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
`);

// 2. ClientList
const clientListPath = path.join(baseDir, 'components', 'clients', 'ClientList.jsx');
let content = fs.readFileSync(clientListPath, 'utf-8');

content = content.replace(
  "import { useQuery, useQueryClient } from '@tanstack/react-query';",
  "import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';\nimport { useDebounce } from '../../hooks/useDebounce';"
);

content = content.replace(
  "const [search, setSearch] = useState('');",
  "const [search, setSearch] = useState('');\n  const debouncedSearch = useDebounce(search, 500);"
);

content = content.replace(
  "queryKey: ['clients', search],",
  "queryKey: ['clients', debouncedSearch],\n    placeholderData: keepPreviousData,"
);

content = content.replace(
  /const url = search \s*\?\s*`http:\/\/localhost:4000\/api\/clients\?search=\$\{encodeURIComponent\(search\)\}`\s*:\s*'http:\/\/localhost:4000\/api\/clients';/g,
  "const url = debouncedSearch \n        ? `http://localhost:4000/api/clients?search=${encodeURIComponent(debouncedSearch)}` \n        : 'http://localhost:4000/api/clients';"
);
fs.writeFileSync(clientListPath, content);

// 3. JobDetails
const jobDetailsPath = path.join(baseDir, 'components', 'jobs', 'JobDetails.jsx');
let jobContent = fs.readFileSync(jobDetailsPath, 'utf-8');

jobContent = jobContent.replace(
  "if (loadingJob || loadingMaterials || loadingHours) {",
  "if (loadingJob) {"
);

jobContent = jobContent.replace(
  `              <tbody className="text-gray-700">\n                {hours.length === 0 ? (`,
  `              <tbody className="text-gray-700">\n                {loadingHours ? (\n                  <tr>\n                    <td colSpan="3" className="p-4 text-center text-gray-500">Loading hours...</td>\n                  </tr>\n                ) : hours.length === 0 ? (`
);

jobContent = jobContent.replace(
  `              <tbody className="text-gray-700">\n                {materials.length === 0 ? (`,
  `              <tbody className="text-gray-700">\n                {loadingMaterials ? (\n                  <tr>\n                    <td colSpan="3" className="p-4 text-center text-gray-500">Loading materials...</td>\n                  </tr>\n                ) : materials.length === 0 ? (`
);
fs.writeFileSync(jobDetailsPath, jobContent);

// 4. URLs
const files = [
  clientListPath,
  jobDetailsPath,
  path.join(baseDir, 'components', 'clients', 'ClientDetails.jsx'),
  path.join(baseDir, 'components', 'jobs', 'JobList.jsx')
];

for (let file of files) {
  let fileContent = fs.readFileSync(file, 'utf-8');
  
  // First, convert 'http://localhost:4000/api/...' to `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/...`
  fileContent = fileContent.replace(/'http:\/\/localhost:4000\/api(.*?)'/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api$1`");
  
  // Next, convert `http://localhost:4000/api/...` to `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/...`
  fileContent = fileContent.replace(/`http:\/\/localhost:4000\/api(.*?)`/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api$1`");
  
  fs.writeFileSync(file, fileContent);
}

console.log("Done");
