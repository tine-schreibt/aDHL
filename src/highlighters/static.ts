/* added if (query.enabled) {  */

// originally from: https://github.com/codemirror/search/blob/main/src/selection-match.ts
import { SearchCursor } from "@codemirror/search";
import {
	combineConfig,
	// Compartment,
	Extension,
	Facet,
	Range,
} from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
//import { tokenClassNodeProp } from "@codemirror/language-data";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { cloneDeep } from "lodash";
import type { RegExpExecArray } from "regexp-match-indices/types";
import AnotherDynamicHighlightsPlugin from "main";
import { SearchQueries } from "src/settings/settings";
import { StyleSpec } from "style-mod";
import { RegExpCursor } from "./regexp-cursor";
import { NodeProp } from '@lezer/common';

export type StaticHighlightOptions = {
	queries: SearchQueries;
	queryOrder: string[];
};

const tokenClassNodeProp = new NodeProp();

const defaultOptions: StaticHighlightOptions = {
	queries: {},
	queryOrder: [],
};

export const staticHighlightConfig = Facet.define<
	StaticHighlightOptions,
	Required<StaticHighlightOptions>
>({
	combine(options: readonly StaticHighlightOptions[]) {
		return combineConfig(options, defaultOptions, {
			queries: (a, b) => a || b,
			queryOrder: (a, b) => a || b,
		});
	},
});

// const staticHighlighterCompartment = new Compartment();

export function staticHighlighterExtension(
	plugin: AnotherDynamicHighlightsPlugin
): Extension {
	let ext: Extension[] = [staticHighlighter];
	let options = plugin.settings.staticHighlighter;
	ext.push(staticHighlightConfig.of(cloneDeep(options)));
	return ext;
}

export interface Styles {
	[selector: string]: StyleSpec;
}

export function buildStyles(plugin: AnotherDynamicHighlightsPlugin) {
	let queries = Object.values(plugin.settings.staticHighlighter.queries);
	let styles: Styles = {};
	for (let query of queries) {
		let className = "." + query.class;
		if (!query.color) continue;
		styles[className] = { backgroundColor: query.color };
	}
	let theme = EditorView.theme(styles);
	return theme;
}

class IconWidget extends WidgetType {
	className: string | undefined;

	constructor(className?: string) {
		super();
		this.className = className;
	}

	toDOM() {
		let headerEl = document.createElement("span");
		this.className && headerEl.addClass(this.className);
		return headerEl;
	}

	ignoreEvent() {
		return true;
	}
}

const staticHighlighter = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lineDecorations: DecorationSet;
		widgetDecorations: DecorationSet;

		constructor(view: EditorView) {
			let { token, line, widget } = this.getDeco(view);
			this.decorations = token;
			this.lineDecorations = line;
			this.widgetDecorations = widget;
		}

		update(update: ViewUpdate) {
			let reconfigured =
				update.startState.facet(staticHighlightConfig) !==
				update.state.facet(staticHighlightConfig);
			if (update.docChanged || update.viewportChanged || reconfigured) {
				let { token, line, widget } = this.getDeco(update.view);
				this.decorations = token;
				this.lineDecorations = line;
				this.widgetDecorations = widget;
			}
		}

		getDeco(view: EditorView): {
			line: DecorationSet;
			token: DecorationSet;
			widget: DecorationSet;
		} {
			let { state } = view,
				tokenDecos: Range<Decoration>[] = [],
				lineDecos: Range<Decoration>[] = [],
				widgetDecos: Range<Decoration>[] = [],
				lineClasses: { [key: number]: string[] } = {},
				queries = Object.values(
					view.state.facet(staticHighlightConfig).queries
				);
			for (let part of view.visibleRanges) {
				for (let query of queries) {
					if (query.enabled) { 
						let cursor: RegExpCursor | SearchCursor;
						try {
							if (query.regex)
								cursor = new RegExpCursor(
									state.doc,
									query.query,
									{},
									part.from,
									part.to
								);
							else
								cursor = new SearchCursor(
									state.doc,
									query.query,
									part.from,
									part.to
								);
						} catch (err) {
							console.debug(err);
							continue;
						}
						while (!cursor.next().done) {
							let { from, to } = cursor.value;
							let string = state.sliceDoc(from, to).trim();
							const linePos = view.state.doc.lineAt(from)?.from;
							let syntaxNode = syntaxTree(view.state).resolveInner(
									linePos + 1
								),
								nodeProps =
									syntaxNode.type.prop(tokenClassNodeProp),
								excludedSection = [
									"hmd-codeblock",
									"hmd-frontmatter",
								].find((token) =>
									nodeProps?.toString().split(" ").includes(token)
								);
							if (excludedSection) continue;
							if (query.mark?.contains("line")) {
								if (!lineClasses[linePos])
									lineClasses[linePos] = [];
								lineClasses[linePos].push(query.class);
							}
							if (!query.mark || query.mark?.contains("match")) {
								const markDeco = Decoration.mark({
									class: query.class,
									attributes: { "data-contents": string },
								});
								tokenDecos.push(markDeco.range(from, to));
							}
						} 
					}
				}
			}
			Object.entries(lineClasses).forEach(([pos, classes]) => {
				const parsedPos = parseInt(pos, 10); // Parse the `pos` key into a number
				if (isNaN(parsedPos)) return; // Ensure it’s valid
				const lineDeco = Decoration.line({
					attributes: { class: classes.join(" ") }, // Join the class names
				});
				lineDecos.push(lineDeco.range(parsedPos)); // Use the parsed number here
			});

			return {
				line: Decoration.set(lineDecos.sort((a, b) => a.from - b.from)),
				token: Decoration.set(
					tokenDecos.sort((a, b) => a.from - b.from)
				),
				widget: Decoration.set(
					widgetDecos.sort((a, b) => a.from - b.from)
				),
			};
		}
	},
	{
		provide: (plugin) => [
			// these are separated out so that we can set decoration priority
			// it's also much easier to sort the decorations when they're grouped
			EditorView.decorations.of(
				(v) => v.plugin(plugin)?.lineDecorations || Decoration.none
			),
			EditorView.decorations.of(
				(v) => v.plugin(plugin)?.decorations || Decoration.none
			),
			EditorView.decorations.of(
				(v) => v.plugin(plugin)?.widgetDecorations || Decoration.none
			),
		],
	}
);
