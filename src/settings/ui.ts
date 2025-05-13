import { EditorView } from "@codemirror/view";
import { StyleSpec } from "style-mod";
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
import * as Modals from "./modals";
import { ExportModal } from "./export";
import { ImportModal } from "./import";
import { markTypes } from "./settings";

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

    //##############################################################
    //######################### FUNCTIONS ######################
    //##############################################################

    // Enable modals save and redraw the display
    const modalSaveAndReload = async () => {
      await this.plugin.saveSettings();
      this.plugin.updateStaticHighlighter();

      this.display(); // Refresh the UI after saving
    };

    // Make color and dropdown choices into standard css snippets
    const snippetMaker = (deco: string, color: string) => {
      let cssSnippet;
      if (color == undefined) {
        color = "default";
      }
      const resolveColor = () =>
        color === "default" ? "var(--text-accent)" : color;
      if (deco == "background") {
        cssSnippet = `background-color: ${resolveColor()}`;
      } else if (deco == "background rounded") {
        cssSnippet = `position: relative; background-color: ${resolveColor()}; padding: 0.15em 0.25em; margin: 0; border-radius: 0.25em; box-decoration-break: clone; -webkit-box-decoration-break: clone; background-clip: padding-box; background-image: linear-gradient(to right, ${resolveColor()}dd, ${resolveColor()} 50%, ${resolveColor()}dd); box-shadow: inset 0 0 0 1px ${resolveColor()}22; display: inline;`;
      } else if (deco == "background realistic") {
        cssSnippet = `position: relative; background-color: ${resolveColor()}; padding: 0.15em 0.45em; margin: 0; border-radius: 0.7em 0.25em; box-decoration-break: clone; -webkit-box-decoration-break: clone; background-image: linear-gradient(135deg, ${resolveColor()} 0%, ${resolveColor()}ee 100%); background-clip: padding-box; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); text-shadow: 0 1px 2px var(--background-primary-alt); display: inline`;
      } else if (deco == "underline lowlight") {
        cssSnippet = `position: relative; background-color: transparent; padding: 0.125em 0.125em; border-radius: 0; background-image: linear-gradient(360deg, ${resolveColor()} 40%, transparent 40%)`;
      } else if (deco == "underline floating thick") {
        cssSnippet = `position: relative; background-color: transparent; padding: 0.125em; padding-bottom: 5px; border-radius: 0; background-image: linear-gradient(360deg, ${resolveColor()} 25%, transparent 25%)`;
      } else if (deco == "underline floating thin") {
        cssSnippet = `position: relative; background-color: transparent; padding: 0.125em; padding-bottom: 5px; border-radius: 0; background-image: linear-gradient(360deg, ${resolveColor()} 15%, transparent 15%)`;
      } else if (deco == "color") {
        cssSnippet = `font-weight: 400; color: ${resolveColor()}`;
      } else if (deco == "bold") {
        cssSnippet = `font-weight: 600; color: ${resolveColor()}`;
      } else if (deco == "underline wavy") {
        cssSnippet = `text-decoration: underline; -webkit-text-decoration-color: ${resolveColor()}; text-decoration-color: ${resolveColor()}; -webkit-text-decoration-style: wavy; text-decoration-style: wavy;`;
      } else if (deco === "border solid") {
        cssSnippet = `border: 1px solid ${resolveColor()}; border-radius: 5px; padding: 1px; padding-bottom: 2px`;
      } else if (deco === "border dashed") {
        cssSnippet = `border: 1px dashed ${resolveColor()}; border-radius: 5px; padding: 1px; padding-bottom: 2px`;
      } else if (deco === "line-through") {
        cssSnippet = `text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: ${resolveColor()}`;
      } else {
        cssSnippet = `text-decoration: ${deco}; text-decoration-color: ${resolveColor()}`;
      }
      return cssSnippet;
    };

    // sort highlighters and tags alphabetically
    const sortAlphabetically = async () => {
      const { queryOrder, queries } = this.plugin.settings.staticHighlighter;

      // 1. Get unique tags and sort them
      const tagList = [
        ...new Set(queryOrder.map((h) => queries[h].tag)),
      ].sort();

      // 2. Create a map of tags to their highlighters
      const tagToHighlighters = tagList.reduce((acc, tag) => {
        // Get all highlighters for this tag and sort them alphabetically
        acc[tag] = queryOrder
          .filter((highlighter) => queries[highlighter].tag === tag)
          .sort();
        return acc;
      }, {} as Record<string, string[]>);

      // 3. Create the final sorted array by concatenating sorted highlighters from each sorted tag
      const sortedQueryOrder = tagList.flatMap((tag) => tagToHighlighters[tag]);

      // 4. Update the settings
      this.plugin.settings.staticHighlighter.queryOrder = sortedQueryOrder;
      await this.plugin.saveSettings();
      this.display();
    };

    const getAccentColor = (alpha = 0.25): string => {
      const hsl = getComputedStyle(document.body)
        .getPropertyValue("--text-accent")
        .trim();
      return hsl.replace("hsl", "hsla").replace(")", `, ${alpha})`);
    };

    // Usage
    const hslaColor = getAccentColor(0.25);

    //##############################################################
    //######################### UI #############################
    //##############################################################

    containerEl.addClass("persistent-highlights");
    containerEl.addClass("dynamic-highlights-settings");

    // Import/Export buttons
    const importExportEl = containerEl.createDiv("import-export-wrapper");
    importExportEl.createEl(
      "a",
      {
        cls: "dynamic-highlighter-import-export import-link",
        text: "Import ",
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
        cls: "dynamic-highlighter-import-export export-link",
        text: " Export",
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

    const headlineAndToggle = new Setting(containerEl)
      .setHeading()
      .setName("Persistent highlights")
      // On/Off-Switch that starts/stops all highlighting
      .addToggle((headlineToggle) => {
        headlineToggle.setTooltip(
          config.onOffSwitch
            ? `Deactivate highlighing`
            : `Activate highlighting`
        );
        headlineToggle.toggleEl.addClass("headline-toggle");
        headlineToggle.setValue(config.onOffSwitch).onChange((value) => {
          config.onOffSwitch = value;
          this.plugin.saveSettings();
          this.plugin.updateStaticHighlighter();
          this.display();
          headlineToggle.setTooltip(
            value ? `Highlighting active` : `Highlighting inactive`
          );
        });
      });
    headlineAndToggle.settingEl.addClass("headline-and-toggle");

    //##############################################################
    //############## Persistent highlighters def ##############
    //##############################################################

    // Setting up variables vor the Persistent Highlighters Scope
    let staticDecorationValue: string = "background";
    let staticDecorationDropdown: Setting;
    let staticDecorationDropdownComponent: DropdownComponent;
    let tagDropdownComponent: DropdownComponent;
    let tagName: string;
    let tagStatus: boolean;
    let selectionDecorationDropdownComponent: DropdownComponent;

    const defineQueryUI = new Setting(containerEl);
    defineQueryUI
      .setName("Define persistent highlighters")
      .setClass("define-query-ui");

    const defineQueryUITop = new Setting(defineQueryUI.controlEl);

    // Input field for the highlighter name
    const queryNameInput = new TextComponent(defineQueryUITop.controlEl);
    queryNameInput.inputEl.addClass("query-name-input");
    queryNameInput.setPlaceholder("Highlighter name");
    queryNameInput.inputEl.setAttribute("aria-label", "Highlighter name");
    if (!queryNameInput.inputEl.classList.contains("has-tooltip")) {
      queryNameInput.inputEl.classList.add("has-tooltip");
    }

    // Color picker
    const colorButtonWrapper = defineQueryUITop.controlEl.createDiv(
      "color-button-wrapper"
    );
    let staticPickrInstance: Pickr;
    const colorPicker = new ButtonComponent(colorButtonWrapper);
    colorPicker.setClass("color-button-wrapper").then(() => {
      this.pickrInstance = staticPickrInstance = new Pickr({
        el: colorPicker.buttonEl,
        container: colorButtonWrapper,
        theme: "nano",
        defaultRepresentation: "HEXA",
        default: hslaColor,
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
      const button = colorButtonWrapper.querySelector(".pcr-button");
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
    const queryInput = new TextComponent(defineQueryUITop.controlEl);
    queryInput.setPlaceholder("Search term");
    queryInput.inputEl.setAttribute("aria-label", "Search term");
    if (!queryNameInput.inputEl.classList.contains("has-tooltip")) {
      queryNameInput.inputEl.classList.add("has-tooltip");
    }
    queryInput.inputEl.addClass("query-input");

    // Tag dropdown
    const tagDropdownWrapper = defineQueryUITop.controlEl.createDiv(
      "tag-dropdown-wrapper"
    );
    const tagDropdown = new Setting(tagDropdownWrapper);
    tagDropdown.setClass("tag-dropdown").addDropdown((dropdown) => {
      tagDropdownComponent = dropdown;
      dropdown.addOption("#unsorted", "#unsorted");
      dropdown.selectEl.setAttribute(
        "aria-label",
        "Select a tag for your highlighter"
      );
      if (!dropdown.selectEl.classList.contains("has-tooltip")) {
        dropdown.selectEl.classList.add("has-tooltip");
      }
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
          const createNewTag = new Modals.NewTagModal(
            this.app,
            tagDropdownComponent,
            tagName,
            expandedTags
          );
          createNewTag.open();
        }
      });
    });

    // Array that holds all expanded Tags to persist the states
    // This has to be her because of the scope
    let expandedTags: string[];
    // Initialise array without wiping saved data
    if (this.plugin.settings.staticHighlighter.expandedTags) {
      expandedTags = this.plugin.settings.staticHighlighter.expandedTags;
    } else {
      expandedTags = [];
    }
    //############## BOTTOM ROW ####################################
    const defineQueryUIBottom = new Setting(defineQueryUI.controlEl);
    defineQueryUIBottom.setClass("define-query-ui-bottom-container");

    // Input field for the highlighter name

    // Tag dropdown
    const staticDecorationDropdownWrapper =
      defineQueryUIBottom.controlEl.createDiv("deco-dropdown");

    staticDecorationDropdown = new Setting(staticDecorationDropdownWrapper);
    staticDecorationDropdown
      .setClass("deco-dropdown")
      .addDropdown((dropdown) => {
        staticDecorationDropdownComponent = dropdown;
        dropdown.selectEl.setAttribute(
          "aria-label",
          "Select a decoration style for your highlighter"
        );
        if (!dropdown.selectEl.classList.contains("has-tooltip")) {
          dropdown.selectEl.classList.add("has-tooltip");
        }
        dropdown
          .addOption("background", "Background square")
          .addOption("background rounded", "--- rounded")
          .addOption("background realistic", "--- realistic")
          .addOption("underline", "Underline solid")
          .addOption("underline lowlight", "--- lowlight")
          .addOption("underline floating thick", "--- floating thick")
          .addOption("underline floating thin", "--- floating thin")
          .addOption("underline dotted", "--- dotted")
          .addOption("underline dashed", "--- dashed")
          .addOption("underline wavy", "--- wavy")
          .addOption("border solid", "Border solid")
          .addOption("border dashed", "--- dashed")
          .addOption("color", "Colored text normal")
          .addOption("bold", "--- bold")
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

    // RegEx toggle
    defineQueryUIBottom.controlEl.createSpan("regex-text").setText("regEx");
    const regexToggle = new ToggleComponent(
      defineQueryUIBottom.controlEl
    ).setValue(false);
    regexToggle.setTooltip("Activate RegEx");
    regexToggle.toggleEl.addClass("regex-toggle");
    regexToggle.onChange((value) => {
      if (value) {
        queryInput.setPlaceholder("Search expression");
        regexToggle.setTooltip("Deactivate RegEx");
      } else {
        queryInput.setPlaceholder("Search term");
        regexToggle.setTooltip("Activate RegEx");
      }
    });

    // "match" toggle, to decorate matched characters
    defineQueryUIBottom.controlEl.createSpan("matches-text").setText("matches");
    const matchToggle = new ToggleComponent(
      defineQueryUIBottom.controlEl
    ).setValue(true);
    matchToggle.setTooltip("Deactivate highlighting matches");
    matchToggle.toggleEl.addClass("matches-toggle");

    matchToggle.onChange((value) => {
      let matchBool: boolean = value;
      matchToggle.setTooltip(
        value
          ? "Deactivate highlighting matches"
          : "Activate highlighting matches"
      );
    });

    // "line" toggle, to decorate the entire parent line
    defineQueryUIBottom.controlEl.createSpan("line-text").setText("lines");
    const lineToggle = new ToggleComponent(
      defineQueryUIBottom.controlEl
    ).setValue(false);
    lineToggle.setTooltip("Activate higlighting of parent line");
    lineToggle.toggleEl.addClass("line-toggle");
    lineToggle.onChange((value) => {
      let lineBool: boolean = value;
      lineToggle.setTooltip(
        value
          ? "Deactivate higlighting of parent line"
          : "Activate higlighting of parent line"
      );
    });

    // The save Button
    // helper variable stores highlighter to enable changing its other settings
    let currentHighlighterName: string | null = null;
    const saveButton = new ButtonComponent(defineQueryUITop.controlEl);
    saveButton.buttonEl.setAttribute("state", "creating");
    saveButton
      .setClass("save-button")
      .setClass("action-button")
      .setClass("action-button-save")
      .setCta()
      .setIcon("save")
      .setTooltip("Save")
      .onClick(async (buttonEl: MouseEvent) => {
        // Get state (creating/editing) to circumvent duplication block when editing
        const state = saveButton.buttonEl.getAttribute("state");
        const previousHighlighterName = queryNameInput.inputEl.dataset.original;
        currentHighlighterName = queryNameInput.inputEl.value.trim();

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
        let enabledMarksMaker = () => {
          let enabledMarks: markTypes[] = [];
          if (matchToggle.getValue() && !enabledMarks.includes("match")) {
            enabledMarks.push("match");
          } else {
            enabledMarks = enabledMarks.filter((value) => value != "match");
          }
          if (lineToggle.getValue() && !enabledMarks.includes("line")) {
            enabledMarks.push("line");
          } else {
            enabledMarks = enabledMarks.filter((value) => value != "line");
          }
          return enabledMarks;
        };
        const staticHexValue = staticPickrInstance
          .getSelectedColor()
          ?.toHEXA()
          .toString();
        const queryValue = queryInput.inputEl.value;
        const queryTypeValue = regexToggle.getValue();
        const tagNameValue = tagDropdownComponent.getValue();
        let tagStatusValue = tagStatus;
        if (tagStatusValue == undefined) {
          tagStatusValue = true;
        }
        if (!expandedTags.includes(tagNameValue)) {
          expandedTags.push(tagNameValue);
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
          // Logic for the static css snippet, which can't be a standard css snippet
          // because it's implemented as StyleSpec in static.css
          let staticCssSnippet: StyleSpec = {};
          const resolveColor02 = () =>
            staticHexValue === "default"
              ? "var(--text-accent)"
              : staticHexValue;
          if (staticDecorationValue === "background") {
            staticCssSnippet = {
              backgroundColor: resolveColor02(),
            };
          } else if (staticDecorationValue === "background rounded") {
            staticCssSnippet = {
              position: "relative",
              backgroundColor: `${resolveColor02()}`,
              padding: "0.15em 0.25em",
              margin: "0",
              borderRadius: "0.25em",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              backgroundClip: "padding-box",
              backgroundImage: `linear-gradient(to right, ${resolveColor02()}dd, ${resolveColor02()} 50%, ${resolveColor02()}dd)`,
              boxShadow: `inset 0 0 0 1px ${resolveColor02()}22`,
              display: "inline",
            };
          } else if (staticDecorationValue === "background realistic") {
            staticCssSnippet = {
              position: "relative",
              backgroundColor: `${resolveColor02()}`, // set base color
              padding: "0.15em 0.45em",
              margin: "0",
              borderRadius: "0.7em 0.25em",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              backgroundImage: `linear-gradient(135deg, ${resolveColor02()} 0%, ${resolveColor02()}ee 100%)`,
              backgroundClip: "padding-box",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              textShadow: "0 1px 2px var(--background-primary-alt)",
              display: "inline",
            };
          } else if (staticDecorationValue === "underline lowlight") {
            staticCssSnippet = {
              position: "relative",
              backgroundColor: "transparent",
              padding: ".125em .125em",
              borderRadius: "0",
              backgroundImage: `linear-gradient(
									360deg,
									${resolveColor02()} 40%,
									transparent 40%
								)`,
            };
          } else if (staticDecorationValue === "underline floating thick") {
            staticCssSnippet = {
              position: "relative",
              backgroundColor: "transparent",
              padding: ".125em",
              paddingBottom: "5px",
              borderRadius: "0",
              backgroundImage: `linear-gradient(
									360deg,
									${resolveColor02()} 25%,
									transparent 25%
								)`,
            };
          } else if (staticDecorationValue === "underline floating thin") {
            staticCssSnippet = {
              position: "relative",
              backgroundColor: "transparent",
              padding: ".125em",
              paddingBottom: "5px",
              borderRadius: "0",
              backgroundImage: `linear-gradient(
									360deg,
									${resolveColor02()} 15%,
									transparent 15%
								)`,
            };
          } else if (staticDecorationValue === "color") {
            staticCssSnippet = {
              fontWeight: "400",
              color: resolveColor02(),
            };
          } else if (staticDecorationValue === "bold") {
            staticCssSnippet = {
              fontWeight: "600",
              color: resolveColor02(),
            };
          } else if (staticDecorationValue === "underline wavy") {
            staticCssSnippet = {
              textDecoration: "underline",
              webkitTextDecorationColor: resolveColor02(),
              textDecorationColor: resolveColor02(),
              webkitTextDecorationStyle: "wavy",
              textDecorationStyle: "wavy",
            };
          } else if (staticDecorationValue === "border solid") {
            staticCssSnippet = {
              border: `1px solid ${resolveColor02()}`,
              borderRadius: "5px",
              padding: "1px",
              paddingBottom: "2px",
            };
          } else if (staticDecorationValue === "border dashed") {
            staticCssSnippet = {
              border: `1px dashed ${resolveColor02()}`,
              borderRadius: "5px",
              padding: "1px",
              paddingBottom: "2px",
            };
          } else if (staticDecorationValue === "line-through") {
            staticCssSnippet = {
              textDecoration: "line-through",
              textDecorationThickness: "2px",
              textDecorationColor: resolveColor02(),
            };
          } else {
            staticCssSnippet = {
              textDecoration: staticDecorationValue,
              textDecorationColor: resolveColor02(),
            };
          }

          // Make a standard snippet for the cool icon next to the highlighters
          let makecolorIconSnippet: string = snippetMaker(
            staticDecorationValue,
            staticHexValue
          );
          // Gather all the stuff we need to make our highlighter
          config.queries[currentHighlighterName] = {
            class: currentHighlighterName, // the name
            staticColor: staticHexValue || hslaColor, // the color
            staticDecoration: staticDecorationValue, // the deco
            staticCss: staticCssSnippet, // the deco css snippet
            colorIconSnippet: makecolorIconSnippet, // the icon snippet
            regex: queryTypeValue, // the regex
            query: queryValue, // the search term/expression
            mark: enabledMarksMaker(), // the marks
            highlighterEnabled: true, // the enabled state of the highlighter
            tag: tagNameValue, // the tag name
            tagEnabled: tagStatusValue, // if the tag is enabled
          };
          // Save and redraw the display
          await this.plugin.saveSettings();
          this.plugin.registerCommands();
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
    const discardButton = new ButtonComponent(defineQueryUITop.controlEl);
    discardButton
      .setClass("discard-button")
      .setClass("action-button")
      .setClass("action-button-discard")
      .setCta()
      .setIcon("x-circle")
      .setTooltip("Discard Changes")
      .onClick(() => {
        const state = saveButton.buttonEl.getAttribute("state");

        if (state === "editing") {
          // Reset to original values
          if (currentHighlighterName != null) {
            const options = config.queries[currentHighlighterName];
            queryNameInput.inputEl.value = currentHighlighterName;
            staticPickrInstance.setColor(options.staticColor);
            queryInput.inputEl.value = options.query;
            tagDropdownComponent.setValue(options.tag);
            regexToggle.setValue(options.regex);
            new Notice("Changes discarded");
          } else {
            // Clear all fields in "creating" mode
            queryNameInput.inputEl.value = "";
            queryInput.inputEl.value = "";
            // Keep things in this order is so that queryNameInput field ends up clear
            staticPickrInstance.setColor(hslaColor);
            queryNameInput.inputEl.setAttribute(
              "style",
              `background-color: none; color: var(--text-normal);`
            );
            staticPickrInstance.hide();
            regexToggle.setValue(false);
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

    const highlightersSetting = new Setting(highlightersContainer)
      .setName("Your highlighters and tags")
      .setHeading()
      .addButton((button) => {
        button
          .setClass("sort-button")
          .setTooltip("Sort a to z")
          .onClick(() => {
            sortAlphabetically();
          });

        // Create a container for the icon inside the button
        const iconContainer = button.buttonEl.createEl("span");
        iconContainer.setAttribute("data-lucide", "arrow-down-a-z");
        createIcons({ icons });
      });

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
          // Make the tag name clickable as well
          let tagName = tagHeader.createSpan("tag-name");
          tagName.setText(tag);

          // make a container for the highlighters
          let highlightersList = tagContainer.createEl("div", {
            cls: "highlighters-list",
          });
          // Do this, which I don't quite get, but it works, so...
          tagContainers[tag] = highlightersList;

          // set the appropriate expand/collapse icon
          if (expandedTags.includes(tag)) {
            setIcon(toggleIcon, "chevron-down");
            highlightersList.removeClass("highlighters-list-collapsed");
            highlightersList.addClass("highlighters-list-expanded");
          } else {
            setIcon(toggleIcon, "chevron-right");
            highlightersList.removeClass("highlighters-list-expanded");
            highlightersList.addClass("highlighters-list-collapsed");
          }

          const tagExpandToggle = () => {
            // toggle to collapsed
            if (expandedTags.includes(tag)) {
              setIcon(toggleIcon, "chevron-right");
              highlightersList.removeClass("highlighters-list-expanded");
              highlightersList.addClass("highlighters-list-collapsed");
              expandedTags = expandedTags.filter((entry) => entry != tag);
            } else {
              // toggle to expanded
              setIcon(toggleIcon, "chevron-down");
              highlightersList.removeClass("highlighters-list-collapsed");
              highlightersList.addClass("highlighters-list-expanded");
              expandedTags.unshift(tag);
            }
            // Save settings after the toggle
            this.plugin.settings.staticHighlighter.expandedTags = expandedTags;
            this.plugin.saveSettings();
          };
          tagName.onclick = () => {
            tagExpandToggle();
          };
          toggleIcon.onclick = () => {
            tagExpandToggle();
          };
          // Create the toggle for enabling/disabling the tag
          const tagButtons = new Setting(tagHeader).setClass(
            "tag-header-buttons"
          );
          tagButtons.addToggle((tagToggle) => {
            tagToggle.setTooltip(
              config.queries[highlighter].tagEnabled
                ? `Deactivate ${tag}`
                : `Activate ${tag}`
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
              button.setTooltip(`Rename this tag`);
              button
                .setClass("action-button")
                .setClass("action-button-edit")
                .setCta()
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
              button.setTooltip(`Delete ${tag}`);
              button
                .setClass("action-button")
                .setClass("action-button-delete")
                .setIcon("trash")
                .setWarning()
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
        dragIcon.addClass(
          "highlighter-setting-icon",
          "highlighter-setting-icon-drag"
        );
        const styleIcon = settingItem.createEl("span");
        styleIcon.addClass("highlighter-style-icon");
        const abc = styleIcon.createEl("span", {
          text: "abc",
          cls: "highlighter-setting-icon-abc",
        });
        Object.assign(
          abc.style,
          this.parseCssString(config.queries[highlighter].colorIconSnippet)
        );
        dragIcon.addClass(
          "highlighter-setting-icon",
          "highlighter-setting-icon-drag"
        );

        const highlighterButtons = new Setting(settingItem)
          .setClass("highlighter-details")
          .setName(highlighter)
          .setDesc(
            config.queries[highlighter].regex
              ? `regEx: ` + query
              : `query: ` + query
          );

        // The toggle to enable/disable the highlighter
        highlighterButtons.addToggle((highlighterToggle) => {
          highlighterToggle.setTooltip(
            config.queries[highlighter].highlighterEnabled
              ? `Deactivate ${highlighter}`
              : `Activate ${highlighter}`
          );
          // logic to grey out the toggle when appropriate
          let highlighterIsDisabled: boolean =
            !this.plugin.settings.staticHighlighter.onOffSwitch;
          highlighterToggle.setValue(
            config.queries[highlighter].highlighterEnabled ?? true
          );
          if (
            // if the highlighter is disabled for some reason
            highlighterIsDisabled ||
            !config.queries[highlighter].tagEnabled
          ) {
            highlighterToggle.setDisabled(highlighterIsDisabled);
            highlighterToggle.toggleEl.classList.remove(
              "enabled-highlighter-toggle"
            );
            highlighterToggle.toggleEl.classList.add(
              "disabled-highlighter-toggle"
            );
          } else {
            // if it is enabled
            highlighterToggle.toggleEl.classList.remove(
              "enabled-highlighter-toggle"
            );
            highlighterToggle.toggleEl.classList.add(
              "enabled-highlighter-toggle"
            );
          }
          highlighterToggle.onChange((value) => {
            if (highlighterIsDisabled) {
              return;
            }
            // Update the 'enabled' property of the highlighter
            config.queries[highlighter].highlighterEnabled = value;
            highlighterToggle.setTooltip(
              value ? `Deactivate ${highlighter}` : `Activate ${highlighter}`
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
            button.setTooltip(`Edit ${highlighter} highlighter`);
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
                queryNameInput.inputEl.value = highlighter;
                queryNameInput.inputEl.dataset.original = highlighter;

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
                regexToggle.setValue(options.regex);
                // matcheToggle / lineToggle
                if (options?.mark) {
                  if (options?.mark.includes("match")) {
                    matchToggle.setValue(true);
                  } else {
                    matchToggle.setValue(false);
                  }
                  if (options?.mark.includes("line")) {
                    lineToggle.setValue(true);
                  } else {
                    lineToggle.setValue(false);
                  }
                }
                containerEl.scrollTop = 0;
              });
          })

          .addButton((button) => {
            button.setTooltip(`Delete ${highlighter}`);
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
    const renderInReadingMode = new Setting(this.containerEl)
      .setName("Show highlights in reading mode")
      .setDesc(
        "If enabled, highlights will also be shown in reading mode (preview)"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.staticHighlighter.showInReadingMode)
          .onChange(async (value) => {
            this.plugin.settings.staticHighlighter.showInReadingMode = value;
            await this.plugin.saveSettings();
          });
      });
    const chooseCommands = new Setting(containerEl);
    chooseCommands.setName("Hotkeys and command palette");
    chooseCommands.setDesc(
      `All your tags are automatically added to the command palette/hotkeys for toggling. If you want to toggle individual highlighters via palette/hotkey, input a comma separated list of their names (case sensitive). Highlighters with the tag '#unsorted' are added automatically.`
    );
    chooseCommands.addTextArea((text) => {
      text.inputEl.addClass("ignored-words-input");
      text
        .setValue(this.plugin.settings.staticHighlighter.toggleable.join(", "))
        .onChange(async (value) => {
          this.plugin.settings.staticHighlighter.toggleable = value
            .split(",") // Split by commas (or your chosen separator)
            .map((tag) => tag.trim()) // Clean up each tag
            .filter((tag) => tag.length > 0); // Remove empty strings
          await this.plugin.saveSettings();
          this.plugin.registerCommands();
          this.plugin.updateSelectionHighlighter();
        });
    });

    //##############################################################
    //################ SELECTION HIGHLIGHTERS ##################
    //##############################################################
    new Setting(containerEl).setName("Selection highlights").setHeading();

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
      selectionColorPickerDefault = hslaColor;
    } else {
      selectionColorPickerDefault =
        this.plugin.settings.selectionHighlighter.selectionColor;
    }
    selectionColorPicker.setClass("color-button-wrapper").then(() => {
      this.pickrInstance = selectionColorPickerInstance = new Pickr({
        el: selectionColorPicker.buttonEl,
        container: rowWrapper,
        theme: "nano",
        defaultRepresentation: "HEXA",
        default: selectionColorPickerDefault,
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
      const button = rowWrapper.querySelector(".pcr-button");
      if (!button) {
        throw new Error("Button is null (see ui.ts)");
      }
      button.ariaLabel = "Decoration color picker";

      // Picker functionality
      selectionColorPickerInstance
        .on("clear", (instance: Pickr) => {
          instance.hide();
        })
        .on("cancel", (instance: Pickr) => {
          instance.hide();
        })
        .on("change", (color: Pickr.HSVaColor) => {
          const hexValue = color?.toHEXA().toString() || "";

          hexValue && hexValue.length == 6
            ? (this.plugin.settings.selectionHighlighter.selectionColor = `${hexValue}A6`)
            : (this.plugin.settings.selectionHighlighter.selectionColor =
                hexValue);
          this.plugin.saveSettings();
        })
        .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
          const hexValue = color?.toHEXA().toString() || "";
          hexValue && hexValue.length == 6
            ? (this.plugin.settings.selectionHighlighter.selectionColor = `${hexValue}A6`)
            : (this.plugin.settings.selectionHighlighter.selectionColor =
                hexValue);
          this.plugin.saveSettings();
          instance.hide();
        });
    });

    const selectionDecorationDropdown = new Setting(rowWrapper)
      .setName("Choose a decoration.")
      .setClass("choose-decoration-text");
    selectionDecorationDropdown
      .setClass("decoration-dropdown")
      .addDropdown((dropdown) => {
        selectionDecorationDropdownComponent = dropdown;
        dropdown.selectEl.setAttribute(
          "aria-label",
          "Select a decoration style for your highlighter"
        );
        if (!dropdown.selectEl.classList.contains("has-tooltip")) {
          dropdown.selectEl.classList.add("has-tooltip");
        }
        dropdown
          .addOption("background", "Background square")
          .addOption("background rounded", "--- rounded")
          .addOption("background realistic", "--- realistic")
          .addOption("underline", "Underline solid")
          .addOption("underline lowlight", "--- lowlight")
          .addOption("underline floating thick", "--- floating thick")
          .addOption("underline floating thin", "--- floating thin")
          .addOption("underline dotted", "--- dotted")
          .addOption("underline dashed", "--- dashed")
          .addOption("underline wavy", "--- wavy")
          .addOption("border solid", "Border solid")
          .addOption("border dashed", "--- dashed")
          .addOption("color", "Colored text normal")
          .addOption("bold", "--- bold")
          .addOption("line-through", "Strikethrough")
          .setValue(
            this.plugin.settings.selectionHighlighter.selectionDecoration ===
              "default"
              ? "underline dotted"
              : this.plugin.settings.selectionHighlighter.selectionDecoration
          )
          .onChange((value) => {
            this.plugin.settings.selectionHighlighter.selectionDecoration =
              value;
            this.plugin.saveSettings();
          });
      });

    const cssSaveButton = new ButtonComponent(rowWrapper);
    cssSaveButton.setTooltip("Save highlighter");
    cssSaveButton
      .setClass("action-button")
      .setCta()
      .setClass("selected-save-button")
      .setIcon("save")
      .setTooltip("Save deco")
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
        new Notice("Selection highlighter style saved.");
        await this.plugin.saveSettings();
        this.plugin.updateSelectionHighlighter();
      });

    const selectedDiscardButton = new ButtonComponent(rowWrapper);
    selectedDiscardButton
      .setClass("selected-discard-button")
      .setClass("action-button")
      .setCta()
      .setIcon("x-circle")
      .setTooltip("Reset to default")
      .onClick(async () => {
        this.plugin.settings.selectionHighlighter.selectionColor = "default";
        this.plugin.settings.selectionHighlighter.selectionDecoration =
          hslaColor;
        this.plugin.settings.selectionHighlighter.css =
          "text-decoration: underline dotted var(--text-accent)";
        selectionDecorationDropdownComponent.setValue("underline dotted");
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
      .setDesc(
        "A comma separated list of words that will be ignored by selection highlights."
      )
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

  private parseCssString(cssString: string): Partial<CSSStyleDeclaration> {
    const styleObject: { [key: string]: string } = {};
    const styles = cssString.split(";").filter((style) => style.trim());

    styles.forEach((style) => {
      const [property, value] = style.split(":").map((part) => part.trim());
      if (property && value) {
        // Convert kebab-case to camelCase for style properties
        const camelProperty = property.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase()
        );
        styleObject[camelProperty] = value;
      }
    });

    return styleObject as Partial<CSSStyleDeclaration>;
  }
}

// FIN
