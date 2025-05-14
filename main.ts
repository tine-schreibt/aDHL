import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  debounce,
  MarkdownView,
  MarkdownPostProcessor,
  Plugin,
  Notice,
} from "obsidian";
import {
  highlightSelectionMatches,
  reconfigureSelectionHighlighter,
} from "./src/highlighters/selection";
import {
  buildStyles,
  staticHighlighterExtension,
} from "./src/highlighters/static";
import {
  DEFAULT_SETTINGS,
  AnotherDynamicHighlightsSettings,
  HighlighterOptions,
} from "./src/settings/settings";
import { SettingTab } from "./src/settings/ui";

declare module "obsidian" {
  interface Editor {
    cm?: EditorView;
  }
}
// ignore this; this is just here so I can do a new commit because the
// fucking verification bot will take another look at this.

export default class AnotherDynamicHighlightsPlugin extends Plugin {
  settings: AnotherDynamicHighlightsSettings;
  extensions: Extension[];
  styles: Extension;
  staticHighlighter: Extension;
  selectionHighlighter: Extension;
  // customCSS: Record<string, CustomCSS>;
  styleEl: HTMLElement;
  settingsTab: SettingTab;

  async onload() {
    try {
      await this.loadSettings();

      this.settingsTab = new SettingTab(this.app, this);
      this.addSettingTab(this.settingsTab);
      this.staticHighlighter = staticHighlighterExtension(this);
      this.extensions = [];
      this.updateSelectionHighlighter();
      this.updateStaticHighlighter();
      this.updateStyles();
      this.registerEditorExtension(this.extensions);
      this.initCSS();

      // Register reading mode highlighter if enabled
      this.registerReadingModeHighlighter();

      this.registerCommands();
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.selectionHighlighter.highlightDelay < 200) {
      this.settings.selectionHighlighter.highlightDelay = 200;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Re-register the reading mode processor when settings change
    // This ensures reading mode reflects the current state
    this.registerReadingModeHighlighter();

    // Force re-render of all markdown views in reading mode
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        // Check if the view is in preview mode
        if (leaf.view.getMode() === "preview") {
          // This triggers a full re-render of the preview
          leaf.view.previewMode.rerender(true);
        }
      }
    });

    // The editor mode is already handled by these:
    this.updateStaticHighlighter();
    this.updateStyles();
  }

  initCSS() {
    let styleEl = (this.styleEl = document.createElement("style"));
    styleEl.setAttribute("type", "text/css");
    document.head.appendChild(styleEl);
    this.register(() => styleEl.detach());
  }

  updateStyles() {
    this.extensions.remove(this.styles);
    this.styles = buildStyles(this);
    this.extensions.push(this.styles);
    this.app.workspace.updateOptions();
  }

  updateStaticHighlighter() {
    this.extensions.remove(this.staticHighlighter);
    this.staticHighlighter = staticHighlighterExtension(this);
    this.extensions.push(this.staticHighlighter);
    this.app.workspace.updateOptions();
  }

  updateSelectionHighlighter() {
    this.extensions.remove(this.selectionHighlighter);
    this.selectionHighlighter = highlightSelectionMatches(
      this.settings.selectionHighlighter
    );
    this.extensions.push(this.selectionHighlighter);
    this.app.workspace.updateOptions();
  }

  iterateCM6(callback: (editor: EditorView) => unknown) {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf?.view instanceof MarkdownView &&
        leaf.view.editor.cm instanceof EditorView
      ) {
        callback(leaf.view.editor.cm);
      }
    });
  }

  // Command Palette and hotkeys
  registerCommands() {
    const staticHighlighters = this.settings.staticHighlighter;
    const selectionHighlight = this.settings.selectionHighlighter;
    // Command for onOffSwitch
    this.addCommand({
      id: `toggle-adhl`,
      name: `The switch - start/stop all static highlighting`,
      callback: () => {
        // toggle
        let toggleState: string = "";
        if (staticHighlighters.onOffSwitch) {
          staticHighlighters.onOffSwitch = false;
          new Notice(`Static highlighting is now OFF.`);
        } else if (!staticHighlighters.onOffSwitch) {
          staticHighlighters.onOffSwitch = true;
          new Notice(`Static highlighting is now ON.`);
        }
        this.saveSettings();
        this.updateStaticHighlighter();
      },
    });

    this.addCommand({
      id: `toggle-cursor`,
      name: `Start/stop highlighting the word around the cursor`,
      callback: () => {
        // toggle
        let toggleState: string = "";
        if (selectionHighlight.highlightWordAroundCursor) {
          selectionHighlight.highlightWordAroundCursor = false;
          new Notice(`Highlighting the word around the cursor is now OFF.`);
        } else if (!selectionHighlight.highlightWordAroundCursor) {
          selectionHighlight.highlightWordAroundCursor = true;
          new Notice(`Highlighting the word around the cursor is now ON.`);
        }
        this.saveSettings();
        this.updateSelectionHighlighter();
      },
    });

    this.addCommand({
      id: `toggle-selected`,
      name: `Start/stop highlighting actively selected text.`,
      callback: () => {
        // toggle
        let toggleState: string = "";
        if (selectionHighlight.highlightSelectedText) {
          selectionHighlight.highlightSelectedText = false;
          new Notice(`Highlighting selected text is now OFF.`);
        } else if (!selectionHighlight.highlightSelectedText) {
          selectionHighlight.highlightSelectedText = true;
          new Notice(`Highlighting selected text is now ON.`);
        }
        this.saveSettings();
        this.updateSelectionHighlighter();
      },
    });

    // Commands for highlighters
    let sortedQueryOrder: string[] = [
      ...this.settings.staticHighlighter.queryOrder,
    ];
    sortedQueryOrder.sort();
    sortedQueryOrder.forEach((highlighter) => {
      if (staticHighlighters.queries[highlighter]) {
        if (staticHighlighters.queries[highlighter].tag === "#unsorted") {
          this.addCommand({
            id: `toggle-${highlighter}`,
            name: `Toggle highlighter "${highlighter} (tag: ${staticHighlighters.queries[highlighter].tag})"`,
            callback: () => {
              // toggle
              let toggleState: string = "";
              if (staticHighlighters.queries[highlighter].highlighterEnabled) {
                staticHighlighters.queries[highlighter].highlighterEnabled =
                  false;
                toggleState = "OFF";
              } else if (
                !staticHighlighters.queries[highlighter].highlighterEnabled
              ) {
                staticHighlighters.queries[highlighter].highlighterEnabled =
                  true;
                toggleState = "ON";
              }
              // notify of states
              staticHighlighters.queries[highlighter].tagEnabled
                ? new Notice(
                    `Toggled "${highlighter}" ${toggleState}; its tag "${staticHighlighters.queries[highlighter].tag}" is ON.`
                  )
                : new Notice(
                    `Toggled "${highlighter}" ${toggleState}; its tag "${staticHighlighters.queries[highlighter].tag}" is OFF.`
                  );
              this.saveSettings();
              this.updateStaticHighlighter();
            },
          });
        }
      }
    });

    // Commands for tags
    sortedQueryOrder.forEach((highlighter) => {
      if (staticHighlighters.queries[highlighter]) {
        let tag = staticHighlighters.queries[highlighter].tag;
        this.addCommand({
          id: `toggle-${tag}`,
          name: `Toggle tag "${tag}"`,
          callback: () => {
            let currentState =
              staticHighlighters.queries[highlighter].tagEnabled;

            // Toggle the state for all highlighters with the same tag
            Object.keys(staticHighlighters.queries).forEach((key) => {
              if (staticHighlighters.queries[key].tag === tag) {
                staticHighlighters.queries[key].tagEnabled = !currentState;
              }
            });

            if (staticHighlighters.queries[highlighter].tagEnabled) {
              new Notice(`Toggled "${tag}" ON.`);
            } else if (staticHighlighters.queries[highlighter].tagEnabled) {
              new Notice(
                `Toggled "${tag}" OFF. All highlighters carrying this tag are now OFF, too.`
              );
            }

            this.saveSettings();
            this.updateStaticHighlighter();
          },
        });
      }
    });

    const sortedToggleables = staticHighlighters.toggleable.sort();
    sortedToggleables.forEach((highlighter) => {
      if (staticHighlighters.queries[highlighter]) {
        if (staticHighlighters.queries[highlighter].tag != "#unsorted") {
          this.addCommand({
            id: `toggle-${highlighter}`,
            name: `Toggle highlighter "${highlighter} (tag: ${staticHighlighters.queries[highlighter].tag})"`,
            callback: () => {
              // toggle
              let toggleState: string = "";
              if (staticHighlighters.queries[highlighter].highlighterEnabled) {
                staticHighlighters.queries[highlighter].highlighterEnabled =
                  false;
                toggleState = "OFF";
              } else if (
                !staticHighlighters.queries[highlighter].highlighterEnabled
              ) {
                staticHighlighters.queries[highlighter].highlighterEnabled =
                  true;
                toggleState = "ON";
              }
              // notify of states
              staticHighlighters.queries[highlighter].tagEnabled
                ? new Notice(
                    `Toggled "${highlighter}" ${toggleState}; its tag "${staticHighlighters.queries[highlighter].tag}" is ON.`
                  )
                : new Notice(
                    `Toggled "${highlighter}" ${toggleState}; its tag "${staticHighlighters.queries[highlighter].tag}" is OFF.`
                  );
              this.saveSettings();
              this.updateStaticHighlighter();
            },
          });
        }
      }
    });
  }

  updateConfig = debounce(
    (type: string, config: HighlighterOptions) => {
      let reconfigure: (config: HighlighterOptions) => StateEffect<unknown>;
      if (type === "selection") {
        reconfigure = reconfigureSelectionHighlighter;
      } else {
        return;
      }
      this.iterateCM6((view) => {
        view.dispatch({
          effects: reconfigure(config),
        });
      });
    },
    1000,
    true
  );

  private processNodeForHighlights(node: Node, pattern: RegExp, query: any) {
    // Skip already highlighted nodes
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).classList.contains("adhl-highlighted")
    ) {
      return;
    }

    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const nodeText: string = node.nodeValue;

      // Skip pure whitespace nodes
      if (!nodeText.trim()) {
        return;
      }

      const matches = Array.from(nodeText.matchAll(pattern));

      // Only log if matches are found
      if (matches.length > 0) {
        console.log("Found matches in text:", {
          text: nodeText,
          pattern: pattern,
          matches: matches.map((m) => ({
            text: m[0],
            index: m.index,
          })),
        });

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
          const matchIndex = match.index;
          if (matchIndex === undefined) continue;

          // Add text before match
          if (matchIndex > lastIndex) {
            fragment.appendChild(
              document.createTextNode(nodeText.slice(lastIndex, matchIndex))
            );
          }

          // Create highlight span
          const highlight = document.createElement("span");
          highlight.classList.add("adhl-highlighted", query.class);
          highlight.textContent = match[0];

          // Apply styles
          if (query.staticCss) {
            Object.entries(query.staticCss).forEach(([prop, value]) => {
              const cssProperty = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
              highlight.style.setProperty(cssProperty, value as string);
            });
          }

          fragment.appendChild(highlight);
          lastIndex = matchIndex + match[0].length;
        }

        // Add remaining text
        if (lastIndex < nodeText.length) {
          fragment.appendChild(
            document.createTextNode(nodeText.slice(lastIndex))
          );
        }

        const parent = node.parentNode;
        if (parent) {
          parent.replaceChild(fragment, node);
        }
      }
    }

    // Process child nodes
    Array.from(node.childNodes).forEach((child) =>
      this.processNodeForHighlights(child, pattern, query)
    );
  }

  private registerReadingModeHighlighter() {
    // Force re-render of all markdown views in reading mode
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf.view instanceof MarkdownView &&
        leaf.view.getMode() === "preview"
      ) {
        // If reading mode is disabled, we need to remove existing highlights first
        if (!this.settings.staticHighlighter.showInReadingMode) {
          const container = leaf.view.previewMode.containerEl;
          const highlights = container.querySelectorAll(".adhl-highlighted");
          highlights.forEach((highlight) => {
            // Replace the highlight span with its text content
            highlight.replaceWith(highlight.textContent || "");
          });
        }
        leaf.view.previewMode.rerender(true);
      }
    });

    // Only register if the setting is enabled
    if (this.settings.staticHighlighter.showInReadingMode) {
      this.registerMarkdownPostProcessor(
        (element: HTMLElement, context: any) => {
          // Only process if the main switch is on AND reading mode highlights are enabled
          if (
            !this.settings.staticHighlighter.onOffSwitch ||
            !this.settings.staticHighlighter.showInReadingMode
          ) {
            return;
          }

          // Get active queries
          const activeQueries = Object.entries(
            this.settings.staticHighlighter.queries
          ).filter(
            ([_, query]) => query.highlighterEnabled && query.tagEnabled
          );

          activeQueries.forEach(([highlighterName, query]) => {
            try {
              let patternString = query.query;
              let flags = "gm"; // Default flags

              if (query.regex) {
                // Check if the query string contains flags like /pattern/flags
                const match = query.query.match(/^\/(.*)\/([gimyus]*)$/);
                if (match) {
                  patternString = match[1];
                  // Combine extracted flags with default, ensuring no duplicates
                  flags = Array.from(
                    new Set(flags.split("").concat(match[2].split("")))
                  ).join("");
                }
                // If no flags in query string, patternString remains query.query and flags remain "gm"
              } else {
                patternString = query.query.replace(
                  /[-\\/\\\\^$*+?.()|[\\]{}]/g,
                  "\\$&"
                );
                // For non-regex, flags remain "gm" (though 'g' is most relevant for replacement, 'm' doesn't hurt)
              }

              const pattern = new RegExp(patternString, flags);

              this.processNodeForHighlights(element, pattern, query);
            } catch (error) {
              console.error(
                `Error processing highlighter ${highlighterName}:`,
                error
              );
            }
          });
        }
      );
    }
  }
}
