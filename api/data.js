// MARKED 2027 Planning Hub — single API endpoint (Vercel Node function)
// Storage: Upstash Redis (Vercel Marketplace). Falls back to in-memory demo mode when not configured.

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const COMMITTEE_CODE = process.env.COMMITTEE_CODE || '';
const ADMIN_CODE = process.env.ADMIN_CODE || '';
const DEMO = !R_URL || !R_TOKEN;

const POLLS = {
  date: ['A', 'B', 'C', 'D'],
  days: ['1', '2'],
  breakout: ['choose', 'rotate', 'hybrid'],
};
const WORKSTREAMS = ['director', 'program', 'counselling', 'logistics', 'registration', 'parents', 'media'];
const STATUSES = ['Not started', 'In progress', 'Done', 'Blocked'];

const SEED_TASKS = [
  ['director', 'Share the planning pack and this hub with all members', '2026-11-05'],
  ['director', 'Confirm workstream leads and members', '2026-11-10'],
  ['director', 'Confirm the program date with the Conference', '2026-11-15'],
  ['director', 'Set a draft budget ceiling', '2026-11-20'],
  ['program', 'Shortlist 2 possible speakers per main session', '2026-11-20'],
  ['program', 'Draft list of breakout facilitators', '2026-11-20'],
  ['program', 'Compile career list + people/companies for "Meet a Professional"', '2026-12-15'],
  ['program', 'Music team for opening worship confirmed', '2027-01-31'],
  ['program', 'Real Talk teen host and two teen speakers identified and prepared', '2027-02-15'],
  ['counselling', 'Names of 6–8 possible counsellors (licensed/trained)', '2026-11-20'],
  ['counselling', 'Draft one-page parental consent form', '2026-11-20'],
  ['counselling', 'Draft "what to do if a teen discloses harm" card', '2026-11-20'],
  ['counselling', 'Safeguarding training for all volunteers', '2027-02-28'],
  ['logistics', '2–3 venue options compared (capacity 400+, side rooms, cost, parking)', '2026-11-20'],
  ['logistics', 'Rough feeding cost per head', '2026-11-20'],
  ['logistics', 'Transport plan per district', '2026-11-20'],
  ['logistics', 'Venue booked', '2026-12-15'],
  ['logistics', 'Site walk-through and run-of-day rehearsal', '2027-03-27'],
  ['registration', 'One coordinator named per district (6)', '2026-11-20'],
  ['registration', 'Draft registration form (paper + Google Form)', '2026-11-20'],
  ['registration', 'Registration opens in all districts', '2027-01-15'],
  ['registration', 'Final registration numbers', '2027-03-20'],
  ['parents', 'Draft message to pastors announcing the date', '2026-11-20'],
  ['parents', 'Shortlist 2 speakers for the parents\' session', '2026-11-20'],
  ['parents', 'Teen mentor pair named in every local church', '2027-02-28'],
  ['media', 'Draft budget template', '2026-11-20'],
  ['media', '3 sponsorship ideas', '2026-11-20'],
  ['media', 'Save-the-date flyer', '2026-12-10'],
  ['media', 'Sponsorship secured', '2027-02-28'],
];

