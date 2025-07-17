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
        
        // Azure OpenAI Provider
        this.registerProvider({
            id: 'azure-openai',
            name: 'Azure OpenAI',
            description: 'Microsoft Azure OpenAI Service',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'gpt-35-turbo',
            models: [
                { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', isDefault: true },
                { id: 'gpt-4', name: 'GPT-4' },
                { id: 'gpt-4-32k', name: 'GPT-4 32K' }
            ],
            apiKeyPattern: /^[a-f0-9]{32}$/,
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                // Azure OpenAI validation would require endpoint URL
                return apiKey.length === 32;
            }
        });

        // Cohere Provider
        this.registerProvider({
            id: 'cohere',
            name: 'Cohere',
            description: 'Cohere Command and Embed models',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'command',
            models: [
                { id: 'command', name: 'Command', isDefault: true },
                { id: 'command-light', name: 'Command Light' },
                { id: 'command-nightly', name: 'Command Nightly' }
            ],
            apiKeyPattern: /^[a-zA-Z0-9]{40}$/,
            apiEndpoint: 'https://api.cohere.ai/v1/generate',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.cohere.ai/v1/models', {
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

        // OpenRouter Provider
        this.registerProvider({
            id: 'openrouter',
            name: 'OpenRouter',
            description: 'Access to 100+ AI models via OpenRouter',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'openai/gpt-3.5-turbo',
            models: [
                { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', isDefault: true },
                { id: 'openai/gpt-4', name: 'GPT-4' },
                { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
                { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' }
            ],
            apiKeyPattern: /^sk-or-[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://openrouter.ai/api/v1/models', {
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

        // Together.ai Provider
        this.registerProvider({
            id: 'together',
            name: 'Together AI',
            description: 'Open source models via Together AI',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'meta-llama/Llama-2-70b-chat-hf',
            models: [
                { id: 'meta-llama/Llama-2-70b-chat-hf', name: 'Llama 2 70B Chat', isDefault: true },
                { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' },
                { id: 'codellama/CodeLlama-34b-Instruct-hf', name: 'CodeLlama 34B' }
            ],
            apiKeyPattern: /^[a-f0-9]{64}$/,
            apiEndpoint: 'https://api.together.xyz/inference',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.together.xyz/models/info', {
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

        // Groq Provider
        this.registerProvider({
            id: 'groq',
            name: 'Groq',
            description: 'Ultra-fast AI inference with Groq',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'mixtral-8x7b-32768',
            models: [
                { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', isDefault: true },
                { id: 'llama2-70b-4096', name: 'Llama 2 70B' },
                { id: 'gemma-7b-it', name: 'Gemma 7B' }
            ],
            apiKeyPattern: /^gsk_[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.groq.com/openai/v1/models', {
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

        // Hugging Face Provider
        this.registerProvider({
            id: 'huggingface',
            name: 'Hugging Face',
            description: 'Hugging Face Inference API',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'microsoft/DialoGPT-large',
            models: [
                { id: 'microsoft/DialoGPT-large', name: 'DialoGPT Large', isDefault: true },
                { id: 'bigcode/starcoder', name: 'StarCoder' },
                { id: 'codellama/CodeLlama-7b-hf', name: 'CodeLlama 7B' }
            ],
            apiKeyPattern: /^hf_[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api-inference.huggingface.co/models',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://huggingface.co/api/whoami', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });

        // DeepInfra Provider
        this.registerProvider({
            id: 'deepinfra',
            name: 'DeepInfra',
            description: 'Serverless AI inference platform',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'meta-llama/Llama-2-70b-chat-hf',
            models: [
                { id: 'meta-llama/Llama-2-70b-chat-hf', name: 'Llama 2 70B Chat', isDefault: true },
                { id: 'codellama/CodeLlama-34b-Instruct-hf', name: 'CodeLlama 34B' },
                { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' }
            ],
            apiKeyPattern: /^[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.deepinfra.com/v1/openai/models', {
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

        // Perplexity AI Provider
        this.registerProvider({
            id: 'perplexity',
            name: 'Perplexity AI',
            description: 'Search-augmented AI models',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'llama-3-sonar-small-32k-online',
            models: [
                { id: 'llama-3-sonar-small-32k-online', name: 'Llama 3 Sonar Small Online', isDefault: true },
                { id: 'llama-3-sonar-large-32k-online', name: 'Llama 3 Sonar Large Online' },
                { id: 'llama-3-8b-instruct', name: 'Llama 3 8B Instruct' }
            ],
            apiKeyPattern: /^pplx-[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.perplexity.ai/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.perplexity.ai/models', {
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

        // Replicate Provider
        this.registerProvider({
            id: 'replicate',
            name: 'Replicate',
            description: 'Run ML models via API',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'meta/llama-2-70b-chat',
            models: [
                { id: 'meta/llama-2-70b-chat', name: 'Llama 2 70B Chat', isDefault: true },
                { id: 'meta/codellama-34b-instruct', name: 'CodeLlama 34B' },
                { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B' }
            ],
            apiKeyPattern: /^r8_[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.replicate.com/v1/predictions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.replicate.com/v1/models', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Token ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return response.ok;
                } catch (error) {
                    return false;
                }
            }
        });

        // AI21 Labs Provider
        this.registerProvider({
            id: 'ai21',
            name: 'AI21 Labs',
            description: 'AI21 Jurassic models',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'j2-ultra',
            models: [
                { id: 'j2-ultra', name: 'Jurassic-2 Ultra', isDefault: true },
                { id: 'j2-mid', name: 'Jurassic-2 Mid' },
                { id: 'j2-light', name: 'Jurassic-2 Light' }
            ],
            apiKeyPattern: /^[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.ai21.com/studio/v1/j2-ultra/complete',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.ai21.com/studio/v1/models', {
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

        // Fireworks AI Provider
        this.registerProvider({
            id: 'fireworks',
            name: 'Fireworks AI',
            description: 'Fast inference for open source models',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: true
            },
            defaultModel: 'accounts/fireworks/models/llama-v2-70b-chat',
            models: [
                { id: 'accounts/fireworks/models/llama-v2-70b-chat', name: 'Llama 2 70B Chat', isDefault: true },
                { id: 'accounts/fireworks/models/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },
                { id: 'accounts/fireworks/models/yi-34b-200k-capybara', name: 'Yi 34B 200K' }
            ],
            apiKeyPattern: /^fw_[a-zA-Z0-9]{32,}$/,
            apiEndpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                try {
                    const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
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

        // GitHub Copilot Provider
        this.registerProvider({
            id: 'github-copilot',
            name: 'GitHub Copilot',
            description: 'GitHub Copilot for code assistance',
            capabilities: {
                supportsChat: true,
                supportsCompletion: true,
                supportsEditing: true,
                supportsExplain: true,
                supportsGenerate: true,
                supportsDebug: true,
                supportsLogAnalysis: false
            },
            defaultModel: 'copilot-codex',
            models: [
                { id: 'copilot-codex', name: 'Copilot Codex', isDefault: true },
                { id: 'copilot-chat', name: 'Copilot Chat' }
            ],
            apiKeyPattern: /^ghp_[a-zA-Z0-9]{36}$/,
            requiresApiKey: true,
            isLocal: false,
            async validateApiKey(apiKey: string): Promise<boolean> {
                // GitHub Copilot uses OAuth, this is a simplified check
                return apiKey.startsWith('ghp_') && apiKey.length === 40;
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