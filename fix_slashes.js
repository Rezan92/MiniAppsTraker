const fs = require('fs');
const path = require('path');
const baseDir = path.join('C:', 'Users', 'syria', 'Documents', 'WebProjects', 'MiniAppsTraker', 'apps', 'web', 'src');

const files = [
  path.join(baseDir, 'components', 'clients', 'ClientList.jsx'),
  path.join(baseDir, 'components', 'jobs', 'JobDetails.jsx'),
  path.join(baseDir, 'components', 'clients', 'ClientDetails.jsx'),
  path.join(baseDir, 'components', 'jobs', 'JobList.jsx')
];

for (let file of files) {
  let fileContent = fs.readFileSync(file, 'utf-8');
  fileContent = fileContent.replace(/\\\$\{import\.meta\.env\.VITE_API_URL/g, "${import.meta.env.VITE_API_URL");
  fs.writeFileSync(file, fileContent);
}

console.log("Done fixed slashes");
