import type { parseHTML } from 'linkedom';
import type { DocumentParser } from './types.js';

type ParseHTML = typeof parseHTML;

/**
 * DocumentParser backed by linkedom (install `linkedom` alongside this package).
 */
export function createLinkedomDocumentParser(parseHTML: ParseHTML): DocumentParser {
	return {
		parseFromString(html: string, _mimeType: string) {
			return parseHTML(html).document;
		},
	};
}
