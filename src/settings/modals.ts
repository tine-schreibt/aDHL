import {
  App,
  Notice,
  setIcon,
  DropdownComponent,
  Modal,
  TextComponent,
  ButtonComponent,
} from "obsidian";
import { StaticHighlightOptions } from "src/highlighters/static";

/*
- newTagModal
- renameTagModal
- deleteTagModal
- deleteHighlighterModal
*/

export class NewTagModal extends Modal {
  private dropdown: DropdownComponent;
  private nameHolder: string;
  private expandedTags: string[];

  constructor(
    app: App,
    dropdown: DropdownComponent,
    nameHolder: string,
    expandedTags: string[]
  ) {
    super(app);
    this.dropdown = dropdown;
    this.nameHolder = nameHolder;
    this.expandedTags = expandedTags;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Create new tag" });
    const helperText = contentEl.createEl("p", {
      text: "Enter a name for your new tag",
      cls: "tag-modal-helper",
    });
    const newTagNameInput = new TextComponent(contentEl);
    newTagNameInput.setPlaceholder("Tag name");
    newTagNameInput.inputEl.ariaLabel = "Tag name";
    newTagNameInput.inputEl.addClass("tag-modal-text");

    const saveButton = new ButtonComponent(contentEl);
    saveButton.setClass("action-button");
    saveButton.setClass("action-button-save");
    saveButton.setCta();
    saveButton.setTooltip("Save new tag.");
    saveButton.setIcon("save");
    saveButton.onClick(async () => {
      const newTagName = newTagNameInput.inputEl.value.trim();
      // if a tag name is entered, hand over name and set status to enabled
      if (newTagName) {
        this.nameHolder = newTagName;
        this.dropdown.addOption(newTagName, newTagName);
        this.dropdown.setValue(newTagName);
        this.expandedTags.unshift(newTagName);
      } else {
        new Notice(`Please enter a tag name (case sensitive).`);
      }
      this.close();
    });
  }
}

export class RenameTagModal extends Modal {
  private oldTagName: string;
  private dropdown: DropdownComponent;
  private expandedTags: string[];
  private staticHighlighter: StaticHighlightOptions;
  private modalSaveAndReload: () => Promise<void>;
  constructor(
    app: App,
    oldTagName: string,
    dropdown: DropdownComponent,
    expandedTags: string[],
    staticHighlighter: StaticHighlightOptions,
    modalSaveAndReload: () => Promise<void>
  ) {
    super(app);
    this.oldTagName = oldTagName;
    this.dropdown = dropdown;
    this.expandedTags = expandedTags;
    this.staticHighlighter = staticHighlighter;
    this.modalSaveAndReload = modalSaveAndReload;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `Rename ${this.oldTagName}` });
    const helperText = contentEl.createEl("p", {
      text: "Enter a new tag name (case sensitive).",
      cls: "tag-modal-helper",
    });
    const newTagNameInput = new TextComponent(contentEl);
    newTagNameInput.setPlaceholder("Tag name");
    newTagNameInput.inputEl.ariaLabel = "Tag name";
    newTagNameInput.inputEl.addClass("tag-modal-text");

    const saveButton = new ButtonComponent(contentEl);
    saveButton.setClass("action-button");
    saveButton.setClass("action-button-save");
    saveButton.setCta();
    saveButton.setTooltip("Save new tag name.");
    saveButton.setIcon("save");
    saveButton.onClick(async () => {
      const newTagName = newTagNameInput.inputEl.value.trim();
      // if a Tag name is entered, hand over name and set status to enabled
      if (newTagName) {
        let tagAdded = false;
        Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
          if (
            this.staticHighlighter.queries[highlighter].tag === this.oldTagName
          ) {
            this.staticHighlighter.queries[highlighter].tag = newTagName;
            if (!tagAdded) {
              this.dropdown.addOption(newTagName, newTagName);
              this.expandedTags.unshift(newTagName);
              tagAdded = true;
            }
          }
        });
        new Notice(`Tag "${this.oldTagName}" renamed to "${newTagName}"!`);
      } else {
        new Notice(`Please enter a tag name.`);
      }
      await this.modalSaveAndReload();
      this.close();
    });
  }
}

