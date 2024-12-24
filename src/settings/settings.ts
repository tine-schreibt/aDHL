/* added decoType */

import { StaticHighlightOptions } from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";

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
  color: string | null;
    regex: boolean;
  mark?: markTypes[];
  css?: string;
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
  },
  staticHighlighter: {
    queries: {},
    queryOrder: [],
  },
};

/*
export function setAttributes(element: any, attributes: any) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}*/ 
