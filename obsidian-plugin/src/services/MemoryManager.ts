import { MCPBridge } from './MCPBridge';
import { Character, Location, Event, Relationship } from '../types/Settings';

export class MemoryManager {
	private mcpBridge: MCPBridge;
	private cache: Map<string, any> = new Map();
	private lastSync: number = 0;

	constructor(mcpBridge: MCPBridge) {
		this.mcpBridge = mcpBridge;
	}

	// 角色管理
	async addCharacter(character: Character): Promise<void> {
		try {
			const result = await this.mcpBridge.addNode('character', {
				name: character.name,
				description: character.description,
				traits: character.traits || [],
				metadata: [
					`描述: ${character.description}`,
					...(character.traits || []).map(trait => `特徵: ${trait}`)
				]
			});

			// 添加關係
			if (character.relationships) {
				for (const rel of character.relationships) {
					await this.createRelationship(character.name, rel.target, rel.type, rel.description);
				}
			}

			this.invalidateCache('characters');
			return result;
		} catch (error) {
			console.error('添加角色失敗:', error);
			throw error;
		}
	}

	async updateCharacter(name: string, updates: Partial<Character>): Promise<void> {
		try {
			const result = await this.mcpBridge.updateNode('character', name, {
				description: updates.description,
				traits: updates.traits,
				metadata: [
					`描述: ${updates.description || ''}`,
					...(updates.traits || []).map(trait => `特徵: ${trait}`)
				]
			});

			this.invalidateCache('characters');
			return result;
		} catch (error) {
			console.error('更新角色失敗:', error);
			throw error;
		}
	}

	async deleteCharacter(name: string): Promise<void> {
		try {
			const result = await this.mcpBridge.deleteNode('character', name);
			this.invalidateCache('characters');
			return result;
		} catch (error) {
			console.error('刪除角色失敗:', error);
			throw error;
		}
	}

	async getCharacters(): Promise<Character[]> {
		try {
			if (this.cache.has('characters') && this.isCacheValid()) {
				return this.cache.get('characters');
			}

			const result = await this.mcpBridge.getNodesByType('character');
			const characters = this.parseCharacters(result);
			
			this.cache.set('characters', characters);
			this.lastSync = Date.now();
			
			return characters;
		} catch (error) {
			console.error('獲取角色列表失敗:', error);
			return [];
		}
	}

	// 地點管理
	async addLocation(location: Location): Promise<void> {
		try {
			const result = await this.mcpBridge.addNode('location', {
				name: location.name,
				description: location.description,
				type: location.type || 'general',
				metadata: [
					`描述: ${location.description}`,
					`類型: ${location.type || '一般地點'}`
				]
			});

			// 添加地點連接
			if (location.connectedTo) {
				for (const connectedLocation of location.connectedTo) {
					await this.createRelationship(location.name, connectedLocation, 'connected_to', '地點連接');
				}
			}

			this.invalidateCache('locations');
			return result;
		} catch (error) {
			console.error('添加地點失敗:', error);
			throw error;
		}
	}

	async updateLocation(name: string, updates: Partial<Location>): Promise<void> {
		try {
			const result = await this.mcpBridge.updateNode('location', name, {
				description: updates.description,
				type: updates.type,
				metadata: [
					`描述: ${updates.description || ''}`,
					`類型: ${updates.type || '一般地點'}`
				]
			});

			this.invalidateCache('locations');
			return result;
		} catch (error) {
			console.error('更新地點失敗:', error);
			throw error;
		}
	}

	async deleteLocation(name: string): Promise<void> {
		try {
			const result = await this.mcpBridge.deleteNode('location', name);
			this.invalidateCache('locations');
			return result;
		} catch (error) {
			console.error('刪除地點失敗:', error);
			throw error;
		}
	}

	async getLocations(): Promise<Location[]> {
		try {
			if (this.cache.has('locations') && this.isCacheValid()) {
				return this.cache.get('locations');
			}

			const result = await this.mcpBridge.getNodesByType('location');
			const locations = this.parseLocations(result);
			
			this.cache.set('locations', locations);
			this.lastSync = Date.now();
			
			return locations;
		} catch (error) {
			console.error('獲取地點列表失敗:', error);
			return [];
		}
	}

