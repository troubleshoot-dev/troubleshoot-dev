/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { Extensions as ViewExtensions, IViewsRegistry, IViewContainersRegistry, ViewContainerLocation } from 'vs/workbench/common/views';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ViewPaneContainer } from 'vs/workbench/browser/parts/views/viewPaneContainer';
import { ICollaborationService } from 'vs/workbench/contrib/collaboration/common/collaborationService';
import { CollaborationService } from 'vs/workbench/contrib/collaboration/browser/collaborationService';
import { CollaborationView } from 'vs/workbench/contrib/collaboration/browser/collaborationView';
import { localize } from 'vs/nls';
import { Codicon } from 'vs/base/common/codicons';
import { registerIcon } from 'vs/platform/theme/common/iconRegistry';
import './collaborationConfiguration';

// Register icons
const collaborationIcon = registerIcon('collaboration', Codicon.liveshare, localize('collaborationIcon', 'Icon for collaboration features'));

// Register services
registerSingleton(ICollaborationService, CollaborationService, true);

// Register view container
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainers).registerViewContainer({
	id: 'workbench.view.collaboration',
	title: localize('collaboration', 'Collaboration'),
	icon: collaborationIcon,
	order: 4,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['workbench.view.collaboration', { mergeViewWithContainerWhenSingleView: true }]),
	storageId: 'workbench.view.collaboration.state',
	hideIfEmpty: true,
}, ViewContainerLocation.Sidebar);

// Register views
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);

viewsRegistry.registerViews([{
	id: 'workbench.view.collaboration.session',
	name: localize('collaborationSession', 'Session'),
	ctorDescriptor: new SyncDescriptor(CollaborationView),
	canToggleVisibility: true,
	canMoveView: true,
	containerIcon: collaborationIcon,
	order: 1
}], VIEW_CONTAINER);

// Register workbench contributions
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);

// Register commands
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ICommandService } from 'vs/platform/commands/common/commands';

CommandsRegistry.registerCommand('troubleshoot.collaboration.createSession', async (accessor: ServicesAccessor) => {
	const collaborationService = accessor.get(ICollaborationService);
	const commandService = accessor.get(ICommandService);
	return commandService.executeCommand('workbench.view.collaboration.focus');
});

CommandsRegistry.registerCommand('troubleshoot.collaboration.joinSession', async (accessor: ServicesAccessor) => {
	const collaborationService = accessor.get(ICollaborationService);
	const commandService = accessor.get(ICommandService);
	return commandService.executeCommand('workbench.view.collaboration.focus');
});

CommandsRegistry.registerCommand('troubleshoot.collaboration.leaveSession', async (accessor: ServicesAccessor) => {
	const collaborationService = accessor.get(ICollaborationService);
	await collaborationService.leaveSession();
});

CommandsRegistry.registerCommand('troubleshoot.collaboration.toggleChat', async (accessor: ServicesAccessor) => {
	// This would toggle the chat panel - implementation depends on chat UI
	const commandService = accessor.get(ICommandService);
	return commandService.executeCommand('workbench.action.togglePanel');
});

// Register menu items
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { Categories } from 'vs/platform/action/common/actionCommonCategories';

// Create Session Action
registerAction2(class CreateCollaborationSessionAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.createCollaborationSession',
			title: localize('createCollaborationSession', "Create Collaboration Session"),
			category: Categories.View,
			f1: true,
			icon: collaborationIcon
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand('troubleshoot.collaboration.createSession');
	}
});

// Join Session Action
registerAction2(class JoinCollaborationSessionAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.joinCollaborationSession',
			title: localize('joinCollaborationSession', "Join Collaboration Session"),
			category: Categories.View,
			f1: true,
			icon: collaborationIcon
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand('troubleshoot.collaboration.joinSession');
	}
});

// Leave Session Action
registerAction2(class LeaveCollaborationSessionAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.leaveCollaborationSession',
			title: localize('leaveCollaborationSession', "Leave Collaboration Session"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand('troubleshoot.collaboration.leaveSession');
	}
});

// Toggle Chat Action
registerAction2(class ToggleCollaborationChatAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.toggleCollaborationChat',
			title: localize('toggleCollaborationChat', "Toggle Collaboration Chat"),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand('troubleshoot.collaboration.toggleChat');
	}
});

// Add menu items to editor context menu
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	group: 'collaboration',
	command: {
		id: 'troubleshoot.collaboration.addComment',
		title: localize('addCollaborationComment', "Add Comment")
	},
	order: 1
});

// Add menu items to view title
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
	group: 'navigation',
	command: {
		id: 'workbench.action.createCollaborationSession',
		title: localize('createSession', "Create Session"),
		icon: collaborationIcon
	},
	when: 'view == workbench.view.collaboration.session',
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
	group: 'navigation',
	command: {
		id: 'workbench.action.joinCollaborationSession',
		title: localize('joinSession', "Join Session"),
		icon: { id: 'codicon/add' }
	},
	when: 'view == workbench.view.collaboration.session',
	order: 2
});