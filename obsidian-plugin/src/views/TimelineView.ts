import { ItemView, WorkspaceLeaf } from 'obsidian';
import { MemoryManager } from '../services/MemoryManager';
import { Event, TimelineNode } from '../types/Settings';

export const TIMELINE_VIEW_TYPE = 'novel-timeline-view';

export class TimelineView extends ItemView {
	private memoryManager: MemoryManager;
	private events: Event[] = [];
	private timelineNodes: TimelineNode[] = [];
	private svgElement: SVGElement | null = null;
	private selectedNode: TimelineNode | null = null;

	constructor(leaf: WorkspaceLeaf, memoryManager: MemoryManager) {
		super(leaf);
		this.memoryManager = memoryManager;
	}

	getViewType(): string {
		return TIMELINE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return '小說時間線';
	}

	getIcon(): string {
		return 'clock';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('timeline-view-container');

		// 創建工具欄
		this.createToolbar(container);

		// 創建時間線畫布
		this.createTimelineCanvas(container);

		// 創建詳情面板
		this.createDetailsPanel(container);

		// 載入數據
		await this.loadTimelineData();
	}

	private createToolbar(container: Element) {
		const toolbar = container.createEl('div', { cls: 'timeline-toolbar' });

		// 刷新按鈕
		const refreshBtn = toolbar.createEl('button', {
			text: '刷新',
			cls: 'timeline-btn'
		});
		refreshBtn.addEventListener('click', () => this.loadTimelineData());

		// 添加事件按鈕
		const addEventBtn = toolbar.createEl('button', {
			text: '添加事件',
			cls: 'timeline-btn timeline-btn-primary'
		});
		addEventBtn.addEventListener('click', () => this.showAddEventModal());

		// 視圖模式切換
		const viewModeSelect = toolbar.createEl('select', { cls: 'timeline-select' });
		viewModeSelect.createEl('option', { text: '線性視圖', value: 'linear' });
		viewModeSelect.createEl('option', { text: '分支視圖', value: 'branching' });
		viewModeSelect.addEventListener('change', (e) => {
			const target = e.target as HTMLSelectElement;
			this.switchViewMode(target.value as 'linear' | 'branching');
		});
	}

	private createTimelineCanvas(container: Element) {
		const canvasContainer = container.createEl('div', { cls: 'timeline-canvas-container' });
		
		this.svgElement = canvasContainer.createEl('svg', {
			cls: 'timeline-svg'
		}) as unknown as SVGElement;

		this.svgElement.setAttribute('width', '100%');
		this.svgElement.setAttribute('height', '400');
		this.svgElement.setAttribute('viewBox', '0 0 1000 400');

		// 添加拖拽和縮放功能
		this.setupInteractions();
	}

	private createDetailsPanel(container: Element) {
		const detailsPanel = container.createEl('div', { cls: 'timeline-details-panel' });
		detailsPanel.createEl('h3', { text: '事件詳情' });
		
		const detailsContent = detailsPanel.createEl('div', { cls: 'timeline-details-content' });
		detailsContent.createEl('p', { text: '點擊時間線上的事件查看詳情' });
	}

	private async loadTimelineData() {
		try {
			this.events = await this.memoryManager.getEvents();
			this.timelineNodes = this.convertEventsToNodes(this.events);
			this.renderTimeline();
		} catch (error) {
			console.error('載入時間線數據失敗:', error);
		}
	}

	private convertEventsToNodes(events: Event[]): TimelineNode[] {
		// 按時間排序事件
		const sortedEvents = events.sort((a, b) => {
			// 簡單的時間排序邏輯，實際應用中可能需要更複雜的時間解析
			return a.time.localeCompare(b.time);
		});

		return sortedEvents.map((event, index) => ({
			id: `event-${index}`,
			name: event.name,
			time: event.time,
			description: event.description,
			type: 'event',
			x: 100 + index * 150, // 線性排列
			y: 200,
			connections: []
		}));
	}

	private renderTimeline() {
		if (!this.svgElement) return;

		// 清空SVG
		this.svgElement.innerHTML = '';

		// 繪製時間軸
		this.drawTimelineAxis();

		// 繪製事件節點
		this.drawEventNodes();

		// 繪製連接線
		this.drawConnections();
	}

