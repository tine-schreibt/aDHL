// originally from: https://github.com/codemirror/search/blob/main/src/selection-match.ts
import { SearchCursor } from "@codemirror/search";
import {
  CharCategory,
  combineConfig,
  Compartment,
  Extension,
  Facet,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { cloneDeep } from "lodash";
import { debounce, Debouncer } from "obsidian";
import { ignoredWords } from "src/settings/ignoredWords";

export type SelectionHighlightOptions = {
  highlightWordAroundCursor: boolean;
  highlightSelectedText: boolean;
  minSelectionLength: number;
  maxMatches: number;
  ignoredWords: string;
  highlightDelay: number;
  selectionColor: string;
  selectionDecoration: string;
  css?: string
};

const defaultHighlightOptions: SelectionHighlightOptions = {
  highlightWordAroundCursor: true,
  highlightSelectedText: true,
  minSelectionLength: 3,
  maxMatches: 100,
  ignoredWords: ignoredWords,
  highlightDelay: 0,
  selectionColor: "default",
  selectionDecoration: "default",
  css: "text-decoration: dashed var(--text-accent)",
};

export const highlightConfig = Facet.define<
  SelectionHighlightOptions,
  Required<SelectionHighlightOptions>
>({
  combine(options: readonly SelectionHighlightOptions[]) {
    return combineConfig(options, defaultHighlightOptions, {
      highlightWordAroundCursor: (a, b) => a || b,
      highlightSelectedText: (a, b) => a || b,
      minSelectionLength: Math.min,
      maxMatches: Math.min,
      highlightDelay: Math.min,
      ignoredWords: (a, b) => a || b,
      selectionColor: (a, b) => b || a,
      selectionDecoration: (a, b) => b || a,
      css: (a, b) => b || a, // Use the custom css if available, otherwise fallback to default
    });
  },
});

export const highlightCompartment = new Compartment();

export function highlightSelectionMatches(
  options?: SelectionHighlightOptions
): Extension {
  let ext: Extension[] = [matchHighlighter];
  if (options) {
    ext.push(highlightConfig.of(cloneDeep(options)));
  }
  return ext;
}

export function reconfigureSelectionHighlighter(
  options: SelectionHighlightOptions
) {
  return highlightCompartment.reconfigure(
    highlightConfig.of(cloneDeep(options))
  );
}

const matchHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    highlightDelay: number;
    delayedGetDeco: Debouncer<[view: EditorView], void>;

    constructor(view: EditorView) {
      this.updateDebouncer(view);
      this.decorations = this.getDeco(view);
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged || update.viewportChanged) {
        // don't immediately remove decorations to prevent issues with things like link clicking
        // https://github.com/nothingislost/obsidian-dynamic-highlights/issues/58
        setTimeout(() => {
          this.decorations = Decoration.none;
          update.view.update([]);
        }, 150);
        // this.decorations = Decoration.none;
        this.delayedGetDeco(update.view);
      }
    }

    updateDebouncer(view: EditorView) {
      this.highlightDelay = view.state.facet(highlightConfig).highlightDelay;
      this.delayedGetDeco = debounce(
        (view: EditorView) => {
          this.decorations = this.getDeco(view);
          view.update([]); // force a view update so that the decorations we just set get applied
        },
        this.highlightDelay,
        true
      );
    }

    getDeco(view: EditorView): DecorationSet {
      let conf = view.state.facet(highlightConfig);      
      if (this.highlightDelay != conf.highlightDelay)
        this.updateDebouncer(view);
      let selectionDecoration = conf.css;
      let { state } = view,
        sel = state.selection;
      if (sel.ranges.length > 1) return Decoration.none;
      let range = sel.main,
        query,
        check = null,
        matchType: string;
      if (range.empty) {
        matchType = "word";
        if (!conf.highlightWordAroundCursor) return Decoration.none;
        let word = state.wordAt(range.head);
        if (!word) return Decoration.none;
        if (word) check = state.charCategorizer(range.head);
        query = state.sliceDoc(word.from, word.to);
        let ignoredWords = new Set(
          conf.ignoredWords.split(",").map((w) => w.toLowerCase().trim())
        );
        if (
          ignoredWords.has(query.toLowerCase()) ||
          query.length < conf.minSelectionLength
        )
          return Decoration.none;
      } else {
        matchType = "string";
        if (!conf.highlightSelectedText) return Decoration.none;
        let len = range.to - range.from;
        if (len < conf.minSelectionLength || len > 200) return Decoration.none;
        query = state.sliceDoc(range.from, range.to).trim();
        if (!query) return Decoration.none;
      }
      let deco = [];
      for (let part of view.visibleRanges) {
        let caseInsensitive = (s: string) => s.toLowerCase();
        let cursor = new SearchCursor(
          state.doc,
          query,
          part.from,
          part.to,
          caseInsensitive
        );
        while (!cursor.next().done) {
          let { from, to } = cursor.value;
          if (
            !check ||
            ((from == 0 ||
              check(state.sliceDoc(from - 1, from)) != CharCategory.Word) &&
              (to == state.doc.length ||
                check(state.sliceDoc(to, to + 1)) != CharCategory.Word))
          ) {
            let string = state.sliceDoc(from, to).trim();
            if (check && from <= range.from && to >= range.to) {
              console.log("CSS Styles: (if)", conf.css);
              const mainMatchDeco = Decoration.mark({
                attributes: { "data-contents": string, style: selectionDecoration },
              });
              deco.push(mainMatchDeco.range(from, to));
            } else if (from >= range.to || to <= range.from) {
              console.log("CSS Styles:(else if)", conf.css);
              const matchDeco = Decoration.mark({              
                attributes: { "data-contents": string, style: selectionDecoration },
              });
              deco.push(matchDeco.range(from, to));
            }
            if (deco.length > conf.maxMatches) return Decoration.none;
          }
        }
      }
      if (deco.length < (range.empty ? 2 : 1)) {
        return Decoration.none;
      }
      return Decoration.set(deco);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
