# dom-text-extraction

Extract readable article content and metadata from HTML (Defuddle-powered).

This library was ported from Obsidian Clipper.

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

## API

- `extractWebContentFromHtml(html, options)`
  - Parses the HTML (via `options.documentParser` or browser `DOMParser`) and returns an `ExtractedWebContent`.
- `extractWebContentFromDocument(doc, options)`
  - Same pipeline, but starts from an existing `Document`.
- `extractPlainTextFromHtml(html, options)` / `extractPlainTextFromDocument(doc, options)`
  - Readable article body as plain text (skips markdown conversion).
- `extractText(html, url, documentParser?)`
  - Shorthand for `extractPlainTextFromHtml` (legacy positional args).
- `htmlFragmentToPlainText(html, documentParser)`
  - Convert an HTML fragment to normalized plain text.
- `createLinkedomDocumentParser(parseHTML)`
  - Helper to build a `DocumentParser` using `linkedom`’s `parseHTML`.

## Notes

- This library **does not fetch URLs**; you provide `html`.
- In Node, set `parseAsyncTimeoutMs: null` (Defuddle’s async parsing is mainly for browsers).
