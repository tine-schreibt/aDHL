 containerEl
      .createEl("h3", {
        text: "Persistent Highlights",
      })
      .addClass("persistent-highlights");
    containerEl.addClass("dynamic-highlights-settings");

    const defineQueryUI = new Setting(containerEl);

    defineQueryUI // selectionHighlighter
      .setName("Define persistent highlighters")
      .setClass("highlighter-definition")
      .setDesc(
        `In this section you define a unique highlighter name along with a background color and a search term/expression. Enable the regex toggle when entering a regex query. Make sure to click the save button once you're done defining the highlighter.`
      );

    const classInput /*selectionColor*/ = new TextComponent(defineQueryUI.controlEl);
    classInput.setPlaceholder("Highlighter name");
    classInput.inputEl.ariaLabel = "Highlighter name";
    classInput.inputEl.addClass("highlighter-name");


    let staticPickrInstance: Pickr;

    const colorWrapper /*selectionColorWrapper*/ = defineQueryUI.controlEl.createDiv("color-wrapper");

    const staticColorPicker = new ButtonComponent(colorWrapper);
    staticColorPicker.setClass("highlightr-color-picker").then(() => {
      this.staticPickrInstance = staticPickrInstance = new Pickr({
        el: staticColorPicker.buttonEl,
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

      staticPickrInstance
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

    const hexValue = staticPickrInstance.getSelectedColor()?.toHEXA().toString();
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