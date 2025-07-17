/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Disposable } from 'vs/base/common/lifecycle';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { ILogService } from 'vs/platform/log/common/log';
import { IAIProviderRegistry } from 'vs/workbench/contrib/ai/common/aiProviderRegistry';
import { Emitter, Event } from 'vs/base/common/event';

export interface IAPIKeyValidationResult {
	isValid: boolean;
	providerId?: string;
	error?: string;
}

export const IAPIKeyManager = createDecorator<IAPIKeyManager>('apiKeyManager');

export interface IAPIKeyManager {
	readonly _serviceBrand: undefined;
	
	readonly onDidChangeApiKeys: Event<string>;
	
	/**
	 * Store an API key securely for a specific provider
	 */
	storeApiKey(providerId: string, apiKey: string): Promise<void>;
	
	/**
	 * Retrieve an API key for a specific provider
	 */
	getApiKey(providerId: string): Promise<string | undefined>;
	
	/**
	 * Delete an API key for a specific provider
	 */
	deleteApiKey(providerId: string): Promise<void>;
	
	/**
	 * Test if an API key is valid for a specific provider
	 */
	testApiKey(providerId: string, apiKey: string): Promise<IAPIKeyValidationResult>;
	
	/**
	 * Auto-detect which provider an API key belongs to
	 */
	detectProvider(apiKey: string): Promise<string | undefined>;
	
	/**
	 * Get all providers that have API keys configured
	 */
	getConfiguredProviders(): Promise<string[]>;
	
	/**
	 * Check if a provider has an API key configured
	 */
	hasApiKey(providerId: string): Promise<boolean>;
	
	/**
	 * Clear all stored API keys (for security/reset purposes)
	 */
	clearAllApiKeys(): Promise<void>;
}

export class APIKeyManager extends Disposable implements IAPIKeyManager {
	declare readonly _serviceBrand: undefined;
	
	private readonly _onDidChangeApiKeys = this._register(new Emitter<string>());
	readonly onDidChangeApiKeys: Event<string> = this._onDidChangeApiKeys.event;
	
