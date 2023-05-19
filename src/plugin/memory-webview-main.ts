/********************************************************************************
 * Copyright (C) 2022 Ericsson, Arm and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as vscode from 'vscode';
import type { DebugProtocol } from '@vscode/debugprotocol';
import * as manifest from './manifest';
import { Messenger } from 'vscode-messenger';
import { WebviewIdMessageParticipant } from 'vscode-messenger-common';
import {
    readyType,
    logMessageType,
    setOptionsType,
    readMemoryType,
    writeMemoryType,
    MemoryReadResult,
    MemoryWriteResult,
    getVariables
} from '../common/messaging';
import { MemoryProvider } from './memory-provider';
import { outputChannelLogger } from './logger';
import { VariableRange } from '../common/memory-range';

interface Variable {
    name: string;
    value: string;
    variablesReference: number;
    memoryReference: number;
}

const isMemoryVariable = (variable: Variable): variable is Variable => variable && !!(variable as Variable).memoryReference;

export class MemoryWebview {
    public static ViewType = `${manifest.PACKAGE_NAME}.memory`;
    public static ShowCommandType = `${manifest.PACKAGE_NAME}.show`;
    public static VariableCommandType = `${manifest.PACKAGE_NAME}.show-variable`;

    protected messenger: Messenger;

    public constructor(protected extensionUri: vscode.Uri, protected memoryProvider: MemoryProvider) {
        this.messenger = new Messenger();
    }

    public activate(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand(MemoryWebview.ShowCommandType, () => this.show()),
            vscode.commands.registerCommand(MemoryWebview.VariableCommandType, node => {
                const variable = node.variable;
                if (isMemoryVariable(variable)) {
                    this.show({ memoryReference: variable.memoryReference.toString() });
                }
            })
        );
    };

    public async show(initialMemory?: Partial<DebugProtocol.ReadMemoryArguments>): Promise<void> {
        const distPathUri = vscode.Uri.joinPath(this.extensionUri, 'dist', 'views');
        const mediaPathUri = vscode.Uri.joinPath(this.extensionUri, 'media');
        const codiconPathUri = vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist');

        const options = {
            retainContextWhenHidden: true,
            enableScripts: true,                            // enable scripts in the webview
            localResourceRoots: [distPathUri, mediaPathUri, codiconPathUri] // restrict extension's local file access
        };

        const panel = vscode.window.createWebviewPanel(MemoryWebview.ViewType, 'Memory Inspector', vscode.ViewColumn.Active, options);

        // Set HTML content
        await this.getWebviewContent(panel);

        // Sets up an event listener to listen for messages passed from the webview view context
        // and executes code based on the message that is recieved
        this.setWebviewMessageListener(panel, initialMemory);
    }

    protected async getWebviewContent(panel: vscode.WebviewPanel): Promise<void> {
        const mainUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(
            this.extensionUri,
            'dist',
            'views',
            'memory.js'
        ));

        const cspSrc = panel.webview.cspSource;
        const codiconsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <meta http-equiv='Content-Security-Policy' content="default-src 'none'; font-src ${cspSrc}; style-src ${cspSrc} 'unsafe-inline'; script-src ${cspSrc};">
                    <script type='module' src='${mainUri}'></script>
                    <link href="${codiconsUri}" rel="stylesheet" />
                </head>
                <body>
                    <div id='root'></div>
                </body>
            </html>
        `;
    }

    protected setWebviewMessageListener(panel: vscode.WebviewPanel, options?: Partial<DebugProtocol.ReadMemoryArguments>): void {
        const participant = this.messenger.registerWebviewPanel(panel);

        const disposables = [
            this.messenger.onNotification(readyType, () => this.refresh(participant, options), { sender: participant }),
            this.messenger.onRequest(logMessageType, message => outputChannelLogger.info('[webview]:', message), { sender: participant }),
            this.messenger.onRequest(readMemoryType, request => this.readMemory(request), { sender: participant }),
            this.messenger.onRequest(writeMemoryType, request => this.writeMemory(request), { sender: participant }),
            this.messenger.onRequest(getVariables, request => this.getVariables(request), { sender: participant }),
            this.memoryProvider.onDidStopDebug(() => this.refresh(participant))
        ];

        panel.onDidDispose(() => disposables.forEach(disposible => disposible.dispose()));
    }

    protected async refresh(participant: WebviewIdMessageParticipant, options?: Partial<DebugProtocol.ReadMemoryArguments>): Promise<void> {
        this.messenger.sendRequest(setOptionsType, participant, options);
    }

    protected async readMemory(request: DebugProtocol.ReadMemoryArguments): Promise<MemoryReadResult> {
        try {
            return await this.memoryProvider.readMemory(request);
        } catch (err) {
            outputChannelLogger.error('Error fetching memory', err instanceof Error ? `: ${err.message}\n${err.stack}` : '');
        }
    }

    protected async writeMemory(request: DebugProtocol.WriteMemoryArguments): Promise<MemoryWriteResult> {
        try {
            return await this.memoryProvider.writeMemory(request);
        } catch (err) {
            outputChannelLogger.error('Error writing memory', err instanceof Error ? `: ${err.message}\n${err.stack}` : '');
        }
    }

    protected async getVariables(request: DebugProtocol.ReadMemoryArguments): Promise<VariableRange[]> {
        try {
            return await this.memoryProvider.getVariables(request);
        } catch (err) {
            outputChannelLogger.error('Error fetching variables', err instanceof Error ? `: ${err.message}\n${err.stack}` : '');
            return [];
        }
    }
}