/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IAIService } from 'vs/workbench/contrib/ai/common/aiService';
import { AIService } from 'vs/workbench/contrib/ai/browser/aiService';
import { AIProviderRegistry, IAIProviderRegistry } from 'vs/workbench/contrib/ai/common/aiProviderRegistry';
import { APIKeyManager, IAPIKeyManager } from './apiKeyManager';
import { APIKeyTester, IAPIKeyTester } from './apiKeyTester';
import { AISettingsContribution } from './aiSettings';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { localize } from 'vs/nls';

// Register services
registerSingleton(IAIService, AIService, true);
registerSingleton(IAIProviderRegistry, AIProviderRegistry, true);
registerSingleton(IAPIKeyManager, APIKeyManager, true);
registerSingleton(IAPIKeyTester, APIKeyTester, true);

// Register workbench contributions
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);

workbenchRegistry.registerWorkbenchContribution(
    AISettingsContribution,
    LifecyclePhase.Restored
);

// Register commands
CommandsRegistry.registerCommand('troubleshoot.ai.configureProvider', async (accessor: ServicesAccessor) => {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('troubleshoot.ai.configureProvider');
});

CommandsRegistry.registerCommand('troubleshoot.ai.setApiKey', async (accessor: ServicesAccessor) => {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('troubleshoot.ai.setApiKey');
});

CommandsRegistry.registerCommand('troubleshoot.ai.testConnection', async (accessor: ServicesAccessor) => {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('troubleshoot.ai.testConnection');
});

CommandsRegistry.registerCommand('troubleshoot.ai.detectApiKeyProvider', async (accessor: ServicesAccessor) => {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('troubleshoot.ai.detectApiKeyProvider');
});

CommandsRegistry.registerCommand('troubleshoot.ai.testAllKeys', async (accessor: ServicesAccessor) => {
    const apiKeyTester = accessor.get(IAPIKeyTester);
    return apiKeyTester.testAllConfiguredKeys();
});

CommandsRegistry.registerCommand('troubleshoot.ai.testSpecificKey', async (accessor: ServicesAccessor, providerId: string, apiKey: string) => {
    const apiKeyTester = accessor.get(IAPIKeyTester);
    return apiKeyTester.testApiKey(providerId, apiKey);
});

CommandsRegistry.registerCommand('troubleshoot.ai.getProviderInfo', async (accessor: ServicesAccessor, providerId: string) => {
    const apiKeyTester = accessor.get(IAPIKeyTester);
    return apiKeyTester.getProviderTestInfo(providerId);
});