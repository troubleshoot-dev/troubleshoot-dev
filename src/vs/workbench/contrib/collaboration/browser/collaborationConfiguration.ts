/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

configurationRegistry.registerConfiguration({
	id: 'troubleshoot.collaboration',
	order: 200,
	title: localize('collaborationConfiguration', 'Team Collaboration'),
	type: 'object',
	properties: {
		'troubleshoot.collaboration.enabled': {
			type: 'boolean',
			default: true,
			description: localize('collaborationEnabled', 'Enable team collaboration features')
		},
		'troubleshoot.collaboration.userName': {
			type: 'string',
			default: '',
			description: localize('collaborationUserName', 'Your display name for collaboration sessions')
		},
		'troubleshoot.collaboration.serverUrl': {
			type: 'string',
			default: 'ws://localhost:8080/collaboration',
			description: localize('collaborationServerUrl', 'WebSocket server URL for collaboration')
		},
		'troubleshoot.collaboration.autoConnect': {
			type: 'boolean',
			default: true,
			description: localize('collaborationAutoConnect', 'Automatically connect to collaboration server when joining a session')
		},
		'troubleshoot.collaboration.showPresence': {
			type: 'boolean',
			default: true,
			description: localize('collaborationShowPresence', 'Show other users\' cursors and selections')
		},
		'troubleshoot.collaboration.showTypingIndicator': {
			type: 'boolean',
			default: true,
			description: localize('collaborationShowTypingIndicator', 'Show typing indicators for other users')
		},
		'troubleshoot.collaboration.chat.enabled': {
			type: 'boolean',
			default: true,
			description: localize('collaborationChatEnabled', 'Enable collaborative chat')
		},
		'troubleshoot.collaboration.chat.showNotifications': {
			type: 'boolean',
			default: true,
			description: localize('collaborationChatNotifications', 'Show notifications for new chat messages')
		},
		'troubleshoot.collaboration.chat.soundEnabled': {
			type: 'boolean',
			default: false,
			description: localize('collaborationChatSound', 'Play sound for new chat messages')
		},
		'troubleshoot.collaboration.comments.enabled': {
			type: 'boolean',
			default: true,
			description: localize('collaborationCommentsEnabled', 'Enable inline code comments')
		},
		'troubleshoot.collaboration.comments.showResolved': {
			type: 'boolean',
			default: false,
			description: localize('collaborationCommentsShowResolved', 'Show resolved comments')
		},
		'troubleshoot.collaboration.sync.enabled': {
			type: 'boolean',
			default: true,
			description: localize('collaborationSyncEnabled', 'Enable real-time document synchronization')
		},
		'troubleshoot.collaboration.sync.conflictResolution': {
			type: 'string',
			enum: ['automatic', 'manual', 'last-writer-wins'],
			enumDescriptions: [
				localize('conflictResolutionAutomatic', 'Automatically resolve conflicts using operational transformation'),
				localize('conflictResolutionManual', 'Prompt user to manually resolve conflicts'),
				localize('conflictResolutionLastWriter', 'Last writer wins (may cause data loss)')
			],
			default: 'automatic',
			description: localize('collaborationConflictResolution', 'How to handle editing conflicts')
		},
		'troubleshoot.collaboration.permissions.defaultRole': {
			type: 'string',
			enum: ['viewer', 'editor', 'admin'],
			enumDescriptions: [
				localize('roleViewer', 'Can view files but not edit'),
				localize('roleEditor', 'Can view and edit files'),
				localize('roleAdmin', 'Can view, edit, and manage session')
			],
			default: 'editor',
			description: localize('collaborationDefaultRole', 'Default role for new session participants')
		},
		'troubleshoot.collaboration.security.requireInvite': {
			type: 'boolean',
			default: true,
			description: localize('collaborationRequireInvite', 'Require explicit invitation to join sessions')
		},
		'troubleshoot.collaboration.security.encryptCommunication': {
			type: 'boolean',
			default: true,
			description: localize('collaborationEncryptCommunication', 'Encrypt all collaboration communication')
		},
		'troubleshoot.collaboration.performance.maxParticipants': {
			type: 'number',
			default: 10,
			minimum: 2,
			maximum: 50,
			description: localize('collaborationMaxParticipants', 'Maximum number of participants in a session')
		},
		'troubleshoot.collaboration.performance.syncThrottleMs': {
			type: 'number',
			default: 100,
			minimum: 50,
			maximum: 1000,
			description: localize('collaborationSyncThrottle', 'Throttle synchronization updates (milliseconds)')
		},
		'troubleshoot.collaboration.ui.showParticipantList': {
			type: 'boolean',
			default: true,
			description: localize('collaborationShowParticipantList', 'Show list of session participants')
		},
		'troubleshoot.collaboration.ui.showSessionStatus': {
			type: 'boolean',
			default: true,
			description: localize('collaborationShowSessionStatus', 'Show collaboration session status in status bar')
		},
		'troubleshoot.collaboration.ui.cursorAnimations': {
			type: 'boolean',
			default: true,
			description: localize('collaborationCursorAnimations', 'Enable smooth cursor animations for other users')
		}
	}
});