	private drawTimelineAxis() {
		if (!this.svgElement) return;

		// 主時間軸線
		const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		mainLine.setAttribute('x1', '50');
		mainLine.setAttribute('y1', '200');
		mainLine.setAttribute('x2', '950');
		mainLine.setAttribute('y2', '200');
		mainLine.setAttribute('stroke', '#666');
		mainLine.setAttribute('stroke-width', '2');
		this.svgElement.appendChild(mainLine);

		// 時間刻度
		for (let i = 0; i < this.timelineNodes.length; i++) {
			const node = this.timelineNodes[i];
			
			// 刻度線
			const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			tick.setAttribute('x1', node.x.toString());
			tick.setAttribute('y1', '195');
			tick.setAttribute('x2', node.x.toString());
			tick.setAttribute('y2', '205');
			tick.setAttribute('stroke', '#666');
			tick.setAttribute('stroke-width', '1');
			this.svgElement.appendChild(tick);

			// 時間標籤
			const timeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			timeLabel.setAttribute('x', node.x.toString());
			timeLabel.setAttribute('y', '230');
			timeLabel.setAttribute('text-anchor', 'middle');
			timeLabel.setAttribute('font-size', '12');
			timeLabel.setAttribute('fill', '#666');
			timeLabel.textContent = node.time;
			this.svgElement.appendChild(timeLabel);
		}
	}

	private drawEventNodes() {
		if (!this.svgElement) return;

		this.timelineNodes.forEach((node, index) => {
			// 事件圓圈
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			circle.setAttribute('cx', node.x.toString());
			circle.setAttribute('cy', node.y.toString());
			circle.setAttribute('r', '8');
			circle.setAttribute('fill', this.getEventColor(node));
			circle.setAttribute('stroke', '#333');
			circle.setAttribute('stroke-width', '2');
			circle.setAttribute('cursor', 'pointer');
			circle.classList.add('timeline-event-node');
			
			// 添加點擊事件
			circle.addEventListener('click', () => this.selectNode(node));
			circle.addEventListener('mouseenter', () => this.showTooltip(node, circle));
			circle.addEventListener('mouseleave', () => this.hideTooltip());

			this.svgElement!.appendChild(circle);

			// 事件標籤
			const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			label.setAttribute('x', node.x.toString());
			label.setAttribute('y', (node.y - 15).toString());
			label.setAttribute('text-anchor', 'middle');
			label.setAttribute('font-size', '10');
			label.setAttribute('fill', '#333');
			label.setAttribute('cursor', 'pointer');
			label.textContent = node.name.length > 10 ? node.name.substring(0, 10) + '...' : node.name;
			
			label.addEventListener('click', () => this.selectNode(node));
			this.svgElement!.appendChild(label);
		});
	}

	private drawConnections() {
		// 繪製事件之間的連接線（如果有的話）
		this.timelineNodes.forEach(node => {
			if (node.connections) {
				node.connections.forEach(connectionId => {
					const targetNode = this.timelineNodes.find(n => n.id === connectionId);
					if (targetNode) {
						this.drawConnection(node, targetNode);
					}
				});
			}
		});
	}

	private drawConnection(from: TimelineNode, to: TimelineNode) {
		if (!this.svgElement) return;

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', from.x.toString());
		line.setAttribute('y1', from.y.toString());
		line.setAttribute('x2', to.x.toString());
		line.setAttribute('y2', to.y.toString());
		line.setAttribute('stroke', '#999');
		line.setAttribute('stroke-width', '1');
		line.setAttribute('stroke-dasharray', '5,5');
		this.svgElement.appendChild(line);
	}

	private getEventColor(node: TimelineNode): string {
		// 根據事件類型返回不同顏色
		const event = this.events.find(e => e.name === node.name);
		if (!event) return '#4CAF50';

		switch (event.type) {
			case 'main': return '#2196F3';
			case 'side': return '#FF9800';
			case 'background': return '#9E9E9E';
			default: return '#4CAF50';
		}
	}

