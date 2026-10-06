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
 */

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
		if (payload.type === 'Issue') {
			return issueEvent(payload);
		}
		if (payload.type === 'Cycle') {
			return cycleEvent(payload);
		}
	}
}
