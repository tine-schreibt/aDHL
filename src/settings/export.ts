// Adapted from https://github.com/mgmeyers/obsidian-style-setting

import { App, Modal, Setting, TextAreaComponent } from "obsidian";
import AnotherDynamicHighlightsPlugin from "../../main";
import { SearchQueries } from "./settings";


export class ExportModal extends Modal {
  plugin: AnotherDynamicHighlightsPlugin;
  section: string;
  config: SearchQueries;

  constructor(app: App, plugin: AnotherDynamicHighlightsPlugin, section: string, config: SearchQueries) {
    super(app);
    this.plugin = plugin;
    this.section = section;
    this.config = config;
  }

  onOpen() {
    let { contentEl, modalEl } = this;

    modalEl.addClass("modal-style-settings");
    modalEl.addClass("modal-dynamic-highlights");
    

    new Setting(contentEl).setName(`Export settings for: ${this.section}`).then(setting => {
      const output = JSON.stringify(this.config, null, 2);

      // Build a copy to clipboard link
      setting.controlEl.createEl(
        "a",
        {
          cls: "style-settings-copy",
          text: "Copy to clipboard",
          href: "#",
        },
          copyButton => {
            new TextAreaComponent(contentEl).setValue(output).then(textarea => {
              copyButton.addEventListener("click", async e => {
                e.preventDefault();
          
                try {
                  // Use the Clipboard API to copy the value directly
                  await navigator.clipboard.writeText(textarea.inputEl.value);
          
                  // Add a success class to the button for feedback
                  copyButton.addClass("success");
                  console.log("Copied to clipboard!");
                } catch (err) {
                  console.error("Failed to copy to clipboard", err);
                }
              });
            });
              setTimeout(() => {
                // If the button is still in the dom, remove the success class
                if (copyButton.parentNode) {
                  copyButton.removeClass("success");
                }
              }, 2000);
            });

      // Build a download link
      setting.controlEl.createEl("a", {
        cls: "style-settings-download",
        text: "Download",
        attr: {
          download: "dynamic-highlights.json",
          href: `data:application/json;charset=utf-8,${encodeURIComponent(output)}`,
        },
      });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
