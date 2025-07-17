/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Disposable } from 'vs/base/common/lifecycle';
import { IAIService } from 'vs/workbench/contrib/ai/common/aiService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';

export interface ILogAnalysisResult {
	summary: string;
	errors: Array<{
		line: number;
		message: string;
		severity: 'error' | 'warning' | 'info';
		suggestion?: string;
	}>;
	patterns: Array<{
		pattern: string;
		count: number;
		significance: string;
	}>;
	recommendations: string[];
	performance?: {
		issues: string[];
		suggestions: string[];
	};
}

export const ILogAnalyzerService = createDecorator<ILogAnalyzerService>('logAnalyzerService');

export interface ILogAnalyzerService {
	readonly _serviceBrand: undefined;
	
	/**
	 * Analyze log content and provide insights
	 */
	analyzeLogs(content: string, logType?: string): Promise<ILogAnalysisResult>;
	
	/**
	 * Detect log patterns and anomalies
	 */
	detectPatterns(content: string): Promise<Array<{ pattern: string; count: number; significance: string }>>;
	
	/**
	 * Extract and analyze errors from logs
	 */
	extractErrors(content: string): Promise<Array<{ line: number; message: string; severity: string; suggestion?: string }>>;
	
	/**
	 * Provide troubleshooting recommendations
	 */
	getTroubleshootingRecommendations(content: string, context?: string): Promise<string[]>;
}

export class LogAnalyzerService extends Disposable implements ILogAnalyzerService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IAIService private readonly aiService: IAIService
	) {
		super();
	}

	async analyzeLogs(content: string, logType?: string): Promise<ILogAnalysisResult> {
		const systemPrompt = `You are an expert log analyzer specializing in troubleshooting. Analyze the provided logs and return a JSON response with the following structure:

{
  "summary": "Brief overview of log analysis",
  "errors": [
    {
      "line": number,
      "message": "error description",
      "severity": "error|warning|info",
      "suggestion": "how to fix this issue"
    }
  ],
  "patterns": [
    {
      "pattern": "pattern description",
      "count": number,
      "significance": "why this pattern matters"
    }
  ],
  "recommendations": ["list of actionable recommendations"],
  "performance": {
    "issues": ["performance problems found"],
    "suggestions": ["optimization suggestions"]
  }
}

Focus on:
- Critical errors and their root causes
- Performance bottlenecks
- Security concerns
- Unusual patterns or anomalies
- Actionable troubleshooting steps

${logType ? `Log type: ${logType}` : ''}`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: `Analyze these logs:\n\n${content}` }
		]);

		try {
			return JSON.parse(response);
		} catch {
			// Fallback if JSON parsing fails
			return {
				summary: response,
				errors: [],
				patterns: [],
				recommendations: [response]
			};
		}
	}

	async detectPatterns(content: string): Promise<Array<{ pattern: string; count: number; significance: string }>> {
		const systemPrompt = `Analyze the logs and identify significant patterns. Return a JSON array of patterns:

[
  {
    "pattern": "description of the pattern",
    "count": number_of_occurrences,
    "significance": "why this pattern is important for troubleshooting"
  }
]

Look for:
- Repeated error messages
- Time-based patterns
- Resource usage patterns
- Request/response patterns
- Failure cascades`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: content }
		]);

		try {
			return JSON.parse(response);
		} catch {
			return [];
		}
	}

	async extractErrors(content: string): Promise<Array<{ line: number; message: string; severity: string; suggestion?: string }>> {
		const systemPrompt = `Extract and analyze errors from the logs. Return a JSON array:

[
  {
    "line": line_number,
    "message": "error message",
    "severity": "error|warning|info",
    "suggestion": "specific suggestion to fix this error"
  }
]

Focus on:
- Critical errors that need immediate attention
- Warnings that could lead to problems
- Patterns of related errors`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: content }
		]);

		try {
			return JSON.parse(response);
		} catch {
			return [];
		}
	}

	async getTroubleshootingRecommendations(content: string, context?: string): Promise<string[]> {
		const systemPrompt = `Based on the log analysis, provide specific troubleshooting recommendations. Return a JSON array of actionable steps:

[
  "Specific action to take",
  "Another recommendation",
  "etc."
]

Prioritize:
- Immediate actions for critical issues
- Root cause investigation steps
- Preventive measures
- Monitoring improvements

${context ? `Additional context: ${context}` : ''}`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: content }
		]);

		try {
			return JSON.parse(response);
		} catch {
			return [response];
		}
	}
}

registerSingleton(ILogAnalyzerService, LogAnalyzerService, true);

