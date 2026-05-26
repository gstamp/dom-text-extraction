import type { DocumentParser } from './types.js';

const BLOCK_TAGS = new Set([
	'ARTICLE',
	'ASIDE',
	'BLOCKQUOTE',
	'BR',
	'DD',
	'DIV',
	'DT',
	'FIGCAPTION',
	'FOOTER',
	'HEADER',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'HR',
	'LI',
	'MAIN',
	'NAV',
	'OL',
	'P',
	'PRE',
	'SECTION',
	'TABLE',
	'TD',
	'TH',
	'TR',
	'UL',
]);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'TEMPLATE']);

/** DOM node types (avoid relying on global `Node` in Node/linkedom). */
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Convert an HTML fragment (article body markup) to normalized plain text.
 */
export function htmlFragmentToPlainText(html: string, documentParser: DocumentParser): string {
	const fragment = html.trim().startsWith('<') ? html : `<div>${html}</div>`;
	// Wrap in a full document so parsers (e.g. linkedom) place nodes under `body`.
	const doc = documentParser.parseFromString(
		`<!doctype html><html><head></head><body>${fragment}</body></html>`,
		'text/html' as DOMParserSupportedType,
	);
	const root = doc.body?.childNodes?.length ? doc.body : doc.documentElement;
	return normalizePlainText(nodeToPlainText(root));
}

function nodeToPlainText(node: Node): string {
	if (node.nodeType === TEXT_NODE) {
		return node.textContent ?? '';
	}
	if (node.nodeType !== ELEMENT_NODE) {
		return '';
	}

	const el = node as Element;
	const tag = el.tagName;
	if (SKIP_TAGS.has(tag)) {
		return '';
	}
	if (tag === 'BR') {
		return '\n';
	}

	let text = '';
	for (const child of Array.from(el.childNodes)) {
		text += nodeToPlainText(child);
	}

	if (BLOCK_TAGS.has(tag)) {
		return `${text}\n`;
	}
	return text;
}

/** Collapse horizontal whitespace; preserve paragraph breaks. */
export function normalizePlainText(text: string): string {
	return text
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
