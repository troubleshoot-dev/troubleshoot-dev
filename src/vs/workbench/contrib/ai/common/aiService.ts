/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/base/common/event';

export interface IAIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
}

export interface IAICompletion {
	text: string;
	confidence: number;
	range?: {
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
}

export interface IAIEdit {
	originalText: string;
	editedText: string;
	explanation?: string;
}

export interface IAICodeContext {
	filePath: string;
	language: string;
	content: string;
	cursorPosition: {
		line: number;
		column: number;
	};
	selection?: {
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
}

export interface IAIProvider {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly supportsChat: boolean;
	readonly supportsCompletion: boolean;
	readonly supportsEditing: boolean;
}

export const IAIService = createDecorator<IAIService>('aiService');

export interface IAIService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when AI providers change
	 */
	readonly onDidChangeProviders: Event<void>;

	/**
	 * Get available AI providers
	 */
	getProviders(): IAIProvider[];

	/**
	 * Get the currently active provider
	 */
	getActiveProvider(): IAIProvider | undefined;

	/**
	 * Set the active AI provider
	 */
	setActiveProvider(providerId: string): Promise<void>;

	/**
	 * Send a chat message to AI
	 */
	chat(messages: IAIMessage[], context?: IAICodeContext): Promise<string>;

	/**
	 * Get code completion suggestions
	 */
	complete(context: IAICodeContext): Promise<IAICompletion[]>;

	/**
	 * Edit code with natural language instruction
	 */
	edit(instruction: string, context: IAICodeContext): Promise<IAIEdit>;

	/**
	 * Explain code
	 */
	explain(context: IAICodeContext): Promise<string>;

	/**
	 * Generate code from description
	 */
	generate(description: string, language: string): Promise<string>;

	/**
	 * Debug code and suggest fixes
	 */
	debug(error: string, context: IAICodeContext): Promise<string>;

	/**
	 * Analyze logs and provide insights
	 */
	analyzeLogs(logs: string): Promise<string>;

	/**
	 * Check if AI service is available
	 */
	isAvailable(): boolean;
}