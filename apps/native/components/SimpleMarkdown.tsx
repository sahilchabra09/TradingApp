/**
 * SimpleMarkdown
 *
 * A zero-dependency Markdown renderer for React Native.
 * Handles the patterns that appear in AI research responses:
 * headings (h1-h3), bold, italic, inline code, bullet/numbered lists,
 * blockquotes, fenced code blocks, horizontal rules, and plain paragraphs.
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

		// Fenced code block
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

		// Horizontal rule
		if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		// Headings
		const h3 = line.match(/^###\s+(.*)/);
		if (h3) { blocks.push({ type: 'h3', content: h3[1] ?? '' }); i++; continue; }
		const h2 = line.match(/^##\s+(.*)/);
		if (h2) { blocks.push({ type: 'h2', content: h2[1] ?? '' }); i++; continue; }
		const h1 = line.match(/^#\s+(.*)/);
		if (h1) { blocks.push({ type: 'h1', content: h1[1] ?? '' }); i++; continue; }

		// Blockquote
		if (line.startsWith('>')) {
			const content = line.replace(/^>\s?/, '');
			blocks.push({ type: 'blockquote', content });
			i++;
			continue;
		}

		// Bullet list
		const bullet = line.match(/^(\s*)[*\-+]\s+(.*)/);
		if (bullet) {
			const depth = Math.floor((bullet[1] ?? '').length / 2);
			blocks.push({ type: 'bullet', content: bullet[2] ?? '', depth });
			i++;
			continue;
		}

		// Numbered list
		const numbered = line.match(/^\s*(\d+)\.\s+(.*)/);
		if (numbered) {
			blocks.push({ type: 'numbered', content: numbered[2] ?? '', index: parseInt(numbered[1] ?? '1', 10) });
			i++;
			continue;
		}

		// Skip blank lines (add spacing via margin)
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Paragraph: collect consecutive non-special lines
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
	// Match: ***bold_italic***, **bold**, *italic*, `code`
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

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const mdStyles = StyleSheet.create({
	base: { color: '#D1FAE5', fontSize: 14, lineHeight: 22 },
	paragraph: { color: '#D1FAE5', fontSize: 14, lineHeight: 22, marginBottom: 8 },
	bold: { fontWeight: '700', color: '#FFFFFF' },
	italic: { fontStyle: 'italic', color: '#6EE7B7' },
	inlineCode: {
		fontFamily: MONO,
		fontSize: 12,
		color: '#6EE7B7',
		backgroundColor: 'rgba(16,185,129,0.18)',
		paddingHorizontal: 4,
		borderRadius: 4,
	},
	h1: {
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: '700',
		marginTop: 16,
		marginBottom: 8,
		lineHeight: 28,
	},
	h2: {
		color: '#FFFFFF',
		fontSize: 17,
		fontWeight: '700',
		marginTop: 14,
		marginBottom: 6,
		lineHeight: 24,
	},
	h3: {
		color: '#ECFDF5',
		fontSize: 15,
		fontWeight: '600',
		marginTop: 10,
		marginBottom: 4,
		lineHeight: 22,
	},
	hr: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
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
		color: '#A7F3D0',
		lineHeight: 18,
	},
	blockquote: {
		borderLeftWidth: 3,
		borderLeftColor: '#059669',
		paddingLeft: 12,
		marginVertical: 4,
	},
	blockquoteText: {
		color: 'rgba(167,243,208,0.75)',
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
		color: '#34D399',
		fontSize: 14,
		lineHeight: 22,
		minWidth: 16,
	},
	listText: {
		flex: 1,
		color: '#D1FAE5',
		fontSize: 14,
		lineHeight: 22,
	},
});
