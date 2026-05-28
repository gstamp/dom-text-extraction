export interface MetaTag {
	name?: string | null;
	property?: string | null;
	content: string | null;
}

/** Structured article + page metadata from Defuddle, plus derived fields. */
export interface ExtractedWebContent {
	author: string;
	/** Article HTML from Defuddle (readable body markup). */
	content: string;
	/** Markdown rendered from `content` for `url` (via `defuddle/full`). */
	markdown: string;
	description: string;
	domain: string;
	/** Extra template-style variables (e.g. transcripts) keyed by name → string value. */
	extractedContent: Record<string, string>;
	favicon: string;
	/** Sanitized document HTML snapshot (scripts/styles stripped, URLs absolutized). */
	fullHtml: string;
	image: string;
	language: string;
	metaTags: MetaTag[];
	parseTime: number;
	published: string;
	schemaOrgData: unknown;
	site: string;
	title: string;
	wordCount: number;
}

export interface DocumentParser {
	parseFromString(html: string, mimeType: string): Document;
}

export interface ExtractWebContentOptions {
	url: string;
	/** Base URI for resolving relatives in `fullHtml` (defaults to `url`). */
	baseUri?: string;
	/** Use Obsidian Clipper reader-view parsing rules when present in the DOM. */
	readerClipMode?: boolean;
	/**
	 * Race `parseAsync` against this timeout (ms), then fall back to sync `parse`.
	 * Pass `null` to always use sync `parse()` (recommended for Node / linkedom).
	 */
	parseAsyncTimeoutMs?: number | null;
}

/** How to represent `<ruby>` / `<rt>` furigana in plain text. */
export type FuriganaMode = 'STRIP' | 'INCLUDE_IN_BRACES' | 'AS_IS';

/** Options for plain-text extraction (same as web content, plus optional parser). */
export type ExtractPlainTextOptions = ExtractWebContentOptions & {
	documentParser?: DocumentParser;
	/** Default: `STRIP` (omit furigana). */
	furigana?: FuriganaMode;
};

/** Options for {@link htmlFragmentToPlainText}. */
export interface PlainTextOptions {
	/** Default: `STRIP` (omit furigana). */
	furigana?: FuriganaMode;
}
