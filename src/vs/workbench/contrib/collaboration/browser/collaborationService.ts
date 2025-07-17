/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { ILogService } from 'vs/platform/log/common/log';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { 
	ICollaborationService, 
	ICollaborationSession, 
	ICollaborationUser, 
	ICollaborationPresence,
	ICollaborationMessage,
	ICollaborationComment,
	ICollaborationCommentReply,
	ICollaborationOperation
} from 'vs/workbench/contrib/collaboration/common/collaborationService';

export class CollaborationService extends Disposable implements ICollaborationService {
	declare readonly _serviceBrand: undefined;

	// Session Management Events
	private readonly _onDidCreateSession = this._register(new Emitter<ICollaborationSession>());
	readonly onDidCreateSession: Event<ICollaborationSession> = this._onDidCreateSession.event;

	private readonly _onDidJoinSession = this._register(new Emitter<ICollaborationSession>());
	readonly onDidJoinSession: Event<ICollaborationSession> = this._onDidJoinSession.event;

	private readonly _onDidLeaveSession = this._register(new Emitter<string>());
	readonly onDidLeaveSession: Event<string> = this._onDidLeaveSession.event;

	private readonly _onDidUpdateSession = this._register(new Emitter<ICollaborationSession>());
	readonly onDidUpdateSession: Event<ICollaborationSession> = this._onDidUpdateSession.event;

	// User Presence Events
	private readonly _onDidChangePresence = this._register(new Emitter<ICollaborationPresence>());
	readonly onDidChangePresence: Event<ICollaborationPresence> = this._onDidChangePresence.event;

	private readonly _onDidUserJoin = this._register(new Emitter<ICollaborationUser>());
	readonly onDidUserJoin: Event<ICollaborationUser> = this._onDidUserJoin.event;

	private readonly _onDidUserLeave = this._register(new Emitter<string>());
	readonly onDidUserLeave: Event<string> = this._onDidUserLeave.event;

	// Document Collaboration Events
	private readonly _onDidReceiveOperation = this._register(new Emitter<ICollaborationOperation>());
	readonly onDidReceiveOperation: Event<ICollaborationOperation> = this._onDidReceiveOperation.event;

	private readonly _onDidSyncDocument = this._register(new Emitter<{ uri: URI; content: string; version: number }>());
	readonly onDidSyncDocument: Event<{ uri: URI; content: string; version: number }> = this._onDidSyncDocument.event;

	// Chat Events
	private readonly _onDidReceiveMessage = this._register(new Emitter<ICollaborationMessage>());
	readonly onDidReceiveMessage: Event<ICollaborationMessage> = this._onDidReceiveMessage.event;

	// Comment Events
	private readonly _onDidAddComment = this._register(new Emitter<ICollaborationComment>());
	readonly onDidAddComment: Event<ICollaborationComment> = this._onDidAddComment.event;

	private readonly _onDidUpdateComment = this._register(new Emitter<ICollaborationComment>());
	readonly onDidUpdateComment: Event<ICollaborationComment> = this._onDidUpdateComment.event;

	private readonly _onDidDeleteComment = this._register(new Emitter<string>());
	readonly onDidDeleteComment: Event<string> = this._onDidDeleteComment.event;

