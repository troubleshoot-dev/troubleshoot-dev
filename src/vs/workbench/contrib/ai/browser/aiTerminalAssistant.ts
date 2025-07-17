/*---------------------------------------------------------------------------------------------
 *  Copyright (c) troubleshoot.dev. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Disposable } from 'vs/base/common/lifecycle';
import { ITerminalService } from 'vs/workbench/contrib/terminal/browser/terminal';
import { IAIService } from 'vs/workbench/contrib/ai/common/aiService';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const ITerminalAIService = createDecorator<ITerminalAIService>('terminalAIService');

export interface ITerminalAIService {
	readonly _serviceBrand: undefined;
	
	/**
	 * Generate a command from natural language description
	 */
	generateCommand(description: string, context?: string): Promise<string>;
	
	/**
	 * Explain what a command does
	 */
	explainCommand(command: string): Promise<string>;
	
	/**
	 * Analyze terminal output and provide insights
	 */
	analyzeOutput(output: string): Promise<string>;
	
	/**
	 * Suggest fixes for command errors
	 */
	suggestFix(command: string, error: string): Promise<string>;
}

export class TerminalAIService extends Disposable implements ITerminalAIService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IAIService private readonly aiService: IAIService,
		@ITerminalService private readonly terminalService: ITerminalService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
	}

	async generateCommand(description: string, context?: string): Promise<string> {
		const systemPrompt = `You are a terminal command generator. Generate shell commands based on natural language descriptions.
		
Rules:
- Provide only the command, no explanations
- Use common Unix/Linux commands
- Be safe - avoid destructive commands without explicit confirmation
- Consider the current directory context if provided
- Prefer widely compatible commands

${context ? `Current context: ${context}` : ''}`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: `Generate a command for: ${description}` }
		]);

		return response.trim();
	}

	async explainCommand(command: string): Promise<string> {
		const systemPrompt = `You are a command explainer. Explain what shell commands do in simple terms.
		
Format your response as:
- What it does: [brief description]
- Parameters: [explain key parameters]
- Safety: [any warnings or considerations]`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: `Explain this command: ${command}` }
		]);

		return response;
	}

	async analyzeOutput(output: string): Promise<string> {
		const systemPrompt = `You are a terminal output analyzer. Analyze command output and provide insights.
		
Look for:
- Errors and their likely causes
- Important information or warnings
- Suggested next steps
- Performance insights`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: `Analyze this terminal output:\n\n${output}` }
		]);

		return response;
	}

	async suggestFix(command: string, error: string): Promise<string> {
		const systemPrompt = `You are a command troubleshooter. Suggest fixes for failed commands.
		
Provide:
- Likely cause of the error
- Corrected command
- Alternative approaches
- Prevention tips`;

		const response = await this.aiService.chat([
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: `Command failed:\nCommand: ${command}\nError: ${error}\n\nSuggest a fix.` }
		]);

		return response;
	}
}

registerSingleton(ITerminalAIService, TerminalAIService, true);

// Terminal AI Commands
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

