export interface NovelCreationSettings {
	memoryMeshUrl: string;
	autoConvertToTraditional: boolean;
	llmApiKey: string;
	llmProvider: 'openai' | 'anthropic' | 'local';
	enableRealTimeSync: boolean;
	timelineViewMode: 'linear' | 'branching';
	characterDisplayMode: 'grid' | 'graph';
}

export const DEFAULT_SETTINGS: NovelCreationSettings = {
	memoryMeshUrl: 'ws://localhost:3000',
	autoConvertToTraditional: true,
	llmApiKey: '',
	llmProvider: 'openai',
	enableRealTimeSync: true,
	timelineViewMode: 'linear',
	characterDisplayMode: 'grid'
};

export interface Character {
	name: string;
	description: string;
	traits?: string[];
	relationships?: Relationship[];
	appearances?: string[];
}

export interface Location {
	name: string;
	description: string;
	type?: string;
	connectedTo?: string[];
}

export interface Event {
	name: string;
	time: string;
	description: string;
	characters?: string[];
	location?: string;
	importance?: number;
	type?: 'main' | 'side' | 'background';
}

export interface Relationship {
	target: string;
	type: string;
	description: string;
	strength?: number;
}

export interface TimelineNode {
	id: string;
	name: string;
	time: string;
	description: string;
	type: 'event' | 'milestone' | 'chapter';
	x: number;
	y: number;
	connections?: string[];
}
