/*
 * Rocket.Chat incoming-webhook script for a Linear velocity feed.
 *
 * Paste into Administration > Integrations > (incoming webhook) > Script, with
 * "Script Enabled" on, and point a Linear webhook (resources: Issues, Cycles)
 * at the integration's URL. Setup: docs/features/socialparlay-linear-feed.md
 *
 * Only movement is posted: an issue being created, started, finished or
 * cancelled, moving between workflow states, joining or leaving a cycle, and
 * cycles starting or completing. Comments, edits, labels, priority and
 * assignee changes return nothing, which tells Rocket.Chat to post nothing.
 *
 * Deliveries are authenticated with Linear's signing secret when one is set
 * below. The repo copy keeps it blank; fill it in on the server only.
 */

const LINEAR_WEBHOOK_SECRET = '';
const MAX_DELIVERY_AGE_MS = 60 * 1000;

const COLORS = {
	created: '#7C8AA5',
	started: '#1F5D7A',
	completed: '#94B66A',
	canceled: '#B43C4C',
	moved: '#3C4C6E',
	cycle: '#D7B95C',
};

const STATE_EMOJI = {
	started: ':arrow_forward:',
	completed: ':white_check_mark:',
	canceled: ':no_entry:',
	backlog: ':leftwards_arrow_with_hook:',
	unstarted: ':leftwards_arrow_with_hook:',
	triage: ':leftwards_arrow_with_hook:',
};

const DAY = 24 * 60 * 60 * 1000;

/* ---- SHA-256 / HMAC, since the integration sandbox has no crypto API ---- */

const SHA256_K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
	0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
	0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
	0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
	0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
	0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const utf8Bytes = (str) => {
	const out = [];
	for (let i = 0; i < str.length; i++) {
		let c = str.charCodeAt(i);
		if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
			const d = str.charCodeAt(i + 1);
			if (d >= 0xdc00 && d <= 0xdfff) {
				c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
				i++;
			}
		}
		if (c < 0x80) {
			out.push(c);
		} else if (c < 0x800) {
			out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
		} else if (c < 0x10000) {
			out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
		} else {
			out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
		}
	}
	return out;
};

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

const sha256 = (bytes) => {
	const len = bytes.length;
	const padded = bytes.slice();
	padded.push(0x80);
	while (padded.length % 64 !== 56) {
		padded.push(0);
	}
	const bits = len * 8;
	padded.push(0, 0, 0, Math.floor(bits / 0x100000000) & 0xff, (bits >>> 24) & 0xff, (bits >>> 16) & 0xff, (bits >>> 8) & 0xff, bits & 0xff);

	const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
	const w = new Array(64);

	for (let offset = 0; offset < padded.length; offset += 64) {
		for (let i = 0; i < 16; i++) {
			const p = offset + i * 4;
			w[i] = (padded[p] << 24) | (padded[p + 1] << 16) | (padded[p + 2] << 8) | padded[p + 3];
		}
		for (let i = 16; i < 64; i++) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
		}
		let [a, b, c, d, e, f, g, hh] = h;
		for (let i = 0; i < 64; i++) {
			const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
			const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (S0 + maj) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = (d + t1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) >>> 0;
		}
		h[0] = (h[0] + a) >>> 0;
		h[1] = (h[1] + b) >>> 0;
		h[2] = (h[2] + c) >>> 0;
		h[3] = (h[3] + d) >>> 0;
		h[4] = (h[4] + e) >>> 0;
		h[5] = (h[5] + f) >>> 0;
		h[6] = (h[6] + g) >>> 0;
		h[7] = (h[7] + hh) >>> 0;
	}

	const out = [];
	for (const v of h) {
		out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
	}
	return out;
};

const hmacSha256Hex = (key, message) => {
	let k = utf8Bytes(key);
	if (k.length > 64) {
		k = sha256(k);
	}
	while (k.length < 64) {
		k.push(0);
	}
	const inner = sha256(k.map((b) => b ^ 0x36).concat(utf8Bytes(message)));
	const outer = sha256(k.map((b) => b ^ 0x5c).concat(inner));
	return outer.map((b) => (b < 16 ? '0' : '') + b.toString(16)).join('');
};

const constantTimeEqual = (a, b) => {
	if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
};

/*
 * Linear sends the HMAC-SHA256 hex of the raw body in `Linear-Signature` and
 * echoes the send time in the body as `webhookTimestamp`.
 */
const isAuthentic = (request, payload) => {
	if (!LINEAR_WEBHOOK_SECRET) {
		return true;
	}
	const headers = request.headers || {};
	const signature = headers['linear-signature'] || headers['Linear-Signature'];
	if (!signature || typeof request.content_raw !== 'string') {
		return false;
	}
	if (!constantTimeEqual(hmacSha256Hex(LINEAR_WEBHOOK_SECRET, request.content_raw), String(signature).toLowerCase())) {
		return false;
	}
	const sentAt = Number(payload && payload.webhookTimestamp);
	return Number.isFinite(sentAt) && Math.abs(Date.now() - sentAt) <= MAX_DELIVERY_AGE_MS;
};

/* ---- Event formatting ---- */

