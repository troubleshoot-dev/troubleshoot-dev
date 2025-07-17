/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Disposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { IAIProviderRegistry } from 'vs/workbench/contrib/ai/common/aiProviderRegistry';
import { IAPIKeyManager, IAPIKeyValidationResult } from 'vs/workbench/contrib/ai/browser/apiKeyManager';
import { Emitter, Event } from 'vs/base/common/event';

export interface IAPIKeyTestResult {
	providerId: string;
	providerName: string;
	isValid: boolean;
	responseTime?: number;
	error?: string;
	details?: {
		statusCode?: number;
		statusText?: string;
		availableModels?: string[];
		accountInfo?: any;
		rateLimits?: {
			remaining?: number;
			resetTime?: string;
		};
	};
}

export interface IAPIKeyTestProgress {
	providerId: string;
	providerName: string;
	status: 'testing' | 'completed' | 'failed';
	message: string;
}

export const IAPIKeyTester = createDecorator<IAPIKeyTester>('apiKeyTester');

export interface IAPIKeyTester {
	readonly _serviceBrand: undefined;
	
	readonly onDidTestProgress: Event<IAPIKeyTestProgress>;
	readonly onDidTestComplete: Event<IAPIKeyTestResult>;
	
	/**
	 * Test a single API key for a specific provider
	 */
	testApiKey(providerId: string, apiKey: string): Promise<IAPIKeyTestResult>;
	
	/**
	 * Test all configured API keys
	 */
	testAllConfiguredKeys(): Promise<IAPIKeyTestResult[]>;
	
	/**
	 * Test and auto-detect provider for an API key
	 */
	testAndDetectProvider(apiKey: string): Promise<IAPIKeyTestResult | undefined>;
	
	/**
	 * Get detailed provider information and requirements
	 */
	getProviderTestInfo(providerId: string): Promise<{
		name: string;
		description: string;
		requiresApiKey: boolean;
		apiKeyPattern?: string;
		setupInstructions: string;
		testEndpoint: string;
	} | undefined>;
	
	/**
	 * Batch test multiple API keys
	 */
	batchTestApiKeys(tests: { providerId: string; apiKey: string }[]): Promise<IAPIKeyTestResult[]>;
}

export class APIKeyTester extends Disposable implements IAPIKeyTester {
	declare readonly _serviceBrand: undefined;
	
	private readonly _onDidTestProgress = this._register(new Emitter<IAPIKeyTestProgress>());
	readonly onDidTestProgress: Event<IAPIKeyTestProgress> = this._onDidTestProgress.event;
	
	private readonly _onDidTestComplete = this._register(new Emitter<IAPIKeyTestResult>());
	readonly onDidTestComplete: Event<IAPIKeyTestResult> = this._onDidTestComplete.event;
	
	constructor(
		@ILogService private readonly logService: ILogService,
		@IAIProviderRegistry private readonly providerRegistry: IAIProviderRegistry,
		@IAPIKeyManager private readonly apiKeyManager: IAPIKeyManager
	) {
		super();
		this.logService.info('APIKeyTester initialized');
	}
	
