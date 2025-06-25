// 注意：這裡使用了opencc-js庫進行簡繁轉換
// 在實際使用中，您可能需要根據具體需求調整實現方式

export class ContentOptimizer {
	private converter: any;

	constructor() {
		// 初始化簡繁轉換器
		this.initConverter();
	}

	private async initConverter() {
		try {
			// 動態導入opencc-js
			const OpenCC = await import('opencc-js');
			this.converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
		} catch (error) {
			console.warn('簡繁轉換器初始化失敗，將使用備用方案:', error);
			this.converter = null;
		}
	}

	/**
	 * 將簡體中文轉換為繁體中文
	 */
	async convertToTraditional(text: string): Promise<string> {
		try {
			if (this.converter) {
				return this.converter(text);
			} else {
				// 備用方案：使用基礎的字符映射
				return this.basicSimplifiedToTraditional(text);
			}
		} catch (error) {
			console.error('簡繁轉換失敗:', error);
			return text; // 返回原文
		}
	}

	/**
	 * 檢測文本中的簡體字符
	 */
	detectSimplifiedChinese(text: string): boolean {
		// 常見簡體字符的正則表達式
		const simplifiedChars = /[国发会来时间问题现实际应该对于这样那样经济发展]/;
		return simplifiedChars.test(text);
	}

	/**
	 * 分析內容的豐富度
	 */
	analyzeContentRichness(text: string): ContentAnalysis {
		const analysis: ContentAnalysis = {
			wordCount: this.countWords(text),
			characterCount: text.length,
			paragraphCount: this.countParagraphs(text),
			dialogueRatio: this.calculateDialogueRatio(text),
			descriptionRatio: this.calculateDescriptionRatio(text),
			richnessScore: 0,
			suggestions: []
		};

		// 計算豐富度分數
		analysis.richnessScore = this.calculateRichnessScore(analysis);
		
		// 生成建議
		analysis.suggestions = this.generateSuggestions(analysis);

		return analysis;
	}

	/**
	 * 分析主線支線權重
	 */
	analyzeStorylineWeight(events: any[]): StorylineAnalysis {
		const mainEvents = events.filter(e => e.type === 'main');
		const sideEvents = events.filter(e => e.type === 'side');
		const backgroundEvents = events.filter(e => e.type === 'background');

		const totalImportance = events.reduce((sum, e) => sum + (e.importance || 1), 0);
		const mainImportance = mainEvents.reduce((sum, e) => sum + (e.importance || 1), 0);
		const sideImportance = sideEvents.reduce((sum, e) => sum + (e.importance || 1), 0);

		return {
			mainlineWeight: totalImportance > 0 ? mainImportance / totalImportance : 0,
			sidelineWeight: totalImportance > 0 ? sideImportance / totalImportance : 0,
			backgroundWeight: totalImportance > 0 ? (totalImportance - mainImportance - sideImportance) / totalImportance : 0,
			balance: this.calculateStorylineBalance(mainImportance, sideImportance, totalImportance),
			recommendations: this.generateStorylineRecommendations(mainImportance, sideImportance, totalImportance)
		};
	}

	/**
	 * 優化文本結構
	 */
	optimizeTextStructure(text: string): string {
		let optimized = text;

		// 修正段落間距
		optimized = optimized.replace(/\n{3,}/g, '\n\n');

		// 修正標點符號
		optimized = this.fixPunctuation(optimized);

		// 修正對話格式
		optimized = this.fixDialogueFormat(optimized);

		return optimized;
	}

	// 私有方法
	private basicSimplifiedToTraditional(text: string): string {
		// 基礎的簡繁轉換映射表（部分常用字）
		const charMap: { [key: string]: string } = {
			'国': '國',
			'发': '發',
			'会': '會',
			'来': '來',
			'时': '時',
			'间': '間',
			'问': '問',
			'题': '題',
			'现': '現',
			'实': '實',
			'际': '際',
			'应': '應',
			'该': '該',
			'对': '對',
			'于': '於',
			'这': '這',
			'样': '樣',
			'那': '那',
			'经': '經',
			'济': '濟',
			'发': '發',
			'展': '展'
		};

		return text.replace(/[国发会来时间问题现实际应该对于这样那样经济发展]/g, (char) => {
			return charMap[char] || char;
		});
	}

	private countWords(text: string): number {
		// 中文字符計數
		const chineseChars = text.match(/[\u4e00-\u9fff]/g);
		const englishWords = text.match(/[a-zA-Z]+/g);
		
		return (chineseChars?.length || 0) + (englishWords?.length || 0);
	}

	private countParagraphs(text: string): number {
		return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
	}

