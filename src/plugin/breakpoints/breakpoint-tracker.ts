/********************************************************************************
 * Copyright (C) 2024 EclipseSource.
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

import { DebugProtocol } from '@vscode/debugprotocol';
import * as vscode from 'vscode';
import { DataBreakpoints } from '../../common/breakpoint';
import { isDebugRequest, isDebugResponse } from '../../common/debug-requests';
import { SessionTracker } from '../session-tracker';

export interface TrackedBreakpoint {
    breakpoint: DebugProtocol.DataBreakpoint;
    response: DebugProtocol.SetDataBreakpointsResponse['body']['breakpoints'][0]
}

export interface TrackedBreakpoints {
    external: TrackedBreakpoint[],
    internal: TrackedBreakpoint[]
}

export class BreakpointTracker {
    protected _dataBreakpoints: TrackedBreakpoints = { external: [], internal: [] };
    protected dataBreakpointsRequest: Record<number, DebugProtocol.SetDataBreakpointsRequest> = {};

    private onDataBreakpointsChanged = new vscode.EventEmitter<DataBreakpoints>();
    readonly onDataBreakpointChangedEvent = this.onDataBreakpointsChanged.event;

    private onSetDataBreakpointResponse = new vscode.EventEmitter<DebugProtocol.SetDataBreakpointsResponse>();
    readonly onSetDataBreakpointResponseEvent = this.onSetDataBreakpointResponse.event;

    notifySetDataBreakpointEnabled = true;

    get dataBreakpoints(): DataBreakpoints {
        return {
            external: this.externalDataBreakpoints,
            internal: this.internalDataBreakpoints
        };
    }

    get internalDataBreakpoints(): DebugProtocol.DataBreakpoint[] {
        return [...this._dataBreakpoints.internal.map(bp => bp.breakpoint)];
    }

    get externalDataBreakpoints(): DebugProtocol.DataBreakpoint[] {
        return [...this._dataBreakpoints.external.map(bp => bp.breakpoint)];
    }

    constructor(protected sessionTracker: SessionTracker) {
        this.sessionTracker.onSessionRequest(event => this.onSessionRequest(event));
        this.sessionTracker.onSessionResponse(event => this.onSessionResponse(event));
    }

    setInternal(response: DebugProtocol.SetDataBreakpointsResponse['body']['breakpoints']): void {
        this._dataBreakpoints.internal = [];

        const { external, internal } = this._dataBreakpoints;
        const ids = response.map(bp => bp.id);
        for (let i = 0; i < external.length; i++) {
            const tbp = external[i];
            if (ids.includes(tbp.response.id)) {
                internal.push(tbp);
            }
        }

        this._dataBreakpoints.external = external.filter(tbp => !ids.includes(tbp.response.id));
        this.fireDataBreakpoints();
    }

    protected onSessionRequest(event: DebugProtocol.Request): void {
        if (!this.sessionTracker.isActive) {
            return;
        }

        if (isDebugRequest('setDataBreakpoints', event)) {
            this.dataBreakpointsRequest[event.seq] = event;
        }
    }

    protected onSessionResponse(event: DebugProtocol.Response): void {
        if (!this.sessionTracker.isActive) {
            return;
        }

        if (isDebugResponse('setDataBreakpoints', event)) {
            this._dataBreakpoints.external = [];

            const { external } = this._dataBreakpoints;

            const request = this.dataBreakpointsRequest[event.request_seq];
            if (request) {
                if (event.success) {
                    for (let i = 0; i < event.body.breakpoints.length; i++) {
                        const response = event.body.breakpoints[i];
                        if (response.verified) {
                            external.push({
                                breakpoint: request.arguments.breakpoints[i],
                                response
                            });
                        }
                    }
                }

                delete this.dataBreakpointsRequest[request.seq];
            }

            if (this.notifySetDataBreakpointEnabled) {
                this.onSetDataBreakpointResponse.fire(event);
                this.fireDataBreakpoints();
            }
        }
    }

    protected fireDataBreakpoints(): void {
        this.onDataBreakpointsChanged.fire(this.dataBreakpoints);
    }
}
