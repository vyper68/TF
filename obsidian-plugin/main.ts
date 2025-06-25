import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { MCPBridge } from './src/services/MCPBridge';
import { MemoryManager } from './src/services/MemoryManager';
import { ContentOptimizer } from './src/services/ContentOptimizer';
import { TimelineView, TIMELINE_VIEW_TYPE } from './src/views/TimelineView';
import { CharacterView, CHARACTER_VIEW_TYPE } from './src/views/CharacterView';
import { NovelCreationSettings, DEFAULT_SETTINGS } from './src/types/Settings';

export default class NovelCreationPlugin extends Plugin {
	settings: NovelCreationSettings;
	mcpBridge: MCPBridge;
	memoryManager: MemoryManager;
	contentOptimizer: ContentOptimizer;

	async onload() {
		await this.loadSettings();

		// 初始化服務
		this.mcpBridge = new MCPBridge(this.settings.memoryMeshUrl);
		this.memoryManager = new MemoryManager(this.mcpBridge);
		this.contentOptimizer = new ContentOptimizer();

		// 註冊視圖
		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf) => new TimelineView(leaf, this.memoryManager)
		);

		this.registerView(
			CHARACTER_VIEW_TYPE,
			(leaf) => new CharacterView(leaf, this.memoryManager)
		);

		// 添加功能區圖標
		this.addRibbonIcon('book-open', '小說創作助手', (evt: MouseEvent) => {
			this.activateView();
		});

		// 註冊命令
		this.addCommand({
			id: 'add-character',
			name: '添加角色',
			callback: () => {
				new CharacterModal(this.app, this.memoryManager).open();
			}
		});

		this.addCommand({
			id: 'add-location',
			name: '添加地點',
			callback: () => {
				new LocationModal(this.app, this.memoryManager).open();
			}
		});

		this.addCommand({
			id: 'add-event',
			name: '添加事件',
			callback: () => {
				new EventModal(this.app, this.memoryManager).open();
			}
		});

		this.addCommand({
			id: 'optimize-content',
			name: '優化內容（簡繁轉換）',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.optimizeContent(editor);
			}
		});

		this.addCommand({
			id: 'show-timeline',
			name: '顯示時間線',
			callback: () => {
				this.activateTimelineView();
			}
		});

		// 添加設定頁面
		this.addSettingTab(new NovelCreationSettingTab(this.app, this));

		// 初始化連接
		try {
			await this.mcpBridge.connect();
			new Notice('MemoryMesh連接成功！');
		} catch (error) {
			new Notice('MemoryMesh連接失敗，請檢查設定');
			console.error('MCP連接錯誤:', error);
		}
	}

	onunload() {
		if (this.mcpBridge) {
			this.mcpBridge.disconnect();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(CHARACTER_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: CHARACTER_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf!);
	}

	async activateTimelineView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf!);
	}

	async optimizeContent(editor: Editor) {
		const selection = editor.getSelection();
		const content = selection || editor.getValue();
		
		try {
			const optimized = await this.contentOptimizer.convertToTraditional(content);
			
			if (selection) {
				editor.replaceSelection(optimized);
			} else {
				editor.setValue(optimized);
			}
			
			new Notice('內容優化完成！');
		} catch (error) {
			new Notice('內容優化失敗');
			console.error('內容優化錯誤:', error);
		}
	}
}

// 角色添加模態框
class CharacterModal extends Modal {
	memoryManager: MemoryManager;

	constructor(app: App, memoryManager: MemoryManager) {
		super(app);
		this.memoryManager = memoryManager;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '添加新角色' });

		const form = contentEl.createEl('form');
		
		const nameInput = form.createEl('input', {
			type: 'text',
			placeholder: '角色名稱',
			cls: 'novel-input'
		});

		const descTextarea = form.createEl('textarea', {
			placeholder: '角色描述',
			cls: 'novel-textarea'
		});

		const submitBtn = form.createEl('button', {
			text: '添加角色',
			type: 'submit',
			cls: 'novel-button'
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			
			try {
				await this.memoryManager.addCharacter({
					name: nameInput.value,
					description: descTextarea.value
				});
				
				new Notice(`角色 "${nameInput.value}" 添加成功！`);
				this.close();
			} catch (error) {
				new Notice('添加角色失敗');
				console.error('添加角色錯誤:', error);
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 地點添加模態框
class LocationModal extends Modal {
	memoryManager: MemoryManager;

	constructor(app: App, memoryManager: MemoryManager) {
		super(app);
		this.memoryManager = memoryManager;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '添加新地點' });

		const form = contentEl.createEl('form');
		
		const nameInput = form.createEl('input', {
			type: 'text',
			placeholder: '地點名稱',
			cls: 'novel-input'
		});

		const descTextarea = form.createEl('textarea', {
			placeholder: '地點描述',
			cls: 'novel-textarea'
		});

		const submitBtn = form.createEl('button', {
			text: '添加地點',
			type: 'submit',
			cls: 'novel-button'
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			
			try {
				await this.memoryManager.addLocation({
					name: nameInput.value,
					description: descTextarea.value
				});
				
				new Notice(`地點 "${nameInput.value}" 添加成功！`);
				this.close();
			} catch (error) {
				new Notice('添加地點失敗');
				console.error('添加地點錯誤:', error);
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 事件添加模態框
class EventModal extends Modal {
	memoryManager: MemoryManager;

	constructor(app: App, memoryManager: MemoryManager) {
		super(app);
		this.memoryManager = memoryManager;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '添加新事件' });

		const form = contentEl.createEl('form');
		
		const nameInput = form.createEl('input', {
			type: 'text',
			placeholder: '事件名稱',
			cls: 'novel-input'
		});

		const timeInput = form.createEl('input', {
			type: 'text',
			placeholder: '時間（如：第一章、1024年春）',
			cls: 'novel-input'
		});

		const descTextarea = form.createEl('textarea', {
			placeholder: '事件描述',
			cls: 'novel-textarea'
		});

		const submitBtn = form.createEl('button', {
			text: '添加事件',
			type: 'submit',
			cls: 'novel-button'
		});

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			
			try {
				await this.memoryManager.addEvent({
					name: nameInput.value,
					time: timeInput.value,
					description: descTextarea.value
				});
				
				new Notice(`事件 "${nameInput.value}" 添加成功！`);
				this.close();
			} catch (error) {
				new Notice('添加事件失敗');
				console.error('添加事件錯誤:', error);
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 設定頁面
class NovelCreationSettingTab extends PluginSettingTab {
	plugin: NovelCreationPlugin;

	constructor(app: App, plugin: NovelCreationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: '小說創作AI助手設定' });

		new Setting(containerEl)
			.setName('MemoryMesh服務地址')
			.setDesc('MemoryMesh MCP服務的連接地址')
			.addText(text => text
				.setPlaceholder('ws://localhost:3000')
				.setValue(this.plugin.settings.memoryMeshUrl)
				.onChange(async (value) => {
					this.plugin.settings.memoryMeshUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('自動簡繁轉換')
			.setDesc('編輯時自動將簡體中文轉換為繁體中文')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoConvertToTraditional)
				.onChange(async (value) => {
					this.plugin.settings.autoConvertToTraditional = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('LLM API Key')
			.setDesc('用於內容分析和優化的LLM API密鑰')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.llmApiKey)
				.onChange(async (value) => {
					this.plugin.settings.llmApiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