CommandsRegistry.registerCommand('troubleshoot.ai.terminal.generateCommand', async (accessor) => {
	const terminalAIService = accessor.get(ITerminalAIService);
	const quickInputService = accessor.get(IQuickInputService);
	const terminalService = accessor.get(ITerminalService);
	const notificationService = accessor.get(INotificationService);

	try {
		const description = await quickInputService.input({
			prompt: localize('generateCommandPrompt', 'Describe what you want to do'),
			placeholder: localize('generateCommandPlaceholder', 'e.g., "find all JavaScript files modified in the last week"')
		});

		if (!description) {
			return;
		}

		// Get current working directory context
		const activeTerminal = terminalService.activeInstance;
		const context = activeTerminal ? `Working directory: ${activeTerminal.cwd}` : undefined;

		const command = await terminalAIService.generateCommand(description, context);

		// Show the generated command and ask for confirmation
		const shouldExecute = await quickInputService.pick([
			{ label: localize('executeCommand', 'Execute: {0}', command), picked: true },
			{ label: localize('copyCommand', 'Copy to clipboard') },
			{ label: localize('editCommand', 'Edit command') }
		], {
			placeHolder: localize('commandAction', 'What would you like to do with this command?')
		});

		if (!shouldExecute) {
			return;
		}

		if (shouldExecute.label.startsWith('Execute')) {
			// Execute the command in the terminal
			if (activeTerminal) {
				activeTerminal.sendText(command, true);
			} else {
				const newTerminal = terminalService.createTerminal();
				newTerminal.sendText(command, true);
			}
		} else if (shouldExecute.label.startsWith('Copy')) {
			// Copy to clipboard
			await navigator.clipboard.writeText(command);
			notificationService.info(localize('commandCopied', 'Command copied to clipboard'));
		} else if (shouldExecute.label.startsWith('Edit')) {
			// Allow editing the command
			const editedCommand = await quickInputService.input({
				prompt: localize('editCommandPrompt', 'Edit the command'),
				value: command
			});

			if (editedCommand && activeTerminal) {
				activeTerminal.sendText(editedCommand, true);
			}
		}

	} catch (error) {
		notificationService.error(localize('generateCommandError', 'Failed to generate command: {0}', error instanceof Error ? error.message : 'Unknown error'));
	}
});

CommandsRegistry.registerCommand('troubleshoot.ai.terminal.explainCommand', async (accessor) => {
	const terminalAIService = accessor.get(ITerminalAIService);
	const quickInputService = accessor.get(IQuickInputService);
	const notificationService = accessor.get(INotificationService);

	try {
		const command = await quickInputService.input({
			prompt: localize('explainCommandPrompt', 'Enter the command to explain'),
			placeholder: localize('explainCommandPlaceholder', 'e.g., "grep -r TODO ."')
		});

		if (!command) {
			return;
		}

		const explanation = await terminalAIService.explainCommand(command);
		notificationService.info(explanation, { sticky: true });

	} catch (error) {
		notificationService.error(localize('explainCommandError', 'Failed to explain command: {0}', error instanceof Error ? error.message : 'Unknown error'));
	}
});

CommandsRegistry.registerCommand('troubleshoot.ai.terminal.analyzeOutput', async (accessor) => {
	const terminalAIService = accessor.get(ITerminalAIService);
	const terminalService = accessor.get(ITerminalService);
	const notificationService = accessor.get(INotificationService);

	try {
		const activeTerminal = terminalService.activeInstance;
		if (!activeTerminal) {
			notificationService.warn(localize('noActiveTerminal', 'No active terminal found'));
			return;
		}

		// Get terminal buffer content (this is a simplified approach)
		// In a real implementation, you'd need to access the terminal's buffer
		const output = 'Terminal output analysis would go here';

		const analysis = await terminalAIService.analyzeOutput(output);
		notificationService.info(analysis, { sticky: true });

	} catch (error) {
		notificationService.error(localize('analyzeOutputError', 'Failed to analyze output: {0}', error instanceof Error ? error.message : 'Unknown error'));
	}
});

// Register terminal context menu items
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';

MenuRegistry.appendMenuItem(MenuId.TerminalContext, {
	command: {
		id: 'troubleshoot.ai.terminal.generateCommand',
		title: localize('generateCommand', 'Generate Command with AI')
	},
	group: 'ai'
});

MenuRegistry.appendMenuItem(MenuId.TerminalContext, {
	command: {
		id: 'troubleshoot.ai.terminal.explainCommand',
		title: localize('explainCommand', 'Explain Command with AI')
	},
	group: 'ai'
});

MenuRegistry.appendMenuItem(MenuId.TerminalContext, {
	command: {
		id: 'troubleshoot.ai.terminal.analyzeOutput',
		title: localize('analyzeOutput', 'Analyze Output with AI')
	},
	group: 'ai'
});