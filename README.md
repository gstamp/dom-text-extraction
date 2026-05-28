# dom-text-extraction

Extract readable article content and metadata from HTML (Defuddle-powered).

This library was ported from the text extraction pipeline in Obsidian Clipper.

## Install

```bash
npm i dom-text-extraction defuddle
```

### Node

For Node, also install `linkedom` (recommended parser):

```bash
npm i linkedom
```

## Usage

### Node (HTML string → markdown + metadata)

```ts
import { extractWebContentFromHtml, createLinkedomDocumentParser } from 'dom-text-extraction';
import { parseHTML } from 'linkedom';

const url = 'https://example.com';
const html = await (await fetch(url)).text();

const result = await extractWebContentFromHtml(html, {
  url,
  documentParser: createLinkedomDocumentParser(parseHTML),
  parseAsyncTimeoutMs: null,
});

console.log(result.markdown);
console.log({ title: result.title, author: result.author, wordCount: result.wordCount });
```

### Browser

```ts
import { extractWebContentFromHtml } from 'dom-text-extraction';

const result = await extractWebContentFromHtml(document.documentElement.outerHTML, {
  url: location.href,
});

console.log(result.markdown);
```

### Plain text only

```ts
import { extractPlainTextFromHtml, createLinkedomDocumentParser } from 'dom-text-extraction';
import { parseHTML } from 'linkedom';

const url = 'https://example.com';
const html = await (await fetch(url)).text();

const text = await extractPlainTextFromHtml(html, {
  url,
  documentParser: createLinkedomDocumentParser(parseHTML),
  parseAsyncTimeoutMs: null,
});

console.log(text);
```

#### Furigana (Japanese ruby text)

Plain-text extraction supports `<ruby>` / `<rt>` furigana via `options.furigana` (also accepted by `htmlFragmentToPlainText` as its third argument). Default is `STRIP`.

| Mode | Description | Example for `<ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>` |
|------|-------------|--------------------------------------------------------|
| `STRIP` (default) | Omit furigana annotations | `漢字` |
| `INCLUDE_IN_BRACES` | Keep furigana in braces after the base text | `漢{かん}字{じ}` |
| `AS_IS` | Inline ruby text as extracted from the DOM | `漢かん字じ` |

```ts
const text = await extractPlainTextFromHtml(html, {
  url,
  documentParser: createLinkedomDocumentParser(parseHTML),
  parseAsyncTimeoutMs: null,
  furigana: 'INCLUDE_IN_BRACES',
});
```

## API

- `extractWebContentFromHtml(html, options)`
  - Parses the HTML (via `options.documentParser` or browser `DOMParser`) and returns an `ExtractedWebContent`.
- `extractWebContentFromDocument(doc, options)`
  - Same pipeline, but starts from an existing `Document`.
- `extractPlainTextFromHtml(html, options)` / `extractPlainTextFromDocument(doc, options)`
  - Readable article body as plain text (skips markdown conversion).
  - `options.furigana`: `STRIP` (default), `INCLUDE_IN_BRACES`, or `AS_IS` — controls `<ruby>` / `<rt>` handling (see above).
- `extractText(html, url, documentParser?)`
  - Shorthand for `extractPlainTextFromHtml` (legacy positional args).
- `htmlFragmentToPlainText(html, documentParser, options?)`
  - Convert an HTML fragment to normalized plain text.
  - `options.furigana`: same furigana modes as plain-text extraction.
- `createLinkedomDocumentParser(parseHTML)`
  - Helper to build a `DocumentParser` using `linkedom`’s `parseHTML`.

## Notes

- This library **does not fetch URLs**; you provide `html`.
- In Node, set `parseAsyncTimeoutMs: null` (Defuddle’s async parsing is mainly for browsers).

## CHANGELOG

### 0.1.1

- Fix handling of furigana so it gets stripped out by default

### 0.1.0

- Initial release
