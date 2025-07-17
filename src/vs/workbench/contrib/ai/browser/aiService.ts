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
import { IAIProviderRegistry } from 'vs/workbench/contrib/ai/common/aiProviderRegistry';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IAPIKeyManager } from 'vs/workbench/contrib/ai/browser/apiKeyManager';

export class AIService extends Disposable implements IAIService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeProviders = this._register(new Emitter<void>());
	readonly onDidChangeProviders: Event<void> = this._onDidChangeProviders.event;

	private _providers: IAIProvider[] = [];
	private _activeProvider: IAIProvider | undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService,
		@IAIProviderRegistry private readonly providerRegistry: IAIProviderRegistry,
		@IStorageService private readonly storageService: IStorageService,
		@IAPIKeyManager private readonly apiKeyManager: IAPIKeyManager
	) {
		super();
		this._initializeProviders();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('troubleshoot.ai')) {
				this._initializeProviders();
			}
		}));
		this._register(this.providerRegistry.onDidChangeProviders(() => {
			this._initializeProviders();
		}));
	}

	private _initializeProviders(): void {
		const config = this.configurationService.getValue<any>('troubleshoot.ai');
		
		// Get providers from registry
		this._providers = this.providerRegistry.getAllProviders().map(provider => ({
			id: provider.id,
			name: provider.name,
			description: provider.description,
			supportsChat: provider.capabilities.supportsChat,
			supportsCompletion: provider.capabilities.supportsCompletion,
			supportsEditing: provider.capabilities.supportsEditing
		}));

		// If no providers are registered, add default ones
		if (this._providers.length === 0) {
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
		}

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
		const config = this.configurationService.getValue<any>('troubleshoot.ai');
		const providerId = this._activeProvider?.id;
		
		if (!providerId) {
			throw new Error('No AI provider selected');
		}

		// Get provider-specific configuration
		const providerConfig = config?.[providerId] || {};
		const apiKey = await this.apiKeyManager.getApiKey(providerId) || providerConfig.apiKey || config?.apiKey; // Use API Key Manager first
		const model = providerConfig.model || config?.model || this._getDefaultModel(providerId);
		const temperature = config?.temperature || 0.7;
		const maxTokens = config?.maxTokens || 2000;
		const timeout = config?.requestTimeout || 30000;
		
		// Get provider info to check if API key is required
		const provider = this.providerRegistry.getProvider(providerId);
		if (provider?.requiresApiKey && !apiKey) {
			throw new Error(`API key required for ${this._activeProvider?.name}. Please configure it in settings.`);
		}

		try {
			const requestOptions = {
				apiKey,
				model,
				temperature,
				maxTokens,
				timeout
			};

			switch (providerId) {
				case 'openai':
					return await this._callOpenAI(type, data, requestOptions);
				case 'azure-openai':
					return await this._callAzureOpenAI(type, data, requestOptions);
				case 'anthropic':
					return await this._callAnthropic(type, data, requestOptions);
				case 'gemini':
					return await this._callGemini(type, data, requestOptions);
				case 'mistral':
					return await this._callMistral(type, data, requestOptions);
				case 'ollama':
					return await this._callOllama(type, data, requestOptions);
				case 'cohere':
					return await this._callCohere(type, data, requestOptions);
				case 'openrouter':
					return await this._callOpenRouter(type, data, requestOptions);
				case 'together':
					return await this._callTogether(type, data, requestOptions);
				case 'groq':
					return await this._callGroq(type, data, requestOptions);
				case 'huggingface':
					return await this._callHuggingFace(type, data, requestOptions);
				case 'deepinfra':
					return await this._callDeepInfra(type, data, requestOptions);
				case 'perplexity':
					return await this._callPerplexity(type, data, requestOptions);
				case 'replicate':
					return await this._callReplicate(type, data, requestOptions);
				case 'ai21':
					return await this._callAI21(type, data, requestOptions);
				case 'fireworks':
					return await this._callFireworks(type, data, requestOptions);
				case 'github-copilot':
					return await this._callGitHubCopilot(type, data, requestOptions);
				case 'local':
					return await this._callLocalModel(type, data, requestOptions);
				default:
					return this._getMockResponse(type, data);
			}
		} catch (error) {
			this.logService.error('AI request failed', error);
			
			// Retry logic
			const retryAttempts = config?.retryAttempts || 3;
			if (data._retryCount < retryAttempts) {
				data._retryCount = (data._retryCount || 0) + 1;
				this.logService.info(`Retrying AI request (attempt ${data._retryCount}/${retryAttempts})`);
				await new Promise(resolve => setTimeout(resolve, 1000 * data._retryCount)); // Exponential backoff
				return this._makeAIRequest(type, data);
			}
			
			throw new Error(`AI request failed after ${retryAttempts} attempts: ${error.message}`);
		}
	}

	private _getDefaultModel(providerId: string): string {
		const defaults: Record<string, string> = {
			'openai': 'gpt-3.5-turbo',
			'anthropic': 'claude-3-sonnet-20240229',
			'gemini': 'gemini-pro',
			'mistral': 'mistral-medium',
			'ollama': 'codellama',
			'local': 'transformers.js'
		};
		return defaults[providerId] || 'gpt-3.5-turbo';
	}

	private async _callOpenAI(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.openai.com/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model,
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from OpenAI';
	}

	private async _callAnthropic(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.anthropic.com/v1/messages';
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'x-api-key': options.apiKey,
				'Content-Type': 'application/json',
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: options.model.includes('claude') ? options.model : 'claude-3-sonnet-20240229',
				max_tokens: options.maxTokens,
				messages: [{ role: 'user', content: prompt }]
			})
		});

		if (!response.ok) {
			throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.content[0]?.text || 'No response from Anthropic';
	}

	private async _callGemini(type: string, data: any, options: any): Promise<string> {
		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.model.includes('gemini') ? options.model : 'gemini-pro'}:generateContent?key=${options.apiKey}`;
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				contents: [{
					parts: [{ text: prompt }]
				}],
				generationConfig: {
					temperature: options.temperature,
					maxOutputTokens: options.maxTokens
				}
			})
		});

		if (!response.ok) {
			throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini';
	}

	private async _callMistral(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.mistral.ai/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model.includes('mistral') ? options.model : 'mistral-medium',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Mistral';
	}

	private async _callOllama(type: string, data: any, options: any): Promise<string> {
		const config = this.configurationService.getValue<any>('troubleshoot.ai');
		const ollamaUrl = config?.ollama?.url || 'http://localhost:11434';
		const endpoint = `${ollamaUrl}/api/generate`;
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'codellama',
				prompt,
				stream: false
			})
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.response || 'No response from Ollama';
	}

	private async _callAzureOpenAI(type: string, data: any, options: any): Promise<string> {
		const config = this.configurationService.getValue<any>('troubleshoot.ai');
		const azureConfig = config?.['azure-openai'] || {};
		const endpoint = azureConfig.endpoint || 'https://your-resource.openai.azure.com';
		const apiVersion = azureConfig.apiVersion || '2023-12-01-preview';
		const deploymentName = azureConfig.deploymentName || options.model;
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(`${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`, {
			method: 'POST',
			headers: {
				'api-key': options.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Azure OpenAI';
	}

	private async _callCohere(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.cohere.ai/v1/generate';
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'command',
				prompt,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.generations[0]?.text || 'No response from Cohere';
	}

	private async _callOpenRouter(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': 'https://troubleshoot.dev',
				'X-Title': 'Troubleshoot Dev'
			},
			body: JSON.stringify({
				model: options.model || 'openai/gpt-3.5-turbo',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from OpenRouter';
	}

	private async _callTogether(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.together.xyz/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'meta-llama/Llama-2-70b-chat-hf',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Together AI';
	}

	private async _callGroq(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'mixtral-8x7b-32768',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Groq';
	}

	private async _callHuggingFace(type: string, data: any, options: any): Promise<string> {
		const endpoint = `https://api-inference.huggingface.co/models/${options.model || 'microsoft/DialoGPT-large'}`;
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				inputs: prompt,
				parameters: {
					temperature: options.temperature,
					max_new_tokens: options.maxTokens
				}
			})
		});

		if (!response.ok) {
			throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result[0]?.generated_text || result.generated_text || 'No response from Hugging Face';
	}

	private async _callDeepInfra(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'meta-llama/Llama-2-70b-chat-hf',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`DeepInfra API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from DeepInfra';
	}

	private async _callPerplexity(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.perplexity.ai/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'llama-3-sonar-small-32k-online',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Perplexity';
	}

	private async _callReplicate(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.replicate.com/v1/predictions';
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Token ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				version: options.model || 'meta/llama-2-70b-chat',
				input: {
					prompt,
					temperature: options.temperature,
					max_tokens: options.maxTokens
				}
			})
		});

		if (!response.ok) {
			throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		// Replicate is async, so this is a simplified implementation
		return result.output?.join('') || 'Processing request with Replicate...';
	}

	private async _callAI21(type: string, data: any, options: any): Promise<string> {
		const endpoint = `https://api.ai21.com/studio/v1/${options.model || 'j2-ultra'}/complete`;
		
		const prompt = type === 'chat' ? 
			data.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') :
			this._buildPromptForType(type, data);

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt,
				temperature: options.temperature,
				maxTokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`AI21 API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.completions[0]?.data?.text || 'No response from AI21';
	}

	private async _callFireworks(type: string, data: any, options: any): Promise<string> {
		const endpoint = 'https://api.fireworks.ai/inference/v1/chat/completions';
		
		let messages: any[] = [];
		if (type === 'chat') {
			messages = data.messages;
		} else {
			messages = [{ role: 'user', content: this._buildPromptForType(type, data) }];
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: options.model || 'accounts/fireworks/models/llama-v2-70b-chat',
				messages,
				temperature: options.temperature,
				max_tokens: options.maxTokens
			})
		});

		if (!response.ok) {
			throw new Error(`Fireworks API error: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0]?.message?.content || 'No response from Fireworks';
	}

	private async _callGitHubCopilot(type: string, data: any, options: any): Promise<string> {
		// GitHub Copilot integration would require special OAuth handling
		// This is a placeholder implementation
		this.logService.info('GitHub Copilot request', { type, model: options.model });
		
		// For now, return a mock response indicating Copilot integration needed
		return 'GitHub Copilot integration requires special authentication setup. Please use the GitHub Copilot extension directly.';
	}

	private async _callLocalModel(type: string, data: any, options: any): Promise<string> {
		// Placeholder for local model integration
		// This would integrate with local AI models like Transformers.js or ONNX
		this.logService.info('Local model request', { type, model: options.model });
		return this._getMockResponse(type, data);
	}

	private _buildPromptForType(type: string, data: any): string {
		switch (type) {
			case 'completion':
				return data.prompt;
			case 'edit':
				return data.prompt;
			case 'explain':
				return data.prompt;
			case 'generate':
				return data.prompt;
			case 'debug':
				return data.prompt;
			case 'analyzeLogs':
				return data.prompt;
			default:
				return data.prompt || 'No prompt provided';
		}
	}

	private _getMockResponse(type: string, data: any): string {
		// Fallback mock responses
		switch (type) {
			case 'chat':
				return 'I can help you with that! Let me analyze your code and provide assistance.';
			case 'completion':
				return 'console.log("AI completion");';
			case 'edit':
				return data.context?.content?.replace(/TODO/g, '// Completed by AI') || 'Edited code';
			case 'explain':
				return 'This code defines a function that performs the specified operation.';
			case 'generate':
				return `// Generated ${data.language || 'JavaScript'} code\nfunction example() {\n    return "Hello World";\n}`;
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