const elapsed = (from, to) => {
	if (!from || !to) {
		return null;
	}
	const ms = new Date(to) - new Date(from);
	if (!(ms >= 0)) {
		return null;
	}
	if (ms < DAY) {
		const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
		return `${hours}h`;
	}
	const days = ms / DAY;
	return days < 10 ? `${days.toFixed(1)}d` : `${Math.round(days)}d`;
};

const last = (history) => (Array.isArray(history) && history.length ? history[history.length - 1] : null);

const issueLink = (issue) => `[${issue.identifier}](${issue.url}) ${issue.title}`;

const issueFields = (issue, extra) => {
	const fields = [];
	if (issue.state && issue.state.name) {
		fields.push({ short: true, title: 'State', value: issue.state.name });
	}
	if (issue.assignee && issue.assignee.name) {
		fields.push({ short: true, title: 'Assignee', value: issue.assignee.name });
	}
	if (issue.estimate !== undefined && issue.estimate !== null) {
		fields.push({ short: true, title: 'Estimate', value: String(issue.estimate) });
	}
	if (issue.cycle && (issue.cycle.name || issue.cycle.number !== undefined)) {
		fields.push({ short: true, title: 'Cycle', value: issue.cycle.name || `Cycle ${issue.cycle.number}` });
	}
	return fields.concat(extra || []);
};

const message = (text, color, fields) => ({
	content: {
		text,
		attachments: [{ color, fields }],
	},
});

const issueEvent = ({ action, data: issue, updatedFrom, actor }) => {
	if (!issue || !issue.identifier) {
		return;
	}
	const who = actor && actor.name ? ` by ${actor.name}` : '';
	const team = issue.team && issue.team.key ? ` · ${issue.team.key}` : '';

	if (action === 'create') {
		return message(`:new: Created ${issueLink(issue)}${who}${team}`, COLORS.created, issueFields(issue));
	}

	if (action !== 'update' || !updatedFrom) {
		return;
	}

	const stateChanged = Object.prototype.hasOwnProperty.call(updatedFrom, 'stateId');
	const cycleChanged = Object.prototype.hasOwnProperty.call(updatedFrom, 'cycleId');

	if (stateChanged && issue.state) {
		const { type } = issue.state;
		const emoji = STATE_EMOJI[type] || ':twisted_rightwards_arrows:';

		if (type === 'completed') {
			const took = elapsed(issue.startedAt || issue.createdAt, issue.completedAt);
			const extra = took ? [{ short: true, title: 'Took', value: took }] : [];
			return message(`${emoji} Done ${issueLink(issue)}${who}${team}`, COLORS.completed, issueFields(issue, extra));
		}
		if (type === 'canceled') {
			return message(`${emoji} Cancelled ${issueLink(issue)}${who}${team}`, COLORS.canceled, issueFields(issue));
		}
		if (type === 'started') {
			return message(`${emoji} Started ${issueLink(issue)}${who}${team}`, COLORS.started, issueFields(issue));
		}
		return message(`${emoji} ${issue.state.name}: ${issueLink(issue)}${who}${team}`, COLORS.moved, issueFields(issue));
	}

	if (cycleChanged) {
		const target = issue.cycle ? issue.cycle.name || `Cycle ${issue.cycle.number}` : null;
		const text = target
			? `:calendar: Added to ${target}: ${issueLink(issue)}${who}${team}`
			: `:calendar: Removed from cycle: ${issueLink(issue)}${who}${team}`;
		return message(text, COLORS.cycle, issueFields(issue));
	}
};

const cycleEvent = ({ action, data: cycle, updatedFrom }) => {
	if (!cycle) {
		return;
	}
	const name = cycle.name || `Cycle ${cycle.number}`;
	const planned = last(cycle.issueCountHistory);
	const done = last(cycle.completedIssueCountHistory);
	const counts = planned !== null && done !== null ? `${done} of ${planned} issues done` : null;

	if (action === 'create') {
		const window = cycle.startsAt && cycle.endsAt ? `${cycle.startsAt.slice(0, 10)} to ${cycle.endsAt.slice(0, 10)}` : null;
		return message(`:rocket: ${name} created${window ? ` (${window})` : ''}`, COLORS.cycle, []);
	}

	const justCompleted =
		action === 'update' && updatedFrom && Object.prototype.hasOwnProperty.call(updatedFrom, 'completedAt') && cycle.completedAt;
	if (justCompleted) {
		return message(`:checkered_flag: ${name} completed${counts ? `: ${counts}` : ''}`, COLORS.cycle, []);
	}
};

// Instantiated by Rocket.Chat's integration sandbox, not by this file.
// eslint-disable-next-line no-unused-vars
class Script {
	process_incoming_request({ request }) {
		const payload = request.content;
		if (!payload || typeof payload !== 'object') {
			return;
		}
		if (!isAuthentic(request, payload)) {
			return { error: { success: false, message: 'Linear signature missing, invalid or stale' } };
		}
		if (payload.type === 'Issue') {
			return issueEvent(payload);
		}
		if (payload.type === 'Cycle') {
			return cycleEvent(payload);
		}
	}
}
