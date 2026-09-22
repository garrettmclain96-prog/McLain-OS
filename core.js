(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.McLainCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUS = ['active', 'blocked', 'waiting', 'shipping', 'parked'];
  const PRIORITY = ['critical', 'high', 'medium', 'low'];
  const now = () => new Date().toISOString();
  const id = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const text = (value, fallback = '') => String(value == null ? fallback : value).trim().slice(0, 4000);
  const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const item = (value, kind) => ({ id: id(kind), text: text(value), createdAt: now() });
  const action = (value, done = false) => ({ ...item(value, 'action'), done: Boolean(done) });

  const SEED_PROJECTS = [
    {
      id: 'ops-post', name: 'OpsPost', category: 'Operations', status: 'shipping', priority: 'critical', color: '#d6ff45',
      outcome: 'Run Jamaica Beach staffing, schedules, work orders, and communications from one mobile system.',
      nextActions: ['Verify the production build end to end', 'Connect the live database and authentication', 'Close the Vonage and Quo integration plan'],
      blockers: ['Production integrations still need credentials and final configuration'],
      evidence: ['Employee and manager workflow demo is deployed'],
      links: []
    },
    {
      id: 'provision-loop', name: 'ProvisionLoop', category: 'Impact', status: 'active', priority: 'critical', color: '#49dcb1',
      outcome: 'Launch a verified closed-loop food network that can start in Galveston County and scale city by city.',
      nextActions: ['Lock the pilot operating rules', 'Recruit the first kitchen partner', 'Define the first funded meal loop'],
      blockers: ['Pilot partners are not yet committed'],
      evidence: ['Public concept and initial product repository exist'],
      links: [{ label: 'Website', url: 'https://provisionloop.org' }]
    },
    {
      id: 'parcel-forge', name: 'ParcelForge', category: 'Property tech', status: 'active', priority: 'high', color: '#69a7ff',
      outcome: 'Create an iPhone-first property intelligence and field research system for Galveston County.',
      nextActions: ['Define the minimum county-data pipeline', 'Ship parcel search and saved properties', 'Prove a field-use workflow on one parcel'],
      blockers: ['Reliable parcel and ownership data sources need validation'],
      evidence: ['MVP scope and product requirements are defined'], links: []
    },
    {
      id: 'family-research', name: 'Family Land Research', category: 'Research', status: 'waiting', priority: 'high', color: '#ffb454',
      outcome: 'Prove the direct family chain and determine whether any land or mineral interest survived to present heirs.',
      nextActions: ['Obtain Lonie McClung’s 1981 death or funeral record', 'Resolve the Lonie to Dee parent-child link', 'Trace the exact tract through deeds and probate'],
      blockers: ['Key vital and probate records are pending'],
      evidence: ['Maternal line proof ladder and record-request packet exist'], links: []
    },
    {
      id: 'turnbot', name: 'TurnBot', category: 'Hardware', status: 'active', priority: 'medium', color: '#d48cff',
      outcome: 'License a universal retrofit smart rotary actuator platform.',
      nextActions: ['Build a working proof-of-function prototype', 'Create a manufacturer-ready demo package', 'Restart targeted licensing outreach'],
      blockers: ['Physical prototype is not yet proven'],
      evidence: ['US provisional patent filed March 31, 2026'],
      links: [{ label: 'Website', url: 'https://turnbot.org' }]
    },
    {
      id: 'glovegate', name: 'GloveGate', category: 'Hardware', status: 'active', priority: 'medium', color: '#ff728d',
      outcome: 'Produce and validate a low-cost glove dispenser that prevents multi-glove pulls.',
      nextActions: ['Choose a prototype vendor', 'Order the first functional sample', 'Run repeat-dispense testing'],
      blockers: ['Prototype quote and manufacturing method are not locked'],
      evidence: ['Patent draft and vendor quote package exist'], links: []
    },
    {
      id: 'brainchild', name: 'Brainchild', category: 'Consumer app', status: 'active', priority: 'high', color: '#b68cff',
      outcome: 'Ship a focused thought-incubation app where ideas either earn preservation or intentionally decay.',
      nextActions: ['Cut the experience to one unmistakable core loop', 'Verify the Supabase data and decay lifecycle', 'Deploy a stable iPhone-first beta'],
      blockers: ['The repository has many competing features and no clear product handoff'],
      evidence: ['React PWA, Supabase schema, thought decay engine, sharing, and payment foundations already exist'],
      links: [{ label: 'GitHub', url: 'https://github.com/garrettmclain96-prog/brainchildofabrainrotgenius' }]
    },
    {
      id: 'mclain-os', name: 'McLain Systems OS', category: 'Operating system', status: 'shipping', priority: 'critical', color: '#ffffff',
      outcome: 'Control every active project, proof trail, blocker, and next action from one iPhone-first system.',
      nextActions: ['Use the OS as the daily source of truth', 'Connect live GitHub project status', 'Add secure cross-device sync'],
      blockers: ['Cloud sync is not configured yet'],
      evidence: ['Installable PWA and server-backed ECC control plane are live'],
      links: [{ label: 'Live app', url: 'https://ecc-kappa-hazel.vercel.app' }, { label: 'GitHub', url: 'https://github.com/garrettmclain96-prog/ecc' }]
    }
  ];

  function normalizeProject(input, index = 0) {
    const p = input || {};
    return {
      id: text(p.id) || id('project'),
      name: text(p.name, `Project ${index + 1}`).slice(0, 120),
      category: text(p.category, 'General').slice(0, 80),
      status: choice(p.status, STATUS, 'active'),
      priority: choice(p.priority, PRIORITY, 'medium'),
      color: /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#d6ff45',
      outcome: text(p.outcome, 'Define the finished outcome.'),
      nextActions: (Array.isArray(p.nextActions) ? p.nextActions : []).slice(0, 50).map(x =>
        typeof x === 'string' ? action(x) : { ...action(x.text, x.done), id: text(x.id) || id('action'), createdAt: x.createdAt || now() }
      ),
      blockers: (Array.isArray(p.blockers) ? p.blockers : []).slice(0, 50).map(x =>
        typeof x === 'string' ? item(x, 'blocker') : { ...item(x.text, 'blocker'), id: text(x.id) || id('blocker'), createdAt: x.createdAt || now() }
      ),
      evidence: (Array.isArray(p.evidence) ? p.evidence : []).slice(0, 100).map(x =>
        typeof x === 'string' ? item(x, 'evidence') : { ...item(x.text, 'evidence'), id: text(x.id) || id('evidence'), createdAt: x.createdAt || now() }
      ),
      links: (Array.isArray(p.links) ? p.links : []).slice(0, 20).map(x => ({ label: text(x.label, 'Link').slice(0, 60), url: text(x.url).slice(0, 500) })),
      createdAt: p.createdAt || now(), updatedAt: p.updatedAt || now()
    };
  }

  function createInitialState() {
    return {
      schemaVersion: 2,
      projects: SEED_PROJECTS.map(normalizeProject),
      inbox: [],
      activity: [{ id: id('event'), type: 'system', text: 'McLain Systems OS initialized', createdAt: now() }],
      settings: { owner: 'Garrett McLain', dailyFocusLimit: 3 }
    };
  }

  function normalizeState(input) {
    if (!input || !Array.isArray(input.projects)) throw new Error('This is not a valid McLain Systems backup.');
    return {
      schemaVersion: 2,
      projects: input.projects.slice(0, 200).map(normalizeProject),
      inbox: Array.isArray(input.inbox) ? input.inbox.slice(0, 500) : [],
      activity: Array.isArray(input.activity) ? input.activity.slice(0, 500) : [],
      settings: { owner: text(input.settings?.owner, 'Garrett McLain'), dailyFocusLimit: Number(input.settings?.dailyFocusLimit) || 3 }
    };
  }

  function event(state, message, type = 'update') {
    return { ...state, activity: [{ id: id('event'), type, text: text(message), createdAt: now() }, ...(state.activity || [])].slice(0, 500) };
  }

  function createProject(state, input) {
    const project = normalizeProject({
      ...input,
      nextActions: input.nextActions?.length ? input.nextActions : [
        'Define the acceptance proof', 'Create or locate the source of truth', 'Complete the smallest shippable next step'
      ]
    });
    return event({ ...state, projects: [project, ...state.projects] }, `Created ${project.name}`, 'create');
  }

  function updateProject(state, projectId, patch) {
    const existing = state.projects.find(p => p.id === projectId);
    if (!existing) return state;
    const updated = normalizeProject({ ...existing, ...patch, id: existing.id, updatedAt: now() });
    return event({ ...state, projects: state.projects.map(p => p.id === projectId ? updated : p) }, `Updated ${updated.name}`);
  }

  function addAction(state, projectId, value) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project || !text(value)) return state;
    return updateProject(state, projectId, { nextActions: [...project.nextActions, action(value)] });
  }

  function toggleAction(state, projectId, actionId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;
    const nextActions = project.nextActions.map(a => a.id === actionId ? { ...a, done: !a.done } : a);
    return updateProject(state, projectId, { nextActions });
  }

  function deleteAction(state, projectId, actionId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;
    return updateProject(state, projectId, { nextActions: project.nextActions.filter(a => a.id !== actionId) });
  }

  function addProjectItem(state, projectId, field, value) {
    if (!['blockers', 'evidence'].includes(field) || !text(value)) return state;
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;
    return updateProject(state, projectId, { [field]: [...project[field], item(value, field.slice(0, -1))] });
  }

  function deleteProjectItem(state, projectId, field, itemId) {
    if (!['blockers', 'evidence'].includes(field)) return state;
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;
    return updateProject(state, projectId, { [field]: project[field].filter(x => x.id !== itemId) });
  }

  function archiveProject(state, projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return state;
    return event({ ...state, projects: state.projects.filter(p => p.id !== projectId) }, `Archived ${project.name}`, 'archive');
  }

  function priorityScore(project) {
    const priority = { critical: 50, high: 35, medium: 20, low: 5 }[project.priority] || 0;
    const state = { blocked: 24, shipping: 20, active: 16, waiting: 8, parked: -20 }[project.status] || 0;
    const proofGap = project.evidence.length ? 0 : 8;
    const blockerWeight = Math.min(project.blockers.length * 4, 12);
    return priority + state + proofGap + blockerWeight;
  }

  function getPortfolio(state) {
    const projects = state.projects || [];
    const active = projects.filter(p => p.status !== 'parked');
    const ranked = [...active].sort((a, b) => priorityScore(b) - priorityScore(a));
    return {
      total: projects.length,
      active: active.length,
      blocked: projects.filter(p => p.status === 'blocked' || p.blockers.length).length,
      shipping: projects.filter(p => p.status === 'shipping').length,
      openActions: projects.reduce((sum, p) => sum + p.nextActions.filter(a => !a.done).length, 0),
      completedActions: projects.reduce((sum, p) => sum + p.nextActions.filter(a => a.done).length, 0),
      focusProject: ranked[0] || null,
      ranked
    };
  }

  function importState(json) {
    let parsed;
    try { parsed = JSON.parse(json); } catch { throw new Error('The selected file is not valid JSON.'); }
    return normalizeState(parsed);
  }

  function exportState(state) {
    return JSON.stringify(normalizeState(state), null, 2);
  }

  function buildHandoff(project) {
    const open = project.nextActions.filter(a => !a.done).slice(0, 3);
    return [
      `# ${project.name} — execution handoff`, '',
      `Status: ${project.status}`, `Priority: ${project.priority}`, '',
      '## Outcome', project.outcome, '',
      '## Current proof', ...(project.evidence.length ? project.evidence.map(x => `- ${x.text}`) : ['- No proof logged']), '',
      '## Blockers', ...(project.blockers.length ? project.blockers.map(x => `- ${x.text}`) : ['- None logged']), '',
      '## Next actions', ...(open.length ? open.map((x, i) => `${i + 1}. ${x.text}`) : ['1. Define the next action']), '',
      '## Instruction', 'Inspect the available project evidence, complete the highest-value safe action, verify the result, and update this project record with proof.'
    ].join('\n');
  }

  return {
    STATUS, PRIORITY, createInitialState, normalizeState, createProject, updateProject, addAction,
    toggleAction, deleteAction, addProjectItem, deleteProjectItem, archiveProject, getPortfolio,
    priorityScore, importState, exportState, buildHandoff
  };
});
