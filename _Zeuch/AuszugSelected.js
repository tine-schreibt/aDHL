containerEl
containerEl.createEl("h3", {
  text: "Selection Highlights",
})
.addClass("persistent-highlights");
containerEl.addClass("dynamic-highlights-settings");

const selectionHighlighter = new Setting(containerEl);

selectionHighlighter // defineQueryUI
  .setName("Enable/disable and style the selection highlighters")
  .setClass("highlighter-definition")
  .setDesc(
    `In this section you can enable/disable and style the selection highlighters.`
  );

 const selectionColorInput /*classInput*/ = new TextComponent(selectionHighlighter.controlEl);
 selectionColorInput.setPlaceholder("Hex code");
 selectionColorInput.inputEl.ariaLabel = "Paste hex code or use color picker";
 selectionColorInput.inputEl.addClass("highlighter-name");

 let selectionPickrInstance: Pickr;

 const selectionColorWrapper /*colorWrapper*/ = selectionHighlighter.controlEl.createDiv("color-wrapper");

const selectionColorPicker = new ButtonComponent(selectionColorWrapper);
selectionColorPicker.setClass("highlightr-color-picker").then(() => {
  this.selectionPickrInstance = selectionPickrInstance = new Pickr({
    el: selectionColorPicker.buttonEl,
    container: selectionColorWrapper,
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
  
  const button = selectionColorWrapper.querySelector(".pcr-button")
  if (!button) {
   throw new Error("Button is null (see ui.ts)");
  }
  button.ariaLabel = "Selection highlight color picker";

  selectionPickrInstance
    .on("clear", (instance: Pickr) => {
      instance.hide();
      selectionColorInput.inputEl.setAttribute(
        "style",
        `background-color: none; color: var(--text-normal);`
      );
    })
    .on("cancel", (instance: Pickr) => {
      instance.hide();
    })
    .on("change", (color: Pickr.HSVaColor) => {
      const selectionColorHex = color?.toHEXA().toString() || "";
      let selectionColor;
      selectionColorHex && selectionColorHex.length == 6
        ? (selectionColor = `${selectionColorHex}A6`)
        : (selectionColor = selectionColorHex);
        selectionColorInput.inputEl.setAttribute(
        "style",
        `background-color: ${selectionColor}; color: var(--text-normal);`
      );
      // selectionColorHex in selectionColorInput field
      this.plugin.settings.selectionHighlighter.selectedHighlighter.highlightColor = selectionColor;
      // const highlightStyle = cursorDropDown.getValue();
      // this.plugin.settings.selectionHighlighter.cursorHighlighter.highlightStyle = highlightStyle;
    })
    .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
      instance.hide();
    });
});

/* Hier kommt das Drop-down für die Markierungen 
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
*/
//#############################################
//#############################################
//#############################################
//#############################################
/* EVTL VPRLAGE FÜR DIE DROPDOWN STRUKTUR
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
const marks = buildMarkerTypes(defineQueryUI.controlEl); */

//#############################################
//#############################################
//#############################################
//#############################################
// Hier gibts Custom CSS

const selectionCustomCSSWrapper =
selectionHighlighter.controlEl.createDiv("custom-css-wrapper");
selectionCustomCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
const selectionCustomCSSEl = new TextAreaComponent(selectionCustomCSSWrapper);
this.editor = editorFromTextArea(selectionCustomCSSEl.inputEl, basicSetup);
selectionCustomCSSEl.inputEl.addClass("custom-css");

//    let currentClassName: string | null = null; */


const selectionSaveButton = new ButtonComponent(selectionColorWrapper);
selectionSaveButton
.setClass("action-button")
.setClass("action-button-save")
.setClass("mod-cta")
.setIcon("save")
.setTooltip("Save")
.onClick(async (buttonEl: MouseEvent) => {
console.log("Selection save button clicked");

const selectionHexValue = selectionPickrInstance.getSelectedColor()?.toHEXA().toString();
//const queryValue = queryInput.inputEl.value; <- Drop-down Value
const selectionCustomCss = this.editor.state.doc.toString();

/*  const enabledMarks = Object.entries(marks)
    .map(([type, item]) => (item.component.getValue() && type) as string)
    .filter((type): type is markTypes => ["line", "match"].includes(type));*/

const selectedHighlighter = {
    highlightStyle: "dotted",
    highlightColor: selectionHexValue || "",
    css: selectionCustomCss,
  };
  this.plugin.settings.selectionHighlighter.selectedHighlighter = selectedHighlighter;
  await this.plugin.saveSettings();
  this.plugin.updateStaticHighlighter();
  this.plugin.updateCustomCSS();
  this.plugin.updateStyles();
  this.display();

selectionSaveButton.buttonEl.setAttribute("aria-label", "Save")
});


