import type { DocumentParser, FuriganaMode, PlainTextOptions } from './types.js';

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
export function htmlFragmentToPlainText(
	html: string,
	documentParser: DocumentParser,
	options: PlainTextOptions = {},
): string {
	const fragment = html.trim().startsWith('<') ? html : `<div>${html}</div>`;
	// Wrap in a full document so parsers (e.g. linkedom) place nodes under `body`.
	const doc = documentParser.parseFromString(
		`<!doctype html><html><head></head><body>${fragment}</body></html>`,
		'text/html' as DOMParserSupportedType,
	);
	const root = doc.body?.childNodes?.length ? doc.body : doc.documentElement;
	return normalizePlainText(nodeToPlainText(root, options));
}

function nodeToPlainText(node: Node, options: PlainTextOptions): string {
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

	if (tag === 'RUBY') {
		const furigana = options.furigana ?? 'STRIP';
		if (furigana !== 'AS_IS') {
			return rubyToPlainText(el, furigana);
		}
	}

	let text = '';
	for (const child of Array.from(el.childNodes)) {
		text += nodeToPlainText(child, options);
	}

	if (BLOCK_TAGS.has(tag)) {
		return `${text}\n`;
	}
	return text;
}

function rubyToPlainText(ruby: Element, furigana: Exclude<FuriganaMode, 'AS_IS'>): string {
	let text = '';
	let skipRpFallback = false;

	for (const child of Array.from(ruby.childNodes)) {
		if (child.nodeType === TEXT_NODE) {
			if (!skipRpFallback) {
				text += child.textContent ?? '';
			}
			continue;
		}
		if (child.nodeType !== ELEMENT_NODE) {
			continue;
		}

		const el = child as Element;
		const tag = el.tagName;
		if (tag === 'RP') {
			skipRpFallback = !skipRpFallback;
			continue;
		}
		if (skipRpFallback) {
			continue;
		}
		if (tag === 'RT') {
			if (furigana === 'INCLUDE_IN_BRACES') {
				const rtText = normalizeRubyAnnotation(el.textContent ?? '');
				if (rtText) {
					text += `{${rtText}}`;
				}
			}
			continue;
		}
		if (tag === 'RB' || tag === 'RBC') {
			text += el.textContent ?? '';
			continue;
		}
		if (tag === 'RTC') {
			if (furigana === 'INCLUDE_IN_BRACES') {
				for (const rtcChild of Array.from(el.childNodes)) {
					if (rtcChild.nodeType !== ELEMENT_NODE) {
						continue;
					}
					const rtcEl = rtcChild as Element;
					if (rtcEl.tagName !== 'RT') {
						continue;
					}
					const rtText = normalizeRubyAnnotation(rtcEl.textContent ?? '');
					if (rtText) {
						text += `{${rtText}}`;
					}
				}
			}
			continue;
		}

		text += nodeToPlainText(child, { furigana });
	}
	return text;
}

function normalizeRubyAnnotation(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

const normalizeElementText = (text: string) => text.replace(/\s+/g, '');

/** Elements Defuddle may flatten to plain text, dropping `<ruby>` markup. */
const RESTORE_RUBY_CONTENT_SELECTORS = [
	'h1,h2,h3,h4,h5,h6',
	'figcaption',
	'.callout-title-inner',
].join(',');

const RESTORE_RUBY_SOURCE_SELECTORS = [
	'article h1,article h2,article h3,article h4,article h5,article h6',
	'article figcaption',
	'.admonition-title',
	'.alert-heading',
	'.alert-title',
	'.markdown-alert-title',
	'.callout-title-inner',
	'h1,h2,h3,h4,h5,h6',
	'figcaption',
].join(',');

/**
 * Defuddle sometimes flattens elements to plain `textContent`, dropping `<ruby>` markup.
 * Restore ruby-bearing elements from the source document when possible.
 */
export function restoreRubyMarkup(
	sourceDoc: Document,
	articleHtml: string,
	documentParser: DocumentParser,
): string {
	const parsed = documentParser.parseFromString(
		`<!doctype html><html><head></head><body>${articleHtml}</body></html>`,
		'text/html' as DOMParserSupportedType,
	);
	const contentRoot = parsed.body;
	if (!contentRoot) {
		return articleHtml;
	}

	const contentElements = [...contentRoot.querySelectorAll(RESTORE_RUBY_CONTENT_SELECTORS)];
	if (!contentElements.length) {
		return articleHtml;
	}

	const sourceElements = [...sourceDoc.querySelectorAll(RESTORE_RUBY_SOURCE_SELECTORS)];
	if (!sourceElements.length) {
		return articleHtml;
	}

	const usedSource = new Set<Element>();

	for (const dst of contentElements) {
		if (dst.querySelector('ruby')) {
			continue;
		}

		const dstText = normalizeElementText(dst.textContent ?? '');
		if (!dstText) {
			continue;
		}

		const src = sourceElements.find((candidate) => {
			if (usedSource.has(candidate)) {
				return false;
			}
			if (!candidate.querySelector('ruby')) {
				return false;
			}
			return normalizeElementText(candidate.textContent ?? '') === dstText;
		});
		if (!src) {
			continue;
		}

		usedSource.add(src);
		dst.innerHTML = src.innerHTML;
	}

	return contentRoot.innerHTML;
}

/** @deprecated Use {@link restoreRubyMarkup}. */
export const restoreHeadingRubyMarkup = restoreRubyMarkup;

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
