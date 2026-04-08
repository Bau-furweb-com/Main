const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Add 'Edit Table' tab to the Sidebar
if (!html.includes('data-tab="editTableTab"')) {
  html = html.replace(
    /<a href="#" data-tab="clientsTab" class="nav-link(.*?)">Clients<\/a>/,
    '<a href="#" data-tab="clientsTab" class="nav-link$1">Clients</a>\n      <a href="#" data-tab="editTableTab" class="nav-link block px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors">Edit Tables</a>'
  );
}

// 2. Add Edit Table tab content section
if (!html.includes('id="editTableTab"')) {
  const editTableTabHtml = `
      <!-- EDIT TABLE TAB -->
      <div id="editTableTab" class="tab-content hidden relative">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-semibold">Database Operations</h2>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">Select Table</label>
            <div class="flex space-x-2 mb-4">
                <select id="tableSelector" class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="businesses">businesses</option>
                    <option value="change_requests">change_requests</option>
                    <option value="chat_messages">chat_messages</option>
                    <option value="admin_action_logs">admin_action_logs</option>
                </select>
                <button id="loadTableBtn" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Load Data</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse whitespace-nowrap">
                    <thead id="editTableHead" class="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    </thead>
                    <tbody id="editTableBody" class="divide-y divide-slate-100 text-sm">
                        <tr><td class="p-4 text-slate-500">Select a table and click Load Data</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
`;
  html = html.replace('<!-- CLIENTS TAB -->', editTableTabHtml + '\n      <!-- CLIENTS TAB -->');
}

// 3. Inject JS
if (!html.includes('tableSelector')) {
  html = html.replace('async function loadAdminData() {', `
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(t => t.classList.add('hidden'));
        
        document.querySelectorAll('.nav-link').forEach(l => {
          l.classList.remove('bg-slate-800', 'text-white');
          l.classList.add('text-slate-400');
        });
        
        const targetId = e.currentTarget.dataset.tab;
        document.getElementById(targetId).classList.remove('hidden');
        
        e.currentTarget.classList.remove('text-slate-400');
        e.currentTarget.classList.add('bg-slate-800', 'text-white');
        
        if(targetId === 'queueTab') document.getElementById('pageTitle').innerText = 'Change Requests Queue';
        if(targetId === 'clientsTab') document.getElementById('pageTitle').innerText = 'Active Clients';
        if(targetId === 'editTableTab') document.getElementById('pageTitle').innerText = 'Edit Tables';
      });
    });

    document.getElementById('loadTableBtn').addEventListener('click', async () => {
        const table = document.getElementById('tableSelector').value;
        const { data, error } = await supabase.from(table).select('*').limit(50);
        if (error) return alert('Error loaded: ' + error.message);
        
        const head = document.getElementById('editTableHead');
        const body = document.getElementById('editTableBody');
        
        if (!data || data.length === 0) {
            head.innerHTML = '';
            body.innerHTML = '<tr><td class="p-4">No rows found</td></tr>';
            return;
        }
        
        const keys = Object.keys(data[0]);
        head.innerHTML = '<tr>' + keys.map(k => '<th class="p-4 font-medium">' + k + '</th>').join('') + '<th class="p-4 font-medium">Actions</th></tr>';
        
        body.innerHTML = data.map(row => {
            const tds = keys.map(k => '<td class="p-4 max-w-xs truncate">' + (row[k] || '') + '</td>').join('');
            return '<tr>' + tds + '<td class="p-4">' +
                   '<button class="text-red-600 hover:text-red-900 delete-row-btn" data-table="' + table + '" data-id="' + row.id + '">Delete</button>' +
                   '</td></tr>';
        }).join('');
        
        document.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure?')) return;
                const tbl = e.target.dataset.table;
                const rid = e.target.dataset.id;
                const { error: delErr } = await supabase.from(tbl).delete().eq('id', rid);
                if (delErr) alert(delErr.message);
                else e.target.closest('tr').remove();
            });
        });
    });

    window.editClient = async (id) => {
      const name = prompt('New Business Name:');
      if(name) {
          const {error} = await supabase.from('businesses').update({ business_name: name }).eq('id', id);
          if(!error) loadAdminData();
      }
    };

    async function loadAdminData() {`);
}

// 4. Edit button on Client
if (!html.includes('window.editClient')) {
  html = html.replace(
    /<button onclick="deleteClient\('\${business\.id}'\)" class="text-red-600 hover:underline font-medium">Remove<\/button>/,
    '<button onclick="window.editClient(\\'${business.id}\\')" class="text-indigo-600 hover:underline font-medium mr-3">Edit</button>' +
    '<button onclick="deleteClient(\\'${business.id}\\')" class="text-red-600 hover:underline font-medium">Remove</button>'
  );
}

// 5. Go to Element on Queue
if (!html.includes('Go to element / site &rarr;')) {
  // Try mapping over the structure in template lateral:
  const replace1 = "<div class=\\"text-xs text-slate-400 max-w-[200px] truncate\\" title=\\"\${req.page_url}\\\">\${req.page_url}</div>";
  const repwith1 = `<div class="text-xs text-slate-400 max-w-[200px] truncate" title="\${req.page_url}">\${req.page_url}</div>\n                  <div class="mt-1"><a href="\${req.page_url && (req.page_url.startsWith('http') || req.page_url.includes('127.0.0.1')) ? req.page_url : 'http://' + req.page_url}" target="_blank" class="text-xs text-indigo-600 hover:underline">Go to element / site &rarr;</a></div>`;
  html = html.replace(replace1, repwith1);
}

// Clean up old nav-link listeners
html = html.replace(
  /document\.querySelectorAll\('\.nav-link'\)\.forEach\(link => \{[\s\S]*?if \(e\.target\.dataset\.tab === 'queueTab'\) \{[\s\S]*?\}\);/,
  '// Tabs handled above'
);

fs.writeFileSync('admin/index.html', html);
