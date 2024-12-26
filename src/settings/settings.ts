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
    cursorHighlighter: {
      highlightStyle: "dotted",
      highlightColor: "",
      css: function() {
        if (this.highlightStyle === "background") {
          return `background-color: var(--highlightColor, var(--accent));`;
        } else {
          return `border-bottom: 1px ${this.highlightStyle} var(--highlightColor, var(--accent));`;
        }
      }
    },
    highlightSelectedText: true,
    selectedHighlighter: {
      highlightStyle: "dotted",
      highlightColor: "",
      css: function() {
        if (this.highlightStyle === "background") {
          return `background-color: var(--highlightColor, var(--accent));`;
        } else {
          return `border-bottom: 1px ${this.highlightStyle} var(--highlightColor, var(--accent));`;
        }
      }
    },
  minSelectionLength: 3,
  maxMatches: 100,
  ignoredWords: ignoredWords,
  highlightDelay: 0,
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
