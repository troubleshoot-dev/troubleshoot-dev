/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IViewContainersRegistry, Extensions as ViewContainerExtensions, ViewContainerLocation } from 'vs/workbench/common/views';
import { IViewsRegistry, Extensions as ViewExtensions } from 'vs/workbench/common/views';
import { IAIService } from 'vs/workbench/contrib/ai/common/aiService';
import { AIService } from 'vs/workbench/contrib/ai/browser/aiService';
import { AIChatView } from 'vs/workbench/contrib/ai/browser/aiChatView';
import { AICompletionProvider } from 'vs/workbench/contrib/ai/browser/aiCompletionProvider';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { ILanguageService } from 'vs/editor/common/languages/language';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Disposable } from 'vs/base/common/lifecycle';
import { CompletionItemProvider } from 'vs/editor/common/languages';

// Import configuration
import './aiConfiguration';

// Import commands and features
import './aiEditCommand';
import './aiTerminalAssistant';
import './aiLogAnalyzer';

// Register AI Service
registerSingleton(IAIService, AIService, true);

// Register AI Chat View Container
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
	id: 'troubleshoot-ai',
	title: localize('aiViewContainer', 'AI Assistant'),
	icon: 'codicon-robot',
	order: 10,
	ctorDescriptor: new SyncDescriptor(
		class extends Disposable {
			constructor() {
				super();
			}
		}
	)
}, ViewContainerLocation.Sidebar);

// Register AI Chat View
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: AIChatView.ID,
	name: AIChatView.TITLE,
	containerIcon: 'codicon-comment-discussion',
	canToggleVisibility: true,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(AIChatView),
	order: 1
}], VIEW_CONTAINER);

// AI Features Contribution
class AIFeaturesContribution extends Disposable {
	
	constructor(
		@ILanguageService private readonly languageService: ILanguageService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		super();
		this._registerCompletionProviders();
	}

	private _registerCompletionProviders(): void {
		// Register AI completion provider for all languages
		const languages = this.languageService.getRegisteredLanguageIds();
		
		for (const language of languages) {
			// Skip certain languages where AI completion might not be useful
			if (['plaintext', 'log', 'binary'].includes(language)) {
				continue;
			}

			const provider = this.instantiationService.createInstance(AICompletionProvider);
			this._register(this.languageService.registerCompletionItemProvider(language, provider));
		}
	}
}

// Register AI Features
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	AIFeaturesContribution,
	LifecyclePhase.Restored
);

// Register Commands
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { INotificationService } from 'vs/platform/notification/common/notification';

CommandsRegistry.registerCommand('troubleshoot.ai.openChat', (accessor) => {
	const viewsService = accessor.get(import('vs/workbench/common/views').then(m => m.IViewsService));
	return viewsService.openView(AIChatView.ID, true);
});

CommandsRegistry.registerCommand('troubleshoot.ai.toggleProvider', async (accessor) => {
	const aiService = accessor.get(IAIService);
	const quickInputService = accessor.get(import('vs/platform/quickinput/common/quickInput').then(m => m.IQuickInputService));
	
	const providers = aiService.getProviders();
	const activeProvider = aiService.getActiveProvider();
	
	const items = providers.map(provider => ({
		id: provider.id,
		label: provider.name,
		description: provider.description,
		picked: provider.id === activeProvider?.id
	}));

	const selected = await quickInputService.pick(items, {
		placeHolder: localize('selectAIProvider', 'Select AI Provider')
	});

	if (selected) {
		await aiService.setActiveProvider(selected.id);
	}
});

CommandsRegistry.registerCommand('troubleshoot.ai.logCompletion', (accessor, completion) => {
	const logService = accessor.get(import('vs/platform/log/common/log').then(m => m.ILogService));
	logService.info('AI Completion used', completion);
});

// Register Menu Items
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';

MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
	command: {
		id: 'troubleshoot.ai.toggleProvider',
		title: localize('switchProvider', 'Switch AI Provider'),
		icon: 'codicon-settings-gear'
	},
	when: 'view == workbench.panel.ai.chat',
	group: 'navigation'
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.edit',
		title: localize('editWithAI', 'Edit with AI')
	},
	when: 'editorTextFocus',
	group: '1_modification'
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.explain',
		title: localize('explainWithAI', 'Explain with AI')
	},
	when: 'editorHasSelection',
	group: '1_modification'
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.debug',
		title: localize('debugWithAI', 'Debug with AI')
	},
	when: 'editorTextFocus',
	group: '1_modification'
});