//############################################
//############################################
//############################################
//############################################

//############################################
//############################################
//############################################
//############################################

const matchDeco = Decoration.mark({
  class: conf.selectedHighlighter.css,
  attributes: { "data-contents": string },
});

//############################################
//############################################
//############################################
//############################################


const selectionColorInput /*classInput*/ = new TextComponent(selectionHighlighter.controlEl);
selectionColorInput.setPlaceholder("Test");
selectionColorInput.inputEl.ariaLabel = "See your settings in action";
selectionColorInput.inputEl.addClass("highlighter-name");

let selectionPickrInstance: Pickr;

const selectionColorWrapper /*colorWrapper*/ = selectionHighlighter.controlEl.createDiv("color-wrapper");

const selectionColorPicker = new ButtonComponent(selectionColorWrapper);
selectionColorPicker.setClass("highlightr-color-picker").then(() => {
 this.selectionPickrInstance = selectionPickrInstance = new Pickr({
   el: selectionColorPicker.buttonEl,
   container: selectionColorWrapper,
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
 
 const button = selectionColorWrapper.querySelector(".pcr-button")
 if (!button) {
  throw new Error("Button is null (see ui.ts)");
 }
 button.ariaLabel = "Selection highlight color picker";

 selectionPickrInstance
   .on("clear", (instance: Pickr) => {
     instance.hide();
     selectionColorInput.inputEl.setAttribute(
       "style",
       `background-color: none; color: var(--text-normal);`
     );
   })
   .on("cancel", (instance: Pickr) => {
     instance.hide();
   })
   .on("change", (color: Pickr.HSVaColor) => {
     const selectionColorHex = color?.toHEXA().toString() || "";
     let selectionColor;
     selectionColorHex && selectionColorHex.length == 6
       ? (selectionColor = `${selectionColorHex}A6`)
       : (selectionColor = selectionColorHex);
       selectionColorInput.inputEl.setAttribute(
       "style",
       `background-color: ${selectionColor}; color: var(--text-normal);`
     );
     // selectionColorHex in selectionColorInput field
     this.plugin.settings.selectionHighlighter.selectedHighlighter.highlightColor = selectionColor;
     // const highlightStyle = cursorDropDown.getValue();
     // this.plugin.settings.selectionHighlighter.cursorHighlighter.highlightStyle = highlightStyle;
   })
   .on("save", async (color: Pickr.HSVaColor, instance: Pickr) => {
     instance.hide();
     await this.plugin.saveSettings();
     this.plugin.updateSelectionHighlighter();
     this.plugin.updateStyles();
   });
});

/* Hier kommt das Drop-down für die Markierungen 
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
*/
//#############################################
//#############################################
//#############################################
//#############################################
/* EVTL VPRLAGE FÜR DIE DROPDOWN STRUKTUR
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
const marks = buildMarkerTypes(defineQueryUI.controlEl); */

//#############################################
//#############################################
//#############################################
//#############################################
// Hier gibts Custom CSS

const selectionCustomCSSWrapper =
selectionHighlighter.controlEl.createDiv("custom-css-wrapper");
selectionCustomCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
const selectionCustomCSSEl = new TextAreaComponent(selectionCustomCSSWrapper);
this.editor = editorFromTextArea(selectionCustomCSSEl.inputEl, basicSetup);
selectionCustomCSSEl.inputEl.addClass("custom-css");

//    let currentClassName: string | null = null; */


const selectionSaveButton = new ButtonComponent(selectionColorWrapper);
selectionSaveButton
.setClass("action-button")
.setClass("action-button-save")
.setClass("mod-cta")
.setIcon("save")
.setTooltip("Save")
.onClick(async (buttonEl: MouseEvent) => {
console.log("Selection save button clicked");

const selectionHexValue = selectionPickrInstance.getSelectedColor()?.toHEXA().toString();
//const queryValue = queryInput.inputEl.value; <- Drop-down Value
const selectionCustomCss = this.editor.state.doc.toString();

/*  const enabledMarks = Object.entries(marks)
   .map(([type, item]) => (item.component.getValue() && type) as string)
   .filter((type): type is markTypes => ["line", "match"].includes(type));*/

const selectedHighlighter = {
   highlightStyle: "dotted",
   highlightColor: selectionHexValue,
   css: selectionCustomCss,
 };
 this.plugin.settings.selectionHighlighter.selectedHighlighter = selectedHighlighter;
 await this.plugin.saveSettings();
 this.plugin.updateStaticHighlighter();
 this.plugin.updateCustomCSS();
 this.plugin.updateStyles();
 this.display();

selectionSaveButton.buttonEl.setAttribute("aria-label", "Save")
});
