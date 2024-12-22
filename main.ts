import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Plugin } from "obsidian";
import {
  highlightSelectionMatches,
  reconfigureSelectionHighlighter,
} from "./src/highlighters/selection";
import { buildStyles, staticHighlighterExtension } from "./src/highlighters/static";
import addIcons from "./src/icons/customIcons";
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

interface CustomCSS {
  css: string;
  enabled: boolean;
}

export default class AnotherDynamicHighlightsPlugin extends Plugin {
  settings: AnotherDynamicHighlightsSettings;
  extensions: Extension[];
  styles: Extension;
  staticHighlighter: Extension;
  selectionHighlighter: Extension;
  customCSS: Record<string, CustomCSS>;
  styleEl: HTMLElement;
  settingsTab: SettingTab;

  async onload() {
    try {
      await this.loadSettings();
   
    this.settingsTab = new SettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    addIcons();
    this.staticHighlighter = staticHighlighterExtension(this);
    this.extensions = [];
    this.updateSelectionHighlighter();
    this.updateStaticHighlighter();
    this.updateStyles();
    this.registerEditorExtension(this.extensions);
    this.initCSS(); 
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
  }

  initCSS() {
    let styleEl = (this.styleEl = document.createElement("style"));
    styleEl.setAttribute("type", "text/css");
    document.head.appendChild(styleEl);
    this.register(() => styleEl.detach());
    this.updateCustomCSS();
  }

  updateCustomCSS() {
    this.styleEl.textContent = Object.values(
      this.settings.staticHighlighter.queries
    )
      .map((q) => q && q.css)
      .join("\n");
    this.app.workspace.trigger("css-change");
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
}
