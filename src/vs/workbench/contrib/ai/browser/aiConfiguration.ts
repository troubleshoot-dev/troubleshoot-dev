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
			enum: ['openai', 'anthropic', 'local'],
			enumDescriptions: [
				localize('providerOpenAI', 'OpenAI GPT models'),
				localize('providerAnthropic', 'Anthropic Claude models'),
				localize('providerLocal', 'Local AI model')
			],
			default: 'openai',
			description: localize('aiProvider', 'AI provider to use for assistance')
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
		}
	}
});