export class DeleteTagModal extends Modal {
  private oldTagName: string;
  private staticHighlighter: StaticHighlightOptions;
  private expandedTags: string[];
  private modalSaveAndReload: () => Promise<void>;
  constructor(
    app: App,
    oldTagName: string,
    staticHighlighter: StaticHighlightOptions,
    expandedTags: string[],
    modalSaveAndReload: () => Promise<void>
  ) {
    super(app);
    this.oldTagName = oldTagName;
    this.staticHighlighter = staticHighlighter;
    this.expandedTags = expandedTags;
    this.modalSaveAndReload = modalSaveAndReload;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", {
      text: `Delete ${this.oldTagName}`,
      cls: "modal-content-grid",
    });

    // Create warning text with proper styling
    const warningSpan = contentEl.createEl("span", {
      text: "WARNING:",
      cls: "modal-warning-text", // We'll define this in CSS
    });

    const helperText = contentEl.createEl("p", {
      cls: "modal-helper-text",
    });

    helperText.appendChild(warningSpan);
    helperText.appendChild(
      document.createTextNode(
        ` This will also permanently delete all highlighters carrying this tag.
			
			Input "Delete ${this.oldTagName}!" to proceed.`
      )
    );

    let tagDeleteDecision = contentEl.createEl("input", {
      type: "text",
      cls: "modal-inputEl",
    });

    tagDeleteDecision.placeholder = `Delete ${this.oldTagName}!`;

    const deleteButton = new ButtonComponent(contentEl);
    deleteButton.setClass("action-button");
    deleteButton.setClass("action-button-delete");
    deleteButton.setWarning();
    deleteButton.setTooltip(`Delete ${this.oldTagName}.`);
    deleteButton.setIcon("trash");
    deleteButton.onClick(async () => {
      const decision = tagDeleteDecision.value.trim();
      // if a tag name is entered, hand over name and set status to enabled
      if (decision === `Delete ${this.oldTagName}!`) {
        try {
          this.expandedTags = this.expandedTags.filter(
            (item) => item !== this.oldTagName
          );
          Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
            if (
              this.staticHighlighter.queries[highlighter].tag ===
              this.oldTagName
            ) {
              delete this.staticHighlighter.queries[highlighter];
              this.staticHighlighter.queryOrder =
                this.staticHighlighter.queryOrder.filter(
                  (item) => item !== highlighter
                );
            }
          });
          await this.modalSaveAndReload();
          new Notice(`Tag "${this.oldTagName}" was deleted!`);
          this.close();
        } catch (error) {
          new Notice("Failed to delete tag: " + error);
        }
      }
    });

    const cancelButton = new ButtonComponent(contentEl);
    cancelButton.setClass("action-button");
    cancelButton.setClass("action-button-cancel");
    cancelButton.setCta();
    cancelButton.setTooltip("Cancel.");
    cancelButton.setIcon("x-circle");
    cancelButton.onClick(async () => {
      this.close();
    });
  }
}

export class DeleteHighlighterModal extends Modal {
  private highlighterName: string;
  private staticHighlighter: StaticHighlightOptions;
  private queryOrder: string[];
  //private removeEmptyTag: () => Promise<void>;
  private modalSaveAndReload: () => Promise<void>;
  constructor(
    app: App,
    highlighterName: string,
    staticHighlighter: StaticHighlightOptions,
    queryOrder: string[],
    //removeEmptyTag: () => Promise<void>,
    modalSaveAndReload: () => Promise<void>
  ) {
    super(app);
    this.highlighterName = highlighterName;
    this.staticHighlighter = staticHighlighter;
    this.queryOrder = queryOrder;
    //this.removeEmptyTag = removeEmptyTag;
    this.modalSaveAndReload = modalSaveAndReload;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `Delete ${this.highlighterName}` });
    const helperText = contentEl.createEl("p", {
      text: `Delete ${this.highlighterName}?\nIt highlights ${
        this.staticHighlighter.queries[this.highlighterName].query
      }.`,
      cls: "Tag-modal-helper",
    });

    const deleteButton = new ButtonComponent(contentEl);
    deleteButton.setClass("action-button");
    deleteButton.setClass("action-button-delete-modal");
    deleteButton.setWarning();
    deleteButton.setTooltip(`Delete ${this.highlighterName}.`);
    deleteButton.setIcon("trash");
    deleteButton.onClick(async () => {
      try {
        delete this.staticHighlighter.queries[this.highlighterName];
        this.queryOrder = this.queryOrder.filter(
          (h) => h !== this.highlighterName
        );
        await this.modalSaveAndReload();
        new Notice(`Highlighter "${this.highlighterName}" was deleted!`);
        this.close();
      } catch (error) {
        new Notice("Failed to delete highlighter: " + error);
      }
    });

    const cancelButton = new ButtonComponent(contentEl);
    cancelButton.setClass("action-button");
    cancelButton.setClass("action-button-cancel");
    cancelButton.setCta();
    cancelButton.setTooltip("Cancel.");
    cancelButton.setIcon("x-circle");
    cancelButton.onClick(async () => {
      this.close();
    });
  }
}
