import { ItemView, WorkspaceLeaf } from 'obsidian';
import { MemoryManager } from '../services/MemoryManager';
import { Character } from '../types/Settings';

export const CHARACTER_VIEW_TYPE = 'novel-character-view';

export class CharacterView extends ItemView {
	private memoryManager: MemoryManager;
	private characters: Character[] = [];
	private selectedCharacter: Character | null = null;
	private viewMode: 'grid' | 'graph' = 'grid';

	constructor(leaf: WorkspaceLeaf, memoryManager: MemoryManager) {
		super(leaf);
		this.memoryManager = memoryManager;
	}

	getViewType(): string {
		return CHARACTER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return '角色管理';
	}

	getIcon(): string {
		return 'users';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('character-view-container');

		// 創建工具欄
		this.createToolbar(container);

		// 創建主要內容區域
		this.createMainContent(container);

		// 載入角色數據
		await this.loadCharacters();
	}

	private createToolbar(container: Element) {
		const toolbar = container.createEl('div', { cls: 'character-toolbar' });

		// 刷新按鈕
		const refreshBtn = toolbar.createEl('button', {
			text: '刷新',
			cls: 'character-btn'
		});
		refreshBtn.addEventListener('click', () => this.loadCharacters());

		// 添加角色按鈕
		const addCharacterBtn = toolbar.createEl('button', {
			text: '添加角色',
			cls: 'character-btn character-btn-primary'
		});
		addCharacterBtn.addEventListener('click', () => this.showAddCharacterModal());

		// 視圖模式切換
		const viewModeToggle = toolbar.createEl('div', { cls: 'character-view-toggle' });
		
		const gridBtn = viewModeToggle.createEl('button', {
			text: '網格',
			cls: 'character-toggle-btn character-toggle-active'
		});
		gridBtn.addEventListener('click', () => this.switchViewMode('grid'));

		const graphBtn = viewModeToggle.createEl('button', {
			text: '關係圖',
			cls: 'character-toggle-btn'
		});
		graphBtn.addEventListener('click', () => this.switchViewMode('graph'));

		// 搜索框
		const searchInput = toolbar.createEl('input', {
			type: 'text',
			placeholder: '搜索角色...',
			cls: 'character-search'
		});
		searchInput.addEventListener('input', (e) => {
			const target = e.target as HTMLInputElement;
			this.filterCharacters(target.value);
		});
	}

	private createMainContent(container: Element) {
		const mainContent = container.createEl('div', { cls: 'character-main-content' });

		// 角色列表/圖表區域
		const charactersArea = mainContent.createEl('div', { cls: 'character-display-area' });
		charactersArea.createEl('div', { cls: 'character-grid' });

		// 角色詳情面板
		const detailsPanel = mainContent.createEl('div', { cls: 'character-details-panel' });
		detailsPanel.createEl('h3', { text: '角色詳情' });
		
		const detailsContent = detailsPanel.createEl('div', { cls: 'character-details-content' });
		detailsContent.createEl('p', { text: '選擇一個角色查看詳情' });
	}

	private async loadCharacters() {
		try {
			this.characters = await this.memoryManager.getCharacters();
			this.renderCharacters();
		} catch (error) {
			console.error('載入角色數據失敗:', error);
		}
	}

	private renderCharacters() {
		if (this.viewMode === 'grid') {
			this.renderGridView();
		} else {
			this.renderGraphView();
		}
	}

