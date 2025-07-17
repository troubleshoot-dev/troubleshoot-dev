/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IAIService } from 'vs/workbench/contrib/ai/common/aiService';
import { IQuickInputService, IQuickPick } from 'vs/platform/quickinput/common/quickInput';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { CancellationToken } from 'vs/base/common/cancellation';

class AIEditAction extends EditorAction {
	
	constructor() {
		super({
			id: 'troubleshoot.ai.edit',
			label: localize('aiEdit', 'Edit with AI'),
			alias: 'Edit with AI',
			precondition: EditorContextKeys.writable,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.KeyK,
				weight: 100
			}
		});
	}

	async run(accessor: any, editor: ICodeEditor): Promise<void> {
		const aiService = accessor.get(IAIService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);
		const progressService = accessor.get(IProgressService);

		if (!aiService.isAvailable()) {
			notificationService.error(localize('aiNotAvailable', 'AI service is not available. Please configure an AI provider.'));
			return;
		}

		const model = editor.getModel();
		if (!model) {
			return;
		}

		const selection = editor.getSelection();
		if (!selection) {
			return;
		}

		// Get the selected text or current line
		const selectedText = selection.isEmpty() 
			? model.getLineContent(selection.startLineNumber)
			: model.getValueInRange(selection);

		// Show input box for instruction
		const quickPick = quickInputService.createQuickPick();
		quickPick.placeholder = localize('aiEditPlaceholder', 'Describe how you want to edit the code...');
		quickPick.title = localize('aiEditTitle', 'AI Edit');
		quickPick.ignoreFocusOut = true;
		
		// Add some common edit suggestions
		quickPick.items = [
			{ label: 'Add error handling', description: 'Add try-catch blocks and error handling' },
			{ label: 'Add comments', description: 'Add explanatory comments to the code' },
			{ label: 'Optimize performance', description: 'Improve code performance and efficiency' },
			{ label: 'Fix bugs', description: 'Identify and fix potential bugs' },
			{ label: 'Refactor', description: 'Improve code structure and readability' },
			{ label: 'Add type annotations', description: 'Add TypeScript type annotations' },
			{ label: 'Convert to async/await', description: 'Convert promises to async/await syntax' },
			{ label: 'Add unit tests', description: 'Generate unit tests for the code' }
		];

		quickPick.onDidAccept(async () => {
			const instruction = quickPick.value || quickPick.selectedItems[0]?.label;
			if (!instruction) {
				quickPick.dispose();
				return;
			}

			quickPick.dispose();

			// Show progress and perform AI edit
			await progressService.withProgress({
				location: ProgressLocation.Notification,
				title: localize('aiEditProgress', 'AI is editing your code...'),
				cancellable: true
			}, async (progress, token) => {
				try {
					const context = {
						filePath: model.uri.path,
						language: model.getLanguageId(),
						content: selectedText,
						cursorPosition: {
							line: selection.startLineNumber,
							column: selection.startColumn
						},
						selection: {
							startLine: selection.startLineNumber,
							startColumn: selection.startColumn,
							endLine: selection.endLineNumber,
							endColumn: selection.endColumn
						}
					};

					const edit = await aiService.edit(instruction, context);
					
					if (token.isCancellationRequested) {
						return;
					}

					// Apply the edit
					editor.executeEdits('ai-edit', [{
						range: selection,
						text: edit.editedText
					}]);

					// Show success notification
					if (edit.explanation) {
						notificationService.info(localize('aiEditSuccess', 'AI Edit: {0}', edit.explanation));
					}

				} catch (error) {
					notificationService.error(localize('aiEditError', 'AI edit failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
				}
			});
		});

		quickPick.onDidHide(() => quickPick.dispose());
		quickPick.show();
	}
}

class AIExplainAction extends EditorAction {
	
	constructor() {
		super({
			id: 'troubleshoot.ai.explain',
			label: localize('aiExplain', 'Explain Code with AI'),
			alias: 'Explain Code with AI',
			precondition: EditorContextKeys.hasNonEmptySelection.or(EditorContextKeys.editorTextFocus),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyE,
				weight: 100
			}
		});
	}

	async run(accessor: any, editor: ICodeEditor): Promise<void> {
		const aiService = accessor.get(IAIService);
		const notificationService = accessor.get(INotificationService);
		const progressService = accessor.get(IProgressService);

		if (!aiService.isAvailable()) {
			notificationService.error(localize('aiNotAvailable', 'AI service is not available. Please configure an AI provider.'));
			return;
		}

		const model = editor.getModel();
		if (!model) {
			return;
		}

		const selection = editor.getSelection();
		if (!selection) {
			return;
		}

		await progressService.withProgress({
			location: ProgressLocation.Notification,
			title: localize('aiExplainProgress', 'AI is analyzing your code...'),
			cancellable: true
		}, async (progress, token) => {
			try {
				const context = {
					filePath: model.uri.path,
					language: model.getLanguageId(),
					content: model.getValue(),
					cursorPosition: {
						line: selection.startLineNumber,
						column: selection.startColumn
					},
					selection: selection.isEmpty() ? undefined : {
						startLine: selection.startLineNumber,
						startColumn: selection.startColumn,
						endLine: selection.endLineNumber,
						endColumn: selection.endColumn
					}
				};

				const explanation = await aiService.explain(context);
				
				if (token.isCancellationRequested) {
					return;
				}

				// Show explanation in a notification or info message
				notificationService.info(explanation, { sticky: true });

			} catch (error) {
				notificationService.error(localize('aiExplainError', 'AI explanation failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
			}
		});
	}
}

class AIDebugAction extends EditorAction {
	
	constructor() {
		super({
			id: 'troubleshoot.ai.debug',
			label: localize('aiDebug', 'Debug with AI'),
			alias: 'Debug with AI',
			precondition: EditorContextKeys.editorTextFocus,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyD,
				weight: 100
			}
		});
	}

	async run(accessor: any, editor: ICodeEditor): Promise<void> {
		const aiService = accessor.get(IAIService);
		const quickInputService = accessor.get(IQuickInputService);
		const notificationService = accessor.get(INotificationService);
		const progressService = accessor.get(IProgressService);

		if (!aiService.isAvailable()) {
			notificationService.error(localize('aiNotAvailable', 'AI service is not available. Please configure an AI provider.'));
			return;
		}

		const model = editor.getModel();
		if (!model) {
			return;
		}

		// Get error description from user
		const errorDescription = await quickInputService.input({
			prompt: localize('aiDebugPrompt', 'Describe the error or issue you\'re experiencing'),
			placeholder: localize('aiDebugPlaceholder', 'e.g., "Getting null reference exception on line 15"')
		});

		if (!errorDescription) {
			return;
		}

		const selection = editor.getSelection();
		if (!selection) {
			return;
		}

		await progressService.withProgress({
			location: ProgressLocation.Notification,
			title: localize('aiDebugProgress', 'AI is analyzing the issue...'),
			cancellable: true
		}, async (progress, token) => {
			try {
				const context = {
					filePath: model.uri.path,
					language: model.getLanguageId(),
					content: model.getValue(),
					cursorPosition: {
						line: selection.startLineNumber,
						column: selection.startColumn
					}
				};

				const debugSuggestion = await aiService.debug(errorDescription, context);
				
				if (token.isCancellationRequested) {
					return;
				}

				// Show debug suggestion
				notificationService.info(debugSuggestion, { sticky: true });

			} catch (error) {
				notificationService.error(localize('aiDebugError', 'AI debugging failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
			}
		});
	}
}

// Register the actions
registerEditorAction(AIEditAction);
registerEditorAction(AIExplainAction);
registerEditorAction(AIDebugAction);