	private calculateDialogueRatio(text: string): number {
		const dialogueMatches = text.match(/["「『][^"」』]*["」』]/g);
		const dialogueLength = dialogueMatches?.join('').length || 0;
		return text.length > 0 ? dialogueLength / text.length : 0;
	}

	private calculateDescriptionRatio(text: string): number {
		// 簡單的描述性文本檢測（非對話部分）
		const nonDialogue = text.replace(/["「『][^"」』]*["」』]/g, '');
		return text.length > 0 ? nonDialogue.length / text.length : 0;
	}

	private calculateRichnessScore(analysis: ContentAnalysis): number {
		let score = 0;

		// 字數分數 (0-30分)
		if (analysis.wordCount > 1000) score += 30;
		else if (analysis.wordCount > 500) score += 20;
		else if (analysis.wordCount > 200) score += 10;

		// 對話比例分數 (0-25分)
		if (analysis.dialogueRatio > 0.1 && analysis.dialogueRatio < 0.6) score += 25;
		else if (analysis.dialogueRatio > 0.05) score += 15;

		// 描述比例分數 (0-25分)
		if (analysis.descriptionRatio > 0.4) score += 25;
		else if (analysis.descriptionRatio > 0.2) score += 15;

		// 段落結構分數 (0-20分)
		const avgWordsPerParagraph = analysis.paragraphCount > 0 ? analysis.wordCount / analysis.paragraphCount : 0;
		if (avgWordsPerParagraph > 50 && avgWordsPerParagraph < 200) score += 20;
		else if (avgWordsPerParagraph > 20) score += 10;

		return Math.min(score, 100);
	}

	private generateSuggestions(analysis: ContentAnalysis): string[] {
		const suggestions: string[] = [];

		if (analysis.wordCount < 200) {
			suggestions.push('內容較短，建議增加更多細節描述');
		}

		if (analysis.dialogueRatio < 0.05) {
			suggestions.push('缺少對話，建議添加角色對話增加生動性');
		} else if (analysis.dialogueRatio > 0.7) {
			suggestions.push('對話過多，建議增加場景描述和心理描寫');
		}

		if (analysis.descriptionRatio < 0.3) {
			suggestions.push('描述性內容不足，建議增加環境和角色描寫');
		}

		if (analysis.paragraphCount < 3) {
			suggestions.push('段落過少，建議適當分段提高可讀性');
		}

		return suggestions;
	}

	private calculateStorylineBalance(mainImportance: number, sideImportance: number, totalImportance: number): 'good' | 'main-heavy' | 'side-heavy' | 'unbalanced' {
		const mainRatio = mainImportance / totalImportance;
		const sideRatio = sideImportance / totalImportance;

		if (mainRatio >= 0.5 && mainRatio <= 0.7 && sideRatio >= 0.2 && sideRatio <= 0.4) {
			return 'good';
		} else if (mainRatio > 0.8) {
			return 'main-heavy';
		} else if (sideRatio > 0.5) {
			return 'side-heavy';
		} else {
			return 'unbalanced';
		}
	}

	private generateStorylineRecommendations(mainImportance: number, sideImportance: number, totalImportance: number): string[] {
		const recommendations: string[] = [];
		const mainRatio = mainImportance / totalImportance;
		const sideRatio = sideImportance / totalImportance;

		if (mainRatio < 0.5) {
			recommendations.push('主線劇情權重偏低，建議增強主線事件的重要性');
		}

		if (sideRatio < 0.2) {
			recommendations.push('支線劇情過少，建議添加更多支線內容豐富故事');
		} else if (sideRatio > 0.5) {
			recommendations.push('支線劇情過多，可能會分散讀者注意力');
		}

		if (mainRatio > 0.8) {
			recommendations.push('主線過於集中，建議適當添加支線調節節奏');
		}

		return recommendations;
	}

	private fixPunctuation(text: string): string {
		// 修正常見的標點符號問題
		return text
			.replace(/，\s*，/g, '，') // 重複逗號
			.replace(/。\s*。/g, '。') // 重複句號
			.replace(/\s+([，。！？；：])/g, '$1') // 標點前的空格
			.replace(/([，。！？；：])\s+/g, '$1 '); // 標點後的空格
	}

	private fixDialogueFormat(text: string): string {
		// 修正對話格式
		return text
			.replace(/"\s*([^"]*)\s*"/g, '「$1」') // 統一對話引號
			.replace(/「([^」]*)」([^，。！？])/g, '「$1」，$2'); // 對話後添加標點
	}
}

// 類型定義
export interface ContentAnalysis {
	wordCount: number;
	characterCount: number;
	paragraphCount: number;
	dialogueRatio: number;
	descriptionRatio: number;
	richnessScore: number;
	suggestions: string[];
}

export interface StorylineAnalysis {
	mainlineWeight: number;
	sidelineWeight: number;
	backgroundWeight: number;
	balance: 'good' | 'main-heavy' | 'side-heavy' | 'unbalanced';
	recommendations: string[];
}
