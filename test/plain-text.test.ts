import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { createLinkedomDocumentParser } from '../dist/linkedom.js';
import { htmlFragmentToPlainText, restoreRubyMarkup } from '../dist/plain-text.js';

const parser = createLinkedomDocumentParser(parseHTML);

const rubyHtml =
	'<p>今日<ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>は<ruby>良<rt>よ</rt>い</ruby>天気です。</p>';

test('furigana STRIP (default) omits ruby annotations', () => {
	assert.equal(htmlFragmentToPlainText(rubyHtml, parser), '今日漢字は良い天気です。');
});

test('furigana STRIP can be set explicitly', () => {
	assert.equal(
		htmlFragmentToPlainText(rubyHtml, parser, { furigana: 'STRIP' }),
		'今日漢字は良い天気です。',
	);
});

test('furigana INCLUDE_IN_BRACES adds annotations in braces', () => {
	assert.equal(
		htmlFragmentToPlainText(rubyHtml, parser, { furigana: 'INCLUDE_IN_BRACES' }),
		'今日漢{かん}字{じ}は良{よ}い天気です。',
	);
});

test('furigana AS_IS keeps ruby text inline', () => {
	assert.equal(
		htmlFragmentToPlainText(rubyHtml, parser, { furigana: 'AS_IS' }),
		'今日漢かん字じは良よい天気です。',
	);
});

test('restoreRubyMarkup reinserts ruby stripped from headings by Defuddle', () => {
	const sourceHtml =
		'<article><h3>デジタル<ruby>化<rt>か</rt></ruby>に<ruby>慣<rt>な</rt></ruby>れなくて<ruby>困<rt>こま</rt></ruby>るという<ruby>川柳<rt>せんりゅう</rt></ruby>が<ruby>多<rt>おお</rt></ruby>かった</h3></article>';
	const defuddledHtml =
		'<article><h3>デジタル化かに慣なれなくて困こまるという川柳せんりゅうが多おおかった</h3><p><ruby>川柳<rt>せんりゅう</rt></ruby></p></article>';
	const sourceDoc = parser.parseFromString(
		`<!doctype html><html><body>${sourceHtml}</body></html>`,
		'text/html',
	);
	const restored = restoreRubyMarkup(sourceDoc, defuddledHtml, parser);
	assert.match(restored, /<h3>[\s\S]*<ruby>多<rt>おお<\/rt><\/ruby>/i);
	assert.equal(
		htmlFragmentToPlainText(restored, parser, { furigana: 'STRIP' }),
		'デジタル化に慣れなくて困るという川柳が多かった\n川柳',
	);
});

test('restoreRubyMarkup reinserts ruby stripped from callout titles and figcaptions', () => {
	const ruby = '漢<ruby>字<rt>じ</rt></ruby>';
	const sourceHtml = `<article>
		<div class="admonition note"><p class="admonition-title">${ruby}注記</p></div>
		<figure><img src="/x.jpg"><figcaption>${ruby}説明</figcaption></figure>
	</article>`;
	const defuddledHtml = `<article>
		<div class="callout"><div class="callout-title"><div class="callout-title-inner">漢字じ注記</div></div></div>
		<figure><figcaption>漢字じ説明</figcaption></figure>
	</article>`;
	const sourceDoc = parser.parseFromString(
		`<!doctype html><html><body>${sourceHtml}</body></html>`,
		'text/html',
	);
	const restored = restoreRubyMarkup(sourceDoc, defuddledHtml, parser);
	assert.equal(
		htmlFragmentToPlainText(restored, parser, { furigana: 'STRIP' }),
		'漢字注記\n\n漢字説明',
	);
});

test('furigana STRIP handles rb/rp markup', () => {
	const html =
		'<ruby><rb>漢</rb><rt> かん </rt><rp>(</rp><rt>かん</rt><rp>)</rp><rb>字</rb><rt>じ</rt></ruby>';
	assert.equal(htmlFragmentToPlainText(html, parser), '漢字');
	assert.equal(
		htmlFragmentToPlainText(html, parser, { furigana: 'INCLUDE_IN_BRACES' }),
		'漢{かん}字{じ}',
	);
});
