import * as Modals from "./modals";
import { EditorView } from "@codemirror/view";
import Pickr from "@simonwep/pickr";
import { createIcons, icons } from "lucide";

import {
	App,
	ButtonComponent,
	Notice,
	PluginSettingTab,
	Scope,
	setIcon,
	Setting,
	DropdownComponent,
	TextComponent,
	ToggleComponent,
} from "obsidian";
import AnotherDynamicHighlightsPlugin from "../../main";
import { ExportModal } from "./export";
import { ImportModal } from "./import";
import { markTypes } from "./settings";
import { StyleSpec } from "style-mod";

export class SettingTab extends PluginSettingTab {
	plugin: AnotherDynamicHighlightsPlugin;
	editor: EditorView;
	scope: Scope;
	pickrInstance: Pickr;

	constructor(app: App, plugin: AnotherDynamicHighlightsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.scope = new Scope(app.scope);
	}

	hide() {
		this.editor?.destroy();
		this.pickrInstance && this.pickrInstance.destroyAndRemove();
		this.app.keymap.popScope(this.scope);
	}
	// Display the settings tab
	display(): void {
		this.app.keymap.pushScope(this.scope);
		const { containerEl } = this;
		containerEl.empty();
		const config = this.plugin.settings.staticHighlighter;

		// Import/Export buttons
		const importExportEl = containerEl.createDiv("import-export-wrapper");
		importExportEl.createEl(
			"a",
			{
				cls: "dynamic-highlighter-import-export",
				text: "Import",
				href: "#",
			},
			(el) => {
				el.addEventListener("click", (e) => {
					e.preventDefault();
					new ImportModal(this.plugin.app, this.plugin).open();
				});
			}
		);
		importExportEl.createEl(
			"a",
			{
				cls: "dynamic-highlighter-import-export",
				text: "Export",
				href: "#",
			},
			(el) => {
				el.addEventListener("click", (e) => {
					e.preventDefault();
					new ExportModal(
						this.plugin.app,
						this.plugin,
						"All",
						config.queries
					).open();
				});
			}
		);
		//##############################################################
		//#########################   FUNCTIONS   ######################
		//##############################################################
		// would have put them at the bottom, but config.queryOrder is out of scope there

		// Enable modals save and redraw the display
		const modalSaveAndReload = async () => {
			await this.plugin.saveSettings();
			this.display(); // Refresh the UI after saving
		};

		// Make color and dropdown choices into standard css snippets
		const snippetMaker = (deco: string, color: string) => {
			let cssSnippet;
			if (color == "default" || color == undefined) {
				if (deco == "background") {
					cssSnippet = `background-color: var(--text-accent)`;
				} else if (deco == "color") {
					cssSnippet = `font-weight: 400; color: var(--text-accent)`;
				} else if (deco == "bold") {
					cssSnippet = `font-weight: 600; color: var(--text-accent)`;
				} else if (deco == "underline wavy") {
					cssSnippet = `text-decoration: underline wavy; text-decoration-thickness: 1px; text-decoration-color: var(--text-accent);`;
				} else if (deco === "border solid") {
					cssSnippet =
						"border: 1px solid var(--text-accent); border-radius: 5px; padding: 1px; padding-bottom: 2px";
				} else if (deco === "border dashed") {
					cssSnippet =
						"border: 1px dashed var(--text-accent); border-radius: 5px; padding: 1px; padding-bottom: 2px";
				} else {
					cssSnippet = `text-decoration: ${deco}; text-decoration-color: var(--text-accent)`;
				}
			} else {
				if (deco == "background" || deco == undefined) {
					cssSnippet = `background-color: ${color}`;
				} else if (deco == "color") {
					cssSnippet = `font-weight: 400; color: ${color}`;
				} else if (deco == "bold") {
					cssSnippet = `font-weight: 600; color: ${color}`;
				} else if (deco == "underline wavy") {
					cssSnippet = `text-decoration: underline wavy; text-decoration-thickness: 1px; text-decoration-color: ${color};`;
				} else if (deco === "border solid") {
					cssSnippet = `border: 1px solid ${color}; border-radius: 5px; padding: 1px; padding-bottom: 2px`;
				} else if (deco === "border dashed") {
					cssSnippet = `border: 1px dashed ${color}; border-radius: 5px; padding: 1px; padding-bottom: 2px`;
				} else {
					cssSnippet = `text-decoration: ${deco}; text-decoration-color: ${color}`;
				}
			}
			return cssSnippet;
		};

		// sort highlighters and tags alphabetically
		const sortAlphabetically = async () => {
			let tagList: string[] = [];
			let interimQueryOrder: string[] = [];
			let queryOrder = this.plugin.settings.staticHighlighter.queryOrder;
			const queries = this.plugin.settings.staticHighlighter.queries;
			// sort queryOrder
			await config.queryOrder.sort();
			// then iterate through it and collect tags
			await queryOrder.forEach((highlighter) => {
				if (!tagList.includes(queries[highlighter].tag)) {
					tagList.push(queries[highlighter].tag);
				}
			});
			// sort the tag list
			await tagList.sort();
			// then iterate through the sorted tags...
			await tagList.forEach((tag) => {
				// and look for their alphabetically sorted highlighters
				// logging away the ones that are done
				let done: string[] = [];
				queryOrder.forEach((highlighter) => {
					if (!done.includes(highlighter)) {
						if (queries[highlighter].tag === tag)
							interimQueryOrder.push(highlighter);
						done.push(highlighter);
					}
				});
			}); // Tadaaaaa!
			this.plugin.settings.staticHighlighter.queryOrder = interimQueryOrder;
			this.plugin.saveSettings();
			this.display();
		};

		//##############################################################
		//#########################   UI   #############################
		//##############################################################

		containerEl.addClass("persistent-highlights");
		containerEl.addClass("dynamic-highlights-settings");

		const headlineToggleContainer = containerEl.createDiv({
			cls: "headline-toggle-container",
		});

		headlineToggleContainer.createEl("h3", {
			text: "Persistent Highlights",
			cls: "headline-text",
		});

		// On/Off-Switch that starts/stops all highlighting
		new Setting(headlineToggleContainer).addToggle((headlineToggle) => {
			headlineToggle.toggleEl.setAttribute(
				"aria-label",
				config.onOffSwitch ? `Stop highlighting` : `Start highlighting`
			);
			headlineToggle.setValue(config.onOffSwitch).onChange((value) => {
				config.onOffSwitch = value;
				this.plugin.saveSettings();
				this.plugin.updateStaticHighlighter();
				this.display();
				headlineToggle.toggleEl.setAttribute(
					"aria-label",
					value ? `Stop highlighting` : `Start highlighting`
				);
			});
		});

		// Setting up variables vor the Persistent Highlighters Scope
		// this is necessary to get the values out of the functional elements
		let staticDecorationValue: string = "background";
		let staticDecorationDropdown: Setting;
		let staticDecorationDropdownComponent: DropdownComponent;
		let tagDropdownComponent: DropdownComponent;
		let tagName: string;
		let tagStatus: boolean;

		//##############################################################
		//##############   Persistent highlighters def   ##############
		//##############################################################
		const defineQueryUI = new Setting(containerEl);
		defineQueryUI
			.setName("Define persistent highlighters")
			.setClass("highlighter-definition");

		// Input field for the highlighter name
		const classInput = new TextComponent(defineQueryUI.controlEl);
		classInput.setPlaceholder("Highlighter name");
		classInput.inputEl.ariaLabel = "Highlighter name";
		classInput.inputEl.addClass("highlighter-name");

		// Color picker
		const colorWrapper = defineQueryUI.controlEl.createDiv("color-wrapper");
		let staticPickrInstance: Pickr;
		const colorPicker = new ButtonComponent(colorWrapper);
		// Set defaults
		colorPicker.setClass("highlightr-color-picker").then(() => {
			this.pickrInstance = staticPickrInstance = new Pickr({
				el: colorPicker.buttonEl,
				container: colorWrapper,
				theme: "nano",
				defaultRepresentation: "HEXA",
				default: "#42188038",
				comparison: false,
				components: {
					preview: true,
					opacity: true,
					hue: true,
					interaction: {
						hex: true,
						rgba: false,
						hsla: true,
						hsva: false,
						cmyk: false,
						input: true,
						clear: true,
						cancel: true,
						save: true,
					},
				},
			});
			// Make the button
			const button = colorWrapper.querySelector(".pcr-button");
			if (!button) {
				throw new Error("Button is null (see ui.ts)");
			}
			button.ariaLabel = "Decoration color picker";

			// Picker functionality
			staticPickrInstance
				.on("clear", (instance: Pickr) => {
					instance.hide();
					queryInput.inputEl.setAttribute(
						"style",
						snippetMaker(staticDecorationValue, "default")
					);
				})
				.on("cancel", (instance: Pickr) => {
					instance.hide();
				})
				.on("change", (color: Pickr.HSVaColor) => {
					const colorHex = color?.toHEXA().toString() || "";
					let newColor;
					colorHex && colorHex.length == 6
						? (newColor = `${colorHex}A6`)
						: (newColor = colorHex);
					queryInput.inputEl.setAttribute(
						"style",
						snippetMaker(staticDecorationValue, newColor)
					);
				})
				.on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
					instance.hide();
				});
		});

		// Query input field (query = highlighter)
		const queryWrapper = defineQueryUI.controlEl.createDiv("query-wrapper");
		const queryInput = new TextComponent(queryWrapper);
		queryInput.setPlaceholder("Search term");
		queryInput.inputEl.addClass("highlighter-settings-query");

		// RegEx toggle
		const queryTypeInput = new ToggleComponent(queryWrapper);
		queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
		queryTypeInput.toggleEl.ariaLabel ? "Enable Regex" : "Disable Regex";
		queryTypeInput.onChange((value) => {
			if (value) {
				queryInput.setPlaceholder("Search expression");
			} else {
				queryInput.setPlaceholder("Search term");
			}
		});

		// Array that holds all expanded Tags to persist the states
		let expandedTags: string[];
		// Initialise array without wiping saved data
		if (this.plugin.settings.staticHighlighter.expandedTags) {
			expandedTags = this.plugin.settings.staticHighlighter.expandedTags;
		} else {
			expandedTags = [];
		}

		// Create the marker types; this is complicated because there used to be 3 more
		// and I couldn't figure out how to simplify things without breaking stuff so I
		// kept it complicated.
		type MarkTypes = Record<
			markTypes,
			{ description: string; defaultState: boolean }
		>;
		type MarkItems = Partial<
			Record<markTypes, { element: HTMLElement; component: ToggleComponent }>
		>;

		const buildMarkerTypesHardcoded = (parentEl: HTMLElement): MarkItems => {
			// This container holds the grid; would have done all with grids, but
			// styles.css wasn't written by me, so I don't know what keeps destroying
			// grids elsewhere in the UI
			const dropdownContainer = parentEl.createDiv(
				"dropdown-and-marks-container"
			);

			// Static decoration dropdown
			staticDecorationDropdown = new Setting(dropdownContainer);
			staticDecorationDropdown

				.setClass("deco-dropdown")
				.addDropdown((dropdown) => {
					staticDecorationDropdownComponent = dropdown;
					dropdown.selectEl.setAttribute(
						"aria-label",
						"Select a decoration style for your highlighter"
					);
					dropdown
						.addOption("background", "Background")
						.addOption("underline", "Underline")
						.addOption("underline dotted", "Dotted")
						.addOption("underline dashed", "Dashed")
						.addOption("underline wavy", "Wavy")
						.addOption("color", "Colored text")
						.addOption("bold", "Bold colored text")
						.addOption("border solid", "Border, solid")
						.addOption("border dashed", "Border, dashed")
						.addOption("line-through", "Strikethrough")
						.setValue("background")
						.onChange((value) => {
							staticDecorationValue = value;
							let color = staticPickrInstance
								.getSelectedColor()
								?.toHEXA()
								.toString();
							queryInput.inputEl.setAttribute(
								"style",
								snippetMaker(staticDecorationValue, color)
							);
						});
				});

			const types: MarkItems = {};

			// "match" toggle, to decorate matched characters
			dropdownContainer.createSpan("matches-text").setText("matches");
			const matchToggle = new ToggleComponent(dropdownContainer).setValue(true); // Default state: true
			matchToggle.toggleEl.addClass("matches-toggle");
			matchToggle.toggleEl.setAttribute(
				"aria-label",
				"Highlight matched strings."
			);
			types["match"] = {
				element: matchToggle.toggleEl,
				component: matchToggle,
			};

			// "line" toggle, to decorate the entire parent line
			dropdownContainer.createSpan("line-text").setText("parent line");
			const lineToggle = new ToggleComponent(dropdownContainer).setValue(false); // Default state: false
			lineToggle.toggleEl.addClass("line-toggle");
			lineToggle.toggleEl.setAttribute(
				"aria-label",
				"Highlight parent lines of matched strings"
			);
			types["line"] = {
				element: lineToggle.toggleEl,
				component: lineToggle,
			};

			// Tag dropdown
			const tagDropdown = new Setting(dropdownContainer);
			tagDropdown.setClass("tag-dropdown").addDropdown((dropdown) => {
				tagDropdownComponent = dropdown;
				dropdown.addOption("#unsorted", "#unsorted");
				dropdown.selectEl.setAttribute(
					"aria-label",
					"Select a tag for your highlighter"
				);
				// Make a set to add each tag only once
				const uniqueTags = new Set<string>();
				Object.keys(config.queries).forEach((highlighter) => {
					const tagging = config.queries[highlighter].tag;
					// get tagStatus as well...
					const taggingStatus = config.queries[highlighter].tagEnabled;
					if (tagging && !uniqueTags.has(tagging)) {
						uniqueTags.add(tagging);
						// Here's the .addOption part
						tagDropdownComponent.addOption(tagging, tagging);
					}
					tagDropdownComponent.onChange((value) => {
						tagName = value;
						// ... to keep it consistent between old and new highlighters
						tagStatus = taggingStatus;
					});
				});
				// Access to the Create new tag modal and handing over of arguments
				tagDropdownComponent.addOption("create-new", "Create new tag");
				tagDropdownComponent.onChange(async (value) => {
					if (value === "create-new") {
						const createNewTag = new Modals.newTagModal(
							this.app,
							tagDropdownComponent,
							tagName,
							expandedTags
						);
						createNewTag.open();
					}
				});
			});
			return types;
		};

		const marks = buildMarkerTypesHardcoded(defineQueryUI.controlEl);

		// The save Button
		// helper variable stores highlighter to enable changing its other settings
		let currentHighlighterName: string | null = null;
		const saveButton = new ButtonComponent(queryWrapper);
		saveButton.buttonEl.setAttribute("state", "creating");
		saveButton.buttonEl.setAttribute("aria-label", "Save Highlighter");
		saveButton
			.setClass("action-button")
			.setClass("action-button-save")
			.setClass("mod-cta")
			.setIcon("save")
			.setTooltip("Save")
			.onClick(async (buttonEl: MouseEvent) => {
				// Get state (creating/editing) to circumvent duplication block when editing
				const state = saveButton.buttonEl.getAttribute("state");
				const previousHighlighterName = classInput.inputEl.dataset.original;
				currentHighlighterName = classInput.inputEl.value.replace(/ /g, "-");

				// Delete old highlighter when editing
				if (
					state === "editing" &&
					previousHighlighterName &&
					previousHighlighterName !== currentHighlighterName
				) {
					// Remove the entry for the original highlighter name
					delete config.queries[previousHighlighterName];
					// Update queryOrder
					const index = config.queryOrder.indexOf(previousHighlighterName);
					if (index !== -1) {
						config.queryOrder[index] = currentHighlighterName;
					}
				}

				// Get all the values and do the variable name dance
				// so that stuff acutally gets saved
				const staticHexValue = staticPickrInstance
					.getSelectedColor()
					?.toHEXA()
					.toString();
				const queryValue = queryInput.inputEl.value;
				const queryTypeValue = queryTypeInput.getValue();
				const tagNameValue = tagDropdownComponent.getValue();
				let tagStatusValue = tagStatus;
				if (tagStatusValue == undefined) {
					tagStatusValue = true;
				}

				// If creating, check if the class name already exists
				if (currentHighlighterName) {
					if (state == "creating") {
						if (!config.queryOrder.includes(currentHighlighterName)) {
							config.queryOrder.unshift(currentHighlighterName);
						} else {
							new Notice("Highlighter name already exists");
							return;
						}
					}

					// markTypes blablababla
					const enabledMarks = Object.entries(marks)
						.map(
							([type, item]) => (item.component.getValue() && type) as string
						)
						.filter((type): type is markTypes =>
							["line", "match"].includes(type)
						);

					// Logic for the static css snippet, which can't be a standard css snippet
					// because it's implemented as StyleSpec in static.css
					let staticCssSnippet: StyleSpec = {};
					if (staticHexValue === "default") {
						if (staticDecorationValue === "background") {
							staticCssSnippet = {
								backgroundColor: "var(--text-accent)",
							};
						} else if (staticDecorationValue === "color") {
							staticCssSnippet = {
								fontWeight: "400",
								color: "var(--text-accent)",
							};
						} else if (staticDecorationValue === "bold") {
							staticCssSnippet = {
								fontWeight: "600",
								color: "var(--text-accent)",
							};
						} else if (staticDecorationValue === "underline wavy") {
							staticCssSnippet = {
								textDecoration: "underline wavy",
								textDecorationColor: "var(--text-accent)",
							};
						} else if (staticDecorationValue === "border solid") {
							staticCssSnippet = {
								border: "1px solid var(--text-accent)",
								borderRadius: "5px",
								padding: "1px",
								paddingBottom: "2px",
							};
						} else if (staticDecorationValue === "border dashed") {
							staticCssSnippet = {
								border: "1px dashed var(--text-accent)",
								borderRadius: "5px",
								padding: "1px",
								paddingBottom: "2px",
							};
						} else {
							staticCssSnippet = {
								textDecoration: staticDecorationValue,
								textDecorationColor: "var(--text-accent)",
							};
						}
					} else {
						if (staticDecorationValue === "background") {
							staticCssSnippet = {
								backgroundColor: staticHexValue,
							};
						} else if (staticDecorationValue === "color") {
							staticCssSnippet = {
								fontWeight: "400",
								color: staticHexValue,
							};
						} else if (staticDecorationValue === "bold") {
							staticCssSnippet = {
								fontWeight: "600",
								color: staticHexValue,
							};
						} else if (staticDecorationValue === "underline wavy") {
							staticCssSnippet = {
								textDecoration: "underline wavy",
								textDecorationThickness: "1px",
								textDecorationColor: "var(--text-accent)",
							};
						} else if (staticDecorationValue === "border solid") {
							staticCssSnippet = {
								border: `1px solid ${staticHexValue}`,
								borderRadius: "5px",
								paddingBottom: "2px",
							};
						} else if (staticDecorationValue === "border dashed") {
							staticCssSnippet = {
								border: `1px dashed ${staticHexValue}`,
								borderRadius: "5px",
								padding: "1px",
								paddingBottom: "2px",
							};
						} else {
							staticCssSnippet = {
								textDecoration: staticDecorationValue,
								textDecorationColor: staticHexValue,
							};
						}
					}

					// Make a standard snippet for the cool icon next to the highlighters
					let makecolorIconSnippet: string = snippetMaker(
						staticDecorationValue,
						staticHexValue
					);
					// Gather all the stuff we need to make our highlighter
					config.queries[currentHighlighterName] = {
						class: currentHighlighterName, // the name
						staticColor: staticHexValue || "#42188038", // the color
						staticDecoration: staticDecorationValue, // the deco
						staticCss: staticCssSnippet, // the deco css snippet
						colorIconSnippet: makecolorIconSnippet, // the icon snippet
						regex: queryTypeValue, // the regex
						query: queryValue, // the search term/expression
						mark: enabledMarks, // the marks
						enabled: true, // the enabled state of the highlighter
						tag: tagNameValue, // the tag name
						tagEnabled: tagStatusValue, // if the tag is enabled
					};
					// Save and redraw the display
					await this.plugin.saveSettings();
					this.plugin.updateStaticHighlighter();
					this.plugin.updateStyles();
					this.display();
					// and put the saveButton in creating mode
					saveButton.buttonEl.setAttribute("state", "creating");
					// or complain if something isn't right
				} else if (!currentHighlighterName && staticHexValue) {
					new Notice("Highlighter name missing");
				} else if (
					!/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(currentHighlighterName)
				) {
					new Notice("Highlighter name missing");
				} else {
					new Notice("Highlighter values missing");
				}
			});

		// The discard button
		const discardButton = new ButtonComponent(queryWrapper);
		discardButton
			.setClass("action-button")
			.setClass("mod-cta")
			.setIcon("x-circle")
			.setTooltip("Discard Changes")
			.onClick(() => {
				const state = saveButton.buttonEl.getAttribute("state");

				if (state === "editing") {
					// Reset to original values
					if (currentHighlighterName != null) {
						const options = config.queries[currentHighlighterName];
						classInput.inputEl.value = currentHighlighterName;
						staticPickrInstance.setColor(options.staticColor);
						queryInput.inputEl.value = options.query;
						tagDropdownComponent.setValue(options.tag);
						queryTypeInput.setValue(options.regex);
						new Notice("Changes discarded");
					} else {
						// Clear all fields in "creating" mode
						classInput.inputEl.value = "";
						queryInput.inputEl.value = "";
						// Keep things in this order is so that classInput field ends up clear
						staticPickrInstance.setColor("#42188038");
						classInput.inputEl.setAttribute(
							"style",
							`background-color: none; color: var(--text-normal);`
						);
						staticPickrInstance.hide();
						queryTypeInput.setValue(false);
						new Notice("Form cleared");
					}

					// Reset saveButton state to creating
					saveButton.buttonEl.setAttribute("state", "creating");
				}
			});

		// #############################################################################################
		// ################################ HIGHTLIGHERS DISPLAY #######################################
		// #############################################################################################

		const highlightersContainer = containerEl.createEl("div", {
			cls: "highlighter-container",
		});
		const titleElement = highlightersContainer.createEl("div", {
			cls: "your-highlighters", // sets the font
		});
		// Tried to make it a grid; failed.
		titleElement.style.display = "flex";
		titleElement.style.alignItems = "center";
		titleElement.style.justifyContent = "space-between";

		const titleText = titleElement.createEl("span", {
			text: "Your highlighters and tags",
		});

		// this button sorts stuff
		const sortButton = titleElement.createEl("button", {
			cls: "sort-button-container",
		});
		sortButton.addClass("sort-button");
		sortButton.setAttribute("aria-label", "Sort a to z");
		sortButton.onclick = () => {
			sortAlphabetically();
		};
		// separate the icon out so it doesn't eat everything else about the button
		const iconContainer = sortButton.createEl("span");
		iconContainer.setAttribute("data-lucide", "arrow-down-a-z");
		createIcons({ icons });
		sortButton.appendChild(iconContainer);

		// ##################### Here come the tags with their buttons ################################################
		const tagContainers: { [key: string]: HTMLElement } = {};
		// This makes the highlighter display
		this.plugin.settings.staticHighlighter.queryOrder.forEach((highlighter) => {
			const queryConfig = config.queries[highlighter];
			if (queryConfig) {
				const { query, regex, tag } = queryConfig;

				if (!tagContainers[tag]) {
					const tagContainer = highlightersContainer.createEl("div", {
						cls: "tag-container",
					});
					const tagHeader = tagContainer.createEl("div", {
						cls: "tag-header",
					});

					// expand/collapse functionality and UX
					// make the clickable icon
					const toggleIcon = tagHeader.createEl("div", {
						cls: "toggle-icon",
					});
					toggleIcon.addClass("tag-icon");
					toggleIcon.style.cursor = "pointer";
					// Make the tag name clickable as well
					let tagName = tagHeader.createSpan("tag-header");
					tagName.setText(tag);
					tagName.addClass("tag-name");
					tagName.style.cursor = "pointer";

					// make a container for the highlighters
					let highlightersList = tagContainer.createEl("div", {
						cls: "highlighters-list",
					});
					// Do this, which I don't quite get, but it works, so...
					tagContainers[tag] = highlightersList;

					// set the appropriate expand/collapse icon
					if (expandedTags.includes(tag)) {
						setIcon(toggleIcon, "chevron-down");
						highlightersList.style.display = "block";
					} else {
						setIcon(toggleIcon, "chevron-right");
						highlightersList.style.display = "none";
					}

					const tagExpandToggle = () => {
						// toggle to collapsed
						if (expandedTags.includes(tag)) {
							setIcon(toggleIcon, "chevron-right"); // Add a down arrow icon (expand state)
							highlightersList.style.display = "none";
							expandedTags = expandedTags.filter((entry) => entry != tag);
							this.plugin.saveSettings();
						} else {
							// toggle to expanded
							setIcon(toggleIcon, "chevron-down");
							highlightersList.style.display = "block";
							expandedTags.unshift(tag);
						}
						// and save so state persists when saving or closing the plugin
						this.plugin.settings.staticHighlighter.expandedTags = expandedTags;
						this.plugin.saveSettings();
					};
					tagName.onclick = () => {
						tagExpandToggle();
					};
					toggleIcon.onclick = () => {
						tagExpandToggle();
					};
					tagHeader.style.cursor = "default"; // Force default cursor for the entire container
					// Create the toggle for enabling/disabling the tag
					const tagButtons = new Setting(tagHeader).setClass(
						"tag-header-buttons"
					);
					tagButtons.addToggle((tagToggle) => {
						tagToggle.toggleEl.setAttribute(
							"aria-label",
							config.queries[highlighter].tagEnabled
								? `Disable ${tag}`
								: `Enable ${tag}`
						);
						// logic to grey out the toggle when appropriate
						let tagIsDisabled: boolean =
							!this.plugin.settings.staticHighlighter.onOffSwitch;
						tagToggle.setValue(config.queries[highlighter].tagEnabled ?? true);
						if (tagIsDisabled) {
							tagToggle.setDisabled(tagIsDisabled);
							tagToggle.toggleEl.classList.add("disabled-toggle");
						}
						tagToggle.onChange((value) => {
							if (tagIsDisabled) {
								return;
							}
							// Update the tagEnabled status for the specific tag
							this.plugin.settings.staticHighlighter.queryOrder.forEach(
								(highlighter) => {
									if (
										this.plugin.settings.staticHighlighter.queries[highlighter]
											.tag === queryConfig.tag &&
										this.plugin.settings.staticHighlighter.queries[highlighter]
											.tagEnabled != value
									)
										this.plugin.settings.staticHighlighter.queries[
											highlighter
										].tagEnabled = value;
								},
								(async () => {
									// Call the save function to persist the changes
									await this.plugin.saveSettings();
									// Refresh the highlighter decorations and display
									this.plugin.updateStaticHighlighter();
									this.display();
								})()
							);
						});
					});
					tagButtons
						.addButton((button) => {
							button.buttonEl.setAttribute("aria-label", `Rename this tag`);
							button
								.setClass("action-button")
								.setClass("action-button-edit")
								.setClass("mod-cta")
								.setIcon("pencil")
								.onClick(async () => {
									const renameTag = new Modals.RenameTagModal(
										this.app,
										tag,
										tagDropdownComponent,
										expandedTags,
										this.plugin.settings.staticHighlighter,
										modalSaveAndReload
									);
									renameTag.open();
								});
						})
						.addButton((button) => {
							button.buttonEl.setAttribute("aria-label", `Delete ${tag}`);
							button
								.setClass("action-button")
								.setClass("action-button-delete")
								.setIcon("trash")
								.setClass("mod-warning")
								.onClick(async () => {
									// delete modal and arguments
									const deleteTag = new Modals.DeleteTagModal(
										this.app,
										tag,
										this.plugin.settings.staticHighlighter,
										expandedTags,
										modalSaveAndReload
									);
									deleteTag.open();
								});
						});
					// container stuff
					tagContainer.appendChild(tagHeader);
					tagContainer.appendChild(highlightersList);
					highlightersContainer.appendChild(tagContainer);
				}

				// ################# Here come the highlighters with their buttons #######################################
				const settingItem = tagContainers[tag].createEl("div");
				settingItem.id = "dh-" + highlighter;
				// Most of this isn't even being displayed, but if any part is removed
				// the whole layout of this part crashes and burns
				settingItem.addClass("highlighter-item-draggable");
				const dragIcon = settingItem.createEl("span");
				const colorIcon = settingItem.createEl("span");
				dragIcon.addClass(
					"highlighter-setting-icon",
					"highlighter-setting-icon-drag"
				);
				colorIcon.addClass("highlighter-setting-icon");
				colorIcon.innerHTML = `<span style="font-size: medium; ${config.queries[highlighter].colorIconSnippet}">abc</span>`;
				dragIcon.addClass(
					"highlighter-setting-icon",
					"highlighter-setting-icon-drag"
				);
				const desc: string[] = [];
				desc.push((regex ? "search expression: " : "search term: ") + query);
				desc.push("tag: " + config.queries[highlighter].tag);

				const highlighterButtons = new Setting(settingItem)
					.setClass("highlighter-details")
					.setName(highlighter)
					.setDesc(desc.join(" | "));

				// The toggle to enable/disable the highlighter
				highlighterButtons.addToggle((highlighterToggle) => {
					// Set initial aria-label based on the initial state
					highlighterToggle.toggleEl.setAttribute(
						"aria-label",
						config.queries[highlighter].enabled
							? `Disable ${highlighter} highlighter`
							: `Enable ${highlighter} highlighter`
					);
					// logic to grey out the toggle when appropriate
					let highlighterIsDisabled: boolean =
						!this.plugin.settings.staticHighlighter.onOffSwitch;
					highlighterToggle.setValue(
						config.queries[highlighter].enabled ?? true
					);
					if (
						highlighterIsDisabled ||
						!config.queries[highlighter].tagEnabled
					) {
						highlighterToggle.setDisabled(highlighterIsDisabled);
						highlighterToggle.toggleEl.classList.add("disabled-toggle");
					}
					highlighterToggle.onChange((value) => {
						if (highlighterIsDisabled) {
							return;
						}
						// Update the 'enabled' property of the highlighter
						config.queries[highlighter].enabled = value;
						// Update the aria-label based on the toggle state
						// because for it works differently than the tagToggle;
						// maybe because of the ${}?
						highlighterToggle.toggleEl.setAttribute(
							"aria-label",
							value
								? `Disable ${highlighter} highlighter`
								: `Enable ${highlighter} highlighter`
						);

						(async () => {
							await this.plugin.saveSettings();
							// Refresh the highlighter decorations
							this.plugin.updateStaticHighlighter();
						})();
					});
				});

				highlighterButtons
					.addButton((button) => {
						button.buttonEl.setAttribute(
							"aria-label",
							`Edit ${highlighter} highlighter`
						);
						button
							.setClass("action-button")
							.setClass("action-button-highlighterslist")
							.setClass("mod-cta-inverted")
							.setIcon("pencil")
							.onClick(async (evt) => {
								// disable douplication prevention
								saveButton.buttonEl.setAttribute("state", "editing");
								// Populate the input elements with the highlighter's settings
								const options = config.queries[highlighter];
								classInput.inputEl.value = highlighter;
								classInput.inputEl.dataset.original = highlighter;

								staticPickrInstance.setColor(options.staticColor);
								queryInput.inputEl.value = options.query;
								staticDecorationDropdownComponent.setValue(
									options.staticDecoration
								);
								staticDecorationValue = options.staticDecoration;
								tagName = options.tag;
								tagDropdownComponent.setValue(options.tag);
								tagStatus = options.tagEnabled;
								staticPickrInstance.setColor(options.staticColor);
								queryTypeInput.setValue(options.regex);

								if (options?.mark) {
									const marksSet = new Set<markTypes>(options.mark);
									Object.entries(marks).forEach(([key, value]) => {
										const isMarkType = ["line", "match"].includes(
											key as markTypes
										);
										value.component.setValue(
											isMarkType && marksSet.has(key as markTypes)
										);
									});
								} else {
									Object.entries(marks).map(([key, value]) =>
										key === "match"
											? value.component.setValue(true)
											: value.component.setValue(false)
									);
								}
								containerEl.scrollTop = 0;
							});
					})

					.addButton((button) => {
						button.buttonEl.setAttribute("aria-label", `Delete ${highlighter}`);
						button
							.setClass("action-button")
							.setClass("action-button-delete")
							.setClass("mod-warning-inverted")
							.setIcon("trash")
							.onClick(async () => {
								const deleteHighlighter = new Modals.DeleteHighlighterModal(
									this.app,
									highlighter,
									this.plugin.settings.staticHighlighter,
									config.queryOrder,
									modalSaveAndReload
								);
								deleteHighlighter.open();
							});
					});
			} else {
				this.plugin.settings.staticHighlighter.queryOrder =
					this.plugin.settings.staticHighlighter.queryOrder.filter(
						(item) => item != highlighter
					);
				this.plugin.saveSettings();
			}
		});

		//##############################################################
		//################   SELECTION HIGHLIGHTERS   ##################
		//##############################################################
		containerEl.createEl("h3", {
			text: "Selection Highlights",
			cls: "selectedHighlightsStylingsContainerHeader",
		});
		const selectionHighlightUI = new Setting(containerEl);
		const rowWrapper = selectionHighlightUI.controlEl.createDiv(
			"selectedHighlightsStylingsContainer"
		);

		const descriptionText = rowWrapper.createDiv("choose-color-text");
		descriptionText.setText("Choose a color.");

		// define pickr for the selection highlights scope
		let selectionColorPickerInstance: Pickr;

		const selectionColorPicker = new ButtonComponent(rowWrapper);
		let selectionColorPickerDefault: string;
		if (
			this.plugin.settings.selectionHighlighter.selectionColor === "default"
		) {
			selectionColorPickerDefault = "#42188038";
		} else {
			selectionColorPickerDefault =
				this.plugin.settings.selectionHighlighter.selectionColor;
		}
		selectionColorPicker.setClass("selected-color-picker").then(() => {
			selectionColorPickerInstance = new Pickr({
				el: selectionColorPicker.buttonEl,
				theme: "nano",
				default: selectionColorPickerDefault,
				components: {
					preview: true,
					opacity: true,
					hue: true,
					interaction: {
						hex: true,
						rgba: false,
						hsla: true,
						hsva: false,
						cmyk: false,
						input: true,
						clear: true,
						cancel: true,
						save: true,
					},
				},
			});
			selectionColorPickerInstance
				.on("clear", (instance: Pickr) => {
					instance.hide();
				})
				.on("cancel", (instance: Pickr) => {
					instance.hide();
				})
				.on("change", (color: Pickr.HSVaColor) => {
					const colorHex = color?.toHEXA().toString() || "";
					let newColor;
					colorHex && colorHex.length == 6
						? (newColor = `${colorHex}A6`)
						: (newColor = colorHex);
				})
				.on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
					const hexValue = color.toHEXA().toString();
					instance.hide();
					this.plugin.settings.selectionHighlighter.selectionColor = hexValue;
					this.plugin.saveSettings();
				});
		});

		const selectionDecorationDropdown = new Setting(rowWrapper)
			.setName("Choose a decoration.")
			.setClass("choose-decoration-text");
		selectionDecorationDropdown
			.setClass("decoration-dropdown")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("background", "Background")
					.addOption("underline", "Underline")
					.addOption("underline dotted", "Dotted")
					.addOption("underline dashed", "Dashed")
					.addOption("underline wavy", "Wavy")
					.addOption("color", "Colored text")
					.addOption("bold", "Bold colored text")
					.addOption("border solid", "Border, solid")
					.addOption("border dashed", "Border, dashed")
					.addOption("line-through", "Strikethrough")
					.setValue(
						this.plugin.settings.selectionHighlighter.selectionDecoration
					)
					.onChange((value) => {
						this.plugin.settings.selectionHighlighter.selectionDecoration =
							value;
						this.plugin.saveSettings();
					});
			});

		const cssSaveButton = new ButtonComponent(rowWrapper);
		cssSaveButton.buttonEl.setAttribute("aria-label", "Save Highlighter");
		cssSaveButton
			.setClass("action-button")
			.setClass("mod-cta")
			.setClass("selected-save-button")
			.setIcon("save")
			.setTooltip("Save CSS Snippet")
			.onClick(async () => {
				let color = this.plugin.settings.selectionHighlighter.selectionColor;
				let decoration =
					this.plugin.settings.selectionHighlighter.selectionDecoration;

				// Make a snippet out of the chosen values
				this.plugin.settings.selectionHighlighter.css = snippetMaker(
					decoration,
					color
				);
				// save and update
				await this.plugin.saveSettings();
				this.plugin.updateSelectionHighlighter();
			});

		const selectedDiscardButton = new ButtonComponent(rowWrapper);
		selectedDiscardButton.buttonEl.setAttribute(
			"aria-label",
			"Discard new values"
		);
		selectedDiscardButton
			.setClass("selected-reset-button")
			.setClass("action-button")
			.setClass("mod-cta")
			.setIcon("x-circle")
			.setTooltip("Reset to default")
			.onClick(async () => {
				this.plugin.settings.selectionHighlighter.selectionColor = "default";
				this.plugin.settings.selectionHighlighter.selectionDecoration =
					"default";
				this.plugin.settings.selectionHighlighter.css =
					"text-decoration: underline dotted var(--text-accent)";
				selectionColorPickerInstance.setColor("#42188038");
				await this.plugin.saveSettings();
				this.plugin.updateSelectionHighlighter();
				new Notice("Defaults reset");
			});
		// It's the only way the layout works
		const dropdownSpacer = new Setting(rowWrapper)
			.setName("")
			.setClass("selected-spacer");
		dropdownSpacer.setClass("selected-spacer");

		new Setting(containerEl)
			.setName("Highlight all occurrences of the word under the cursor")
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.selectionHighlighter.highlightWordAroundCursor
					)
					.onChange((value) => {
						this.plugin.settings.selectionHighlighter.highlightWordAroundCursor =
							value;
						this.plugin.saveSettings();
						this.plugin.updateSelectionHighlighter();
					});
			});

		new Setting(containerEl)
			.setName("Highlight all occurrences of the actively selected text")
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.selectionHighlighter.highlightSelectedText
					)
					.onChange((value) => {
						this.plugin.settings.selectionHighlighter.highlightSelectedText =
							value;
						this.plugin.saveSettings();
						this.plugin.updateSelectionHighlighter();
					});
			});
		new Setting(containerEl)
			.setName("Highlight delay")
			.setDesc(
				"The delay, in milliseconds, before selection highlights will appear. Must be greater than 200ms."
			)
			.addText((text) => {
				text.inputEl.type = "number";
				text
					.setValue(
						String(this.plugin.settings.selectionHighlighter.highlightDelay)
					)
					.onChange((value) => {
						if (parseInt(value) < 200) value = "200";
						if (parseInt(value) >= 0)
							this.plugin.settings.selectionHighlighter.highlightDelay =
								parseInt(value);
						this.plugin.saveSettings();
						this.plugin.updateSelectionHighlighter();
					});
			});
		new Setting(containerEl)
			.setName("Ignored words")
			.setDesc("A comma delimted list of words that will not be highlighted")
			.addTextArea((text) => {
				text.inputEl.addClass("ignored-words-input");
				text
					.setValue(this.plugin.settings.selectionHighlighter.ignoredWords)
					.onChange(async (value) => {
						this.plugin.settings.selectionHighlighter.ignoredWords = value;
						await this.plugin.saveSettings();
						this.plugin.updateSelectionHighlighter();
					});
			});
	}
}

// FIN
