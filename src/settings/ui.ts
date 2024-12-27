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
  TextComponent,
  ToggleComponent,
} from "obsidian";
import Sortable from "sortablejs";
import { basicSetup } from "src/editor/extensions";
import AnotherDynamicHighlightsPlugin from "../../main";
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

  display(): void {
    this.app.keymap.pushScope(this.scope);
    const { containerEl } = this;
    containerEl.empty();
    const config = this.plugin.settings.staticHighlighter;
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
    containerEl
      .createEl("h3", {
        text: "Persistent Highlights",
      })
      .addClass("persistent-highlights");
    containerEl.addClass("dynamic-highlights-settings");

    const defineQueryUI = new Setting(containerEl);

    defineQueryUI
      .setName("Define persistent highlighters")
      .setClass("highlighter-definition")
      .setDesc(
        `In this section you define a unique highlighter name along with a background color and a search term/expression. Enable the regex toggle when entering a regex query. Make sure to click the save button once you're done defining the highlighter.`
      );

    const classInput = new TextComponent(defineQueryUI.controlEl);
    classInput.setPlaceholder("Highlighter name");
    classInput.inputEl.ariaLabel = "Highlighter name";
    classInput.inputEl.addClass("highlighter-name");

    const colorWrapper = defineQueryUI.controlEl.createDiv("color-wrapper");

    let pickrInstance: Pickr;
    const colorPicker = new ButtonComponent(colorWrapper);

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
      
      const button = colorWrapper.querySelector(".pcr-button");
      if (!button) {
       throw new Error("Button is null (see ui.ts)");
      }
      button.ariaLabel = "Background color picker";

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

    const queryWrapper = defineQueryUI.controlEl.createDiv("query-wrapper");
    const queryInput = new TextComponent(queryWrapper);
    queryInput.setPlaceholder("Search term");
    queryInput.inputEl.addClass("highlighter-settings-query");

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

    type MarkTypes = Record<
      markTypes,
      { description: string; defaultState: boolean }
    >;
    type MarkItems = Partial<
      Record<markTypes, { element: HTMLElement; component: ToggleComponent }>
    >;
    const buildMarkerTypes = (parentEl: HTMLElement) => {
      const types: MarkItems = {};
      const marks: MarkTypes = {
        match: { description: "matches", defaultState: true },
        line: { description: "parent line", defaultState: false },
      };
      const container = parentEl.createDiv("mark-wrapper");
      let type: markTypes;
      for (type in marks) {
        const mark = marks[type];
        const wrapper = container.createDiv("mark-wrapper");
        wrapper.createSpan("match-type").setText(mark.description);
        const component = new ToggleComponent(wrapper).setValue(
          mark.defaultState
        );
        types[type] = {
          element: wrapper,
          component: component,
        };
      }
      return types;
    };
    const marks = buildMarkerTypes(defineQueryUI.controlEl);

    const customCSSWrapper =
      defineQueryUI.controlEl.createDiv("custom-css-wrapper");
    customCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
    const customCSSEl = new TextAreaComponent(customCSSWrapper);
    this.editor = editorFromTextArea(customCSSEl.inputEl, basicSetup);
    customCSSEl.inputEl.addClass("custom-css");

    let currentClassName: string | null = null;

    const saveButton = new ButtonComponent(queryWrapper);
    saveButton.buttonEl.setAttribute("state", "creating");
    saveButton
  .setClass("action-button")
  .setClass("action-button-save")
  .setClass("mod-cta")
  .setIcon("save")
  .setTooltip("Save")
  .onClick(async (buttonEl: MouseEvent) => {
    console.log("Save button clicked");

    // Determine the current state (creating/editing)
    const state = saveButton.buttonEl.getAttribute("state");
    console.log(`saveButton initial state:`, "state", state)
    const previousClassName = classInput.inputEl.dataset.original; // Store the original name when editing
    currentClassName = classInput.inputEl.value.replace(/ /g, "-");

    // Check if the edit mode and class name has changed
    if (state === "editing" && previousClassName && previousClassName !== currentClassName) {
      // Remove the entry for the original class name
      delete config.queries[previousClassName];
      // Update the order list if necessary
      const index = config.queryOrder.indexOf(previousClassName);
      if (index !== -1) {
        config.queryOrder[index] = currentClassName;
      }
    }

    const hexValue = pickrInstance.getSelectedColor()?.toHEXA().toString();
    const queryValue = queryInput.inputEl.value;
    const queryTypeValue = queryTypeInput.getValue();
    const customCss = this.editor.state.doc.toString();

    if (currentClassName) {
      if (state == "creating") {
        if (!config.queryOrder.includes(currentClassName)) {
          config.queryOrder.push(currentClassName);
        } else {
          new Notice("Highlighter name already exists");
          return;
        }
      }

      const enabledMarks = Object.entries(marks)
        .map(([type, item]) => (item.component.getValue() && type) as string)
        .filter((type): type is markTypes => ["line", "match"].includes(type));

      config.queries[currentClassName] = {
        class: currentClassName,
        color: hexValue || "",
        regex: queryTypeValue,
        query: queryValue,
        mark: enabledMarks,
        css: customCss,
        enabled: true,
      };

      await this.plugin.saveSettings();
      this.plugin.updateStaticHighlighter();
      this.plugin.updateCustomCSS();
      this.plugin.updateStyles();
      this.display();
      saveButton.buttonEl.setAttribute("state", "creating");
      console.log(`saveButton state after saving:`, "state", state)
    } else if (!currentClassName && hexValue) {
      new Notice("Highlighter name missing");
    } else if (!/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(currentClassName)) {
      new Notice("Highlighter name missing");
    } else {
      new Notice("Highlighter values missing");
    }
  });
    saveButton.buttonEl.setAttribute("aria-label", "Save");

    // Create the discard button
const discardButton = new ButtonComponent(queryWrapper);
discardButton
  .setClass("action-button")
  .setClass("mod-cta")
  .setIcon("x-circle")
  .setTooltip("Discard Changes")
  .onClick(() => {
    const state = saveButton.buttonEl.getAttribute("state");
    console.log("Discard button clicked, current state:", state);

    if (state === "editing") {
      // Reset to original values
      if (currentClassName != null) {
      const options = config.queries[currentClassName];
      classInput.inputEl.value = currentClassName;
      pickrInstance.setColor(options.color);
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
      pickrInstance.setColor(null);
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
    saveButton.buttonEl.removeAttribute("state");
  }});


console.log("Save and discard buttons created:", saveButton.buttonEl, discardButton.buttonEl);

    
   // ################## HIGHTLIGHER CONTAINER ##################
    const highlightersContainer = containerEl.createEl("div", {
      cls: "highlighter-container",
    });

    // ################## HIGHTLIGHER CONTAINER ##################
    
    this.plugin.settings.staticHighlighter.queryOrder.forEach((highlighter) => {
      const queryConfig = config.queries[highlighter];
      if (queryConfig) {
        const { color, query, regex } = queryConfig;
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${color} stroke=${color} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
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
        desc.push("color: " + config.queries[highlighter].color);

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
          
          pickrInstance.setColor(options.color);
          queryInput.inputEl.value = options.query;
          pickrInstance.setColor(options.color);
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
    selectionHighlightUI
      .setName("Choose a color")
      .setClass("selection-highlighter-button-text")
    const selectionColorPicker = new ButtonComponent(selectionHighlightUI.controlEl);
    selectionColorPicker.setClass("selection-color-picker").then(() => {
      const colorPickerInstance = new Pickr({
        el: selectionColorPicker.buttonEl,
        theme: "nano",
        default: "#42188038",
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

      colorPickerInstance.on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
        const hexValue = color.toHEXA().toString();
        this.plugin.settings.selectionHighlighter.selectionColor = hexValue;
        this.plugin.saveSettings();
      });
    });

    const decorationDropdown = new Setting(selectionHighlightUI.controlEl)
      .setName("Choose a decoration style.")
      .setClass("selection-highlighter-button-text")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("underline", "Underline")
          .addOption("dotted", "Dotted")
          .addOption("dashed", "Dashed")
          .addOption("wavy", "Wavy")
          .addOption("bold", "Bold")
          .addOption("background", "Backround")
          .setValue("standard")
          .onChange((value) => {
            this.plugin.settings.selectionHighlighter.selectionDecoration = value;
            this.plugin.saveSettings();
          });
      });

      const cssSaveButton = new ButtonComponent(selectionHighlightUI.controlEl);
      cssSaveButton
        .setClass("action-button")
        .setClass("mod-cta")
        .setIcon("save")
        .setTooltip("Save CSS Snippet")
        .onClick(async () => {
          const color = this.plugin.settings.selectionHighlighter.selectionColor;
          const decoration = this.plugin.settings.selectionHighlighter.selectionDecoration;
          let cssSnippet;
          if (decoration == "background") {
             // cssSnippet = `.selection-highlight { background-color: ${color}; }`;
            cssSnippet = `background-color: ${color}`;
          } else {
            cssSnippet = `text-decoration: ${decoration} ${color} }`;
          }
      
          // Save the CSS snippet to the settings
          this.plugin.settings.selectionHighlighter.css = cssSnippet;
          await this.plugin.saveSettings();
          new Notice("CSS Snippet saved successfully!");
        });


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