	// 事件管理
	async addEvent(event: Event): Promise<void> {
		try {
			const result = await this.mcpBridge.addNode('event', {
				name: event.name,
				time: event.time,
				description: event.description,
				importance: event.importance || 1,
				type: event.type || 'main',
				metadata: [
					`時間: ${event.time}`,
					`描述: ${event.description}`,
					`重要性: ${event.importance || 1}`,
					`類型: ${event.type || '主線'}`
				]
			});

			// 添加角色關聯
			if (event.characters) {
				for (const character of event.characters) {
					await this.createRelationship(event.name, character, 'involves', '事件涉及角色');
				}
			}

			// 添加地點關聯
			if (event.location) {
				await this.createRelationship(event.name, event.location, 'occurs_at', '事件發生地點');
			}

			this.invalidateCache('events');
			return result;
		} catch (error) {
			console.error('添加事件失敗:', error);
			throw error;
		}
	}

	async updateEvent(name: string, updates: Partial<Event>): Promise<void> {
		try {
			const result = await this.mcpBridge.updateNode('event', name, {
				time: updates.time,
				description: updates.description,
				importance: updates.importance,
				type: updates.type,
				metadata: [
					`時間: ${updates.time || ''}`,
					`描述: ${updates.description || ''}`,
					`重要性: ${updates.importance || 1}`,
					`類型: ${updates.type || '主線'}`
				]
			});

			this.invalidateCache('events');
			return result;
		} catch (error) {
			console.error('更新事件失敗:', error);
			throw error;
		}
	}

	async deleteEvent(name: string): Promise<void> {
		try {
			const result = await this.mcpBridge.deleteNode('event', name);
			this.invalidateCache('events');
			return result;
		} catch (error) {
			console.error('刪除事件失敗:', error);
			throw error;
		}
	}

	async getEvents(): Promise<Event[]> {
		try {
			if (this.cache.has('events') && this.isCacheValid()) {
				return this.cache.get('events');
			}

			const result = await this.mcpBridge.getNodesByType('event');
			const events = this.parseEvents(result);
			
			this.cache.set('events', events);
			this.lastSync = Date.now();
			
			return events;
		} catch (error) {
			console.error('獲取事件列表失敗:', error);
			return [];
		}
	}

	// 關係管理
	async createRelationship(from: string, to: string, type: string, description: string): Promise<void> {
		try {
			return await this.mcpBridge.createRelation(from, to, type);
		} catch (error) {
			console.error('創建關係失敗:', error);
			throw error;
		}
	}

	// 搜索功能
	async searchMemory(query: string): Promise<any> {
		try {
			return await this.mcpBridge.searchMemory(query);
		} catch (error) {
			console.error('搜索記憶失敗:', error);
			throw error;
		}
	}

	// 獲取統計信息
	async getStats(): Promise<any> {
		try {
			return await this.mcpBridge.getMemoryStats();
		} catch (error) {
			console.error('獲取統計信息失敗:', error);
			return null;
		}
	}

	// 私有方法
	private parseCharacters(result: any): Character[] {
		// 解析MemoryMesh返回的角色數據
		if (!result || !result.nodes) return [];
		
		return result.nodes.map((node: any) => ({
			name: node.name,
			description: this.extractFromMetadata(node.metadata, '描述'),
			traits: this.extractTraitsFromMetadata(node.metadata),
			relationships: [] // 需要額外查詢關係
		}));
	}

	private parseLocations(result: any): Location[] {
		if (!result || !result.nodes) return [];
		
		return result.nodes.map((node: any) => ({
			name: node.name,
			description: this.extractFromMetadata(node.metadata, '描述'),
			type: this.extractFromMetadata(node.metadata, '類型'),
			connectedTo: [] // 需要額外查詢連接
		}));
	}

	private parseEvents(result: any): Event[] {
		if (!result || !result.nodes) return [];
		
		return result.nodes.map((node: any) => ({
			name: node.name,
			time: this.extractFromMetadata(node.metadata, '時間'),
			description: this.extractFromMetadata(node.metadata, '描述'),
			importance: parseInt(this.extractFromMetadata(node.metadata, '重要性')) || 1,
			type: this.extractFromMetadata(node.metadata, '類型') as 'main' | 'side' | 'background',
			characters: [], // 需要額外查詢關聯
			location: undefined // 需要額外查詢關聯
		}));
	}

	private extractFromMetadata(metadata: string[], prefix: string): string {
		const item = metadata.find(m => m.startsWith(`${prefix}:`));
		return item ? item.substring(prefix.length + 2) : '';
	}

	private extractTraitsFromMetadata(metadata: string[]): string[] {
		return metadata
			.filter(m => m.startsWith('特徵:'))
			.map(m => m.substring(3).trim());
	}

	private isCacheValid(): boolean {
		return Date.now() - this.lastSync < 30000; // 30秒緩存
	}

	private invalidateCache(key: string): void {
		this.cache.delete(key);
	}
}
