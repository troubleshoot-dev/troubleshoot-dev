/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/aiChat';
import { localize } from 'vs/nls';
import { Disposable, DisposableStore } from 'vs/base/common/lifecycle';
import { Event, Emitter } from 'vs/base/common/event';
import { ViewPane } from 'vs/workbench/browser/parts/views/viewPane';
import { IViewletViewOptions } from 'vs/workbench/browser/parts/views/viewsViewlet';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IAIService, IAIMessage } from 'vs/workbench/contrib/ai/common/aiService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { append, $, addDisposableListener, EventType } from 'vs/base/browser/dom';
import { Button } from 'vs/base/browser/ui/button/button';
import { defaultButtonStyles } from 'vs/platform/theme/browser/defaultStyles';

export class AIChatView extends ViewPane {
	static readonly ID = 'workbench.panel.ai.chat';
	static readonly TITLE = localize('aiChat', "AI Chat");

	private _chatContainer!: HTMLElement;
	private _messagesContainer!: HTMLElement;
	private _inputContainer!: HTMLElement;
	private _inputField!: HTMLTextAreaElement;
	private _sendButton!: Button;
	private _messages: IAIMessage[] = [];
	private _disposables = new DisposableStore();

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IAIService private readonly aiService: IAIService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this._chatContainer = append(container, $('.ai-chat-container'));
		
		// Messages area
		this._messagesContainer = append(this._chatContainer, $('.ai-chat-messages'));
		
		// Input area
		this._inputContainer = append(this._chatContainer, $('.ai-chat-input'));
		
		this._inputField = append(this._inputContainer, $('textarea.ai-chat-input-field')) as HTMLTextAreaElement;
		this._inputField.placeholder = localize('aiChatPlaceholder', 'Ask AI about your code...');
		this._inputField.rows = 3;
		
		this._sendButton = new Button(this._inputContainer, defaultButtonStyles);
		this._sendButton.label = localize('send', 'Send');
		
		this._setupEventListeners();
		this._addWelcomeMessage();
	}

	private _setupEventListeners(): void {
		this._disposables.add(this._sendButton.onDidClick(() => this._sendMessage()));
		
		this._disposables.add(addDisposableListener(this._inputField, EventType.KEY_DOWN, (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				this._sendMessage();
			}
		}));

		this._disposables.add(this.aiService.onDidChangeProviders(() => {
			this._updateProviderStatus();
		}));
	}

	private _addWelcomeMessage(): void {
		const welcomeMessage: IAIMessage = {
			role: 'assistant',
			content: localize('aiWelcome', 'Hello! I\'m your AI assistant. I can help you with code questions, debugging, explanations, and more. How can I assist you today?'),
			timestamp: Date.now()
		};
		
		this._messages.push(welcomeMessage);
		this._renderMessage(welcomeMessage);
	}

	private async _sendMessage(): Promise<void> {
		const content = this._inputField.value.trim();
		if (!content) {
			return;
		}

		// Clear input
		this._inputField.value = '';
		
		// Add user message
		const userMessage: IAIMessage = {
			role: 'user',
			content,
			timestamp: Date.now()
		};
		
		this._messages.push(userMessage);
		this._renderMessage(userMessage);

		// Show typing indicator
		const typingElement = this._showTypingIndicator();

		try {
			// Get current editor context
			const context = this._getCurrentEditorContext();
			
			// Get AI response
			const response = await this.aiService.chat(this._messages, context);
			
			// Remove typing indicator
			typingElement.remove();
			
			// Add AI response
			const aiMessage: IAIMessage = {
				role: 'assistant',
				content: response,
				timestamp: Date.now()
			};
			
			this._messages.push(aiMessage);
			this._renderMessage(aiMessage);
			
		} catch (error) {
			typingElement.remove();
			this._renderError(error instanceof Error ? error.message : 'Unknown error occurred');
		}

		// Scroll to bottom
		this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
	}

	private _renderMessage(message: IAIMessage): void {
		const messageElement = append(this._messagesContainer, $('.ai-chat-message', { 'data-role': message.role }));
		
		const roleElement = append(messageElement, $('.ai-chat-message-role'));
		roleElement.textContent = message.role === 'user' ? 'You' : 'AI';
		
		const contentElement = append(messageElement, $('.ai-chat-message-content'));
		contentElement.textContent = message.content;
		
		if (message.timestamp) {
			const timeElement = append(messageElement, $('.ai-chat-message-time'));
			timeElement.textContent = new Date(message.timestamp).toLocaleTimeString();
		}
	}

	private _showTypingIndicator(): HTMLElement {
		const typingElement = append(this._messagesContainer, $('.ai-chat-typing'));
		typingElement.textContent = 'AI is typing...';
		return typingElement;
	}

	private _renderError(error: string): void {
		const errorElement = append(this._messagesContainer, $('.ai-chat-error'));
		errorElement.textContent = `Error: ${error}`;
	}

	private _getCurrentEditorContext() {
		const activeEditor = this.editorService.activeTextEditorControl;
		if (!activeEditor) {
			return undefined;
		}

		const model = activeEditor.getModel();
		if (!model) {
			return undefined;
		}

		const selection = activeEditor.getSelection();
		const position = activeEditor.getPosition();

		return {
			filePath: model.uri.path,
			language: model.getLanguageId(),
			content: model.getValue(),
			cursorPosition: {
				line: position?.lineNumber || 1,
				column: position?.column || 1
			},
			selection: selection ? {
				startLine: selection.startLineNumber,
				startColumn: selection.startColumn,
				endLine: selection.endLineNumber,
				endColumn: selection.endColumn
			} : undefined
		};
	}

	private _updateProviderStatus(): void {
		const provider = this.aiService.getActiveProvider();
		if (provider) {
			this._inputField.placeholder = localize('aiChatPlaceholderWithProvider', 'Ask {0} about your code...', provider.name);
		} else {
			this._inputField.placeholder = localize('aiChatPlaceholderNoProvider', 'No AI provider configured');
			this._inputField.disabled = true;
		}
	}

	override dispose(): void {
		this._disposables.dispose();
		super.dispose();
	}
}