/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';

export interface ICollaborationUser {
	readonly id: string;
	readonly name: string;
	readonly email?: string;
	readonly avatar?: string;
	readonly color: string;
	readonly isOnline: boolean;
	readonly lastSeen: number;
}

export interface ICollaborationSession {
	readonly id: string;
	readonly name: string;
	readonly ownerId: string;
	readonly participants: Map<string, ICollaborationUser>;
	readonly documents: URI[];
	readonly createdAt: number;
	readonly isActive: boolean;
}

export interface ICollaborationPresence {
	readonly userId: string;
	readonly documentUri?: URI;
	readonly cursorPosition?: { line: number; column: number };
	readonly selection?: { 
		startLine: number; 
		startColumn: number; 
		endLine: number; 
		endColumn: number; 
	};
	readonly isTyping: boolean;
	readonly lastActivity: number;
}

export interface ICollaborationMessage {
	readonly id: string;
	readonly sessionId: string;
	readonly userId: string;
	readonly userName: string;
	readonly content: string;
	readonly timestamp: number;
	readonly mentions: string[];
	readonly isEdited: boolean;
	readonly parentId?: string;
}

export interface ICollaborationComment {
	readonly id: string;
	readonly documentUri: URI;
	readonly range: {
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
	readonly userId: string;
	readonly userName: string;
	readonly content: string;
	readonly timestamp: number;
	readonly replies: ICollaborationCommentReply[];
	readonly isResolved: boolean;
}

export interface ICollaborationCommentReply {
	readonly id: string;
	readonly userId: string;
	readonly userName: string;
	readonly content: string;
	readonly timestamp: number;
}

export interface ICollaborationOperation {
	readonly type: 'insert' | 'delete' | 'replace';
	readonly documentUri: URI;
	readonly position: { line: number; column: number };
	readonly text?: string;
	readonly length?: number;
	readonly userId: string;
	readonly timestamp: number;
	readonly version: number;
}

export const ICollaborationService = createDecorator<ICollaborationService>('collaborationService');

export interface ICollaborationService {
	readonly _serviceBrand: undefined;

	// Session Management
	readonly onDidCreateSession: Event<ICollaborationSession>;
	readonly onDidJoinSession: Event<ICollaborationSession>;
	readonly onDidLeaveSession: Event<string>; // session ID
	readonly onDidUpdateSession: Event<ICollaborationSession>;

	// User Presence
	readonly onDidChangePresence: Event<ICollaborationPresence>;
	readonly onDidUserJoin: Event<ICollaborationUser>;
	readonly onDidUserLeave: Event<string>; // user ID

	// Document Collaboration
	readonly onDidReceiveOperation: Event<ICollaborationOperation>;
	readonly onDidSyncDocument: Event<{ uri: URI; content: string; version: number }>;

	// Chat
	readonly onDidReceiveMessage: Event<ICollaborationMessage>;

	// Comments
	readonly onDidAddComment: Event<ICollaborationComment>;
	readonly onDidUpdateComment: Event<ICollaborationComment>;
	readonly onDidDeleteComment: Event<string>; // comment ID

	// Session Management Methods
	createSession(name: string, documents: URI[]): Promise<ICollaborationSession>;
	joinSession(sessionId: string): Promise<boolean>;
	leaveSession(): Promise<void>;
	getCurrentSession(): ICollaborationSession | undefined;
	getSessionParticipants(): ICollaborationUser[];

	// Presence Methods
	updatePresence(presence: Partial<ICollaborationPresence>): Promise<void>;
	getPresence(userId: string): ICollaborationPresence | undefined;
	getAllPresences(): ICollaborationPresence[];

	// Document Collaboration Methods
	applyOperation(operation: ICollaborationOperation): Promise<void>;
	getDocumentVersion(uri: URI): number;
	syncDocument(uri: URI): Promise<void>;

	// Chat Methods
	sendMessage(content: string, mentions?: string[], parentId?: string): Promise<void>;
	getMessages(limit?: number, before?: number): Promise<ICollaborationMessage[]>;

	// Comment Methods
	addComment(documentUri: URI, range: any, content: string): Promise<ICollaborationComment>;
	replyToComment(commentId: string, content: string): Promise<void>;
	resolveComment(commentId: string, resolved: boolean): Promise<void>;
	getComments(documentUri: URI): Promise<ICollaborationComment[]>;

	// Connection Status
	isConnected(): boolean;
	connect(): Promise<void>;
	disconnect(): Promise<void>;
}