	private renderGridView() {
		const gridContainer = this.containerEl.querySelector('.character-grid');
		if (!gridContainer) return;

		gridContainer.innerHTML = '';

		this.characters.forEach(character => {
			const characterCard = gridContainer.createEl('div', { cls: 'character-card' });
			
			// 角色頭像（使用首字母）
			const avatar = characterCard.createEl('div', { cls: 'character-avatar' });
			avatar.textContent = character.name.charAt(0);

			// 角色信息
			const info = characterCard.createEl('div', { cls: 'character-info' });
			
			const name = info.createEl('h4', { cls: 'character-name' });
			name.textContent = character.name;

			const description = info.createEl('p', { cls: 'character-description' });
			description.textContent = character.description.length > 100 
				? character.description.substring(0, 100) + '...'
				: character.description;

			// 特徵標籤
			if (character.traits && character.traits.length > 0) {
				const traitsContainer = info.createEl('div', { cls: 'character-traits' });
				character.traits.slice(0, 3).forEach(trait => {
					const traitTag = traitsContainer.createEl('span', { cls: 'character-trait-tag' });
					traitTag.textContent = trait;
				});
			}

			// 操作按鈕
			const actions = characterCard.createEl('div', { cls: 'character-actions' });
			
			const viewBtn = actions.createEl('button', {
				text: '查看',
				cls: 'character-btn character-btn-small'
			});
			viewBtn.addEventListener('click', () => this.selectCharacter(character));

			const editBtn = actions.createEl('button', {
				text: '編輯',
				cls: 'character-btn character-btn-small'
			});
			editBtn.addEventListener('click', () => this.editCharacter(character));

			const deleteBtn = actions.createEl('button', {
				text: '刪除',
				cls: 'character-btn character-btn-small character-btn-danger'
			});
			deleteBtn.addEventListener('click', () => this.deleteCharacter(character));

			// 點擊卡片選中角色
			characterCard.addEventListener('click', (e) => {
				if (!(e.target as Element).closest('.character-actions')) {
					this.selectCharacter(character);
				}
			});
		});
	}

	private renderGraphView() {
		const displayArea = this.containerEl.querySelector('.character-display-area');
		if (!displayArea) return;

		// 清空現有內容
		displayArea.innerHTML = '';

		// 創建SVG畫布
		const svg = displayArea.createEl('svg', { cls: 'character-graph-svg' }) as unknown as SVGElement;
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '400');
		svg.setAttribute('viewBox', '0 0 800 400');

		// 簡單的圓形佈局
		const centerX = 400;
		const centerY = 200;
		const radius = 150;

