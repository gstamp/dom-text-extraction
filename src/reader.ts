import * as DefuddleNS from 'defuddle';
import { setElementHTML } from './dom-mini.js';

/**
 * When the page is Obsidian Clipper's reader view, parse from the original article HTML
 * to avoid reader chrome (same logic as Obsidian Clipper `parseForClip`).
 */
export function parseDocumentForClip(doc: Document, pageUrl: string) {
	const readerArticle = doc.querySelector(
		'.obsidian-reader-active .obsidian-reader-content article',
	);
	if (readerArticle) {
		const readerDoc = doc.implementation.createHTMLDocument();
		const originalHtml = readerArticle.getAttribute('data-original-html');
		if (originalHtml) {
			setElementHTML(readerDoc.body, originalHtml);
		} else {
			readerDoc.body.replaceChildren(
				...Array.from(readerArticle.childNodes).map((n) => readerDoc.importNode(n, true)),
			);
		}
		const Defuddle: any = (DefuddleNS as any).default ?? (DefuddleNS as any);
		return new Defuddle(readerDoc, { url: '' }).parse();
	}
	const Defuddle: any = (DefuddleNS as any).default ?? (DefuddleNS as any);
	return new Defuddle(doc, { url: pageUrl }).parse();
}
