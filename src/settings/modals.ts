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

export class newGroupModal extends Modal {
	dropdown: DropdownComponent;
	nameHolder: string;
	expandedGroups: string[];

	constructor(
		app: App,
		dropdown: DropdownComponent,
		nameHolder: string,
		expandedGroups: string[]
	) {
		super(app);
		this.dropdown = dropdown;
		this.nameHolder = nameHolder;
		this.expandedGroups = expandedGroups;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Create New Group" });
		const helperText = contentEl.createEl("p", {
			text: "Enter a name for your new group",
			cls: "group-modal-helper",
		});
		let newGroupNameInput = contentEl.createEl("input", {
			type: "text",
			cls: "group-modal-text",
		});
		newGroupNameInput.placeholder = "Group name";

		const saveButton = contentEl.createEl("button");
		saveButton.addClass("action-button");
		saveButton.addClass("action-button-save");
		saveButton.addClass("mod-cta");
		saveButton.setAttribute("aria-label", "Save new group.");
		const saveEl = saveButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(saveEl, "save");
		saveButton.onclick = async () => {
			const newGroupName = newGroupNameInput.value.trim();
			// if a group name is entered, hand over name and set status to enabled
			if (newGroupName) {
				this.nameHolder = newGroupName;
				this.dropdown.addOption(newGroupName, newGroupName);
				this.dropdown.setValue(newGroupName);
				this.expandedGroups.push(newGroupName);
			} else {
				new Notice(`Please enter a group name.`);
			}
			this.close();
		};
	}
}

export class RenameGroupModal extends Modal {
	private oldGroupName: string;
	private dropdown: DropdownComponent;
	private expandedGroups: string[];
	private staticHighlighter: StaticHighlightOptions;
	private modalSaveAndReload: () => Promise<void>;
	constructor(
		app: App,
		oldGroupName: string,
		dropdown: DropdownComponent,
		expandedGroups: string[],
		staticHighlighter: StaticHighlightOptions,
		modalSaveAndReload: () => Promise<void>
	) {
		super(app);
		this.oldGroupName = oldGroupName;
		this.dropdown = dropdown;
		this.expandedGroups = expandedGroups;
		this.staticHighlighter = staticHighlighter;
		this.modalSaveAndReload = modalSaveAndReload;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Edit Group Name" });
		const helperText = contentEl.createEl("p", {
			text: "Enter an existing group name to move highlighters there (case sensitive).",
			cls: "group-modal-helper",
		});
		let newGroupNameInput = contentEl.createEl("input", {
			type: "text",
			cls: "group-modal-text",
		});
		newGroupNameInput.placeholder = "Group name";

		const saveButton = contentEl.createEl("button");
		saveButton.addClass("action-button");
		saveButton.addClass("action-button-save");
		saveButton.addClass("mod-cta");
		saveButton.setAttribute("aria-label", "Save new group name.");
		const saveEl = saveButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(saveEl, "save");
		saveButton.onclick = async () => {
			let newGroupName = newGroupNameInput.value.trim();
			// if a group name is entered, hand over name and set status to enabled
			if (newGroupName) {
				Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
					let existenceChecker = 0;
					let pushChecker = 0;
					if (
						this.staticHighlighter.queries[highlighter].group === newGroupName
					) {
						existenceChecker += 1;
					} else if (
						this.staticHighlighter.queries[highlighter].group ===
						this.oldGroupName
					) {
						this.staticHighlighter.queries[highlighter].group = newGroupName;
						this.dropdown.addOption(newGroupName, newGroupName);
						if (pushChecker === 0) {
							this.expandedGroups.push(newGroupName);
							pushChecker += 1;
						}
					}
				}),
					new Notice(
						`Group "${this.oldGroupName}" renamed to "${newGroupName}"!`
					);
			} else {
				new Notice(`Please enter a group name.`);
			}
			await this.modalSaveAndReload();
			this.close();
		};
	}
}

export class DeleteGroupModal extends Modal {
	private oldGroupName: string;
	private staticHighlighter: StaticHighlightOptions;
	private modalSaveAndReload: () => Promise<void>;
	constructor(
		app: App,
		oldGroupName: string,
		staticHighlighter: StaticHighlightOptions,
		modalSaveAndReload: () => Promise<void>
	) {
		super(app);
		this.oldGroupName = oldGroupName;
		this.staticHighlighter = staticHighlighter;
		this.modalSaveAndReload = modalSaveAndReload;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: `Delete ${this.oldGroupName}` });
		const helperText = contentEl.createEl("p", {
			text: "This will delete the group and all highlighters in it.",
			cls: "group-modal-helper",
		});
		let groupDeleteDecision = contentEl.createEl("input", {
			type: "text",
			cls: "group-modal-text",
		});
		groupDeleteDecision.placeholder = `Input "Delete ${this.oldGroupName}!"`;

		const deleteButton = contentEl.createEl("button");
		deleteButton.addClass("action-button");
		deleteButton.addClass("action-button-delete-modal");
		deleteButton.addClass("mod-warning");
		deleteButton.setAttribute("aria-label", `Delete ${this.oldGroupName}.`);
		const deleteEl = deleteButton.createSpan({ cls: "icon" }); // Create a span for the icon
		setIcon(deleteEl, "trash");
		deleteButton.onclick = async () => {
			let decision = groupDeleteDecision.value.trim();
			// if a group name is entered, hand over name and set status to enabled
			if (decision == `Delete ${this.oldGroupName}!`) {
				Object.keys(this.staticHighlighter.queries).forEach((highlighter) => {
					if (
						this.staticHighlighter.queries[highlighter].group ===
						this.oldGroupName
					) {
						delete this.staticHighlighter.queries[highlighter];
					}
				});
				new Notice(`Group "${this.oldGroupName}" was deleted."!`);
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
	//private removeEmptyGroup: () => Promise<void>;
	private modalSaveAndReload: () => Promise<void>;
	constructor(
		app: App,
		highlighterName: string,
		staticHighlighter: StaticHighlightOptions,
		queryOrder: string[],
		//removeEmptyGroup: () => Promise<void>,
		modalSaveAndReload: () => Promise<void>
	) {
		super(app);
		this.highlighterName = highlighterName;
		this.staticHighlighter = staticHighlighter;
		this.queryOrder = queryOrder;
		//this.removeEmptyGroup = removeEmptyGroup;
		this.modalSaveAndReload = modalSaveAndReload;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: `Delete ${this.highlighterName}` });
		const helperText = contentEl.createEl("p", {
			text: `Are you sure you want to delete the highlighter ${this.highlighterName}?`,
			cls: "group-modal-helper",
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
			await /*this.removeEmptyGroup(),*/ await this.modalSaveAndReload();
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
