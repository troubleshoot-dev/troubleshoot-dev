/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';
import { IAIService, IAIProvider, IAIMessage, IAICompletion, IAIEdit, IAICodeContext } from 'vs/workbench/contrib/ai/common/aiService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService } from 'vs/platform/log/common/log';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

export class AIService extends Disposable implements IAIService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeProviders = this._register(new Emitter<void>());
	readonly onDidChangeProviders: Event<void> = this._onDidChangeProviders.event;

	private _providers: IAIProvider[] = [];
	private _activeProvider: IAIProvider | undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this._initializeProviders();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('troubleshoot.ai')) {
				this._initializeProviders();
			}
		}));
	}

	private _initializeProviders(): void {
		const config = this.configurationService.getValue<any>('troubleshoot.ai');
		
		this._providers = [
			{
				id: 'openai',
				name: 'OpenAI GPT',
				description: 'OpenAI GPT models for code assistance',
				supportsChat: true,
				supportsCompletion: true,
				supportsEditing: true
			},
			{
				id: 'anthropic',
				name: 'Anthropic Claude',
				description: 'Anthropic Claude for code analysis',
				supportsChat: true,
				supportsCompletion: true,
				supportsEditing: true
			},
			{
				id: 'local',
				name: 'Local Model',
				description: 'Local AI model for privacy',
				supportsChat: true,
				supportsCompletion: true,
				supportsEditing: false
			}
		];

		// Set active provider from config
		const activeProviderId = config?.provider || 'openai';
		this._activeProvider = this._providers.find(p => p.id === activeProviderId);
		
		this._onDidChangeProviders.fire();
	}

	getProviders(): IAIProvider[] {
		return [...this._providers];
	}

	getActiveProvider(): IAIProvider | undefined {
		return this._activeProvider;
	}

	async setActiveProvider(providerId: string): Promise<void> {
		const provider = this._providers.find(p => p.id === providerId);
		if (provider) {
			this._activeProvider = provider;
			await this.configurationService.updateValue('troubleshoot.ai.provider', providerId);
			this._onDidChangeProviders.fire();
		}
	}

	async chat(messages: IAIMessage[], context?: IAICodeContext): Promise<string> {
		if (!this._activeProvider?.supportsChat) {
			throw new Error('Active provider does not support chat');
		}

		this.logService.info('AI Chat request', { provider: this._activeProvider.id, messageCount: messages.length });

		// Build context-aware prompt
		let systemPrompt = 'You are a helpful AI assistant specialized in software development and troubleshooting.';
		
		if (context) {
			systemPrompt += `\n\nCurrent file: ${context.filePath}`;
			systemPrompt += `\nLanguage: ${context.language}`;
			systemPrompt += `\nCode context:\n\`\`\`${context.language}\n${context.content}\n\`\`\``;
		}

		const fullMessages: IAIMessage[] = [
			{ role: 'system', content: systemPrompt },
			...messages
		];

		return this._makeAIRequest('chat', { messages: fullMessages, context });
	}

	async complete(context: IAICodeContext): Promise<IAICompletion[]> {
		if (!this._activeProvider?.supportsCompletion) {
			throw new Error('Active provider does not support completion');
		}

		this.logService.info('AI Completion request', { provider: this._activeProvider.id, file: context.filePath });

		const prompt = this._buildCompletionPrompt(context);
		const response = await this._makeAIRequest('completion', { prompt, context });

		return [{
			text: response,
			confidence: 0.8,
			range: context.selection
		}];
	}

	async edit(instruction: string, context: IAICodeContext): Promise<IAIEdit> {
		if (!this._activeProvider?.supportsEditing) {
			throw new Error('Active provider does not support editing');
		}

		this.logService.info('AI Edit request', { provider: this._activeProvider.id, instruction });

		const prompt = `Edit the following code according to the instruction: "${instruction}"\n\nOriginal code:\n\`\`\`${context.language}\n${context.content}\n\`\`\`\n\nProvide only the edited code without explanations.`;
		
		const editedText = await this._makeAIRequest('edit', { prompt, context });

		return {
			originalText: context.content,
			editedText,
			explanation: `Applied instruction: ${instruction}`
		};
	}

	async explain(context: IAICodeContext): Promise<string> {
		const selectedCode = context.selection ? 
			context.content.split('\n').slice(context.selection.startLine - 1, context.selection.endLine).join('\n') :
			context.content;

		const prompt = `Explain the following ${context.language} code:\n\n\`\`\`${context.language}\n${selectedCode}\n\`\`\``;
		
		return this._makeAIRequest('explain', { prompt, context });
	}

	async generate(description: string, language: string): Promise<string> {
		const prompt = `Generate ${language} code for: ${description}\n\nProvide only the code without explanations.`;
		
		return this._makeAIRequest('generate', { prompt, language });
	}

	async debug(error: string, context: IAICodeContext): Promise<string> {
		const prompt = `Debug this ${context.language} code error:\n\nError: ${error}\n\nCode:\n\`\`\`${context.language}\n${context.content}\n\`\`\`\n\nProvide debugging suggestions and potential fixes.`;
		
		return this._makeAIRequest('debug', { prompt, context, error });
	}

	async analyzeLogs(logs: string): Promise<string> {
		const prompt = `Analyze these logs and provide insights about potential issues, patterns, and recommendations:\n\n\`\`\`\n${logs}\n\`\`\``;
		
		return this._makeAIRequest('analyzeLogs', { prompt, logs });
	}

	isAvailable(): boolean {
		return this._activeProvider !== undefined;
	}

	private _buildCompletionPrompt(context: IAICodeContext): string {
		const beforeCursor = context.content.split('\n').slice(0, context.cursorPosition.line).join('\n');
		const afterCursor = context.content.split('\n').slice(context.cursorPosition.line).join('\n');

		return `Complete the following ${context.language} code:\n\n\`\`\`${context.language}\n${beforeCursor}<CURSOR>${afterCursor}\n\`\`\`\n\nProvide only the completion text.`;
	}

	private async _makeAIRequest(type: string, data: any): Promise<string> {
		// This is a mock implementation - in real implementation, this would call actual AI APIs
		this.logService.info(`AI ${type} request`, data);

		// Simulate AI response based on request type
		switch (type) {
			case 'chat':
				return 'I can help you with that! Let me analyze your code and provide assistance.';
			case 'completion':
				return 'console.log("AI completion");';
			case 'edit':
				return data.context.content.replace(/TODO/g, '// Completed by AI');
			case 'explain':
				return 'This code defines a function that performs the specified operation.';
			case 'generate':
				return `// Generated ${data.language} code\nfunction example() {\n    return "Hello World";\n}`;
			case 'debug':
				return 'The error appears to be caused by a null reference. Consider adding null checks.';
			case 'analyzeLogs':
				return 'Log analysis shows normal operation with no critical errors detected.';
			default:
				return 'AI response not implemented for this request type.';
		}
	}
}

registerSingleton(IAIService, AIService, true);