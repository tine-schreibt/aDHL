import { StaticHighlightOptions } from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";
import { StyleSpec } from "style-mod";

export type markTypes = "line" | "match";

export type SettingValue = number | string | boolean;
export interface CSSSettings {
  [key: string]: SettingValue;
}

interface SearchQuery {
  query: string;
  class: string;
  staticColor: string;
  staticDecoration: string;
  staticCss: StyleSpec;
  colorIconSnippet: string;
  regex: boolean;
  mark?: markTypes[];
  highlighterEnabled: boolean;
  tag: string;
  tagEnabled: boolean;
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
    showInReadingMode: false,
    queries: {},
    queryOrder: [],
    tagOrder: [],
    expandedTags: [],
    toggleable: ["#unsorted"],
    onOffSwitch: true,
  },
};
