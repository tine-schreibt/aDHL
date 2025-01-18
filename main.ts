import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Plugin, Notice } from "obsidian";
import {
	highlightSelectionMatches,
	reconfigureSelectionHighlighter,
} from "./src/highlighters/selection";
import {
	buildStyles,
	staticHighlighterExtension,
} from "./src/highlighters/static";
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
			addIcons();
			this.staticHighlighter = staticHighlighterExtension(this);
			this.extensions = [];
			this.updateSelectionHighlighter();
			this.updateStaticHighlighter();
			this.updateStyles();
			this.registerEditorExtension(this.extensions);
			this.initCSS();
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
			name: `The Switch - Start/stop all static highlighting`,
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
				if (
					staticHighlighters.spreadTag.includes(
						staticHighlighters.queries[highlighter].tag
					)
				) {
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
						console.log("registered command for tag ", tag);
					},
				});
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