	// Private state
	private _websocket: WebSocket | undefined;
	private _currentSession: ICollaborationSession | undefined;
	private _currentUser: ICollaborationUser | undefined;
	private _presences = new Map<string, ICollaborationPresence>();
	private _documentVersions = new Map<string, number>();
	private _reconnectAttempts = 0;
	private _maxReconnectAttempts = 5;
	private _reconnectDelay = 1000;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();
		this._initializeUser();
	}

	private _initializeUser(): void {
		// Generate a unique user ID and color for this session
		const userId = this._generateUserId();
		const userName = this.configurationService.getValue<string>('troubleshoot.collaboration.userName') || 'Anonymous';
		const userColor = this._generateUserColor();

		this._currentUser = {
			id: userId,
			name: userName,
			color: userColor,
			isOnline: true,
			lastSeen: Date.now()
		};
	}

	private _generateUserId(): string {
		return 'user_' + Math.random().toString(36).substr(2, 9);
	}

	private _generateUserColor(): string {
		const colors = [
			'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
			'#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
		];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	// Session Management Methods
	async createSession(name: string, documents: URI[]): Promise<ICollaborationSession> {
		if (!this._currentUser) {
			throw new Error('User not initialized');
		}

		const session: ICollaborationSession = {
			id: this._generateSessionId(),
			name,
			ownerId: this._currentUser.id,
			participants: new Map([[this._currentUser.id, this._currentUser]]),
			documents,
			createdAt: Date.now(),
			isActive: true
		};

		this._currentSession = session;
		
		// Connect to WebSocket server
		await this.connect();
		
		// Send session creation message
		this._sendMessage({
			type: 'create_session',
			session
		});

		this._onDidCreateSession.fire(session);
		this.logService.info('Created collaboration session', { sessionId: session.id });
		
		return session;
	}

	async joinSession(sessionId: string): Promise<boolean> {
		if (!this._currentUser) {
			throw new Error('User not initialized');
		}

		try {
			// Connect to WebSocket server
			await this.connect();
			
			// Send join session message
			this._sendMessage({
				type: 'join_session',
				sessionId,
				user: this._currentUser
			});

			// Wait for session confirmation
			return new Promise((resolve) => {
				const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
				
				const disposable = this.onDidJoinSession((session) => {
					if (session.id === sessionId) {
						clearTimeout(timeout);
						disposable.dispose();
						resolve(true);
					}
				});
			});
		} catch (error) {
			this.logService.error('Failed to join session', error);
			return false;
		}
	}

	async leaveSession(): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		const sessionId = this._currentSession.id;
		
		// Send leave session message
		this._sendMessage({
			type: 'leave_session',
			sessionId,
			userId: this._currentUser?.id
		});

		this._currentSession = undefined;
		this._presences.clear();
		this._documentVersions.clear();

		await this.disconnect();
		
		this._onDidLeaveSession.fire(sessionId);
		this.logService.info('Left collaboration session', { sessionId });
	}

	getCurrentSession(): ICollaborationSession | undefined {
		return this._currentSession;
	}

	getSessionParticipants(): ICollaborationUser[] {
		return this._currentSession ? Array.from(this._currentSession.participants.values()) : [];
	}

	// Presence Methods
	async updatePresence(presence: Partial<ICollaborationPresence>): Promise<void> {
		if (!this._currentUser || !this._currentSession) {
			return;
		}

		const fullPresence: ICollaborationPresence = {
			userId: this._currentUser.id,
			documentUri: presence.documentUri,
			cursorPosition: presence.cursorPosition,
			selection: presence.selection,
			isTyping: presence.isTyping || false,
			lastActivity: Date.now()
		};

		this._presences.set(this._currentUser.id, fullPresence);

		// Send presence update
		this._sendMessage({
			type: 'presence_update',
			sessionId: this._currentSession.id,
			presence: fullPresence
		});

		this._onDidChangePresence.fire(fullPresence);
	}

	getPresence(userId: string): ICollaborationPresence | undefined {
		return this._presences.get(userId);
	}

	getAllPresences(): ICollaborationPresence[] {
		return Array.from(this._presences.values());
	}

	// Document Collaboration Methods
	async applyOperation(operation: ICollaborationOperation): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		// Update local document version
		const uriString = operation.documentUri.toString();
		const currentVersion = this._documentVersions.get(uriString) || 0;
		this._documentVersions.set(uriString, currentVersion + 1);

		// Send operation to other participants
		this._sendMessage({
			type: 'document_operation',
			sessionId: this._currentSession.id,
			operation: {
				...operation,
				version: currentVersion + 1
			}
		});

		this._onDidReceiveOperation.fire(operation);
	}

	getDocumentVersion(uri: URI): number {
		return this._documentVersions.get(uri.toString()) || 0;
	}

	async syncDocument(uri: URI): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		// Request document sync
		this._sendMessage({
			type: 'sync_document',
			sessionId: this._currentSession.id,
			documentUri: uri.toString()
		});
	}

	// Chat Methods
	async sendMessage(content: string, mentions?: string[], parentId?: string): Promise<void> {
		if (!this._currentUser || !this._currentSession) {
			return;
		}

		const message: ICollaborationMessage = {
			id: this._generateMessageId(),
			sessionId: this._currentSession.id,
			userId: this._currentUser.id,
			userName: this._currentUser.name,
			content,
			timestamp: Date.now(),
			mentions: mentions || [],
			isEdited: false,
			parentId
		};

		// Send message
		this._sendMessage({
			type: 'chat_message',
			message
		});

		this._onDidReceiveMessage.fire(message);
	}

	async getMessages(limit?: number, before?: number): Promise<ICollaborationMessage[]> {
		// This would typically fetch from a server or local cache
		// For now, return empty array as placeholder
		return [];
	}

	// Comment Methods
	async addComment(documentUri: URI, range: any, content: string): Promise<ICollaborationComment> {
		if (!this._currentUser || !this._currentSession) {
			throw new Error('Not in a collaboration session');
		}

		const comment: ICollaborationComment = {
			id: this._generateCommentId(),
			documentUri,
			range,
			userId: this._currentUser.id,
			userName: this._currentUser.name,
			content,
			timestamp: Date.now(),
			replies: [],
			isResolved: false
		};

		// Send comment
		this._sendMessage({
			type: 'add_comment',
			sessionId: this._currentSession.id,
			comment
		});

		this._onDidAddComment.fire(comment);
		return comment;
	}

	async replyToComment(commentId: string, content: string): Promise<void> {
		if (!this._currentUser || !this._currentSession) {
			return;
		}

		const reply: ICollaborationCommentReply = {
			id: this._generateCommentId(),
			userId: this._currentUser.id,
			userName: this._currentUser.name,
			content,
			timestamp: Date.now()
		};

		// Send reply
		this._sendMessage({
			type: 'reply_comment',
			sessionId: this._currentSession.id,
			commentId,
			reply
		});
	}

	async resolveComment(commentId: string, resolved: boolean): Promise<void> {
		if (!this._currentSession) {
			return;
		}

		// Send resolve comment
		this._sendMessage({
			type: 'resolve_comment',
			sessionId: this._currentSession.id,
			commentId,
			resolved
		});
	}

	async getComments(documentUri: URI): Promise<ICollaborationComment[]> {
		// This would typically fetch from a server or local cache
		// For now, return empty array as placeholder
		return [];
	}

	// Connection Methods
	isConnected(): boolean {
		return this._websocket?.readyState === WebSocket.OPEN;
	}

	async connect(): Promise<void> {
		if (this.isConnected()) {
			return;
		}

		const config = this.configurationService.getValue<any>('troubleshoot.collaboration');
		const serverUrl = config?.serverUrl || 'ws://localhost:8080/collaboration';

		return new Promise((resolve, reject) => {
			try {
				this._websocket = new WebSocket(serverUrl);

				this._websocket.onopen = () => {
					this.logService.info('Connected to collaboration server');
					this._reconnectAttempts = 0;
					resolve();
				};

				this._websocket.onmessage = (event) => {
					this._handleMessage(JSON.parse(event.data));
				};

				this._websocket.onclose = () => {
					this.logService.info('Disconnected from collaboration server');
					this._handleDisconnection();
				};

				this._websocket.onerror = (error) => {
					this.logService.error('WebSocket error', error);
					reject(error);
				};

				// Connection timeout
				setTimeout(() => {
					if (!this.isConnected()) {
						reject(new Error('Connection timeout'));
					}
				}, 10000);

			} catch (error) {
				reject(error);
			}
		});
	}

	async disconnect(): Promise<void> {
		if (this._websocket) {
			this._websocket.close();
			this._websocket = undefined;
		}
	}

	// Private Methods
	private _generateSessionId(): string {
		return 'session_' + Math.random().toString(36).substr(2, 9);
	}

	private _generateMessageId(): string {
		return 'msg_' + Math.random().toString(36).substr(2, 9);
	}

	private _generateCommentId(): string {
		return 'comment_' + Math.random().toString(36).substr(2, 9);
	}

	private _sendMessage(message: any): void {
		if (this.isConnected() && this._websocket) {
			this._websocket.send(JSON.stringify(message));
		}
	}

	private _handleMessage(message: any): void {
		switch (message.type) {
			case 'session_joined':
				this._handleSessionJoined(message);
				break;
			case 'user_joined':
				this._handleUserJoined(message);
				break;
			case 'user_left':
				this._handleUserLeft(message);
				break;
			case 'presence_update':
				this._handlePresenceUpdate(message);
				break;
			case 'document_operation':
				this._handleDocumentOperation(message);
				break;
			case 'document_sync':
				this._handleDocumentSync(message);
				break;
			case 'chat_message':
				this._handleChatMessage(message);
				break;
			case 'comment_added':
				this._handleCommentAdded(message);
				break;
			case 'comment_updated':
				this._handleCommentUpdated(message);
				break;
			case 'comment_deleted':
				this._handleCommentDeleted(message);
				break;
			default:
				this.logService.warn('Unknown message type', message.type);
		}
	}

	private _handleSessionJoined(message: any): void {
		this._currentSession = message.session;
		this._onDidJoinSession.fire(message.session);
	}

	private _handleUserJoined(message: any): void {
		if (this._currentSession) {
			this._currentSession.participants.set(message.user.id, message.user);
			this._onDidUserJoin.fire(message.user);
		}
	}

	private _handleUserLeft(message: any): void {
		if (this._currentSession) {
			this._currentSession.participants.delete(message.userId);
			this._presences.delete(message.userId);
			this._onDidUserLeave.fire(message.userId);
		}
	}

	private _handlePresenceUpdate(message: any): void {
		this._presences.set(message.presence.userId, message.presence);
		this._onDidChangePresence.fire(message.presence);
	}

	private _handleDocumentOperation(message: any): void {
		const operation = message.operation;
		const uriString = operation.documentUri;
		this._documentVersions.set(uriString, operation.version);
		this._onDidReceiveOperation.fire({
			...operation,
			documentUri: URI.parse(uriString)
		});
	}

	private _handleDocumentSync(message: any): void {
		this._onDidSyncDocument.fire({
			uri: URI.parse(message.documentUri),
			content: message.content,
			version: message.version
		});
	}

	private _handleChatMessage(message: any): void {
		this._onDidReceiveMessage.fire(message.message);
	}

	private _handleCommentAdded(message: any): void {
		const comment = {
			...message.comment,
			documentUri: URI.parse(message.comment.documentUri)
		};
		this._onDidAddComment.fire(comment);
	}

	private _handleCommentUpdated(message: any): void {
		const comment = {
			...message.comment,
			documentUri: URI.parse(message.comment.documentUri)
		};
		this._onDidUpdateComment.fire(comment);
	}

	private _handleCommentDeleted(message: any): void {
		this._onDidDeleteComment.fire(message.commentId);
	}

	private _handleDisconnection(): void {
		if (this._currentSession && this._reconnectAttempts < this._maxReconnectAttempts) {
			// Attempt to reconnect
			this._reconnectAttempts++;
			const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);
			
			this.logService.info(`Attempting to reconnect (${this._reconnectAttempts}/${this._maxReconnectAttempts}) in ${delay}ms`);
			
			setTimeout(() => {
				this.connect().catch((error) => {
					this.logService.error('Reconnection failed', error);
				});
			}, delay);
		} else if (this._reconnectAttempts >= this._maxReconnectAttempts) {
			this.notificationService.error('Lost connection to collaboration server. Please rejoin the session.');
		}
	}
}