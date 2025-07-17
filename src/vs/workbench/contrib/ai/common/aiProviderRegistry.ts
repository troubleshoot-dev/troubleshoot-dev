/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Emitter, Event } from 'vs/base/common/event';
import { Disposable } from 'vs/base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';

export interface IAIProviderCapabilities {
    supportsChat: boolean;
    supportsCompletion: boolean;
    supportsEditing: boolean;
    supportsExplain: boolean;
    supportsGenerate: boolean;
    supportsDebug: boolean;
    supportsLogAnalysis: boolean;
}

export interface IAIProviderModel {
    id: string;
    name: string;
    description?: string;
    contextWindow?: number;
    maxTokens?: number;
    isDefault?: boolean;
}

export interface IAIProvider {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly capabilities: IAIProviderCapabilities;
    readonly defaultModel: string;
    readonly models: IAIProviderModel[];
    readonly apiKeyPattern?: RegExp;
    readonly apiEndpoint?: string;
    readonly requiresApiKey: boolean;
    readonly isLocal: boolean;
    
    validateApiKey(apiKey: string): Promise<boolean>;
}

export const IAIProviderRegistry = createDecorator<IAIProviderRegistry>('aiProviderRegistry');

export interface IAIProviderRegistry {
    readonly _serviceBrand: undefined;
    
    readonly onDidChangeProviders: Event<void>;
    
    registerProvider(provider: IAIProvider): void;
    unregisterProvider(providerId: string): void;
    getProvider(providerId: string): IAIProvider | undefined;
    getAllProviders(): IAIProvider[];
    detectProvider(apiKey: string): Promise<string | undefined>;
}

export class AIProviderRegistry extends Disposable implements IAIProviderRegistry {
    declare readonly _serviceBrand: undefined;
    
    private readonly _onDidChangeProviders = this._register(new Emitter<void>());
    readonly onDidChangeProviders: Event<void> = this._onDidChangeProviders.event;
    
    private readonly _providers = new Map<string, IAIProvider>();
    
    constructor(
        @ILogService private readonly logService: ILogService
    ) {
        super();
        this._registerDefaultProviders();
    }
    
    private _registerDefaultProviders(): void {
        // OpenAI Provider
        this.registerProvider({
            id: 'openai',
            name: 'OpenAI',
            description: 'OpenAI GPT models for code assistance',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'gpt-3.5-turbo',
            models: [
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', isDefault: true },
                { id: 'gpt-4', name: 'GPT-4' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                { id: 'gpt-4o', name: 'GPT-4o' }
            ],
            apiKeyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.openai.com/v1/models', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });
        
        // Anthropic Provider
        this.registerProvider({
            id: 'anthropic',
            name: 'Anthropic Claude',
            description: 'Anthropic Claude models for code analysis',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'claude-3-sonnet-20240229',
            models: [
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', isDefault: true },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
            ],
            apiKeyPattern: /^sk-ant-[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.anthropic.com/v1/messages',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.anthropic.com/v1/models', {
                        method: 'GET',
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                        }
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });
        
        // Google Gemini Provider
        this.registerProvider({
            id: 'gemini',
            name: 'Google Gemini',
            description: 'Google Gemini models for AI assistance',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'gemini-pro',
            models: [
                { id: 'gemini-pro', name: 'Gemini Pro', isDefault: true },
                { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' },
                { id: 'gemini-ultra', name: 'Gemini Ultra' }
            ],
            apiKeyPattern: /^[a-zA-Z0-9_-]{39}$/,
            apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                        method: 'GET'
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });
        
        // Mistral Provider
        this.registerProvider({
            id: 'mistral',
            name: 'Mistral AI',
            description: 'Mistral AI models for code assistance',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'mistral-medium',
            models: [
                { id: 'mistral-tiny', name: 'Mistral Tiny' },
                { id: 'mistral-small', name: 'Mistral Small' },
                { id: 'mistral-medium', name: 'Mistral Medium', isDefault: true },
                { id: 'mistral-large', name: 'Mistral Large' }
            ],
            apiKeyPattern: /^[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.mistral.ai/v1/models', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });
        
        // Ollama Provider
        this.registerProvider({
            id: 'ollama',
            name: 'Ollama',
            description: 'Self-hosted Ollama models for local inference',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'codellama',
            models: [
                { id: 'codellama', name: 'CodeLlama', isDefault: true },
                { id: 'llama3', name: 'Llama 3' },
                { id: 'mistral', name: 'Mistral' },
                { id: 'phi3', name: 'Phi-3' }
            ],
            apiEndpoint: 'http://localhost:11434/api/generate',
            requiresApiKey: false,
            isLocal: true,
            async validateApiKey(_apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('http://localhost:11434/api/tags', {
                        method: 'GET'
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });
        
        // Local Model Provider
        this.registerProvider({
            id: 'local',
            name: 'Local Model',
            description: 'Local AI model for privacy',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: false,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'transformers.js',
            models: [
                { id: 'transformers.js', name: 'Transformers.js', isDefault: true },
                { id: 'onnx', name: 'ONNX Runtime' },
                { id: 'webllm', name: 'WebLLM' }
            ],
            requiresApiKey: false,
            isLocal: true,
            async validateApiKey(_apiKey: string): Promise<boolean> {
                return true;
            }
        });
    }
    
    registerProvider(provider: IAIProvider): void {
        this._providers.set(provider.id, provider);
        this._onDidChangeProviders.fire();
        this.logService.info(`Registered AI provider: ${provider.id}`);
    }
    
    unregisterProvider(providerId: string): void {
        if (this._providers.delete(providerId)) {
            this._onDidChangeProviders.fire();
            this.logService.info(`Unregistered AI provider: ${providerId}`);
        }
    }
    
    getProvider(providerId: string): IAIProvider | undefined {
        return this._providers.get(providerId);
    }
    
    getAllProviders(): IAIProvider[] {
        return Array.from(this._providers.values());
    }
    
    async detectProvider(apiKey: string): Promise<string | undefined> {
        if (!apiKey) {
            return undefined;
        }
        
        this.logService.info('Attempting to detect AI provider from API key');
        
        // First try pattern matching
        for (const provider of this._providers.values()) {
            if (provider.apiKeyPattern && provider.apiKeyPattern.test(apiKey)) {
                this.logService.info(`Provider detected by pattern: ${provider.id}`);
                
                // Validate the key to confirm
                try {
                    const isValid = await provider.validateApiKey(apiKey);
                    if (isValid) {
                        this.logService.info(`Provider confirmed by validation: ${provider.id}`);
                        return provider.id;
                    }
                } catch (error) {
                    this.logService.error(`Error validating API key for ${provider.id}`, error);
                }
            }
        }
        
        // If pattern matching fails, try validation with each provider
        for (const provider of this._providers.values()) {
            if (provider.requiresApiKey) {
                try {
                    const isValid = await provider.validateApiKey(apiKey);
                    if (isValid) {
                        this.logService.info(`Provider detected by validation: ${provider.id}`);
                        return provider.id;
                    }
                } catch (error) {
                    this.logService.error(`Error validating API key for ${provider.id}`, error);
                }
            }
        }
        
        this.logService.info('Could not detect provider from API key');
        return undefined;
    }
}