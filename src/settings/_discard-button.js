if (saveButton.buttonEl.getAttribute("state") == "editing") {
const discardButton = new ButtonComponent(queryWrapper);
discardButton
.setClass("action-button")
.setClass("action-button-discard")
.setClass("mod-warning")
.setIcon("cross")
.setTooltip("Discard Changes")
.onClick(() => {
    saveButton.buttonEl.removeAttribute("state");
    
    // Reset input fields
    classInput.inputEl.value = "";
    queryInput.inputEl.value = "";
    pickrInstance.clear();
    queryTypeInput.setValue(options.regex);      // Reset dropdown or selection

    // Clear the editor content
    this.editor.setState(
    EditorState.create({
        doc: "",
        extensions: basicSetup,
    })
    );

    new Notice("Changes discarded");
});
}
