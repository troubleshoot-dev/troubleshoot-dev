/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IAIProviderRegistry } from 'vs/workbench/contrib/ai/common/aiProviderRegistry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService } from 'vs/platform/log/common/log';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';

export class AISettingsContribution extends Disposable implements IWorkbenchContribution {
    private static readonly API_KEY_STORAGE_PREFIX = 'troubleshoot.ai.apiKey.';
    
    constructor(
        @IAIProviderRegistry private readonly providerRegistry: IAIProviderRegistry,
        @IConfigurationService private readonly configurationService: IConfigurationService,
        @ILogService private readonly logService: ILogService,
        @ICommandService private readonly commandService: ICommandService,
        @INotificationService private readonly notificationService: INotificationService,
        @IQuickInputService private readonly quickInputService: IQuickInputService,
        @IStorageService private readonly storageService: IStorageService,
        @IExtensionService private readonly extensionService: IExtensionService
    ) {
        super();
        this.registerSettings();
        this.registerCommands();
        this._register(this.providerRegistry.onDidChangeProviders(() => this.registerSettings()));
    }

    private registerSettings(): void {
        const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
        const providers = this.providerRegistry.getAllProviders();

        // Register base AI settings
        configurationRegistry.registerConfiguration({
            id: 'troubleshoot.ai',
            order: 100,
            title: localize('aiConfiguration', 'AI Assistant'),
            type: 'object',
            properties: {
                'troubleshoot.ai.enabled': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiEnabled', 'Enable AI assistant features')
                },
                'troubleshoot.ai.provider': {
                    type: 'string',
                    enum: providers.map(p => p.id),
                    enumDescriptions: providers.map(p => p.description),
                    default: 'openai',
                    description: localize('aiProvider', 'AI provider to use for assistance')
                },
                'troubleshoot.ai.autoDetectProvider': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiAutoDetectProvider', 'Automatically detect which AI provider an API key belongs to')
                },
                'troubleshoot.ai.temperature': {
                    type: 'number',
                    default: 0.7,
                    minimum: 0,
                    maximum: 2,
                    description: localize('aiTemperature', 'Temperature setting for AI responses (higher values = more creative, lower values = more deterministic)')
                },
                'troubleshoot.ai.maxTokens': {
                    type: 'number',
                    default: 2000,
                    minimum: 100,
                    maximum: 32000,
                    description: localize('aiMaxTokens', 'Maximum number of tokens to generate in AI responses')
                },
                'troubleshoot.ai.storeHistory': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiStoreHistory', 'Store AI request and response history locally')
                },
                'troubleshoot.ai.historyRetentionDays': {
                    type: 'number',
                    default: 30,
                    minimum: 1,
                    maximum: 365,
                    description: localize('aiHistoryRetentionDays', 'Number of days to retain AI request history')
                }
            }
        });

        // Register provider-specific settings
        for (const provider of providers) {
            const properties: Record<string, any> = {};
            
            if (provider.requiresApiKey) {
                properties[`troubleshoot.ai.${provider.id}.apiKey`] = {
                    type: 'string',
                    default: '',
                    description: localize('aiApiKey', `API key for ${provider.name}`),
                    scope: ConfigurationScope.APPLICATION
                };
            }
            
            properties[`troubleshoot.ai.${provider.id}.model`] = {
                type: 'string',
                enum: provider.models.map(m => m.id),
                enumDescriptions: provider.models.map(m => m.name),
                default: provider.defaultModel,
                description: localize('aiModel', `AI model to use for ${provider.name}`)
            };
            
            if (provider.isLocal) {
                properties[`troubleshoot.ai.${provider.id}.path`] = {
                    type: 'string',
                    default: '',
                    description: localize('aiLocalModelPath', `Path to local model files for ${provider.name}`)
                };
            }
            
            if (provider.id === 'ollama') {
                properties['troubleshoot.ai.ollama.url'] = {
                    type: 'string',
                    default: 'http://localhost:11434',
                    description: localize('aiOllamaUrl', 'URL for Ollama server')
                };
            }
            
            configurationRegistry.registerConfiguration({
                id: `troubleshoot.ai.${provider.id}`,
                order: 101,
                title: localize('aiProviderConfiguration', `${provider.name} Configuration`),
                type: 'object',
                properties
            });
        }

        // Register feature-specific settings
        configurationRegistry.registerConfiguration({
            id: 'troubleshoot.ai.features',
            order: 102,
            title: localize('aiFeaturesConfiguration', 'AI Features'),
            type: 'object',
            properties: {
                'troubleshoot.ai.completion.enabled': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiCompletionEnabled', 'Enable AI-powered code completion')
                },
                'troubleshoot.ai.completion.delay': {
                    type: 'number',
                    default: 500,
                    minimum: 100,
                    maximum: 2000,
                    description: localize('aiCompletionDelay', 'Delay in milliseconds before triggering AI completion')
                },
                'troubleshoot.ai.completion.maxSuggestions': {
                    type: 'number',
                    default: 3,
                    minimum: 1,
                    maximum: 10,
                    description: localize('aiCompletionMaxSuggestions', 'Maximum number of AI completion suggestions to show')
                },
                'troubleshoot.ai.chat.enabled': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiChatEnabled', 'Enable AI chat panel')
                },
                'troubleshoot.ai.chat.contextLines': {
                    type: 'number',
                    default: 50,
                    minimum: 10,
                    maximum: 200,
                    description: localize('aiChatContextLines', 'Number of lines of code context to include in chat')
                },
                'troubleshoot.ai.edit.enabled': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiEditEnabled', 'Enable AI-powered code editing (Ctrl+K)')
                },
                'troubleshoot.ai.debug.enabled': {
                    type: 'boolean',
                    default: true,
                    description: localize('aiDebugEnabled', 'Enable AI-powered debugging assistance')
                }
            }
        });

        // Register privacy settings
        configurationRegistry.registerConfiguration({
            id: 'troubleshoot.ai.privacy',
            order: 103,
            title: localize('aiPrivacyConfiguration', 'AI Privacy'),
            type: 'object',
            properties: {
                'troubleshoot.ai.privacy.mode': {
                    type: 'string',
                    enum: ['cloud', 'local', 'hybrid'],
                    enumDescriptions: [
                        localize('privacyCloud', 'Send code to cloud AI services'),
                        localize('privacyLocal', 'Use only local AI models'),
                        localize('privacyHybrid', 'Use local for sensitive code, cloud for general assistance')
                    ],
                    default: 'cloud',
                    description: localize('aiPrivacyMode', 'Privacy mode for AI processing')
                },
                'troubleshoot.ai.privacy.excludePatterns': {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    default: ['*.env', '*.key', '*.pem', '*secret*', '*password*'],
                    description: localize('aiPrivacyExcludePatterns', 'File patterns to exclude from AI processing for privacy')
                }
            }
        });

        this.logService.info('AI settings registered');
    }

    private registerCommands(): void {
        this._register(this.commandService.registerCommand('troubleshoot.ai.configureProvider', async () => {
            const providers = this.providerRegistry.getAllProviders();
            const items: IQuickPickItem[] = providers.map(provider => ({
                label: provider.name,
                description: provider.description,
                detail: provider.requiresApiKey ? 'Requires API key' : 'No API key required'
            }));
            
            const selected = await this.quickInputService.pick(items, {
                placeHolder: 'Select AI provider to configure'
            });
            
            if (selected) {
                const provider = providers.find(p => p.name === selected.label);
                if (provider) {
                    await this.configureProvider(provider.id);
                }
            }
        }));
        
        this._register(this.commandService.registerCommand('troubleshoot.ai.setApiKey', async () => {
            const providers = this.providerRegistry.getAllProviders().filter(p => p.requiresApiKey);
            const items: IQuickPickItem[] = providers.map(provider => ({
                label: provider.name,
                description: provider.description
            }));
            
            const selected = await this.quickInputService.pick(items, {
                placeHolder: 'Select AI provider to set API key'
            });
            
            if (selected) {
                const provider = providers.find(p => p.name === selected.label);
                if (provider) {
                    await this.setApiKey(provider.id);
                }
            }
        }));
        
        this._register(this.commandService.registerCommand('troubleshoot.ai.testConnection', async () => {
            const providers = this.providerRegistry.getAllProviders();
            const items: IQuickPickItem[] = providers.map(provider => ({
                label: provider.name,
                description: provider.description
            }));
            
            const selected = await this.quickInputService.pick(items, {
                placeHolder: 'Select AI provider to test connection'
            });
            
            if (selected) {
                const provider = providers.find(p => p.name === selected.label);
                if (provider) {
                    await this.testConnection(provider.id);
                }
            }
        }));
        
        this._register(this.commandService.registerCommand('troubleshoot.ai.detectApiKeyProvider', async () => {
            const input = await this.quickInputService.input({
                placeHolder: 'Enter API key to detect provider',
                password: true
            });
            
            if (input) {
                const providerId = await this.providerRegistry.detectProvider(input);
                if (providerId) {
                    const provider = this.providerRegistry.getProvider(providerId);
                    this.notificationService.info(`API key detected as ${provider?.name}`);
                    
                    const setKey = 'Set API Key';
                    const result = await this.notificationService.prompt(
                        Severity.Info,
                        `Would you like to set this API key for ${provider?.name}?`,
                        [{ label: setKey }]
                    );
                    
                    if (result.choice?.label === setKey) {
                        await this.storeApiKey(providerId, input);
                        await this.configurationService.updateValue('troubleshoot.ai.provider', providerId);
                    }
                } else {
                    this.notificationService.error('Could not detect provider for this API key');
                }
            }
        }));
    }
    
    private async configureProvider(providerId: string): Promise<void> {
        const provider = this.providerRegistry.getProvider(providerId);
        if (!provider) {
            return;
        }
        
        if (provider.requiresApiKey) {
            await this.setApiKey(providerId);
        }
        
        // Select model
        const modelItems: IQuickPickItem[] = provider.models.map(model => ({
            label: model.name,
            description: model.id,
            picked: model.isDefault
        }));
        
        const selectedModel = await this.quickInputService.pick(modelItems, {
            placeHolder: `Select model for ${provider.name}`
        });
        
        if (selectedModel) {
            await this.configurationService.updateValue(`troubleshoot.ai.${providerId}.model`, selectedModel.description);
        }
        
        // Set as active provider
        const setAsActive = await this.quickInputService.pick([
            { label: 'Yes', picked: true },
            { label: 'No' }
        ], {
            placeHolder: `Set ${provider.name} as the active AI provider?`
        });
        
        if (setAsActive?.label === 'Yes') {
            await this.configurationService.updateValue('troubleshoot.ai.provider', providerId);
            this.notificationService.info(`${provider.name} is now the active AI provider`);
        }
    }
    
    private async setApiKey(providerId: string): Promise<void> {
        const provider = this.providerRegistry.getProvider(providerId);
        if (!provider || !provider.requiresApiKey) {
            return;
        }
        
        const input = await this.quickInputService.input({
            placeHolder: `Enter API key for ${provider.name}`,
            password: true
        });
        
        if (input) {
            await this.storeApiKey(providerId, input);
            
            const testConnection = 'Test Connection';
            const result = await this.notificationService.prompt(
                Severity.Info,
                `API key for ${provider.name} has been saved. Would you like to test the connection?`,
                [{ label: testConnection }]
            );
            
            if (result.choice?.label === testConnection) {
                await this.testConnection(providerId);
            }
        }
    }
    
    private async storeApiKey(providerId: string, apiKey: string): Promise<void> {
        // Store API key in secure storage
        await this.storageService.store(
            `${AISettingsContribution.API_KEY_STORAGE_PREFIX}${providerId}`,
            apiKey,
            StorageScope.APPLICATION,
            StorageTarget.USER
        );
        
        this.logService.info(`API key stored for provider: ${providerId}`);
    }
    
    private async getApiKey(providerId: string): Promise<string | undefined> {
        return this.storageService.get(
            `${AISettingsContribution.API_KEY_STORAGE_PREFIX}${providerId}`,
            StorageScope.APPLICATION
        );
    }
    
    private async testConnection(providerId: string): Promise<void> {
        const provider = this.providerRegistry.getProvider(providerId);
        if (!provider) {
            return;
        }
        
        this.notificationService.info(`Testing connection to ${provider.name}...`);
        
        try {
            if (provider.requiresApiKey) {
                const apiKey = await this.getApiKey(providerId);
                if (!apiKey) {
                    this.notificationService.error(`No API key found for ${provider.name}`);
                    return;
                }
                
                const isValid = await provider.validateApiKey(apiKey);
                if (isValid) {
                    this.notificationService.info(`Successfully connected to ${provider.name}`);
                } else {
                    this.notificationService.error(`Failed to connect to ${provider.name}. Invalid API key.`);
                }
            } else if (provider.isLocal) {
                // For local providers like Ollama, test the connection to the local server
                const isValid = await provider.validateApiKey('');
                if (isValid) {
                    this.notificationService.info(`Successfully connected to ${provider.name}`);
                } else {
                    this.notificationService.error(`Failed to connect to ${provider.name}. Is the local server running?`);
                }
            } else {
                this.notificationService.info(`${provider.name} does not require connection testing`);
            }
        } catch (error) {
            this.logService.error(`Error testing connection to ${provider.name}`, error);
            this.notificationService.error(`Error testing connection to ${provider.name}: ${error.message}`);
        }
    }
}