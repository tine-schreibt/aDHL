/* aria-label - WORKS*/
/* config.queries[className] = { enabled: true };*/
/* toggle v1 added - WORKS */
/* attempting save logic v1 */
/* added save/update logic*/
/*duplicate check, name change*/

import { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import Pickr from "@simonwep/pickr";
import {
  App,
  ButtonComponent,
  Notice,
  PluginSettingTab,
  Scope,
  setIcon,
  Setting,
  TextAreaComponent,
  DropdownComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import Sortable from "sortablejs";
import { basicSetup } from "src/editor/extensions";
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
        cls: "dynamic-highlighter-import",
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
        cls: "dynamic-highlighter-export",
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

// Persistent Highlights Container
    containerEl
      .createEl("h3", {
        text: "Persistent Highlights",
      })
      .addClass("persistent-highlights");
    containerEl.addClass("dynamic-highlights-settings");

    // Define Query UI
    const defineQueryUI = new Setting(containerEl);
    defineQueryUI
      .setName("Define persistent highlighters")
      .setClass("highlighter-definition")
      .setDesc(
        `In this section you define a unique highlighter name along with a background color and a search term/expression. Enable the regex toggle when entering a regex query. Make sure to click the save button once you're done defining the highlighter.`
      );
    
    // Create the input field for the highlighter name
    const classInput = new TextComponent(defineQueryUI.controlEl);
    classInput.setPlaceholder("Highlighter name");
    classInput.inputEl.ariaLabel = "Highlighter name";
    classInput.inputEl.addClass("highlighter-name");

    // Create the color picker
    const colorWrapper = defineQueryUI.controlEl.createDiv("color-wrapper");

    let pickrInstance: Pickr;
    const colorPicker = new ButtonComponent(colorWrapper);
      // Set the defaults for the picker
    colorPicker.setClass("highlightr-color-picker").then(() => {
      this.pickrInstance = pickrInstance = new Pickr({
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
      // Make the button and aria label
      const button = colorWrapper.querySelector(".pcr-button");
      if (!button) {
       throw new Error("Button is null (see ui.ts)");
      }
      button.ariaLabel = "Background color picker";

      // Picker functionality
      pickrInstance
        .on("clear", (instance: Pickr) => {
          instance.hide();
          classInput.inputEl.setAttribute(
            "style",
            `background-color: none; color: var(--text-normal);`
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
          classInput.inputEl.setAttribute(
            "style",
            `background-color: ${newColor}; color: var(--text-normal);`
          );
        })
        .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
          instance.hide();
        });
    });

    // Create the query input field
    const queryWrapper = defineQueryUI.controlEl.createDiv("query-wrapper");
    const queryInput = new TextComponent(queryWrapper);
    queryInput.setPlaceholder("Search term");
    queryInput.inputEl.addClass("highlighter-settings-query");

    // Create the regex toggle
    const queryTypeInput = new ToggleComponent(queryWrapper);
    queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
    queryTypeInput.toggleEl.ariaLabel = "Enable Regex";
    queryTypeInput.onChange((value) => {
      if (value) {
        queryInput.setPlaceholder("Search expression");
      } else {
        queryInput.setPlaceholder("Search term");
      }
    });

    let staticDecorationValue: string = "background";
    let staticDecorationDropdown: Setting;
    let staticDecorationDropdownComponent: DropdownComponent;
    
    // Create the marker types
    type MarkTypes = Record<
      markTypes,
      { description: string; defaultState: boolean }
    >;
    type MarkItems = Partial<
      Record<markTypes, { element: HTMLElement; component: ToggleComponent }>
    >;
    const buildMarkerTypesHardcoded = (parentEl: HTMLElement): MarkItems => {
      // Create a single grid container
      const dropdownContainer = parentEl.createDiv("dropdown-and-marks-container");
    
      // Create the static decoration dropdown
      dropdownContainer.createSpan("deco-text").setText("Deco");
      staticDecorationDropdown = new Setting(dropdownContainer);
      staticDecorationDropdown
        .setClass("deco-dropdown")
        .addDropdown((dropdown) => {
          staticDecorationDropdownComponent = dropdown;
          dropdown
            .addOption("underline", "Underline")
            .addOption("underline dotted", "Dotted")
            .addOption("underline dashed", "Dashed")
            .addOption("underline wavy", "Wavy")
            .addOption("background", "Background")
            .addOption("bold", "Bold, colored text")
            .addOption("line-through", "Strikethrough")
            .setValue("background")
            .onChange((value) => {
              staticDecorationValue = value;
            });
        });
    
      const types: MarkItems = {};
    
      // Add the "match" toggle
      dropdownContainer.createSpan("matches-text").setText("matches");
      const matchToggle = new ToggleComponent(dropdownContainer).setValue(true); // Default state: true
      matchToggle.toggleEl.addClass("matches-toggle");
      types["match"] = {
        element: matchToggle.toggleEl,
        component: matchToggle,
      };
    
      // Add the "line" toggle
      dropdownContainer.createSpan("line-text").setText("parent line");
      const lineToggle = new ToggleComponent(dropdownContainer).setValue(false); // Default state: false
      lineToggle.toggleEl.addClass("line-toggle");
      types["line"] = {
        element: lineToggle.toggleEl,
        component: lineToggle,
      };
    
      return types;
    };
    
    const marks = buildMarkerTypesHardcoded(defineQueryUI.controlEl);

    // Create the custom CSS field
    const customCSSWrapper =
      defineQueryUI.controlEl.createDiv("custom-css-wrapper");
    customCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
    const customCSSEl = new TextAreaComponent(customCSSWrapper);
    this.editor = editorFromTextArea(customCSSEl.inputEl, basicSetup);
    customCSSEl.inputEl.addClass("custom-css");

    let currentClassName: string | null = null;

    // Create the save button
    const saveButton = new ButtonComponent(queryWrapper);
    saveButton.buttonEl.setAttribute("state", "creating");
    saveButton
  .setClass("action-button")
  .setClass("action-button-save")
  .setClass("mod-cta")
  .setIcon("save")
  .setTooltip("Save")
  .onClick(async (buttonEl: MouseEvent) => {

    // Determine the current state (creating/editing)
    const state = saveButton.buttonEl.getAttribute("state");
    const previousClassName = classInput.inputEl.dataset.original; // Store the original name when editing
    currentClassName = classInput.inputEl.value.replace(/ /g, "-");

    // Delete old highlighter when editing
    if (state === "editing" && previousClassName && previousClassName !== currentClassName) {
      // Remove the entry for the original class name
      delete config.queries[previousClassName];
      // Update the order list if necessary
      const index = config.queryOrder.indexOf(previousClassName);
      if (index !== -1) {
        config.queryOrder[index] = currentClassName;
      }
    }

// Get the values from the form
const staticHexValue = pickrInstance.getSelectedColor()?.toHEXA().toString();
const queryValue = queryInput.inputEl.value;
const queryTypeValue = queryTypeInput.getValue();
const customCss = this.editor.state.doc.toString();

// If creating, check if the class name already exists
if (currentClassName) {
  if (state == "creating") {
    if (!config.queryOrder.includes(currentClassName)) {
      config.queryOrder.push(currentClassName);
    } else {
      new Notice("Highlighter name already exists");
      return;
    }
  }

  // markTypes blablababla
  const enabledMarks = Object.entries(marks)
    .map(([type, item]) => (item.component.getValue() && type) as string)
    .filter((type): type is markTypes => ["line", "match"].includes(type));

  // Logic for the static CSS snippet
  let staticCssSnippet: StyleSpec = {};
  if (staticHexValue === "default") {
    if (staticDecorationValue === "background") {
      staticCssSnippet = {
        backgroundColor: "var(--text-accent)",
      };
    } else if (staticDecorationValue === "bold") {
      staticCssSnippet = {
        fontWeight: "bold",
        color: "var(--text-accent)",
      };
    } else if (staticDecorationValue === "underline wavy") {
      staticCssSnippet = {
        textDecoration: "underline wavy",
        textDecorationColor: "var(--text-accent)",
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
    } else if (staticDecorationValue === "bold") {
      staticCssSnippet = {
        fontWeight: "bold",
        color: staticHexValue,
      };
    } else if (staticDecorationValue === "underline wavy") {
      staticCssSnippet = {
        textDecoration: "underline wavy",
        textDecorationThickness: "1px",
        textDecorationColor: "var(--text-accent)",
      };
    } else {
      staticCssSnippet = {
        textDecoration: staticDecorationValue,
        textDecorationColor: staticHexValue,
      };
    }
  }
  console.log(`staticCssSnippet:`, staticCssSnippet);

  // Gather all values
  config.queries[currentClassName] = {
    class: currentClassName,
    staticColor: staticHexValue || "#42188038",
    staticDecoration: staticDecorationValue,
    staticCss: staticCssSnippet,
    regex: queryTypeValue,
    query: queryValue,
    mark: enabledMarks,
    css: customCss,
    enabled: true,
  };
  // Save and update
  await this.plugin.saveSettings();
  this.plugin.updateStaticHighlighter();
  this.plugin.updateCustomCSS();
  this.plugin.updateStyles();
  this.display();
  saveButton.buttonEl.setAttribute("state", "creating");
} else if (!currentClassName && staticHexValue) {
  new Notice("Highlighter name missing");
} else if (!/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(currentClassName)) {
  new Notice("Highlighter name missing");
} else {
  new Notice("Highlighter values missing");
}
  });
    saveButton.buttonEl.setAttribute("aria-label", "Save Highlighter");

    // Create the discard button
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
      if (currentClassName != null) {
      const options = config.queries[currentClassName];
      classInput.inputEl.value = currentClassName;
      pickrInstance.setColor(options.staticColor);
      queryInput.inputEl.value = options.query;
      queryTypeInput.setValue(options.regex);
      this.editor.setState(
        EditorState.create({
          doc: options.css || "",
          extensions: basicSetup,
        })
      );
      new Notice("Changes discarded");
    } else {
      // Clear all fields in "creating" mode
      classInput.inputEl.value = "";
      queryInput.inputEl.value = "";
      pickrInstance.setColor("#42188038"); // This order is so that classInput.inputEl.setAttribute can clear the input field's style
      classInput.inputEl.setAttribute(
        "style",
        `background-color: none; color: var(--text-normal);`
      );
      pickrInstance.hide();
      queryTypeInput.setValue(false);
      this.editor.setState(
        EditorState.create({
          doc: "",
          extensions: basicSetup,
        })
      );
      new Notice("Form cleared");
    }

    // Reset state (optional)
    saveButton.buttonEl.setAttribute("state", "creating");
  }});
    
   // ################## HIGHTLIGHER CONTAINER ##################
    const highlightersContainer = containerEl.createEl("div", {
      cls: "highlighter-container",
    });

    // ################## HIGHTLIGHER CONTAINER ##################
    
    this.plugin.settings.staticHighlighter.queryOrder.forEach((highlighter) => {
      const queryConfig = config.queries[highlighter];
      if (queryConfig) {
        const { staticColor, query, regex } = queryConfig;
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${staticColor} stroke=${staticColor} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
        const settingItem = highlightersContainer.createEl("div");
        settingItem.id = "dh-" + highlighter;
        settingItem.addClass("highlighter-item-draggable");
        const dragIcon = settingItem.createEl("span");
        const colorIcon = settingItem.createEl("span");
        dragIcon.addClass(
          "highlighter-setting-icon",
          "highlighter-setting-icon-drag"
        );
        colorIcon.addClass("highlighter-setting-icon");
        colorIcon.innerHTML = icon;
        setIcon(dragIcon, "three-horizontal-bars");
        dragIcon.ariaLabel = "Drag to rearrange";
        const desc: string[] = [];
        desc.push((regex ? "search expression: " : "search term: ") + query);
        desc.push("css class: " + highlighter);
        desc.push("color: " + config.queries[highlighter].staticColor);

        new Setting(settingItem)
          .setClass("highlighter-details")
          .setName(highlighter)
          .setDesc(desc.join(" | "))

    // ####### beginning TOGGLE ENABLED/DISABLED########################

            .addToggle((toggle) => {
              toggle.setValue(config.queries[highlighter].enabled ?? true).onChange((value) => {
                // Update the 'enabled' property of the highlighter
                config.queries[highlighter].enabled = value;

                // Update the aria-label based on the toggle state
                toggle.toggleEl.setAttribute("aria-label", value ? `Disable ${highlighter} highlighter` : `Enable ${highlighter} highlighter`);

                // Use an immediately invoked async function to handle the await
                (async () => {
                  // Call the save function to persist the changes
                  await this.plugin.saveSettings();

                  // Refresh the highlighter decorations
                  this.plugin.updateStaticHighlighter(); // Ensure this method exists in your plugin
                })();
              });

              // Set initial aria-label based on the initial state
              toggle.toggleEl.setAttribute("aria-label", config.queries[highlighter].enabled ? `Disable ${highlighter} highlighter` : `Enable ${highlighter} highlighter`);
            })

    // ####### endTOGGLE ENABLED/DISABLED########################

      .addButton((button) => {
        button.buttonEl.setAttribute("aria-label", `Edit ${highlighter} highlighter`);
        button
        .setClass("action-button")
        .setClass("action-button-edit")
        .setClass("mod-cta")
        .setIcon("pencil")
        .onClick(async (evt) => {
          saveButton.buttonEl.setAttribute("state", "editing");

          const options = config.queries[highlighter];
          classInput.inputEl.value = highlighter;
          classInput.inputEl.dataset.original = highlighter; // Store original name
          
          pickrInstance.setColor(options.staticColor);
          queryInput.inputEl.value = options.query;
          staticDecorationDropdownComponent.setValue(options.staticDecoration);
          staticDecorationValue = options.staticDecoration; // Set staticDecorationValue to the current value
          pickrInstance.setColor(options.staticColor);
          queryTypeInput.setValue(options.regex);

          const extensions = basicSetup;
          this.editor.setState(
            EditorState.create({
              doc: options.css ? options.css : "",
              extensions: extensions,
            })
          );
          if (options?.mark) {
            const marksSet = new Set<markTypes>(options.mark); // Convert to a Set for efficient lookups
            Object.entries(marks).forEach(([key, value]) => {
              const isMarkType = ["line", "match"].includes(key as markTypes);
              value.component.setValue(isMarkType && marksSet.has(key as markTypes));
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
              button.buttonEl.setAttribute("aria-label", `Delete ${highlighter} highlighter`);
              button
                .setClass("action-button")
                .setClass("action-button-delete")
                .setIcon("trash")
                .setClass("mod-warning")
                .onClick(async () => {
                  new Notice(`${highlighter} highlight deleted`);
                  delete config.queries[highlighter];
                  config.queryOrder.remove(highlighter);
                  await this.plugin.saveSettings();
                  this.plugin.updateStyles();
                  this.plugin.updateStaticHighlighter();
                  const highlighterElement = highlightersContainer.querySelector(`#dh-${highlighter}`);
                    if (highlighterElement) {
                      highlighterElement.detach();
                    }
                });
            });
      } else {
        console.warn(`Highlighter "${highlighter}" not found in config.queries.`);
      }
    });
  
    Sortable.create(highlightersContainer, {
      animation: 500,
      ghostClass: "highlighter-sortable-ghost",
      chosenClass: "highlighter-sortable-chosen",
      dragClass: "highlighter-sortable-drag",
      handle: ".highlighter-setting-icon-drag",
      dragoverBubble: true,
      forceFallback: true,
      fallbackClass: "highlighter-sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      onSort: (command) => {
        const arrayResult = config.queryOrder;
        const oldIndexNonNull = command.oldIndex;
        const newIndexNonNull = command.newIndex;
        if (typeof oldIndexNonNull === "number" && typeof newIndexNonNull === "number") {
          const [removed] = arrayResult.splice(oldIndexNonNull, 1);
          arrayResult.splice(newIndexNonNull, 0, removed);
        } else throw new Error(`index is null`)
        this.plugin.settings.staticHighlighter.queryOrder = arrayResult;
        this.plugin.saveSettings();
      },
    });

    containerEl.createEl("h3", {
      text: "Selection Highlights",
    });
    const selectionHighlightUI = new Setting(containerEl);
    const rowWrapper = selectionHighlightUI.controlEl.createDiv("selectedHighlightsStylingsContainer");

    const descriptionText = rowWrapper.createDiv("choose-color-text");
    descriptionText.setText("Choose a color.");

    let selectionColorPickerInstance: Pickr; // Define outside

const selectionColorPicker = new ButtonComponent(rowWrapper);
let selectionColorPickerDefault: string;
if (this.plugin.settings.selectionHighlighter.selectionColor === "default") {
  selectionColorPickerDefault = "#42188038";
} else {
  selectionColorPickerDefault = this.plugin.settings.selectionHighlighter.selectionColor;
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
      .setClass("choose-decoration-text")
      selectionDecorationDropdown
      .setClass("decoration-dropdown")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("underline", "Underline")
          .addOption("underline dotted", "Dotted")
          .addOption("underline dashed", "Dashed")
          .addOption("underline wavy", "Wavy")
          .addOption("background", "Background")
          .addOption("bold", "Bold, colored text")
          .addOption("line-through", "Strikethrough")
          .setValue(this.plugin.settings.selectionHighlighter.selectionDecoration)
          .onChange((value) => {
            this.plugin.settings.selectionHighlighter.selectionDecoration = value;
            this.plugin.saveSettings();
          });
      });

      const cssSaveButton = new ButtonComponent(rowWrapper)
        .setClass("action-button")
        .setClass("mod-cta")
        .setClass("selected-save-button")
        .setIcon("save")
        .setTooltip("Save CSS Snippet")
        .onClick(async () => {
          let color = this.plugin.settings.selectionHighlighter.selectionColor;
          let decoration = this.plugin.settings.selectionHighlighter.selectionDecoration;

          let cssSnippet;

          if (color == "default") {
            if (decoration == "background") {
              cssSnippet = `background-color: var(--text-accent)`
            } else if (decoration == "bold") {
              cssSnippet = `font-weight: bold; color: var(--text-accent)`
            } else if (decoration == "underline wavy") {
              cssSnippet = `background-image: linear-gradient(to right, var(--text-accent) 0%, var(--text-accent) 25%, transparent 25%, transparent 50%); background-size: 4px 1px; background-repeat: repeat-x; background-position: bottom; text-decoration: underline wavy; text-decoration-thickness: 1px; text-decoration-color: var(--text-accent);`
            } else {
              cssSnippet = `text-decoration: ${decoration}; text-decoration-color: var(--text-accent)`
            }
        } else {
            if (decoration == "background") {
              cssSnippet = `background-color: ${color}`
            } else if (decoration == "bold") {
              cssSnippet = `font-weight: bold; color: ${color}`
            } else if (decoration == "underline wavy") {
              cssSnippet = `background-image: linear-gradient(to right, ${color} 0%, ${color} 25%, transparent 25%, transparent 50%); background-size: 4px 1px; background-repeat: repeat-x; background-position: bottom; text-decoration: underline wavy; text-decoration-thickness: 1px; text-decoration-color: var(--text-accent);`
            } else {
              cssSnippet = `text-decoration: ${decoration}; text-decoration-color: ${color}`
            }
          }
          // Save the CSS snippet to the settings
          this.plugin.settings.selectionHighlighter.css = cssSnippet;
          await this.plugin.saveSettings();
          this.plugin.updateSelectionHighlighter()
          new Notice("CSS Snippet saved successfully!");
        });
        cssSaveButton.buttonEl.setAttribute("aria-label", "Save Highlighter");


        const selectedDiscardButton = new ButtonComponent(rowWrapper);
        selectedDiscardButton
          .setClass("selected-reset-button")
          .setClass("action-button")
          .setClass("mod-cta")
          .setIcon("x-circle")
          .setTooltip("Reset to default")
          .onClick(async () => {
          this.plugin.settings.selectionHighlighter.selectionColor = "default";
          this.plugin.settings.selectionHighlighter.selectionDecoration = "default";
          this.plugin.settings.selectionHighlighter.css = "text-decoration: underline dotted var(--text-accent)";
          selectionColorPickerInstance.setColor("#42188038");
          await this.plugin.saveSettings();
          this.plugin.updateSelectionHighlighter()
          new Notice("Defaults reset");
        });

        const dropdownSpacer = new Setting(rowWrapper)
        .setName("")
        .setClass("selected-spacer")
        dropdownSpacer
        .setClass("selected-spacer");

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

function editorFromTextArea(
  textarea: HTMLTextAreaElement,
  extensions: Extension
) {
  const view = new EditorView({
    state: EditorState.create({ doc: textarea.value, extensions }),
  });
  const parentNodeNonNull = textarea.parentNode
  if (parentNodeNonNull){
    parentNodeNonNull.insertBefore(view.dom, textarea);}
  textarea.style.display = "none";
  if (textarea.form)
    textarea.form.addEventListener("submit", () => {
      textarea.value = view.state.doc.toString();
    });
  return view;
}

