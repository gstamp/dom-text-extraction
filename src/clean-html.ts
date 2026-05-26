/**
 * Clone the live document into a standalone tree and strip scripts, inline styles,
 * and absolutize URLs — same approach as Obsidian Clipper's `getPageContent`.
 */
export async function buildCleanFullHtml(source: Document, baseUri: string): Promise<string> {
	// Clone into a standalone document without requiring DOMParser.
	// Works in browsers, and in Node when `source` is a linkedom Document.
	// Fast clone: parse the serialized HTML via DOMParser (browser) or linkedom (Node).
	const serialized = (source.documentElement as any)?.outerHTML;
	if (!serialized) return '';

	let doc: Document;
	if (typeof DOMParser !== 'undefined') {
		doc = new DOMParser().parseFromString(serialized, 'text/html' as DOMParserSupportedType);
	} else {
		// linkedom path (Node)
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		let parseHTML: any;
		try {
			// In NodeNext builds, require may not exist; fall back to dynamic import.
			parseHTML = (await import('linkedom')).parseHTML;
		} catch {
			throw new Error('DOMParser is not available; install `linkedom` for Node usage');
		}
		doc = parseHTML(serialized).document;
	}

	doc.querySelectorAll('script, style').forEach((el) => el.remove());
	doc.querySelectorAll('*').forEach((el) => el.removeAttribute('style'));

	doc.querySelectorAll('[src], [href]').forEach((element) => {
		(['src', 'href', 'srcset'] as const).forEach((attr) => {
			const value = element.getAttribute(attr);
			if (!value) return;

			if (attr === 'srcset') {
				const newSrcset = value
					.split(',')
					.map((src) => {
						const [url, size] = src.trim().split(' ');
						if (!url) return src;
						try {
							const absoluteUrl = new URL(url, baseUri).href;
							return `${absoluteUrl}${size ? ` ${size}` : ''}`;
						} catch {
							return src;
						}
					})
					.join(', ');
				element.setAttribute(attr, newSrcset);
			} else if (
				!value.startsWith('http') &&
				!value.startsWith('data:') &&
				!value.startsWith('#') &&
				!value.startsWith('//')
			) {
				try {
					const absoluteUrl = new URL(value, baseUri).href;
					element.setAttribute(attr, absoluteUrl);
				} catch {
					// ignore invalid URLs
				}
			}
		});
	});

	return doc.documentElement.outerHTML;
}
