/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import { IViewletViewOptions } from 'vs/workbench/browser/parts/views/viewsViewlet';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ViewPane } from 'vs/workbench/browser/parts/views/viewPane';
import { ICollaborationService, ICollaborationSession, ICollaborationUser } from 'vs/workbench/contrib/collaboration/common/collaborationService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { URI } from 'vs/base/common/uri';

export class CollaborationView extends ViewPane {
	private _currentSession: ICollaborationSession | undefined;
	private _participants: ICollaborationUser[] = [];
	private _container: HTMLElement | undefined;
	private _sessionInfoElement: HTMLElement | undefined;
	private _participantsElement: HTMLElement | undefined;
	private _actionsElement: HTMLElement | undefined;

	constructor(
		options: IViewletViewOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ICollaborationService private readonly collaborationService: ICollaborationService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(this.collaborationService.onDidJoinSession(session => {
			this._currentSession = session;
			this._participants = Array.from(session.participants.values());
			this._updateView();
		}));

		this._register(this.collaborationService.onDidLeaveSession(() => {
			this._currentSession = undefined;
			this._participants = [];
			this._updateView();
		}));

		this._register(this.collaborationService.onDidUserJoin(user => {
			this._participants.push(user);
			this._updateView();
		}));

		this._register(this.collaborationService.onDidUserLeave(userId => {
			this._participants = this._participants.filter(p => p.id !== userId);
			this._updateView();
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		this._container = container;
		this._container.classList.add('collaboration-view');

		// Session Info Section
		this._sessionInfoElement = document.createElement('div');
		this._sessionInfoElement.classList.add('session-info');
		this._container.appendChild(this._sessionInfoElement);

		// Participants Section
		const participantsHeader = document.createElement('h3');
		participantsHeader.textContent = localize('participants', 'Participants');
		participantsHeader.classList.add('participants-header');
		this._container.appendChild(participantsHeader);

		this._participantsElement = document.createElement('div');
		this._participantsElement.classList.add('participants-list');
		this._container.appendChild(this._participantsElement);

		// Actions Section
		this._actionsElement = document.createElement('div');
		this._actionsElement.classList.add('collaboration-actions');
		this._container.appendChild(this._actionsElement);

		this._createActions();
		this._updateView();
	}

	private _createActions(): void {
		if (!this._actionsElement) {
			return;
		}

		// Create Session Button
		const createSessionButton = document.createElement('button');
		createSessionButton.textContent = localize('createSession', 'Create Session');
		createSessionButton.classList.add('monaco-button', 'monaco-text-button');
		createSessionButton.onclick = () => this._createSession();
		this._actionsElement.appendChild(createSessionButton);

		// Join Session Button
		const joinSessionButton = document.createElement('button');
		joinSessionButton.textContent = localize('joinSession', 'Join Session');
		joinSessionButton.classList.add('monaco-button', 'monaco-text-button');
		joinSessionButton.onclick = () => this._joinSession();
		this._actionsElement.appendChild(joinSessionButton);

		// Leave Session Button
		const leaveSessionButton = document.createElement('button');
		leaveSessionButton.textContent = localize('leaveSession', 'Leave Session');
		leaveSessionButton.classList.add('monaco-button', 'monaco-text-button');
		leaveSessionButton.onclick = () => this._leaveSession();
		this._actionsElement.appendChild(leaveSessionButton);

		// Share Session Button
		const shareSessionButton = document.createElement('button');
		shareSessionButton.textContent = localize('shareSession', 'Share Session');
		shareSessionButton.classList.add('monaco-button', 'monaco-text-button');
		shareSessionButton.onclick = () => this._shareSession();
		this._actionsElement.appendChild(shareSessionButton);
	}

	private _updateView(): void {
		this._updateSessionInfo();
		this._updateParticipantsList();
		this._updateActions();
	}

	private _updateSessionInfo(): void {
		if (!this._sessionInfoElement) {
			return;
		}

		this._sessionInfoElement.innerHTML = '';

		if (this._currentSession) {
			const sessionName = document.createElement('div');
			sessionName.classList.add('session-name');
			sessionName.textContent = this._currentSession.name;
			this._sessionInfoElement.appendChild(sessionName);

			const sessionId = document.createElement('div');
			sessionId.classList.add('session-id');
			sessionId.textContent = `ID: ${this._currentSession.id}`;
			this._sessionInfoElement.appendChild(sessionId);

			const sessionStatus = document.createElement('div');
			sessionStatus.classList.add('session-status', 'active');
			sessionStatus.textContent = localize('sessionActive', 'Active');
			this._sessionInfoElement.appendChild(sessionStatus);
		} else {
			const noSession = document.createElement('div');
			noSession.classList.add('no-session');
			noSession.textContent = localize('noActiveSession', 'No active collaboration session');
			this._sessionInfoElement.appendChild(noSession);
		}
	}

	private _updateParticipantsList(): void {
		if (!this._participantsElement) {
			return;
		}

		this._participantsElement.innerHTML = '';

		if (this._participants.length === 0) {
			const noParticipants = document.createElement('div');
			noParticipants.classList.add('no-participants');
			noParticipants.textContent = localize('noParticipants', 'No participants');
			this._participantsElement.appendChild(noParticipants);
			return;
		}

		this._participants.forEach(participant => {
			const participantElement = document.createElement('div');
			participantElement.classList.add('participant');

			const avatar = document.createElement('div');
			avatar.classList.add('participant-avatar');
			avatar.style.backgroundColor = participant.color;
			avatar.textContent = participant.name.charAt(0).toUpperCase();
			participantElement.appendChild(avatar);

			const info = document.createElement('div');
			info.classList.add('participant-info');

			const name = document.createElement('div');
			name.classList.add('participant-name');
			name.textContent = participant.name;
			info.appendChild(name);

			const status = document.createElement('div');
			status.classList.add('participant-status');
			status.textContent = participant.isOnline ? localize('online', 'Online') : localize('offline', 'Offline');
			status.classList.add(participant.isOnline ? 'online' : 'offline');
			info.appendChild(status);

			participantElement.appendChild(info);
			this._participantsElement.appendChild(participantElement);
		});
	}

	private _updateActions(): void {
		if (!this._actionsElement) {
			return;
		}

		const buttons = this._actionsElement.querySelectorAll('button');
		const [createButton, joinButton, leaveButton, shareButton] = buttons;

		if (this._currentSession) {
			createButton.style.display = 'none';
			joinButton.style.display = 'none';
			leaveButton.style.display = 'block';
			shareButton.style.display = 'block';
		} else {
			createButton.style.display = 'block';
			joinButton.style.display = 'block';
			leaveButton.style.display = 'none';
			shareButton.style.display = 'none';
		}
	}

	private async _createSession(): Promise<void> {
		const sessionName = await this.quickInputService.input({
			placeHolder: localize('sessionNamePlaceholder', 'Enter session name'),
			prompt: localize('sessionNamePrompt', 'What would you like to name this collaboration session?')
		});

		if (!sessionName) {
			return;
		}

		try {
			// For now, create session with no specific documents
			// In a real implementation, this might include currently open files
			await this.collaborationService.createSession(sessionName, []);
			this.notificationService.info(localize('sessionCreated', 'Collaboration session "{0}" created successfully', sessionName));
		} catch (error) {
			this.notificationService.error(localize('sessionCreateError', 'Failed to create session: {0}', error.message));
		}
	}

	private async _joinSession(): Promise<void> {
		const sessionId = await this.quickInputService.input({
			placeHolder: localize('sessionIdPlaceholder', 'Enter session ID'),
			prompt: localize('sessionIdPrompt', 'Enter the ID of the session you want to join')
		});

		if (!sessionId) {
			return;
		}

		try {
			const success = await this.collaborationService.joinSession(sessionId);
			if (success) {
				this.notificationService.info(localize('sessionJoined', 'Successfully joined collaboration session'));
			} else {
				this.notificationService.error(localize('sessionJoinError', 'Failed to join session. Please check the session ID and try again.'));
			}
		} catch (error) {
			this.notificationService.error(localize('sessionJoinError', 'Failed to join session: {0}', error.message));
		}
	}

	private async _leaveSession(): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		try {
			await this.collaborationService.leaveSession();
			this.notificationService.info(localize('sessionLeft', 'Left collaboration session'));
		} catch (error) {
			this.notificationService.error(localize('sessionLeaveError', 'Failed to leave session: {0}', error.message));
		}
	}

	private async _shareSession(): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		// Copy session ID to clipboard
		try {
			await navigator.clipboard.writeText(this._currentSession.id);
			this.notificationService.info(localize('sessionIdCopied', 'Session ID copied to clipboard'));
		} catch (error) {
			// Fallback: show session ID in a dialog
			this.notificationService.info(localize('sessionIdShare', 'Share this session ID: {0}', this._currentSession.id));
		}
	}
}