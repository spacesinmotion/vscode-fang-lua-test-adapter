import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestSuiteInfo, RetireEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';

import * as child_process from 'child_process';

export class LuaTestingAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly retireEmitter = new vscode.EventEmitter<RetireEvent>();

	private runningTestProcess: child_process.ChildProcess | undefined;

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get retire(): vscode.Event<RetireEvent> | undefined { return this.retireEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {
		this.log.info('Initializing lua adapter');
		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.retireEmitter);
	}

	async spawn_lua(args: string[], onStdOut: (o: string) => void, onFinish: () => void): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const lua_executable = <string>vscode.workspace.getConfiguration("luatesting", null).get("luaexecutatble");

			const path = this.workspace.uri.path.normalize().substr(1)
			this.runningTestProcess = child_process.spawn(lua_executable, ['testing.lua'].concat(args).concat([path]), {
				cwd: __dirname + '/../lua'
			});

			this.runningTestProcess.on('error', (err) => {
				this.log.error(`Failed to start subprocess. ${err}`);
				this.runningTestProcess = undefined
				onFinish()
				reject()
			});

			this.runningTestProcess.stdout?.on('data', (data) => {
				onStdOut(`${data}`)
			});

			this.runningTestProcess.stderr?.on('data', (data) => {
				const xx = `${data}`;
				this.log.error(`lua: ${xx}`);
				this.runningTestProcess = undefined;
				onFinish()
				reject()
			});

			this.runningTestProcess.once('exit', () => {
				this.runningTestProcess = undefined;
				onFinish()
				resolve();
			});
		});
	}

	async load(): Promise<void> {
		if (this.runningTestProcess) return

		this.log.info('Loading lua tests');

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });
		var suiteData = ""

		return this.spawn_lua(['suite'], (o: string) => {
			suiteData += o.trim()
		}, () => {
			const suite = <TestSuiteInfo>JSON.parse(suiteData)
			this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite });
			this.retireEmitter.fire(<RetireEvent>{ tests: ['root'] });
		});
	}

	async run(tests: string[]): Promise<void> {
		if (this.runningTestProcess) return

		this.log.info(`Running lua tests ${JSON.stringify(tests)}`);
		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

		return this.spawn_lua(['run'].concat(tests), (o: string) => {
			for (const l of o.split(/\r?\n/).filter(x => x)) {
				this.testStatesEmitter.fire(<TestEvent>JSON.parse(l))
			}
		}, () => {
			this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
		});
	}

	/*	implement this method if your TestAdapter supports debugging tests
		async debug(tests: string[]): Promise<void> {
			// start a test run in a child process and attach the debugger to it...
		}
	*/

	cancel(): void {
		if (this.runningTestProcess) {
			const ok = this.runningTestProcess.kill();
			console.log(`killed ${ok}`);
			this.runningTestProcess = undefined;
		}
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