// ---------- storage ----------
const mem = globalThis.__markedMem || (globalThis.__markedMem = {});
function memExec(cmd) {
  const [op, key, ...a] = cmd;
  const h = mem[key] || (mem[key] = {});
  switch (op) {
    case 'HGETALL': return Object.entries(h).flat();
    case 'HGET': return h[a[0]] ?? null;
    case 'HSET': for (let i = 0; i < a.length; i += 2) h[a[i]] = a[i + 1]; return 1;
    case 'HDEL': { const had = a[0] in h; delete h[a[0]]; return had ? 1 : 0; }
    default: throw new Error('unsupported ' + op);
  }
}
async function redis(cmds) {
  if (DEMO) return cmds.map(memExec);
  const r = await fetch(R_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + R_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('storage ' + r.status);
  const j = await r.json();
  return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const K = s => 'marked27:' + s;
function parseHash(flat) {
  const out = [];
  for (let i = 0; i < (flat || []).length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch (_) {} }
  return out;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

async function loadAll() {
  const keys = ['tasks', 'comments', 'careers', 'team', 'decisions', ...Object.keys(POLLS).map(p => 'votes:' + p)];
  const res = await redis(keys.map(k => ['HGETALL', K(k)]));
  const data = {};
  keys.forEach((k, i) => { data[k] = parseHash(res[i]); });
  if (data.tasks.length === 0) {
    const cmds = SEED_TASKS.map(([ws, title, due], i) => {
      const t = { id: 'seed' + String(i).padStart(2, '0'), ws, title, due, owner: '', status: 'Not started', note: '', updatedBy: '', updatedAt: 0 };
      data.tasks.push(t);
      return ['HSET', K('tasks'), t.id, JSON.stringify(t)];
    });
    await redis(cmds);
  }
  const votes = {};
  Object.keys(POLLS).forEach(p => { votes[p] = data['votes:' + p]; delete data['votes:' + p]; });
  data.votes = votes;
  return data;
}

// ---------- handler ----------
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const data = await loadAll();
      return res.status(200).json({ ok: true, demo: DEMO, ...data });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
    b = b || {};
    const name = clip(b.name, 60);
    const code = String(b.code || '');
    const isAdmin = !!ADMIN_CODE && code === ADMIN_CODE;
    const isMember = isAdmin || !COMMITTEE_CODE || code === COMMITTEE_CODE;
    if (!isMember) return res.status(401).json({ ok: false, error: 'Wrong committee code' });
    if (!name) return res.status(400).json({ ok: false, error: 'Please enter your name' });
    const now = Date.now();
    const needAdmin = () => { if (!isAdmin) { res.status(403).json({ ok: false, error: 'Only the Director (admin code) can do this' }); return true; } return false; };

    switch (b.action) {
      case 'ping':
        return res.json({ ok: true, admin: isAdmin });

      case 'comment': {
        const text = clip(b.text, 1500), thread = clip(b.thread, 60);
        if (!text || !thread) return res.status(400).json({ ok: false, error: 'Empty comment' });
        const c = { id: uid(), thread, name, text, ts: now };
        await redis([['HSET', K('comments'), c.id, JSON.stringify(c)]]);
        return res.json({ ok: true });
      }
      case 'deleteComment': {
        const raw = (await redis([['HGET', K('comments'), clip(b.id, 40)]]))[0];
        if (!raw) return res.json({ ok: true });
        const c = JSON.parse(raw);
        if (!isAdmin && c.name.toLowerCase() !== name.toLowerCase()) return res.status(403).json({ ok: false, error: 'You can only delete your own comments' });
        await redis([['HDEL', K('comments'), c.id]]);
        return res.json({ ok: true });
      }
      case 'vote': {
        const poll = clip(b.poll, 20), option = clip(b.option, 20), reason = clip(b.reason, 800);
        if (!POLLS[poll] || !POLLS[poll].includes(option)) return res.status(400).json({ ok: false, error: 'Invalid option' });
        if (reason.length < 5) return res.status(400).json({ ok: false, error: 'Please give a short reason for your vote' });
        const v = { name, option, reason, ts: now };
        await redis([['HSET', K('votes:' + poll), name.toLowerCase(), JSON.stringify(v)]]);
        return res.json({ ok: true });
      }
      case 'career': {
        const career = clip(b.career, 80);
        if (!career) return res.status(400).json({ ok: false, error: 'Enter a career' });
        const c = { id: uid(), career, who: clip(b.who, 200), contact: clip(b.contact, 120), name, ts: now };
        await redis([['HSET', K('careers'), c.id, JSON.stringify(c)]]);
        return res.json({ ok: true });
      }
      case 'deleteCareer': {
        const raw = (await redis([['HGET', K('careers'), clip(b.id, 40)]]))[0];
        if (!raw) return res.json({ ok: true });
        const c = JSON.parse(raw);
        if (!isAdmin && c.name.toLowerCase() !== name.toLowerCase()) return res.status(403).json({ ok: false, error: 'You can only delete your own entries' });
        await redis([['HDEL', K('careers'), c.id]]);
        return res.json({ ok: true });
      }
      case 'join': {
        const ws = (Array.isArray(b.workstreams) ? b.workstreams : []).filter(w => WORKSTREAMS.includes(w)).slice(0, 3);
        if (!ws.length) return res.status(400).json({ ok: false, error: 'Pick at least one workstream' });
        const m = { name, workstreams: ws, lead: !!b.lead, hours: clip(b.hours, 40), note: clip(b.note, 400), ts: now };
        await redis([['HSET', K('team'), name.toLowerCase(), JSON.stringify(m)]]);
        return res.json({ ok: true });
      }
      case 'taskUpdate': {
        const raw = (await redis([['HGET', K('tasks'), clip(b.id, 40)]]))[0];
        if (!raw) return res.status(404).json({ ok: false, error: 'Task not found' });
        const t = JSON.parse(raw);
        if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return res.status(400).json({ ok: false, error: 'Bad status' }); t.status = b.status; }
        if (b.owner !== undefined) t.owner = clip(b.owner, 60);
        if (b.note !== undefined) t.note = clip(b.note, 400);
        t.updatedBy = name; t.updatedAt = now;
        await redis([['HSET', K('tasks'), t.id, JSON.stringify(t)]]);
        return res.json({ ok: true });
      }
      case 'taskAdd': {
        if (needAdmin()) return;
        const ws = WORKSTREAMS.includes(b.ws) ? b.ws : 'director';
        const title = clip(b.title, 200);
        if (!title) return res.status(400).json({ ok: false, error: 'Enter a task' });
        const t = { id: uid(), ws, title, due: clip(b.due, 10), owner: clip(b.owner, 60), status: 'Not started', note: '', updatedBy: name, updatedAt: now };
        await redis([['HSET', K('tasks'), t.id, JSON.stringify(t)]]);
        return res.json({ ok: true });
      }
      case 'taskEdit': {
        if (needAdmin()) return;
        const raw = (await redis([['HGET', K('tasks'), clip(b.id, 40)]]))[0];
        if (!raw) return res.status(404).json({ ok: false, error: 'Task not found' });
        const t = JSON.parse(raw);
        if (b.title) t.title = clip(b.title, 200);
        if (b.due !== undefined) t.due = clip(b.due, 10);
        if (b.ws && WORKSTREAMS.includes(b.ws)) t.ws = b.ws;
        t.updatedBy = name; t.updatedAt = now;
        await redis([['HSET', K('tasks'), t.id, JSON.stringify(t)]]);
        return res.json({ ok: true });
      }
      case 'taskDelete': {
        if (needAdmin()) return;
        await redis([['HDEL', K('tasks'), clip(b.id, 40)]]);
        return res.json({ ok: true });
      }
      case 'decision': {
        if (needAdmin()) return;
        const text = clip(b.text, 600);
        if (!text) return res.status(400).json({ ok: false, error: 'Empty decision' });
        const d = { id: uid(), text, date: clip(b.date, 10) || new Date(now).toISOString().slice(0, 10), name, ts: now };
        await redis([['HSET', K('decisions'), d.id, JSON.stringify(d)]]);
        return res.json({ ok: true });
      }
      case 'deleteDecision': {
        if (needAdmin()) return;
        await redis([['HDEL', K('decisions'), clip(b.id, 40)]]);
        return res.json({ ok: true });
      }
      default:
        return res.status(400).json({ ok: false, error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Server error: ' + e.message });
  }
};
