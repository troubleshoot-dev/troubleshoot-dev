/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { Categories } from 'vs/platform/action/common/actionCommonCategories';

// Register AI menu items
export function registerAIMenuItems(): void {
    // AI Settings submenu
    MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
        group: '2_configuration',
        command: {
            id: 'workbench.action.openAISettings',
            title: localize('aiSettings', "AI Settings")
        },
        order: 3
    });

    // AI Provider configuration
    registerAction2(class ConfigureAIProviderAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.configureAIProvider',
                title: localize('configureAIProvider', "Configure AI Provider"),
                category: Categories.View,
                f1: true
            });
        }

        async run(accessor: ServicesAccessor): Promise<void> {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('troubleshoot.ai.configureProvider');
        }
    });

    // Set API Key
    registerAction2(class SetAIApiKeyAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.setAIApiKey',
                title: localize('setAIApiKey', "Set AI API Key"),
                category: Categories.View,
                f1: true
            });
        }

        async run(accessor: ServicesAccessor): Promise<void> {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('troubleshoot.ai.setApiKey');
        }
    });

    // Test AI Connection
    registerAction2(class TestAIConnectionAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.testAIConnection',
                title: localize('testAIConnection', "Test AI Connection"),
                category: Categories.View,
                f1: true
            });
        }

        async run(accessor: ServicesAccessor): Promise<void> {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('troubleshoot.ai.testConnection');
        }
    });

    // Detect API Key Provider
    registerAction2(class DetectAIApiKeyProviderAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.detectAIApiKeyProvider',
                title: localize('detectAIApiKeyProvider', "Detect AI API Key Provider"),
                category: Categories.View,
                f1: true
            });
        }

        async run(accessor: ServicesAccessor): Promise<void> {
            const commandService = accessor.get(ICommandService);
            await commandService.executeCommand('troubleshoot.ai.detectApiKeyProvider');
        }
    });

    // Add AI menu items to the editor context menu
    MenuRegistry.appendMenuItem(MenuId.EditorContext, {
        group: 'navigation',
        command: {
            id: 'troubleshoot.ai.explainCode',
            title: localize('explainCode', "Explain Code with AI")
        },
        when: ContextKeyExpr.true(),
        order: 1
    });

    MenuRegistry.appendMenuItem(MenuId.EditorContext, {
        group: 'navigation',
        command: {
            id: 'troubleshoot.ai.editCode',
            title: localize('editCode', "Edit Code with AI")
        },
        when: ContextKeyExpr.true(),
        order: 2
    });

    MenuRegistry.appendMenuItem(MenuId.EditorContext, {
        group: 'navigation',
        command: {
            id: 'troubleshoot.ai.generateTests',
            title: localize('generateTests', "Generate Tests with AI")
        },
        when: ContextKeyExpr.true(),
        order: 3
    });

    // Add AI menu items to the editor title menu
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        group: 'navigation',
        command: {
            id: 'troubleshoot.ai.analyzeCode',
            title: localize('analyzeCode', "Analyze Code with AI"),
            icon: { id: 'codicon/lightbulb' }
        },
        when: ContextKeyExpr.true(),
        order: 1
    });

    // Add AI menu items to the view title menu
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        group: 'navigation',
        command: {
            id: 'troubleshoot.ai.openChat',
            title: localize('openChat', "Open AI Chat"),
            icon: { id: 'codicon/comment-discussion' }
        },
        when: ContextKeyExpr.equals('view', 'workbench.view.explorer'),
        order: 1
    });
}