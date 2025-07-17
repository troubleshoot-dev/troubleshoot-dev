/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

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
			enum: ['openai', 'anthropic', 'gemini', 'mistral', 'ollama', 'local'],
			enumDescriptions: [
				localize('providerOpenAI', 'OpenAI GPT models'),
				localize('providerAnthropic', 'Anthropic Claude models'),
				localize('providerGemini', 'Google Gemini models'),
				localize('providerMistral', 'Mistral AI models'),
				localize('providerOllama', 'Ollama local models'),
				localize('providerLocal', 'Local AI model')
			],
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
		'troubleshoot.ai.apiKey': {
			type: 'string',
			default: '',
			description: localize('aiApiKey', 'API key for the selected AI provider'),
			scope: 1 // User scope only for security
		},
		'troubleshoot.ai.model': {
			type: 'string',
			default: 'gpt-3.5-turbo',
			description: localize('aiModel', 'AI model to use (e.g., gpt-3.5-turbo, gpt-4, claude-3-sonnet)')
		},
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
		},
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
		},
		'troubleshoot.ai.troubleshooting.enabled': {
			type: 'boolean',
			default: true,
			description: localize('aiTroubleshootingEnabled', 'Enable AI-powered troubleshooting features')
		},
		'troubleshoot.ai.troubleshooting.logAnalysis': {
			type: 'boolean',
			default: true,
			description: localize('aiLogAnalysis', 'Enable AI log analysis and insights')
		},
		'troubleshoot.ai.troubleshooting.errorDetection': {
			type: 'boolean',
			default: true,
			description: localize('aiErrorDetection', 'Enable AI-powered error detection and suggestions')
		},
		'troubleshoot.ai.troubleshooting.performanceAnalysis': {
			type: 'boolean',
			default: true,
			description: localize('aiPerformanceAnalysis', 'Enable AI performance analysis and optimization suggestions')
		},
		// Provider-specific API keys (stored securely)
		'troubleshoot.ai.openai.apiKey': {
			type: 'string',
			default: '',
			description: localize('aiOpenAIApiKey', 'OpenAI API key'),
			scope: 1 // User scope only for security
		},
		'troubleshoot.ai.anthropic.apiKey': {
			type: 'string',
			default: '',
			description: localize('aiAnthropicApiKey', 'Anthropic API key'),
			scope: 1
		},
		'troubleshoot.ai.gemini.apiKey': {
			type: 'string',
			default: '',
			description: localize('aiGeminiApiKey', 'Google Gemini API key'),
			scope: 1
		},
		'troubleshoot.ai.mistral.apiKey': {
			type: 'string',
			default: '',
			description: localize('aiMistralApiKey', 'Mistral AI API key'),
			scope: 1
		},
		// Provider-specific models
		'troubleshoot.ai.openai.model': {
			type: 'string',
			enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
			default: 'gpt-3.5-turbo',
			description: localize('aiOpenAIModel', 'OpenAI model to use')
		},
		'troubleshoot.ai.anthropic.model': {
			type: 'string',
			enum: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
			default: 'claude-3-sonnet-20240229',
			description: localize('aiAnthropicModel', 'Anthropic Claude model to use')
		},
		'troubleshoot.ai.gemini.model': {
			type: 'string',
			enum: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
			default: 'gemini-pro',
			description: localize('aiGeminiModel', 'Google Gemini model to use')
		},
		'troubleshoot.ai.mistral.model': {
			type: 'string',
			enum: ['mistral-tiny', 'mistral-small', 'mistral-medium', 'mistral-large'],
			default: 'mistral-medium',
			description: localize('aiMistralModel', 'Mistral AI model to use')
		},
		'troubleshoot.ai.ollama.model': {
			type: 'string',
			enum: ['codellama', 'llama3', 'mistral', 'phi3'],
			default: 'codellama',
			description: localize('aiOllamaModel', 'Ollama model to use')
		},
		'troubleshoot.ai.ollama.url': {
			type: 'string',
			default: 'http://localhost:11434',
			description: localize('aiOllamaUrl', 'Ollama server URL')
		},
		// Local model settings
		'troubleshoot.ai.local.modelPath': {
			type: 'string',
			default: '',
			description: localize('aiLocalModelPath', 'Path to local AI model files')
		},
		'troubleshoot.ai.local.model': {
			type: 'string',
			enum: ['transformers.js', 'onnx', 'webllm'],
			default: 'transformers.js',
			description: localize('aiLocalModel', 'Local AI model type to use')
		},
		// Advanced settings
		'troubleshoot.ai.requestTimeout': {
			type: 'number',
			default: 30000,
			minimum: 5000,
			maximum: 120000,
			description: localize('aiRequestTimeout', 'Request timeout in milliseconds')
		},
		'troubleshoot.ai.retryAttempts': {
			type: 'number',
			default: 3,
			minimum: 1,
			maximum: 10,
			description: localize('aiRetryAttempts', 'Number of retry attempts for failed requests')
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