	private selectNode(node: TimelineNode) {
		this.selectedNode = node;
		this.updateDetailsPanel(node);
		this.highlightSelectedNode(node);
	}

	private updateDetailsPanel(node: TimelineNode) {
		const detailsContent = this.containerEl.querySelector('.timeline-details-content');
		if (!detailsContent) return;

		const event = this.events.find(e => e.name === node.name);
		if (!event) return;

		detailsContent.innerHTML = `
			<h4>${event.name}</h4>
			<p><strong>時間：</strong>${event.time}</p>
			<p><strong>類型：</strong>${this.getEventTypeText(event.type)}</p>
			<p><strong>重要性：</strong>${event.importance || 1}/5</p>
			<p><strong>描述：</strong>${event.description}</p>
			${event.characters ? `<p><strong>涉及角色：</strong>${event.characters.join(', ')}</p>` : ''}
			${event.location ? `<p><strong>發生地點：</strong>${event.location}</p>` : ''}
			<div class="timeline-event-actions">
				<button class="timeline-btn timeline-btn-small" onclick="this.editEvent('${event.name}')">編輯</button>
				<button class="timeline-btn timeline-btn-small timeline-btn-danger" onclick="this.deleteEvent('${event.name}')">刪除</button>
			</div>
		`;
	}

	private getEventTypeText(type?: string): string {
		switch (type) {
			case 'main': return '主線';
			case 'side': return '支線';
			case 'background': return '背景';
			default: return '未分類';
		}
	}

	private highlightSelectedNode(node: TimelineNode) {
		// 移除之前的高亮
		this.svgElement?.querySelectorAll('.timeline-event-node').forEach(circle => {
			circle.setAttribute('stroke-width', '2');
		});

		// 高亮選中的節點
		const circles = this.svgElement?.querySelectorAll('.timeline-event-node');
		if (circles) {
			const nodeIndex = this.timelineNodes.findIndex(n => n.id === node.id);
			if (nodeIndex >= 0 && circles[nodeIndex]) {
				circles[nodeIndex].setAttribute('stroke-width', '4');
			}
		}
	}

	private showTooltip(node: TimelineNode, element: Element) {
		// 實現工具提示
		const tooltip = document.createElement('div');
		tooltip.className = 'timeline-tooltip';
		tooltip.textContent = node.description;
		document.body.appendChild(tooltip);

		const rect = element.getBoundingClientRect();
		tooltip.style.left = rect.left + 'px';
		tooltip.style.top = (rect.top - 30) + 'px';
	}

	private hideTooltip() {
		const tooltip = document.querySelector('.timeline-tooltip');
		if (tooltip) {
			tooltip.remove();
		}
	}

	private setupInteractions() {
		// 實現拖拽和縮放功能
		let isDragging = false;
		let startX = 0;
		let startY = 0;

		this.svgElement?.addEventListener('mousedown', (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
		});

		this.svgElement?.addEventListener('mousemove', (e) => {
			if (isDragging) {
				const deltaX = e.clientX - startX;
				const deltaY = e.clientY - startY;
				// 實現拖拽邏輯
			}
		});

		this.svgElement?.addEventListener('mouseup', () => {
			isDragging = false;
		});
	}

	private switchViewMode(mode: 'linear' | 'branching') {
		// 切換視圖模式
		if (mode === 'branching') {
			this.layoutBranchingView();
		} else {
			this.layoutLinearView();
		}
		this.renderTimeline();
	}

	private layoutLinearView() {
		this.timelineNodes.forEach((node, index) => {
			node.x = 100 + index * 150;
			node.y = 200;
		});
	}

	private layoutBranchingView() {
		// 實現分支佈局邏輯
		this.timelineNodes.forEach((node, index) => {
			const event = this.events.find(e => e.name === node.name);
			if (event?.type === 'main') {
				node.y = 150;
			} else if (event?.type === 'side') {
				node.y = 250;
			} else {
				node.y = 300;
			}
			node.x = 100 + index * 120;
		});
	}

	private showAddEventModal() {
		// 顯示添加事件的模態框
		// 這裡可以重用main.ts中的EventModal
	}

	async onClose() {
		// 清理資源
	}
}
