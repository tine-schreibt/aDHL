/* added decoType */

import {
	staticHighlightConfig,
	StaticHighlightOptions,
} from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";
import { StyleSpec } from "style-mod";

/*
interface SearchConfig {
  value: string;
  type: string;
  range: { from: number; to: number };
}*/

export type markTypes = "line" | "match";

export type SettingValue = number | string | boolean;
export interface CSSSettings {
	[key: string]: SettingValue;
}

// Enable/Disable Highlighters (searchQuery)
interface SearchQuery {
	query: string;
	class: string;
	staticColor: string;
	staticDecoration: string;
	staticCss: StyleSpec;
	regex: boolean;
	mark?: markTypes[];
	css?: string;
	group: string;
	groupEnabled: boolean;
	enabled?: boolean;
}
export interface SearchQueries {
	[key: string]: SearchQuery;
}

export type HighlighterOptions =
	| SelectionHighlightOptions
	| StaticHighlightOptions;

export interface AnotherDynamicHighlightsSettings {
	selectionHighlighter: SelectionHighlightOptions;
	staticHighlighter: StaticHighlightOptions;
}

export const DEFAULT_SETTINGS: AnotherDynamicHighlightsSettings = {
	selectionHighlighter: {
		highlightWordAroundCursor: true,
		highlightSelectedText: true,
		maxMatches: 100,
		minSelectionLength: 3,
		highlightDelay: 200,
		ignoredWords: ignoredWords,
		selectionColor: "default",
		selectionDecoration: "default",
		css: "text-decoration: underline dotted var(--text-accent)",
	},
	staticHighlighter: {
		queries: {},
		queryOrder: [],
		expandedGroups: [],
	},
};

/*
export function setAttributes(element: any, attributes: any) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}*/
