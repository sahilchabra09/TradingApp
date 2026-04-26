/**
 * SimpleMarkdown
 *
 * A zero-dependency Markdown renderer for React Native.
 * Handles the patterns that appear in AI research responses:
 * headings (h1-h3), bold, italic, inline code, bullet/numbered lists,
 * blockquotes, fenced code blocks, horizontal rules, and plain paragraphs.
 *
 * NOTE: This component uses static styles because it may render outside the
 * theme context (e.g., in modals). For theme-aware text, wrap the component
 * and override text colors via the parent View.
 */
import { Platform, StyleSheet, Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Block =
	| { type: 'h1' | 'h2' | 'h3'; content: string }
	| { type: 'hr' }
	| { type: 'code_block'; content: string }
	| { type: 'blockquote'; content: string }
	| { type: 'bullet'; content: string; depth: number }
	| { type: 'numbered'; content: string; index: number }
	| { type: 'paragraph'; content: string };

type Span =
	| { type: 'text'; value: string }
	| { type: 'bold'; value: string }
	| { type: 'italic'; value: string }
	| { type: 'bold_italic'; value: string }
	| { type: 'code'; value: string };

// ─── Block parser ─────────────────────────────────────────────────────────────

function parseBlocks(markdown: string): Block[] {
	const lines = markdown.split('\n');
	const blocks: Block[] = [];
	let i = 0;

	while (i < lines.length) {
		const raw = lines[i];
		const line = raw ?? '';

		if (line.startsWith('```')) {
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
				codeLines.push(lines[i] ?? '');
				i++;
			}
			blocks.push({ type: 'code_block', content: codeLines.join('\n') });
			i++;
			continue;
		}

		if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		const h3 = line.match(/^###\s+(.*)/);
		if (h3) { blocks.push({ type: 'h3', content: h3[1] ?? '' }); i++; continue; }
		const h2 = line.match(/^##\s+(.*)/);
		if (h2) { blocks.push({ type: 'h2', content: h2[1] ?? '' }); i++; continue; }
		const h1 = line.match(/^#\s+(.*)/);
		if (h1) { blocks.push({ type: 'h1', content: h1[1] ?? '' }); i++; continue; }

		if (line.startsWith('>')) {
			const content = line.replace(/^>\s?/, '');
			blocks.push({ type: 'blockquote', content });
			i++;
			continue;
		}

		const bullet = line.match(/^(\s*)[*\-+]\s+(.*)/);
		if (bullet) {
			const depth = Math.floor((bullet[1] ?? '').length / 2);
			blocks.push({ type: 'bullet', content: bullet[2] ?? '', depth });
			i++;
			continue;
		}

		const numbered = line.match(/^\s*(\d+)\.\s+(.*)/);
		if (numbered) {
			blocks.push({ type: 'numbered', content: numbered[2] ?? '', index: parseInt(numbered[1] ?? '1', 10) });
			i++;
			continue;
		}

		if (line.trim() === '') {
			i++;
			continue;
		}

		const paragraphLines: string[] = [];
		while (
			i < lines.length &&
			(lines[i] ?? '').trim() !== '' &&
			!(lines[i] ?? '').startsWith('#') &&
			!(lines[i] ?? '').startsWith('>') &&
			!(lines[i] ?? '').startsWith('```') &&
			!(/^(\s*[-*+]|\d+\.)\s/.test(lines[i] ?? '')) &&
			!/^(\s*[-*_]){3,}\s*$/.test(lines[i] ?? '')
		) {
			paragraphLines.push(lines[i] ?? '');
			i++;
		}
		if (paragraphLines.length > 0) {
			blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
		}
	}

	return blocks;
}

// ─── Inline parser ────────────────────────────────────────────────────────────

function parseInline(text: string): Span[] {
	const spans: Span[] = [];
	const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		if (match.index > lastIndex) {
			spans.push({ type: 'text', value: text.slice(lastIndex, match.index) });
		}
		if (match[2] !== undefined) {
			spans.push({ type: 'bold_italic', value: match[2] });
		} else if (match[3] !== undefined) {
			spans.push({ type: 'bold', value: match[3] });
		} else if (match[4] !== undefined) {
			spans.push({ type: 'italic', value: match[4] });
		} else if (match[5] !== undefined) {
			spans.push({ type: 'code', value: match[5] });
		}
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		spans.push({ type: 'text', value: text.slice(lastIndex) });
	}

	return spans.length > 0 ? spans : [{ type: 'text', value: text }];
}

// ─── Inline renderer ──────────────────────────────────────────────────────────

function InlineText({ text, baseStyle }: { text: string; baseStyle?: object }) {
	const spans = parseInline(text);
	return (
		<Text style={[mdStyles.base, baseStyle]}>
			{spans.map((span, idx) => {
				switch (span.type) {
					case 'bold':
						return <Text key={idx} style={mdStyles.bold}>{span.value}</Text>;
					case 'italic':
						return <Text key={idx} style={mdStyles.italic}>{span.value}</Text>;
					case 'bold_italic':
						return <Text key={idx} style={[mdStyles.bold, mdStyles.italic]}>{span.value}</Text>;
					case 'code':
						return <Text key={idx} style={mdStyles.inlineCode}>{span.value}</Text>;
					default:
						return <Text key={idx}>{span.value}</Text>;
				}
			})}
		</Text>
	);
}

// ─── Block renderer ───────────────────────────────────────────────────────────

function renderBlock(block: Block, idx: number): React.ReactNode {
	switch (block.type) {
		case 'h1':
			return <InlineText key={idx} text={block.content} baseStyle={mdStyles.h1} />;
		case 'h2':
			return <InlineText key={idx} text={block.content} baseStyle={mdStyles.h2} />;
		case 'h3':
			return <InlineText key={idx} text={block.content} baseStyle={mdStyles.h3} />;
		case 'hr':
			return <View key={idx} style={mdStyles.hr} />;
		case 'code_block':
			return (
				<View key={idx} style={mdStyles.codeBlock}>
					<Text style={mdStyles.codeBlockText}>{block.content}</Text>
				</View>
			);
		case 'blockquote':
			return (
				<View key={idx} style={mdStyles.blockquote}>
					<InlineText text={block.content} baseStyle={mdStyles.blockquoteText} />
				</View>
			);
		case 'bullet':
			return (
				<View key={idx} style={[mdStyles.listRow, { paddingLeft: 8 + block.depth * 16 }]}>
					<Text style={mdStyles.bullet}>•</Text>
					<InlineText text={block.content} baseStyle={mdStyles.listText} />
				</View>
			);
		case 'numbered':
			return (
				<View key={idx} style={mdStyles.listRow}>
					<Text style={mdStyles.bullet}>{block.index}.</Text>
					<InlineText text={block.content} baseStyle={mdStyles.listText} />
				</View>
			);
		case 'paragraph':
			return <InlineText key={idx} text={block.content} baseStyle={mdStyles.paragraph} />;
	}
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SimpleMarkdown({ children }: { children: string }) {
	const blocks = parseBlocks(children);
	return <View>{blocks.map(renderBlock)}</View>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Neutral palette — works well on dark and is not green-tinted.

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const mdStyles = StyleSheet.create({
	base: { color: '#E0E0E4', fontSize: 14, lineHeight: 22 },
	paragraph: { color: '#E0E0E4', fontSize: 14, lineHeight: 22, marginBottom: 8 },
	bold: { fontWeight: '700', color: '#F5F5F7' },
	italic: { fontStyle: 'italic', color: '#BABAC0' },
	inlineCode: {
		fontFamily: MONO,
		fontSize: 12,
		color: '#D4B978',
		backgroundColor: 'rgba(201, 169, 98, 0.12)',
		paddingHorizontal: 4,
		borderRadius: 4,
	},
	h1: {
		color: '#F5F5F7',
		fontSize: 20,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 8,
		lineHeight: 28,
	},
	h2: {
		color: '#F5F5F7',
		fontSize: 17,
		fontWeight: '700',
		marginTop: 14,
		marginBottom: 6,
		lineHeight: 24,
	},
	h3: {
		color: '#E8E8EC',
		fontSize: 15,
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 4,
		lineHeight: 22,
	},
	hr: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.08)',
		marginVertical: 12,
	},
	codeBlock: {
		backgroundColor: 'rgba(0,0,0,0.4)',
		borderRadius: 8,
		padding: 12,
		marginVertical: 6,
	},
	codeBlockText: {
		fontFamily: MONO,
		fontSize: 12,
		color: '#D4B978',
		lineHeight: 18,
	},
	blockquote: {
		borderLeftWidth: 3,
		borderLeftColor: '#C9A962',
		paddingLeft: 12,
		marginVertical: 4,
	},
	blockquoteText: {
		color: 'rgba(224, 224, 228, 0.75)',
		fontSize: 14,
		lineHeight: 22,
		fontStyle: 'italic',
	},
	listRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 4,
		gap: 8,
	},
	bullet: {
		color: '#C9A962',
		fontSize: 14,
		lineHeight: 22,
		minWidth: 16,
	},
	listText: {
		flex: 1,
		color: '#E0E0E4',
		fontSize: 14,
		lineHeight: 22,
	},
});
