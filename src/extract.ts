import * as DefuddleNS from 'defuddle';
import * as DefuddleFullNS from 'defuddle/full';
import { buildCleanFullHtml } from './clean-html.js';
import { htmlFragmentToPlainText } from './plain-text.js';
import { parseDocumentForClip } from './reader.js';
import type {
	DocumentParser,
	ExtractedWebContent,
	ExtractPlainTextOptions,
	ExtractWebContentOptions,
} from './types.js';
import { getDomain } from './url.js';

function hasParseAsync(defuddle: { parseAsync?: () => Promise<unknown> }): boolean {
	return typeof defuddle.parseAsync === 'function';
}

async function parseDefuddle(doc: Document, pageUrl: string, timeoutMs: number | null) {
	const Defuddle: any = (DefuddleNS as any).default ?? (DefuddleNS as any);
	const defuddle = new Defuddle(doc, { url: pageUrl });
	if (timeoutMs === null || !hasParseAsync(defuddle)) {
		return defuddle.parse();
	}

	const parseTimeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('parseAsync timeout')), timeoutMs),
	);

	try {
		return await Promise.race([defuddle.parseAsync(), parseTimeout]);
	} catch {
		return defuddle.parse();
	}
}

/**
 * Run the Obsidian Clipper–style pipeline on a live or parsed `Document`:
 * Defuddle (async with timeout in browsers, optional), cleaned `fullHtml`, markdown body.
 */
export async function extractWebContentFromDocument(
	doc: Document,
	options: ExtractWebContentOptions,
): Promise<ExtractedWebContent> {
	const pageUrl = options.url;
	const baseUri = options.baseUri ?? pageUrl;
	const timeoutMs = options.parseAsyncTimeoutMs ?? 8000;

	const defuddleResult = options.readerClipMode
		? parseDocumentForClip(doc, pageUrl)
		: await parseDefuddle(doc, pageUrl, timeoutMs);

	const extractedContent: Record<string, string> = { ...defuddleResult.variables };
	const fullHtml = await buildCleanFullHtml(doc, baseUri);
	const createMarkdownContent: any =
		(DefuddleFullNS as any).createMarkdownContent ??
		(DefuddleFullNS as any).default?.createMarkdownContent ??
		(DefuddleFullNS as any).default;
	if (typeof createMarkdownContent !== 'function') {
		throw new Error('defuddle/full: createMarkdownContent export not found');
	}
	// `defuddle/full` currently assumes a browser-like global `document`, including
	// `document.implementation.createHTMLDocument()`. Provide a temporary shim in Node.
	const prevDocument = (globalThis as any).document;
	const prevHadDocument = 'document' in globalThis && prevDocument;
	const prevHasImpl = !!prevDocument?.implementation?.createHTMLDocument;

	if (!prevHadDocument || !prevHasImpl) {
		let shimDoc: any = doc;
		if (!shimDoc.implementation) shimDoc.implementation = {};
		if (typeof shimDoc.implementation.createHTMLDocument !== 'function') {
			shimDoc.implementation.createHTMLDocument = () => {
				// Create a fresh empty HTML document via linkedom if available.
				// (Used by Turndown internally.)
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				try {
					// Prefer dynamic import (ESM) to keep it optional in browsers.
					throw new Error('use-dynamic-import');
				} catch {
					// replaced below
				}
			};
			try {
				const { parseHTML } = await import('linkedom');
				shimDoc.implementation.createHTMLDocument = () => {
					const d: any = parseHTML('<!doctype html><html><head></head><body></body></html>').document;
					// Turndown expects HTMLDocument-like open/write/close.
					d.open = () => d;
					d.write = (s: string) => {
						(d.documentElement as any).innerHTML = s;
					};
					d.close = () => {};
					return d as Document;
				};
			} catch {
				// If linkedom isn't available, keep the shim; Turndown may still fail,
				// but this keeps browser builds clean.
			}
		}
		(globalThis as any).document = shimDoc;
	}
	try {
		const markdown = createMarkdownContent(defuddleResult.content, pageUrl);
		return {
			author: defuddleResult.author,
			content: defuddleResult.content,
			markdown,
			description: defuddleResult.description,
			domain: getDomain(pageUrl),
			extractedContent,
			favicon: defuddleResult.favicon,
			fullHtml,
			image: defuddleResult.image,
			language: defuddleResult.language || '',
			metaTags: defuddleResult.metaTags || [],
			parseTime: defuddleResult.parseTime,
			published: defuddleResult.published,
			schemaOrgData: defuddleResult.schemaOrgData,
			site: defuddleResult.site,
			title: defuddleResult.title,
			wordCount: defuddleResult.wordCount,
		};
	} finally {
		if (!prevHadDocument) {
			delete (globalThis as any).document;
		} else if (!prevHasImpl) {
			(globalThis as any).document = prevDocument;
		}
	}
}

async function extractArticleHtmlFromDocument(
	doc: Document,
	options: ExtractWebContentOptions,
): Promise<string> {
	const pageUrl = options.url;
	const timeoutMs = options.parseAsyncTimeoutMs ?? 8000;

	const defuddleResult = options.readerClipMode
		? parseDocumentForClip(doc, pageUrl)
		: await parseDefuddle(doc, pageUrl, timeoutMs);

	return defuddleResult.content;
}

/**
 * Extract readable article body as plain text (no markdown conversion).
 */
export async function extractPlainTextFromDocument(
	doc: Document,
	options: ExtractPlainTextOptions,
): Promise<string> {
	const articleHtml = await extractArticleHtmlFromDocument(doc, options);
	const parser = options.documentParser ?? getDefaultDocumentParser();
	return htmlFragmentToPlainText(articleHtml, parser);
}

/** Parse HTML, then run {@link extractPlainTextFromDocument}. */
export async function extractPlainTextFromHtml(
	html: string,
	options: ExtractPlainTextOptions,
): Promise<string> {
	const parser = options.documentParser ?? getDefaultDocumentParser();
	const doc = parser.parseFromString(html, 'text/html' as DOMParserSupportedType);
	return extractPlainTextFromDocument(doc, options);
}

function getDefaultDocumentParser(): DocumentParser {
	if (typeof DOMParser === 'undefined') {
		throw new Error(
			'DOMParser is not available. Pass `documentParser` (see `dom-text-extraction/linkedom`) or run in a browser.',
		);
	}
	return {
		parseFromString(html: string, mimeType: string) {
			return new DOMParser().parseFromString(html, mimeType as DOMParserSupportedType);
		},
	};
}

/** Parse HTML, then run {@link extractWebContentFromDocument}. */
export async function extractWebContentFromHtml(
	html: string,
	options: ExtractWebContentOptions & { documentParser?: DocumentParser },
): Promise<ExtractedWebContent> {
	const parser = options.documentParser ?? getDefaultDocumentParser();
	const doc = parser.parseFromString(html, 'text/html' as DOMParserSupportedType);
	return extractWebContentFromDocument(doc, options);
}

/**
 * Convenience alias for {@link extractPlainTextFromHtml}.
 * @deprecated Prefer `extractPlainTextFromHtml` for the options-object API.
 */
export async function extractText(
	html: string,
	pageUrl: string,
	documentParser?: DocumentParser,
): Promise<string> {
	return extractPlainTextFromHtml(html, {
		url: pageUrl,
		documentParser,
		parseAsyncTimeoutMs: null,
	});
}