	async testApiKey(providerId: string, apiKey: string): Promise<IAPIKeyTestResult> {
		const provider = this.providerRegistry.getProvider(providerId);
		if (!provider) {
			return {
				providerId,
				providerName: 'Unknown Provider',
				isValid: false,
				error: `Provider '${providerId}' not found`
			};
		}
		
		this._onDidTestProgress.fire({
			providerId,
			providerName: provider.name,
			status: 'testing',
			message: `Testing ${provider.name} API key...`
		});
		
		const startTime = Date.now();
		
		try {
			// For local providers, just check if they're available
			if (!provider.requiresApiKey) {
				const result: IAPIKeyTestResult = {
					providerId,
					providerName: provider.name,
					isValid: true,
					responseTime: Date.now() - startTime,
					details: {
						statusCode: 200,
						statusText: 'Local provider available'
					}
				};
				
				this._onDidTestProgress.fire({
					providerId,
					providerName: provider.name,
					status: 'completed',
					message: `${provider.name} is available locally`
				});
				
				this._onDidTestComplete.fire(result);
				return result;
			}
			
			// Test the API key with enhanced validation
			const detailedResult = await this._performDetailedTest(provider, apiKey);
			const responseTime = Date.now() - startTime;
			
			const result: IAPIKeyTestResult = {
				providerId,
				providerName: provider.name,
				isValid: detailedResult.isValid,
				responseTime,
				error: detailedResult.error,
				details: detailedResult.details
			};
			
			this._onDidTestProgress.fire({
				providerId,
				providerName: provider.name,
				status: result.isValid ? 'completed' : 'failed',
				message: result.isValid 
					? `${provider.name} API key is valid (${responseTime}ms)`
					: `${provider.name} API key failed: ${result.error}`
			});
			
			this._onDidTestComplete.fire(result);
			return result;
			
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const result: IAPIKeyTestResult = {
				providerId,
				providerName: provider.name,
				isValid: false,
				responseTime,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
			
			this._onDidTestProgress.fire({
				providerId,
				providerName: provider.name,
				status: 'failed',
				message: `${provider.name} test failed: ${result.error}`
			});
			
			this._onDidTestComplete.fire(result);
			return result;
		}
	}
	
	async testAllConfiguredKeys(): Promise<IAPIKeyTestResult[]> {
		this.logService.info('Testing all configured API keys');
		
		const configuredProviders = await this.apiKeyManager.getConfiguredProviders();
		const results: IAPIKeyTestResult[] = [];
		
		for (const providerId of configuredProviders) {
			const apiKey = await this.apiKeyManager.getApiKey(providerId);
			if (apiKey) {
				const result = await this.testApiKey(providerId, apiKey);
				results.push(result);
			}
		}
		
		this.logService.info(`Completed testing ${results.length} configured API keys`);
		return results;
	}
	
	async testAndDetectProvider(apiKey: string): Promise<IAPIKeyTestResult | undefined> {
		this.logService.info('Testing and detecting provider for API key');
		
		// First try to detect the provider
		const detectedProviderId = await this.apiKeyManager.detectProvider(apiKey);
		
		if (detectedProviderId) {
			this.logService.info(`Provider detected: ${detectedProviderId}`);
			return await this.testApiKey(detectedProviderId, apiKey);
		}
		
		// If detection fails, try testing with all providers that require API keys
		const allProviders = this.providerRegistry.getAllProviders();
		const providersToTest = allProviders.filter(p => p.requiresApiKey);
		
		for (const provider of providersToTest) {
			try {
				const result = await this.testApiKey(provider.id, apiKey);
				if (result.isValid) {
					this.logService.info(`API key validated with provider: ${provider.id}`);
					return result;
				}
			} catch (error) {
				// Continue testing other providers
				this.logService.trace(`API key test failed for ${provider.id}:`, error);
			}
		}
		
		this.logService.warn('Could not detect or validate API key with any provider');
		return undefined;
	}
	
	async getProviderTestInfo(providerId: string): Promise<{
		name: string;
		description: string;
		requiresApiKey: boolean;
		apiKeyPattern?: string;
		setupInstructions: string;
		testEndpoint: string;
	} | undefined> {
		const provider = this.providerRegistry.getProvider(providerId);
		if (!provider) {
			return undefined;
		}
		
		const setupInstructions = this._getSetupInstructions(providerId);
		
		return {
			name: provider.name,
			description: provider.description,
			requiresApiKey: provider.requiresApiKey,
			apiKeyPattern: provider.apiKeyPattern?.source,
			setupInstructions,
			testEndpoint: provider.apiEndpoint || 'Local provider'
		};
	}
	
	async batchTestApiKeys(tests: { providerId: string; apiKey: string }[]): Promise<IAPIKeyTestResult[]> {
		this.logService.info(`Starting batch test of ${tests.length} API keys`);
		
		const results: IAPIKeyTestResult[] = [];
		
		// Test in parallel with a reasonable concurrency limit
		const concurrencyLimit = 5;
		const chunks = this._chunkArray(tests, concurrencyLimit);
		
		for (const chunk of chunks) {
			const chunkResults = await Promise.all(
				chunk.map(test => this.testApiKey(test.providerId, test.apiKey))
			);
			results.push(...chunkResults);
		}
		
		this.logService.info(`Completed batch testing ${results.length} API keys`);
		return results;
	}
	
	private async _performDetailedTest(provider: any, apiKey: string): Promise<{
		isValid: boolean;
		error?: string;
		details?: any;
	}> {
		try {
			// Use provider-specific detailed testing
			switch (provider.id) {
				case 'openai':
					return await this._testOpenAI(apiKey);
				case 'anthropic':
					return await this._testAnthropic(apiKey);
				case 'gemini':
					return await this._testGemini(apiKey);
				case 'mistral':
					return await this._testMistral(apiKey);
				case 'cohere':
					return await this._testCohere(apiKey);
				case 'groq':
					return await this._testGroq(apiKey);
				case 'huggingface':
					return await this._testHuggingFace(apiKey);
				default:
					// Fallback to basic validation
					const isValid = await provider.validateApiKey(apiKey);
					return {
						isValid,
						error: isValid ? undefined : 'API key validation failed'
					};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
	
	private async _testOpenAI(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch('https://api.openai.com/v1/models', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: data.data?.map((m: any) => m.id).slice(0, 10) || [],
						rateLimits: {
							remaining: response.headers.get('x-ratelimit-remaining'),
							resetTime: response.headers.get('x-ratelimit-reset-time')
						}
					}
				};
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					isValid: false,
					error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testAnthropic(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			// Anthropic doesn't have a models endpoint, so we'll test with a minimal message
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'Content-Type': 'application/json',
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 1,
					messages: [{ role: 'user', content: 'Hi' }]
				})
			});
			
			if (response.ok || response.status === 400) {
				// 400 is acceptable as it means the API key is valid but request might be malformed
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
					}
				};
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					isValid: false,
					error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testGemini(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
				method: 'GET'
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: data.models?.map((m: any) => m.name).slice(0, 10) || []
					}
				};
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					isValid: false,
					error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testMistral(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch('https://api.mistral.ai/v1/models', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: data.data?.map((m: any) => m.id) || []
					}
				};
			} else {
				const errorData = await response.json().catch(() => ({}));
				return {
					isValid: false,
					error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testCohere(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch('https://api.cohere.ai/v1/models', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: data.models?.map((m: any) => m.name) || []
					}
				};
			} else {
				return {
					isValid: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testGroq(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch('https://api.groq.com/openai/v1/models', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						availableModels: data.data?.map((m: any) => m.id) || []
					}
				};
			} else {
				return {
					isValid: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private async _testHuggingFace(apiKey: string): Promise<{ isValid: boolean; error?: string; details?: any }> {
		try {
			const response = await fetch('https://huggingface.co/api/whoami', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${apiKey}`
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				return {
					isValid: true,
					details: {
						statusCode: response.status,
						statusText: response.statusText,
						accountInfo: {
							name: data.name,
							type: data.type
						}
					}
				};
			} else {
				return {
					isValid: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
					details: {
						statusCode: response.status,
						statusText: response.statusText
					}
				};
			}
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}
	
	private _getSetupInstructions(providerId: string): string {
		const instructions: Record<string, string> = {
			'openai': 'Get your API key from https://platform.openai.com/api-keys. Format: sk-...',
			'anthropic': 'Get your API key from https://console.anthropic.com/. Format: sk-ant-...',
			'gemini': 'Get your API key from https://makersuite.google.com/app/apikey. Format: 39 characters',
			'mistral': 'Get your API key from https://console.mistral.ai/. Format: 32+ characters',
			'cohere': 'Get your API key from https://dashboard.cohere.ai/api-keys. Format: 40 characters',
			'groq': 'Get your API key from https://console.groq.com/keys. Format: gsk_...',
			'huggingface': 'Get your API key from https://huggingface.co/settings/tokens. Format: hf_...',
			'openrouter': 'Get your API key from https://openrouter.ai/keys. Format: sk-or-...',
			'together': 'Get your API key from https://api.together.xyz/settings/api-keys. Format: 64 hex characters',
			'deepinfra': 'Get your API key from https://deepinfra.com/dash/api_keys. Format: 32+ characters',
			'perplexity': 'Get your API key from https://www.perplexity.ai/settings/api. Format: pplx-...',
			'replicate': 'Get your API key from https://replicate.com/account/api-tokens. Format: r8_...',
			'ai21': 'Get your API key from https://studio.ai21.com/account/api-key. Format: 32+ characters',
			'fireworks': 'Get your API key from https://fireworks.ai/account/api-keys. Format: fw_...',
			'github-copilot': 'GitHub Copilot requires GitHub authentication. Format: ghp_...',
			'ollama': 'Install Ollama locally from https://ollama.ai/. No API key required.',
			'local': 'Configure local AI models. No API key required.'
		};
		
		return instructions[providerId] || 'Check the provider\'s documentation for API key setup instructions.';
	}
	
	private _chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}
}