(function () {
  'use strict';

  const Core = window.McLainCore;
  const STORAGE_KEY = 'mclain:os:v2';
  const OPS_STORAGE_KEY = 'mclain:ops:v1';
  const OPS_SESSION_KEY = 'mclain:ops:session:v1';
  const opsConfig = window.McLainOpsConfig;
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const titleCase = value => String(value).replace(/(^|[-_ ])\w/g, match => match.toUpperCase());
  const statusColors = { active: '#69a7ff', blocked: '#ff6b72', waiting: '#ffb454', shipping: '#49dcb1', parked: '#8f9aaa' };
  const diagnostics = [
    ['platform-audit', 'Hosted'], ['doctor', 'Doctor'], ['catalog-check', 'Catalog'],
    ['command-registry-check', 'Commands'], ['skills-health', 'Skills'], ['harness-audit', 'Harness']
  ];

  let state = loadState();
  let opsState = loadOpsState();
  let opsSession = null;
  try { opsSession = JSON.parse(localStorage.getItem(OPS_SESSION_KEY) || 'null'); } catch { localStorage.removeItem(OPS_SESSION_KEY); }
  let sharedOrders = [];
  let opsMember = false;
  let activeProjectId = null;
  let toastTimer;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Core.importState(saved) : Core.createInitialState();
    } catch {
      return Core.createInitialState();
    }
  }

  function loadOpsState() {
    try {
      const saved = localStorage.getItem(OPS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : { workOrders: [] };
      return { workOrders: Array.isArray(parsed.workOrders) ? parsed.workOrders : [] };
    } catch {
      return { workOrders: [] };
    }
  }

  function saveOpsState(message) {
    try {
      localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(opsState));
      renderOpsWorkOrders();
      if (message) toast(message);
      return true;
    } catch {
      toast('Device storage is full. Export a backup before adding more records.');
      return false;
    }
  }

  function commit(next, message) {
    state = next;
    localStorage.setItem(STORAGE_KEY, Core.exportState(state));
    renderAll();
    if (activeProjectId && !getProject(activeProjectId)) closeProject();
    else if (activeProjectId) renderProjectSheet(activeProjectId);
    if (message) toast(message);
  }

  function toast(message) {
    const element = $('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2400);
  }

  function getProject(projectId) {
    return state.projects.find(project => project.id === projectId);
  }

  function openActions(project) {
    return project.nextActions.filter(action => !action.done);
  }

  function renderAll() {
    renderHome();
    renderProjects();
    renderOpsWorkOrders();
  }

  function renderHome() {
    const portfolio = Core.getPortfolio(state);
    $('todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
    $('portfolioStats').innerHTML = [
      [portfolio.active, 'active systems'], [portfolio.shipping, 'shipping'], [portfolio.blocked, 'with blockers'], [portfolio.openActions, 'open actions']
    ].map(([value, label]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join('');

    const focus = portfolio.focusProject;
    $('focusCard').innerHTML = focus ? `
      <div class="focus-top"><p class="overline">TODAY'S HIGHEST-LEVERAGE MOVE</p><span class="priority-tag">${escapeHtml(focus.priority)}</span></div>
      <h2>${escapeHtml(focus.name)}</h2><p>${escapeHtml(focus.outcome)}</p>
      <button class="focus-action" data-open-project="${escapeHtml(focus.id)}"><span><strong>Do this next</strong><small>${escapeHtml(openActions(focus)[0]?.text || 'Define the next action')}</small></span><b>→</b></button>
    ` : '<div class="empty-state">Create a project to start your command center.</div>';

    const attention = portfolio.ranked.slice(0, 4);
    $('attentionList').innerHTML = attention.length ? attention.map(project => `
      <button class="project-row" data-open-project="${escapeHtml(project.id)}" style="--project-color:${project.color}">
        <span class="project-dot"></span><span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(titleCase(project.status))} · ${project.blockers.length} blocker${project.blockers.length === 1 ? '' : 's'} · ${openActions(project).length} next</small></span><span>›</span>
      </button>`).join('') : '<div class="empty-state">No projects need attention.</div>';

    const queue = portfolio.ranked.flatMap(project => openActions(project).slice(0, 2).map(action => ({ project, action }))).slice(0, 8);
    $('actionQueue').innerHTML = queue.length ? queue.map(({ project, action }) => `
      <div class="queue-item" style="--project-color:${project.color}">
        <button class="check-button" data-toggle-action="${escapeHtml(action.id)}" data-project-id="${escapeHtml(project.id)}" aria-label="Complete action"></button>
        <button class="unstyled action-copy" data-open-project="${escapeHtml(project.id)}"><p>${escapeHtml(action.text)}</p><small>${escapeHtml(project.name)}</small></button>
        <span class="priority-line"></span>
      </div>`).join('') : '<div class="empty-state">Nothing queued. Add the next action to an active project.</div>';
  }

  function renderProjects() {
    const search = $('projectSearch').value.trim().toLowerCase();
    const filter = $('projectFilter').value;
    const ranked = Core.getPortfolio(state).ranked.concat(state.projects.filter(project => project.status === 'parked'));
    const projects = ranked.filter(project => (filter === 'all' || project.status === filter) && (!search || `${project.name} ${project.category} ${project.outcome}`.toLowerCase().includes(search)));
    $('projectGrid').innerHTML = projects.length ? projects.map(project => `
      <button class="project-card" data-open-project="${escapeHtml(project.id)}" style="--project-color:${project.color}">
        <div class="project-card-top"><span class="status-tag" style="color:${statusColors[project.status]}">${escapeHtml(project.status)}</span><span class="priority-tag">${escapeHtml(project.priority)}</span></div>
        <h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.outcome)}</p>
        <div class="project-meta"><span>${escapeHtml(project.category)}</span><span>${openActions(project).length} next · ${project.evidence.length} proof</span></div>
      </button>`).join('') : '<div class="empty-state">No projects match this view.</div>';
  }

  function renderOpsWorkOrders() {
    const target = $('opsWorkOrderList');
    if (!target) return;
    if (!opsMember) {
      target.innerHTML = '<div class="empty-state">Sign in with an approved resort staff account to load the shared queue.</div>';
      return;
    }
    const orders = sharedOrders.slice().sort((a, b) => {
      if ((a.reviewState === 'done') !== (b.reviewState === 'done')) return a.reviewState === 'done' ? 1 : -1;
      const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2) || String(b.createdAt).localeCompare(String(a.createdAt));
    });
    target.innerHTML = orders.length ? orders.map(order => `
      <article class="work-order-card ${order.reviewState === 'done' ? 'done' : ''}">
        <div class="work-order-top">
          <span class="status-tag">${escapeHtml(order.priority)}</span>
          <span class="state-pill ${order.reviewState === 'done' ? 'ready' : ''}">${escapeHtml(order.reviewState)}</span>
        </div>
        <h3>${escapeHtml(order.title)}</h3>
        <p>${escapeHtml(order.location || order.site || 'No location logged')}</p>
        <p>${escapeHtml(order.description || '')}</p>
        <div class="work-order-meta">
          <span>${escapeHtml(order.department)}</span>
          <span>${escapeHtml(order.id)}</span>
        </div>
        <div class="work-order-note">${escapeHtml(order.notificationSubject || 'Manager approval draft ready')}<br>Proposed assignee: ${escapeHtml(order.proposedAssignee || 'None')}<br>Resolution evidence: ${escapeHtml(order.resolutionEvidence || 'Not logged')}</div>
        ${order.reviewState === 'done' ? '' : `<div class="work-order-actions">
          <button class="secondary-button" type="button" data-claim-work-order="${escapeHtml(order.id)}" ${order.reviewState === 'claimed' ? 'disabled' : ''}>${order.reviewState === 'claimed' ? 'Review claimed' : 'Claim review'}</button>
          <button class="secondary-button" type="button" data-assign-work-order="${escapeHtml(order.id)}">Propose assignee</button>
          <button class="secondary-button" type="button" data-log-work-order="${escapeHtml(order.id)}">Record evidence</button>
          <button class="secondary-button" type="button" data-close-work-order="${escapeHtml(order.id)}" ${order.reviewState !== 'claimed' || !order.resolutionEvidence ? 'disabled' : ''}>Mark resolved</button>
        </div>`}
      </article>`).join('') : '<div class="empty-state">The shared queue is empty. Send a front desk issue to create one.</div>';
  }

  async function opsRequest(path, options = {}, retry = true) {
    const response = await fetch(`${opsConfig.url}${path}`, {
      ...options,
      headers: { apikey: opsConfig.publishableKey, authorization: `Bearer ${opsSession?.access_token || opsConfig.publishableKey}`, 'content-type': 'application/json', ...options.headers }
    });
    if (response.status === 401 && retry && opsSession?.refresh_token) {
      const refreshed = await fetch(`${opsConfig.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { apikey: opsConfig.publishableKey, 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: opsSession.refresh_token })
      });
      if (refreshed.ok) {
        opsSession = await refreshed.json();
        localStorage.setItem(OPS_SESSION_KEY, JSON.stringify(opsSession));
        return opsRequest(path, options, false);
      }
      signOutOps();
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.msg || body.message || body.error_description || body.error || `Request failed (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }

  function mapSharedOrder(row) {
    return {
      id: row.id, dedupeKey: row.dedupe_key, title: row.title, priority: row.priority,
      department: row.department, location: row.location, description: row.description,
      notificationSubject: row.notification_subject, reviewState: row.review_state,
      proposedAssignee: row.proposed_assignee, resolutionEvidence: row.resolution_evidence,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  async function refreshOps() {
    if (!opsSession) return;
    const memberships = await opsRequest(`/rest/v1/site_memberships?site_id=eq.${opsConfig.siteId}&is_active=eq.true&select=id&limit=1`);
    opsMember = memberships.length > 0;
    $('opsAuthForm').hidden = true;
    $('opsMemberActions').hidden = false;
    $('opsAuthStatus').textContent = opsMember ? 'Signed in. Shared resort queue.' : 'Signed in, waiting for a resort manager to add this account as a site member.';
    sharedOrders = opsMember ? (await opsRequest(`/rest/v1/ops_work_orders?site_id=eq.${opsConfig.siteId}&select=*&order=created_at.desc&limit=200`)).map(mapSharedOrder) : [];
    renderOpsWorkOrders();
  }

  function signOutOps() {
    opsSession = null;
    opsMember = false;
    sharedOrders = [];
    localStorage.removeItem(OPS_SESSION_KEY);
    $('opsAuthForm').hidden = false;
    $('opsMemberActions').hidden = true;
    $('opsAuthStatus').textContent = 'Signed out.';
    renderOpsWorkOrders();
  }

  async function updateSharedOrder(id, patch) {
    await opsRequest(`/rest/v1/ops_work_orders?id=eq.${encodeURIComponent(id)}&site_id=eq.${opsConfig.siteId}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
    }).then(rows => { if (!rows.length) throw new Error('No update allowed. A manager account is required.'); });
    await refreshOps();
  }

  async function importLocalOps() {
    if (!opsMember) return toast('A resort membership is required first');
    if (!opsState.workOrders.length) return toast('No device drafts to move');
    if (!confirm(`Move ${opsState.workOrders.length} old device drafts into the shared queue?`)) return;
    let moved = 0;
    for (const order of opsState.workOrders) {
      try {
        await opsRequest('/rest/v1/ops_work_orders?on_conflict=site_id,dedupe_key', {
          method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({ id: order.id, site_id: opsConfig.siteId, dedupe_key: order.dedupeKey, title: order.title,
            priority: order.priority, department: order.department, location: order.location || '', description: order.description || '',
            notification_subject: order.notificationSubject || '' })
        });
        moved++;
      } catch (error) { toast(`Stopped after ${moved}: ${error.message}`); await refreshOps(); return; }
    }
    await refreshOps();
    toast(`${moved} device drafts checked against the shared queue`);
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${name}View`));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    if (name === 'system') { loadSystemStatus(); loadCapabilities(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderProjectSheet(projectId) {
    const project = getProject(projectId);
    if (!project) return;
    const github = project.links.find(link => /github\.com\//i.test(link.url));
    $('sheetContent').innerHTML = `
      <header class="sheet-head">
        <div class="between"><span class="status-tag" style="color:${statusColors[project.status]}">${escapeHtml(project.status)}</span><span class="priority-tag">${escapeHtml(project.priority)}</span></div>
        <h2 id="sheetTitle">${escapeHtml(project.name)}</h2><p>${escapeHtml(project.outcome)}</p>
      </header>
      <section class="sheet-section">
        <h3>Project controls</h3>
        <div class="edit-grid">
          <label>Finished outcome<textarea id="editOutcome" rows="3">${escapeHtml(project.outcome)}</textarea></label>
          <div class="edit-row"><label>Status<select id="editStatus">${Core.STATUS.map(value => `<option ${value === project.status ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>Priority<select id="editPriority">${Core.PRIORITY.map(value => `<option ${value === project.priority ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div>
          <button class="secondary-button" data-save-project="${escapeHtml(project.id)}">Save project state</button>
        </div>
      </section>
      <section class="sheet-section"><div class="between"><h3>Next actions</h3><span>${openActions(project).length} open</span></div>
        <div class="detail-list">${project.nextActions.map(action => `
          <div class="detail-item"><button class="check-button ${action.done ? 'done' : ''}" data-toggle-action="${escapeHtml(action.id)}" data-project-id="${escapeHtml(project.id)}">${action.done ? '✓' : ''}</button><p style="${action.done ? 'text-decoration:line-through;color:#718094' : ''}">${escapeHtml(action.text)}</p><button class="delete-small" data-delete-action="${escapeHtml(action.id)}" data-project-id="${escapeHtml(project.id)}">×</button></div>`).join('') || '<div class="empty-state">No actions yet.</div>'}</div>
        <form class="inline-form" data-add-action="${escapeHtml(project.id)}"><input maxlength="300" placeholder="Add exact next action" required><button aria-label="Add action">+</button></form>
      </section>
      ${renderItemSection(project, 'blockers', 'Blockers', 'What is preventing movement?')}
      ${renderItemSection(project, 'evidence', 'Proof', 'Add a URL, record, deliverable, or verified result')}
      <section class="sheet-section"><div class="between"><h3>Owned links</h3>${github ? `<button class="text-button" data-sync-repo="${escapeHtml(project.id)}">Check GitHub</button>` : ''}</div>
        <div class="link-list">${project.links.map(link => `<a class="link-chip" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)} ↗</a>`).join('') || '<span class="surface-copy">No links logged.</span>'}</div><div id="repoStatus"></div>
      </section>
      <div class="sheet-actions"><button class="primary-button" data-copy-handoff="${escapeHtml(project.id)}">Share AI handoff <span>↗</span></button><button class="danger-button" data-archive-project="${escapeHtml(project.id)}">Archive</button></div>
    `;
  }

  function renderItemSection(project, field, title, placeholder) {
    return `<section class="sheet-section"><div class="between"><h3>${title}</h3><span>${project[field].length}</span></div>
      <div class="detail-list">${project[field].map(entry => `<div class="detail-item"><span style="color:${field === 'blockers' ? 'var(--danger)' : 'var(--success)'}">${field === 'blockers' ? '!' : '✓'}</span><p>${escapeHtml(entry.text)}</p><button class="delete-small" data-delete-item="${escapeHtml(entry.id)}" data-field="${field}" data-project-id="${escapeHtml(project.id)}">×</button></div>`).join('') || `<div class="empty-state">No ${title.toLowerCase()} logged.</div>`}</div>
      <form class="inline-form" data-add-item="${field}" data-project-id="${escapeHtml(project.id)}"><input maxlength="400" placeholder="${escapeHtml(placeholder)}" required><button aria-label="Add ${title.toLowerCase()}">+</button></form></section>`;
  }

  function openProject(projectId) {
    activeProjectId = projectId;
    renderProjectSheet(projectId);
    $('projectSheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeProject() {
    activeProjectId = null;
    $('projectSheet').hidden = true;
    document.body.style.overflow = '';
  }

  async function copyHandoff(projectId) {
    const project = getProject(projectId);
    if (!project) return;
    const handoff = Core.buildHandoff(project);
    try {
      if (navigator.share) await navigator.share({ title: `${project.name} execution handoff`, text: handoff });
      else await navigator.clipboard.writeText(handoff);
      toast('Execution handoff ready');
    } catch (error) {
      if (error.name !== 'AbortError') toast('Could not share the handoff');
    }
  }

  async function syncRepo(projectId) {
    const project = getProject(projectId);
    const link = project?.links.find(entry => /github\.com\//i.test(entry.url));
    const match = link?.url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (!match) return toast('No GitHub repository is linked');
    const target = $('repoStatus');
    target.innerHTML = '<p class="surface-copy">Checking the live repository…</p>';
    try {
      const response = await fetch(`/api/repo-status?owner=${encodeURIComponent(match[1])}&repo=${encodeURIComponent(match[2])}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Repository check failed');
      target.innerHTML = `<div class="system-metrics"><div><strong>${escapeHtml(data.branch)}</strong><small>default branch</small></div><div><strong>${data.openIssues}</strong><small>open issues</small></div><div><strong>${escapeHtml(data.lastPush)}</strong><small>last push</small></div></div>`;
    } catch (error) {
      target.innerHTML = `<p class="surface-copy">${escapeHtml(error.message)}</p>`;
    }
  }

  function openProjectDialog() {
    $('projectForm').reset();
    $('projectCategory').value = 'General';
    $('projectPriority').value = 'high';
    $('projectDialog').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('projectName').focus(), 50);
  }

  function closeProjectDialog() {
    $('projectDialog').hidden = true;
    document.body.style.overflow = '';
  }

  function updateNetwork() {
    const online = navigator.onLine;
    $('networkBadge').classList.toggle('offline', !online);
    $('networkBadge').querySelector('span').textContent = online ? 'online' : 'offline';
  }

  async function loadSystemStatus() {
    if (!navigator.onLine) return;
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      const ready = Boolean(data.controlPlane && data.sourceOfTruth);
      $('systemState').textContent = ready ? 'ready' : 'attention';
      $('systemState').classList.toggle('ready', ready);
      $('systemMetrics').innerHTML = `<div><strong>${escapeHtml(data.version || '—')}</strong><small>OS version</small></div><div><strong>${data.providerCount ?? '—'}</strong><small>providers</small></div><div><strong>${data.productCount ?? '—'}</strong><small>products</small></div>`;
    } catch {
      $('systemState').textContent = 'offline';
      $('systemMetrics').innerHTML = '<span>Runtime status is unavailable.</span>';
    }
  }

  async function loadCapabilities() {
    const target = $('capabilityGrid');
    if (!target || !navigator.onLine) return;
    try {
      const response = await fetch('/api/capabilities');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Capability registry unavailable');
      target.innerHTML = data.capabilities.map(item => {
        const repoUrl = item.repo ? 'https://github.com/' + item.repo : '';
        const primaryUrl = item.url || repoUrl;
        const integration = item.integration ? `
          <div class="capability-contract">
            <span>${escapeHtml(item.integration.readiness)}</span>
            <b>${escapeHtml(item.integration.firstPilot)}</b>
            <small>${escapeHtml(item.integration.nextAction)}</small>
          </div>` : '';
        return `<a class="capability-card" href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener">
          <div class="between"><strong>${escapeHtml(item.name)}</strong><span class="state-pill ${item.status === 'active' ? 'ready' : ''}">${escapeHtml(item.status)}</span></div>
          <small>${escapeHtml(item.role)}</small>
          <p>${escapeHtml(item.purpose)}</p>
          ${integration}
        </a>`;
      }).join('');
    } catch (error) {
      target.innerHTML = `<p class="surface-copy">${escapeHtml(error.message)}</p>`;
    }
  }

  function buildFrontdeskPilotPayload() {
    const issueId = window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36);
    return {
      issueId: `pilot-${issueId}`,
      title: $('frontdeskTitle').value.trim(),
      description: $('frontdeskDescription').value.trim(),
      location: $('frontdeskLocation').value.trim(),
      category: $('frontdeskCategory').value,
      priority: $('frontdeskPriority').value,
      reportedBy: $('frontdeskReportedBy').value.trim() || 'Front Desk'
    };
  }

  function formatFrontdeskPilotOutput(data) {
    if (!data?.ok) return data?.error || 'Issue intake failed.';
    const lines = [
      `contract: ${data.contract}`,
      `workOrder: ${data.workOrder.id}`,
      `status: ${data.workOrder.status}`,
      `department: ${data.workOrder.department}`,
      `priority: ${data.workOrder.priority}`,
      `dedupe: ${data.workOrder.dedupeKey}`,
      `notification: ${data.managerNotification.status}`,
      `approvalRequired: ${data.managerNotification.approvalRequired}`,
      '',
      'next:',
      ...data.workOrder.nextActions.map((action, index) => `${index + 1}. ${action}`),
      '',
      'approval boundary:',
      ...data.automationBoundaries.requiresApproval.map(action => `- ${action}`)
    ];
    return lines.join('\n');
  }

  async function submitFrontdeskPilot(event) {
    event.preventDefault();
    if (!opsMember) return toast('Sign in with a resort staff account first');
    const output = $('frontdeskPilotOutput');
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    output.textContent = 'Sending test issue…';
    try {
      await opsRequest('/auth/v1/user');
      const response = await fetch('/api/activepieces-frontdesk-issue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${opsSession.access_token}` },
        body: JSON.stringify(buildFrontdeskPilotPayload())
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Issue intake failed');
      if (data.sharedQueue !== 'saved_or_already_exists') throw new Error('Issue was not saved to the shared queue');
      await refreshOps();
      output.textContent = formatFrontdeskPilotOutput(data) + '\n\nSaved to shared resort queue.';
      $('opsWorkOrderList').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      output.textContent = `Request failed; no shared work order confirmed: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  async function runDiagnostic(command, button) {
    if (!navigator.onLine) return toast('Diagnostics require a connection');
    const output = $('diagnosticOutput');
    button.disabled = true;
    output.textContent = `Running ${command}…`;
    try {
      const response = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
      const data = await response.json();
      output.textContent = [`command: ${command}`, `ok: ${Boolean(data.ok)}`, data.exitCode !== undefined ? `exit: ${data.exitCode}` : '', '', data.stdout || '', data.stderr || '', data.error || ''].filter(Boolean).join('\n');
    } catch (error) {
      output.textContent = `Request failed: ${error.message}`;
    } finally { button.disabled = false; }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ format: 'mclain-os-backup-v1', projects: JSON.parse(Core.exportState(state)), ops: opsState, sharedWorkOrdersSnapshot: sharedOrders }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mclain-systems-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('Backup exported');
  }

  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) return showView(viewButton.dataset.view);
    const openButton = event.target.closest('[data-open-project]');
    if (openButton) return openProject(openButton.dataset.openProject);
    const toggleButton = event.target.closest('[data-toggle-action]');
    if (toggleButton) return commit(Core.toggleAction(state, toggleButton.dataset.projectId, toggleButton.dataset.toggleAction), 'Action updated');
    const deleteAction = event.target.closest('[data-delete-action]');
    if (deleteAction) return commit(Core.deleteAction(state, deleteAction.dataset.projectId, deleteAction.dataset.deleteAction), 'Action removed');
    const deleteItem = event.target.closest('[data-delete-item]');
    if (deleteItem) return commit(Core.deleteProjectItem(state, deleteItem.dataset.projectId, deleteItem.dataset.field, deleteItem.dataset.deleteItem), 'Record removed');
    const save = event.target.closest('[data-save-project]');
    if (save) return commit(Core.updateProject(state, save.dataset.saveProject, { outcome: $('editOutcome').value, status: $('editStatus').value, priority: $('editPriority').value }), 'Project state saved');
    const handoff = event.target.closest('[data-copy-handoff]');
    if (handoff) return copyHandoff(handoff.dataset.copyHandoff);
    const archive = event.target.closest('[data-archive-project]');
    if (archive && confirm('Archive this project from the OS?')) return commit(Core.archiveProject(state, archive.dataset.archiveProject), 'Project archived');
    const sync = event.target.closest('[data-sync-repo]');
    if (sync) return syncRepo(sync.dataset.syncRepo);
    const claimWorkOrder = event.target.closest('[data-claim-work-order]');
    if (claimWorkOrder) {
      updateSharedOrder(claimWorkOrder.dataset.claimWorkOrder, { review_state: 'claimed' }).then(() => toast('Review claimed')).catch(error => toast(error.message));
      return;
    }
    const assignWorkOrder = event.target.closest('[data-assign-work-order]');
    if (assignWorkOrder) {
      const id = assignWorkOrder.dataset.assignWorkOrder;
      const order = sharedOrders.find(item => item.id === id);
      const name = prompt('Proposed assignee (no dispatch will be sent):', order?.proposedAssignee || '');
      if (name === null) return;
      updateSharedOrder(id, { proposed_assignee: name.trim().slice(0, 120) }).then(() => toast('Assignee proposal saved')).catch(error => toast(error.message));
      return;
    }
    const logWorkOrder = event.target.closest('[data-log-work-order]');
    if (logWorkOrder) {
      const id = logWorkOrder.dataset.logWorkOrder;
      const order = sharedOrders.find(item => item.id === id);
      const evidence = prompt('What was observed or fixed? Include a reference to any photo or document:', order?.resolutionEvidence || '');
      if (!evidence?.trim()) return;
      updateSharedOrder(id, { resolution_evidence: evidence.trim().slice(0, 1200) }).then(() => toast('Evidence recorded')).catch(error => toast(error.message));
      return;
    }
    const closeWorkOrder = event.target.closest('[data-close-work-order]');
    if (closeWorkOrder && confirm('Mark this local draft resolved? This does not close an external work order or contact anyone.')) {
      updateSharedOrder(closeWorkOrder.dataset.closeWorkOrder, { review_state: 'done' }).then(() => toast('Shared work-order draft resolved')).catch(error => toast(error.message));
      return;
    }
  });

  document.addEventListener('submit', event => {
    const actionForm = event.target.closest('[data-add-action]');
    if (actionForm) {
      event.preventDefault();
      const input = actionForm.querySelector('input');
      commit(Core.addAction(state, actionForm.dataset.addAction, input.value), 'Next action added');
      return;
    }
    const itemForm = event.target.closest('[data-add-item]');
    if (itemForm) {
      event.preventDefault();
      const input = itemForm.querySelector('input');
      commit(Core.addProjectItem(state, itemForm.dataset.projectId, itemForm.dataset.addItem, input.value), 'Project record updated');
    }
  });

  $('captureForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = {
      name: $('captureName').value, outcome: $('captureOutcome').value, priority: $('capturePriority').value,
      category: $('captureCategory').value, status: $('captureBlocker').value ? 'blocked' : 'active',
      blockers: $('captureBlocker').value ? [$('captureBlocker').value] : []
    };
    const next = Core.createProject(state, input);
    const projectId = next.projects[0].id;
    commit(next, `${input.name} is now an owned project`);
    event.target.reset();
    $('captureCategory').value = 'New venture';
    showView('projects');
    openProject(projectId);
  });

  $('projectForm').addEventListener('submit', event => {
    event.preventDefault();
    const next = Core.createProject(state, { name: $('projectName').value, outcome: $('projectOutcome').value, priority: $('projectPriority').value, category: $('projectCategory').value });
    const projectId = next.projects[0].id;
    closeProjectDialog();
    commit(next, 'Project created');
    openProject(projectId);
  });

  $('frontdeskPilotForm').addEventListener('submit', submitFrontdeskPilot);
  $('opsAuthForm').addEventListener('submit', async event => {
    event.preventDefault();
    const action = event.submitter?.value || 'signin';
    const email = $('opsEmail').value.trim();
    const password = $('opsPassword').value;
    $('opsAuthStatus').textContent = action === 'signup' ? 'Creating account…' : 'Signing in…';
    try {
      const path = action === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
      const data = await opsRequest(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      const session = data.access_token ? data : data.session;
      $('opsPassword').value = '';
      if (!session?.access_token) {
        $('opsAuthStatus').textContent = 'Account created. Check your email to verify it, then sign in. A manager must add your resort membership.';
        return;
      }
      opsSession = session;
      localStorage.setItem(OPS_SESSION_KEY, JSON.stringify(opsSession));
      await refreshOps();
    } catch (error) { $('opsAuthStatus').textContent = error.message; }
  });
  $('opsSignOut').addEventListener('click', signOutOps);
  $('opsImportLocal').addEventListener('click', () => importLocalOps().catch(error => toast(error.message)));
  $('clearCompletedWorkOrders').addEventListener('click', () => refreshOps().catch(error => toast(error.message)));
  $('projectSearch').addEventListener('input', renderProjects);
  $('projectFilter').addEventListener('change', renderProjects);
  $('quickAdd').addEventListener('click', openProjectDialog);
  $('closeSheet').addEventListener('click', closeProject);
  $('projectSheet').addEventListener('click', event => { if (event.target === $('projectSheet')) closeProject(); });
  $('projectDialog').addEventListener('click', event => { if (event.target === $('projectDialog') || event.target.closest('[data-close-dialog]')) closeProjectDialog(); });
  $('exportData').addEventListener('click', exportData);
  $('importData').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const next = Core.importState(parsed.format === 'mclain-os-backup-v1' ? JSON.stringify(parsed.projects) : raw);
      if (parsed.format === 'mclain-os-backup-v1') {
        if (!parsed.ops || !Array.isArray(parsed.ops.workOrders)) throw new Error('Invalid work-order backup');
        opsState = { workOrders: parsed.ops.workOrders };
        if (!saveOpsState()) return;
      }
      commit(next, 'Backup imported');
    }
    catch (error) { toast(error.message); }
    event.target.value = '';
  });
  $('diagnosticButtons').innerHTML = diagnostics.map(([key, label]) => `<button class="diagnostic-button" data-diagnostic="${key}">${label}</button>`).join('');
  $('diagnosticButtons').addEventListener('click', event => {
    const button = event.target.closest('[data-diagnostic]');
    if (button) runDiagnostic(button.dataset.diagnostic, button);
  });
  addEventListener('online', updateNetwork);
  addEventListener('offline', updateNetwork);
  addEventListener('keydown', event => { if (event.key === 'Escape') { closeProject(); closeProjectDialog(); } });

  updateNetwork();
  renderAll();
  if (opsSession) refreshOps().catch(error => { $('opsAuthStatus').textContent = error.message; });
  localStorage.setItem(STORAGE_KEY, Core.exportState(state));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