		this.characters.forEach((character, index) => {
			const angle = (index / this.characters.length) * 2 * Math.PI;
			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle);

			// 繪製角色節點
			const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			group.setAttribute('cursor', 'pointer');
			group.addEventListener('click', () => this.selectCharacter(character));

			// 圓圈
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			circle.setAttribute('cx', x.toString());
			circle.setAttribute('cy', y.toString());
			circle.setAttribute('r', '25');
			circle.setAttribute('fill', this.getCharacterColor(character));
			circle.setAttribute('stroke', '#333');
			circle.setAttribute('stroke-width', '2');

			// 文字標籤
			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.setAttribute('x', x.toString());
			text.setAttribute('y', (y + 40).toString());
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('font-size', '12');
			text.setAttribute('fill', '#333');
			text.textContent = character.name;

			group.appendChild(circle);
			group.appendChild(text);
			svg.appendChild(group);

			// 繪製關係線（如果有的話）
			if (character.relationships) {
				character.relationships.forEach(rel => {
					const targetCharacter = this.characters.find(c => c.name === rel.target);
					if (targetCharacter) {
						const targetIndex = this.characters.indexOf(targetCharacter);
						const targetAngle = (targetIndex / this.characters.length) * 2 * Math.PI;
						const targetX = centerX + radius * Math.cos(targetAngle);
						const targetY = centerY + radius * Math.sin(targetAngle);

						this.drawRelationship(svg, x, y, targetX, targetY, rel.type);
					}
				});
			}
		});
	}

	private drawRelationship(svg: SVGElement, x1: number, y1: number, x2: number, y2: number, type: string) {
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', x1.toString());
		line.setAttribute('y1', y1.toString());
		line.setAttribute('x2', x2.toString());
		line.setAttribute('y2', y2.toString());
		line.setAttribute('stroke', this.getRelationshipColor(type));
		line.setAttribute('stroke-width', '2');
		line.setAttribute('stroke-dasharray', '5,5');
		svg.appendChild(line);

		// 添加關係標籤
		const midX = (x1 + x2) / 2;
		const midY = (y1 + y2) / 2;
		
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.setAttribute('x', midX.toString());
		label.setAttribute('y', midY.toString());
		label.setAttribute('text-anchor', 'middle');
		label.setAttribute('font-size', '10');
		label.setAttribute('fill', '#666');
		label.textContent = type;
		svg.appendChild(label);
	}

	private getCharacterColor(character: Character): string {
		// 根據角色特徵或其他屬性返回顏色
		const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
		const hash = character.name.split('').reduce((a, b) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		}, 0);
		return colors[Math.abs(hash) % colors.length];
	}

	private getRelationshipColor(type: string): string {
		const colorMap: { [key: string]: string } = {
			'friend': '#4CAF50',
			'enemy': '#F44336',
			'family': '#2196F3',
			'lover': '#E91E63',
			'mentor': '#FF9800',
			'student': '#9C27B0'
		};
		return colorMap[type] || '#666';
	}

	private selectCharacter(character: Character) {
		this.selectedCharacter = character;
		this.updateDetailsPanel(character);
		this.highlightSelectedCharacter(character);
	}

	private updateDetailsPanel(character: Character) {
		const detailsContent = this.containerEl.querySelector('.character-details-content');
		if (!detailsContent) return;

		detailsContent.innerHTML = `
			<div class="character-detail-header">
				<div class="character-detail-avatar">${character.name.charAt(0)}</div>
				<h4>${character.name}</h4>
			</div>
			<div class="character-detail-section">
				<h5>描述</h5>
				<p>${character.description}</p>
			</div>
			${character.traits && character.traits.length > 0 ? `
				<div class="character-detail-section">
					<h5>特徵</h5>
					<div class="character-detail-traits">
						${character.traits.map(trait => `<span class="character-trait-tag">${trait}</span>`).join('')}
					</div>
				</div>
			` : ''}
			${character.relationships && character.relationships.length > 0 ? `
				<div class="character-detail-section">
					<h5>關係</h5>
					<div class="character-relationships">
						${character.relationships.map(rel => `
							<div class="character-relationship">
								<span class="relationship-target">${rel.target}</span>
								<span class="relationship-type">${rel.type}</span>
								<span class="relationship-desc">${rel.description}</span>
							</div>
						`).join('')}
					</div>
				</div>
			` : ''}
			<div class="character-detail-actions">
				<button class="character-btn character-btn-small" onclick="this.editCharacter('${character.name}')">編輯</button>
				<button class="character-btn character-btn-small character-btn-danger" onclick="this.deleteCharacter('${character.name}')">刪除</button>
			</div>
		`;
	}

	private highlightSelectedCharacter(character: Character) {
		// 在網格視圖中高亮選中的角色卡片
		this.containerEl.querySelectorAll('.character-card').forEach(card => {
			card.classList.remove('character-card-selected');
		});

		const cards = this.containerEl.querySelectorAll('.character-card');
		const characterIndex = this.characters.findIndex(c => c.name === character.name);
		if (characterIndex >= 0 && cards[characterIndex]) {
			cards[characterIndex].classList.add('character-card-selected');
		}
	}

	private switchViewMode(mode: 'grid' | 'graph') {
		this.viewMode = mode;

		// 更新按鈕狀態
		this.containerEl.querySelectorAll('.character-toggle-btn').forEach(btn => {
			btn.classList.remove('character-toggle-active');
		});

		const activeBtn = this.containerEl.querySelector(
			mode === 'grid' ? '.character-toggle-btn:first-child' : '.character-toggle-btn:last-child'
		);
		activeBtn?.classList.add('character-toggle-active');

		// 重新渲染
		this.renderCharacters();
	}

	private filterCharacters(searchTerm: string) {
		const filteredCharacters = this.characters.filter(character =>
			character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			character.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(character.traits && character.traits.some(trait => 
				trait.toLowerCase().includes(searchTerm.toLowerCase())
			))
		);

		// 暫時替換角色列表進行渲染
		const originalCharacters = this.characters;
		this.characters = filteredCharacters;
		this.renderCharacters();
		this.characters = originalCharacters;
	}

	private showAddCharacterModal() {
		// 這裡可以觸發主插件中的角色添加模態框
		// 或者在這裡實現一個簡化版本
	}

	private async editCharacter(character: Character) {
		// 實現編輯角色功能
		try {
			// 這裡應該打開編輯模態框
			console.log('編輯角色:', character.name);
		} catch (error) {
			console.error('編輯角色失敗:', error);
		}
	}

	private async deleteCharacter(character: Character) {
		// 實現刪除角色功能
		if (confirm(`確定要刪除角色 "${character.name}" 嗎？`)) {
			try {
				await this.memoryManager.deleteCharacter(character.name);
				await this.loadCharacters(); // 重新載入數據
			} catch (error) {
				console.error('刪除角色失敗:', error);
			}
		}
	}

	async onClose() {
		// 清理資源
	}
}
