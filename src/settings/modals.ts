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
	Modal,
} from "obsidian";
import { basicSetup } from "src/editor/extensions";
import AnotherDynamicHighlightsPlugin from "../../main";
import { ExportModal } from "./export";
import { ImportModal } from "./import";
import { HighlighterOptions, markTypes } from "./settings";
import { StyleSpec } from "style-mod";
import { StaticHighlightOptions } from "src/highlighters/static";

export class newTagModal extends Modal {
	dropdown: DropdownComponent;
	nameHolder: string;
	expandedTags: string[];

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
		contentEl.createEl("h2", { text: "Create New tag" });
		const helperText = contentEl.createEl("p", {
			text: "Enter a name for your new tag",
			cls: "tag-modal-helper",
		});
		let newTagNameInput = contentEl.createEl("input", {
			type: "text",
			cls: "tag-modal-text",
		});
		newTagNameInput.placeholder = "Tag name";

		const saveButton = contentEl.createEl("button");
		saveButton.addClass("action-button");
		saveButton.addClass("action-button-save");
		saveButton.addClass("mod-cta");
		saveButton.setAttribute("aria-label", "Save new tag.");
		const saveEl = saveButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(saveEl, "save");
		saveButton.onclick = async () => {
			const newTagName = newTagNameInput.value.trim();
			// if a tag name is entered, hand over name and set status to enabled
			if (newTagName) {
				this.nameHolder = newTagName;
				this.dropdown.addOption(newTagName, newTagName);
				this.dropdown.setValue(newTagName);
				this.expandedTags.push(newTagName);
			} else {
				new Notice(`Please enter a tag name (case sensitive).`);
			}
			this.close();
		};
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
		contentEl.createEl("h2", { text: "Edit Tag Name" });
		const helperText = contentEl.createEl("p", {
			text: "Enter a new tag name (case sensitive).",
			cls: "tag-modal-helper",
		});
		let newTagNameInput = contentEl.createEl("input", {
			type: "text",
			cls: "tag-modal-text",
		});
		newTagNameInput.placeholder = "Tag name";

		const saveButton = contentEl.createEl("button");
		saveButton.addClass("action-button");
		saveButton.addClass("action-button-save");
		saveButton.addClass("mod-cta");
		saveButton.setAttribute("aria-label", "Save new tag name.");
		const saveEl = saveButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(saveEl, "save");
		saveButton.onclick = async () => {
			let newTagName = newTagNameInput.value.trim();
			// if a Tag name is entered, hand over name and set status to enabled
			if (newTagName) {
				Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
					let existenceChecker = 0;
					let pushChecker = 0;
					if (this.staticHighlighter.queries[highlighter].tag === newTagName) {
						existenceChecker += 1;
					} else if (
						this.staticHighlighter.queries[highlighter].tag === this.oldTagName
					) {
						this.staticHighlighter.queries[highlighter].tag = newTagName;
						this.dropdown.addOption(newTagName, newTagName);
						if (pushChecker === 0) {
							this.expandedTags.push(newTagName);
							pushChecker += 1;
						}
					}
				}),
					new Notice(`Tag "${this.oldTagName}" renamed to "${newTagName}"!`);
			} else {
				new Notice(`Please enter a tag name.`);
			}
			await this.modalSaveAndReload();
			this.close();
		};
	}
}

export class DeleteTagModal extends Modal {
	private oldTagName: string;
	private staticHighlighter: StaticHighlightOptions;
	private modalSaveAndReload: () => Promise<void>;
	constructor(
		app: App,
		oldTagName: string,
		staticHighlighter: StaticHighlightOptions,
		modalSaveAndReload: () => Promise<void>
	) {
		super(app);
		this.oldTagName = oldTagName;
		this.staticHighlighter = staticHighlighter;
		this.modalSaveAndReload = modalSaveAndReload;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: `Delete ${this.oldTagName}` });
		const helperText = contentEl.createEl("p", {
			text: "This will delete the Tag and all highlighters in it.",
			cls: "Tag-modal-helper",
		});
		let tagDeleteDecision = contentEl.createEl("input", {
			type: "text",
			cls: "Tag-modal-text",
		});
		tagDeleteDecision.placeholder = `Input "Delete ${this.oldTagName}!"`;

		const deleteButton = contentEl.createEl("button");
		deleteButton.addClass("action-button");
		deleteButton.addClass("action-button-delete-modal");
		deleteButton.addClass("mod-warning");
		deleteButton.setAttribute("aria-label", `Delete ${this.oldTagName}.`);
		const deleteEl = deleteButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(deleteEl, "trash");
		deleteButton.onclick = async () => {
			let decision = tagDeleteDecision.value.trim();
			// if a tag name is entered, hand over name and set status to enabled
			if (decision == `Delete ${this.oldTagName}!`) {
				Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
					if (
						this.staticHighlighter.queries[highlighter].tag === this.oldTagName
					) {
						delete this.staticHighlighter.queries[highlighter];
					}
				});
				new Notice(`Tag "${this.oldTagName}" was deleted."!`);
				await this.modalSaveAndReload();
				this.close();
			}
		};

		const cancelButton = contentEl.createEl("button");
		cancelButton.addClass("action-button");
		cancelButton.addClass("action-button-cancel");
		cancelButton.addClass("mod-cta");
		cancelButton.setAttribute("aria-label", "Cancel.");
		const cancelEl = cancelButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(cancelEl, "x-circle");
		cancelButton.onclick = async () => {
			this.close();
		};
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
			text: `Are you sure you want to delete the highlighter ${this.highlighterName}?`,
			cls: "Tag-modal-helper",
		});

		const deleteButton = contentEl.createEl("button");
		deleteButton.addClass("action-button");
		deleteButton.addClass("action-button-delete-modal");
		deleteButton.addClass("mod-warning");
		deleteButton.setAttribute("aria-label", `Delete ${this.highlighterName}.`);
		const deleteEl = deleteButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(deleteEl, "trash");
		deleteButton.onclick = async () => {
			delete this.staticHighlighter.queries[this.highlighterName];
			this.queryOrder = this.queryOrder.filter(
				(h) => h != this.highlighterName
			);
			await /*this.removeEmptyTag(),*/ await this.modalSaveAndReload();
			this.close();
		};
		new Notice(`Highlighter "${this.highlighterName}" was deleted."!`);

		const cancelButton = contentEl.createEl("button");
		cancelButton.addClass("action-button");
		cancelButton.addClass("action-button-cancel");
		cancelButton.addClass("mod-cta");
		cancelButton.setAttribute("aria-label", "Cancel.");
		const cancelEl = cancelButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(cancelEl, "x-circle");
		cancelButton.onclick = async () => {
			this.close();
		};
	}
}
