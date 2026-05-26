/** Minimal `setElementHTML` (works in browsers and linkedom). */
export function setElementHTML(element: Element, html: string): void {
	// Prefer native innerHTML when available (works in browsers and linkedom).
	if ('innerHTML' in (element as any)) {
		(element as any).innerHTML = html;
		return;
	}

	// Fallback for environments without innerHTML.
	if (typeof DOMParser === 'undefined') {
		throw new Error('DOMParser is not available and element.innerHTML is unsupported');
	}
	const parsed = new DOMParser().parseFromString(html, 'text/html' as DOMParserSupportedType);
	element.replaceChildren(...Array.from(parsed.body.childNodes));
}