// Register Commands
CommandsRegistry.registerCommand('troubleshoot.ai.analyzeLogs', async (accessor) => {
	const logAnalyzerService = accessor.get(ILogAnalyzerService);
	const editorService = accessor.get(IEditorService);
	const notificationService = accessor.get(INotificationService);
	const progressService = accessor.get(IProgressService);

	const activeEditor = editorService.activeTextEditorControl;
	if (!activeEditor) {
		notificationService.warn(localize('noActiveEditor', 'No active editor found'));
		return;
	}

	const model = activeEditor.getModel();
	if (!model) {
		return;
	}

	const content = model.getValue();
	if (!content.trim()) {
		notificationService.warn(localize('emptyFile', 'File is empty'));
		return;
	}

	await progressService.withProgress({
		location: ProgressLocation.Notification,
		title: localize('analyzingLogs', 'Analyzing logs with AI...'),
		cancellable: true
	}, async (progress, token) => {
		try {
			const fileName = model.uri.path.toLowerCase();
			let logType: string | undefined;
			
			// Detect log type from file extension or name
			if (fileName.includes('error') || fileName.includes('err')) {
				logType = 'error';
			} else if (fileName.includes('access') || fileName.includes('request')) {
				logType = 'access';
			} else if (fileName.includes('debug')) {
				logType = 'debug';
			} else if (fileName.includes('audit')) {
				logType = 'audit';
			}

			const analysis = await logAnalyzerService.analyzeLogs(content, logType);
			
			if (token.isCancellationRequested) {
				return;
			}

			// Show analysis results
			let message = `**Log Analysis Summary:**\n${analysis.summary}\n\n`;
			
			if (analysis.errors.length > 0) {
				message += `**Errors Found (${analysis.errors.length}):**\n`;
				analysis.errors.slice(0, 5).forEach(error => {
					message += `• Line ${error.line}: ${error.message}\n`;
					if (error.suggestion) {
						message += `  → ${error.suggestion}\n`;
					}
				});
				message += '\n';
			}

			if (analysis.patterns.length > 0) {
				message += `**Patterns Detected:**\n`;
				analysis.patterns.slice(0, 3).forEach(pattern => {
					message += `• ${pattern.pattern} (${pattern.count} times)\n`;
				});
				message += '\n';
			}

			if (analysis.recommendations.length > 0) {
				message += `**Recommendations:**\n`;
				analysis.recommendations.slice(0, 5).forEach(rec => {
					message += `• ${rec}\n`;
				});
			}

			notificationService.info(message, { sticky: true });

		} catch (error) {
			notificationService.error(localize('logAnalysisError', 'Log analysis failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
		}
	});
});

CommandsRegistry.registerCommand('troubleshoot.ai.detectLogPatterns', async (accessor) => {
	const logAnalyzerService = accessor.get(ILogAnalyzerService);
	const editorService = accessor.get(IEditorService);
	const notificationService = accessor.get(INotificationService);
	const progressService = accessor.get(IProgressService);

	const activeEditor = editorService.activeTextEditorControl;
	if (!activeEditor) {
		notificationService.warn(localize('noActiveEditor', 'No active editor found'));
		return;
	}

	const model = activeEditor.getModel();
	if (!model) {
		return;
	}

	const content = model.getValue();

	await progressService.withProgress({
		location: ProgressLocation.Notification,
		title: localize('detectingPatterns', 'Detecting log patterns...'),
		cancellable: true
	}, async (progress, token) => {
		try {
			const patterns = await logAnalyzerService.detectPatterns(content);
			
			if (token.isCancellationRequested) {
				return;
			}

			if (patterns.length === 0) {
				notificationService.info(localize('noPatternsFound', 'No significant patterns detected'));
				return;
			}

			let message = `**Log Patterns Detected:**\n\n`;
			patterns.forEach(pattern => {
				message += `• **${pattern.pattern}** (${pattern.count} occurrences)\n`;
				message += `  ${pattern.significance}\n\n`;
			});

			notificationService.info(message, { sticky: true });

		} catch (error) {
			notificationService.error(localize('patternDetectionError', 'Pattern detection failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
		}
	});
});

CommandsRegistry.registerCommand('troubleshoot.ai.extractLogErrors', async (accessor) => {
	const logAnalyzerService = accessor.get(ILogAnalyzerService);
	const editorService = accessor.get(IEditorService);
	const notificationService = accessor.get(INotificationService);
	const progressService = accessor.get(IProgressService);

	const activeEditor = editorService.activeTextEditorControl;
	if (!activeEditor) {
		notificationService.warn(localize('noActiveEditor', 'No active editor found'));
		return;
	}

	const model = activeEditor.getModel();
	if (!model) {
		return;
	}

	const content = model.getValue();

	await progressService.withProgress({
		location: ProgressLocation.Notification,
		title: localize('extractingErrors', 'Extracting errors from logs...'),
		cancellable: true
	}, async (progress, token) => {
		try {
			const errors = await logAnalyzerService.extractErrors(content);
			
			if (token.isCancellationRequested) {
				return;
			}

			if (errors.length === 0) {
				notificationService.info(localize('noErrorsFound', 'No errors found in logs'));
				return;
			}

			let message = `**Errors Extracted (${errors.length} total):**\n\n`;
			errors.slice(0, 10).forEach(error => {
				message += `• **Line ${error.line}** [${error.severity.toUpperCase()}]: ${error.message}\n`;
				if (error.suggestion) {
					message += `  💡 ${error.suggestion}\n`;
				}
				message += '\n';
			});

			if (errors.length > 10) {
				message += `... and ${errors.length - 10} more errors\n`;
			}

			notificationService.info(message, { sticky: true });

		} catch (error) {
			notificationService.error(localize('errorExtractionError', 'Error extraction failed: {0}', error instanceof Error ? error.message : 'Unknown error'));
		}
	});
});

// Register Menu Items
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.analyzeLogs',
		title: localize('analyzeLogsWithAI', 'Analyze Logs with AI')
	},
	when: 'resourceExtname =~ /\\.(log|txt)$/',
	group: 'troubleshoot'
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.detectLogPatterns',
		title: localize('detectLogPatterns', 'Detect Log Patterns')
	},
	when: 'resourceExtname =~ /\\.(log|txt)$/',
	group: 'troubleshoot'
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	command: {
		id: 'troubleshoot.ai.extractLogErrors',
		title: localize('extractLogErrors', 'Extract Log Errors')
	},
	when: 'resourceExtname =~ /\\.(log|txt)$/',
	group: 'troubleshoot'
});