	private static readonly API_KEY_STORAGE_PREFIX = 'troubleshoot.ai.apikey.';
	private static readonly CONFIGURED_PROVIDERS_KEY = 'troubleshoot.ai.configuredProviders';
	
	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ILogService private readonly logService: ILogService,
		@IAIProviderRegistry private readonly providerRegistry: IAIProviderRegistry
	) {
		super();
		this.logService.info('APIKeyManager initialized');
	}
	
	async storeApiKey(providerId: string, apiKey: string): Promise<void> {
		if (!providerId || !apiKey) {
			throw new Error('Provider ID and API key are required');
		}
		
		// Validate the provider exists
		const provider = this.providerRegistry.getProvider(providerId);
		if (!provider) {
			throw new Error(`Unknown provider: ${providerId}`);
		}
		
		// Store the API key securely in user scope only
		const storageKey = APIKeyManager.API_KEY_STORAGE_PREFIX + providerId;
		this.storageService.store(storageKey, apiKey, StorageScope.APPLICATION, StorageTarget.USER);
		
		// Update the list of configured providers
		await this._updateConfiguredProviders(providerId, true);
		
		this.logService.info(`API key stored for provider: ${providerId}`);
		this._onDidChangeApiKeys.fire(providerId);
	}
	
	async getApiKey(providerId: string): Promise<string | undefined> {
		if (!providerId) {
			return undefined;
		}
		
		const storageKey = APIKeyManager.API_KEY_STORAGE_PREFIX + providerId;
		const apiKey = this.storageService.get(storageKey, StorageScope.APPLICATION);
		
		if (apiKey) {
			this.logService.trace(`API key retrieved for provider: ${providerId}`);
		}
		
		return apiKey;
	}
	
	async deleteApiKey(providerId: string): Promise<void> {
		if (!providerId) {
			return;
		}
		
		const storageKey = APIKeyManager.API_KEY_STORAGE_PREFIX + providerId;
		this.storageService.remove(storageKey, StorageScope.APPLICATION);
		
		// Update the list of configured providers
		await this._updateConfiguredProviders(providerId, false);
		
		this.logService.info(`API key deleted for provider: ${providerId}`);
		this._onDidChangeApiKeys.fire(providerId);
	}
	
	async testApiKey(providerId: string, apiKey: string): Promise<IAPIKeyValidationResult> {
		if (!providerId || !apiKey) {
			return {
				isValid: false,
				error: 'Provider ID and API key are required'
			};
		}
		
		const provider = this.providerRegistry.getProvider(providerId);
		if (!provider) {
			return {
				isValid: false,
				error: `Unknown provider: ${providerId}`
			};
		}
		
		// Local providers don't require API keys
		if (!provider.requiresApiKey) {
			return {
				isValid: true,
				providerId
			};
		}
		
		try {
			this.logService.info(`Testing API key for provider: ${providerId}`);
			const isValid = await provider.validateApiKey(apiKey);
			
			if (isValid) {
				this.logService.info(`API key validation successful for provider: ${providerId}`);
				return {
					isValid: true,
					providerId
				};
			} else {
				this.logService.warn(`API key validation failed for provider: ${providerId}`);
				return {
					isValid: false,
					providerId,
					error: 'API key validation failed'
				};
			}
		} catch (error) {
			this.logService.error(`Error testing API key for provider ${providerId}`, error);
			return {
				isValid: false,
				providerId,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
	
	async detectProvider(apiKey: string): Promise<string | undefined> {
		if (!apiKey) {
			return undefined;
		}
		
		this.logService.info('Attempting to auto-detect provider from API key');
		
		try {
			const detectedProviderId = await this.providerRegistry.detectProvider(apiKey);
			
			if (detectedProviderId) {
				this.logService.info(`Provider auto-detected: ${detectedProviderId}`);
				return detectedProviderId;
			} else {
				this.logService.info('Could not auto-detect provider from API key');
				return undefined;
			}
		} catch (error) {
			this.logService.error('Error during provider auto-detection', error);
			return undefined;
		}
	}
	
	async getConfiguredProviders(): Promise<string[]> {
		const configuredProvidersJson = this.storageService.get(
			APIKeyManager.CONFIGURED_PROVIDERS_KEY,
			StorageScope.APPLICATION,
			'[]'
		);
		
		try {
			return JSON.parse(configuredProvidersJson);
		} catch (error) {
			this.logService.error('Error parsing configured providers list', error);
			return [];
		}
	}
	
	async hasApiKey(providerId: string): Promise<boolean> {
		const apiKey = await this.getApiKey(providerId);
		return !!apiKey;
	}
	
	async clearAllApiKeys(): Promise<void> {
		this.logService.warn('Clearing all stored API keys');
		
		const configuredProviders = await this.getConfiguredProviders();
		
		// Remove all API keys
		for (const providerId of configuredProviders) {
			const storageKey = APIKeyManager.API_KEY_STORAGE_PREFIX + providerId;
			this.storageService.remove(storageKey, StorageScope.APPLICATION);
			this._onDidChangeApiKeys.fire(providerId);
		}
		
		// Clear the configured providers list
		this.storageService.remove(APIKeyManager.CONFIGURED_PROVIDERS_KEY, StorageScope.APPLICATION);
		
		this.logService.info('All API keys cleared');
	}
	
	private async _updateConfiguredProviders(providerId: string, isConfigured: boolean): Promise<void> {
		const configuredProviders = await this.getConfiguredProviders();
		const index = configuredProviders.indexOf(providerId);
		
		if (isConfigured && index === -1) {
			// Add provider to the list
			configuredProviders.push(providerId);
		} else if (!isConfigured && index !== -1) {
			// Remove provider from the list
			configuredProviders.splice(index, 1);
		}
		
		// Store the updated list
		this.storageService.store(
			APIKeyManager.CONFIGURED_PROVIDERS_KEY,
			JSON.stringify(configuredProviders),
			StorageScope.APPLICATION,
			StorageTarget.USER
		);
	}
}