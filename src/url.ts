/**
 * Registered domain / hostname label suitable for display (mirrors Obsidian Clipper).
 */
export function getDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;

		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
			return hostname;
		}

		const hostParts = hostname.split('.');

		if (hostParts.length > 2) {
			const lastTwo = hostParts.slice(-2).join('.');
			if (lastTwo.match(/^(co|com|org|net|edu|gov|mil)\.[a-z]{2}$/)) {
				return hostParts.slice(-3).join('.');
			}
		}

		return hostParts.slice(-2).join('.');
	} catch {
		return '';
	}
}
