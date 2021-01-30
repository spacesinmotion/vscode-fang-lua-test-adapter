import * as vscode from 'vscode';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { Log, TestAdapterRegistrar } from 'vscode-test-adapter-util';
import { FangLuaTestingAdapter } from './adapter';
import { copyFile, mkdir, existsSync } from 'fs';

export async function activate(context: vscode.ExtensionContext) {

	const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

	const log = new Log('FangLuaTesting', workspaceFolder, 'Fang Lua Testing Log');
	context.subscriptions.push(log);

	const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
	if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

	if (testExplorerExtension) {
		const testHub = testExplorerExtension.exports;

		context.subscriptions.push(new TestAdapterRegistrar(
			testHub,
			workspaceFolder => new FangLuaTestingAdapter(workspaceFolder, log),
			log
		));

	}

	const initworkspacecommand = vscode.commands.registerCommand('fangluatesting.initworkspace', () => {
		const path_to_fang = __dirname + '/../fang/fang.lua'
		const path = (vscode.workspace.workspaceFolders || [])[0].uri.path.normalize()
		if (existsSync(path + '/fang/fang.lua')) {
			vscode.window.showInformationMessage('Already initialized!');
			return
		}

		const copy_fang = () => {
			copyFile(path_to_fang, path + '/fang/fang.lua', (err) => {
				if (err)
					vscode.window.showErrorMessage("Failed to copy 'fang.lua'")
				else {
					const path_to_fang_runner = __dirname + '/../fang/fang-runner.lua'
					copyFile(path_to_fang_runner, path + '/fang/fang-runner.lua', (err) => {
						if (err)
							vscode.window.showErrorMessage("Failed to copy 'fang-runner.lua'")
						else
							vscode.window.showInformationMessage('Fang initialized!');
					});
				}
			});
		}

		if (existsSync(path + '/fang'))
			copy_fang();
		else {
			mkdir(path + '/fang', (err) => {
				if (err)
					vscode.window.showErrorMessage("Failed to create 'fang' directory " + path + '/fang')
				else
					copy_fang();
			});
		}
	});

	context.subscriptions.push(initworkspacecommand);
}
