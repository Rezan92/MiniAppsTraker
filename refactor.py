import os
import re

base_dir = r"C:\Users\syria\Documents\WebProjects\MiniAppsTraker\apps\web\src"

# 1. Create useDebounce.js
hooks_dir = os.path.join(base_dir, "hooks")
os.makedirs(hooks_dir, exist_ok=True)
with open(os.path.join(hooks_dir, "useDebounce.js"), "w", encoding='utf-8') as f:
    f.write('''import { useState, useEffect } from 'react';

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
''')

# 2. Update ClientList.jsx
client_list_path = os.path.join(base_dir, "components", "clients", "ClientList.jsx")
with open(client_list_path, "r", encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { useQuery, useQueryClient } from '@tanstack/react-query';",
    "import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';\\nimport { useDebounce } from '../../hooks/useDebounce';"
)

content = content.replace(
    "const [search, setSearch] = useState('');",
    "const [search, setSearch] = useState('');\\n  const debouncedSearch = useDebounce(search, 500);"
)

content = content.replace(
    "queryKey: ['clients', search],",
    "queryKey: ['clients', debouncedSearch],\\n    placeholderData: keepPreviousData,"
)

content = content.replace(
    "search \\n        ? http://localhost:4000/api/clients?search= \\n        : 'http://localhost:4000/api/clients'",
    "debouncedSearch \\n        ? ${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients?search= \\n        : ${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients"
)

with open(client_list_path, "w", encoding='utf-8') as f:
    f.write(content)

# 3. Update JobDetails.jsx
job_details_path = os.path.join(base_dir, "components", "jobs", "JobDetails.jsx")
with open(job_details_path, "r", encoding='utf-8') as f:
    job_content = f.read()

job_content = job_content.replace(
    "if (loadingJob || loadingMaterials || loadingHours) {",
    "if (loadingJob) {"
)

hours_table = '''              <tbody className="text-gray-700">
                {hours.length === 0 ? ('''
new_hours_table = '''              <tbody className="text-gray-700">
                {loadingHours ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">Loading hours...</td>
                  </tr>
                ) : hours.length === 0 ? ('''
job_content = job_content.replace(hours_table, new_hours_table)

materials_table = '''              <tbody className="text-gray-700">
                {materials.length === 0 ? ('''
new_materials_table = '''              <tbody className="text-gray-700">
                {loadingMaterials ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">Loading materials...</td>
                  </tr>
                ) : materials.length === 0 ? ('''
job_content = job_content.replace(materials_table, new_materials_table)

with open(job_details_path, "w", encoding='utf-8') as f:
    f.write(job_content)

# 4. Replace all localhost urls across all 4 files
files_to_update = [
    client_list_path,
    job_details_path,
    os.path.join(base_dir, "components", "clients", "ClientDetails.jsx"),
    os.path.join(base_dir, "components", "jobs", "JobList.jsx")
]

for file_path in files_to_update:
    with open(file_path, "r", encoding='utf-8') as f:
        file_content = f.read()
    
    # regex to replace http://localhost:4000/api/... with ${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/...
    # and 'http://localhost:4000/api/...' with ${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/...
    file_content = re.sub(r"http://localhost:4000/api(.*?)[]", r"${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api\1", file_content)
    file_content = re.sub(r"'http://localhost:4000/api(.*?)[']", r"${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api\1", file_content)

    with open(file_path, "w", encoding='utf-8') as f:
        f.write(file_content)

print("Done")
