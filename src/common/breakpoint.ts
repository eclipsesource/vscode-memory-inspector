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
import { DebugRequestTypes } from './debug-requests';

export interface TrackedBreakpoint {
    type: TrackedBreakpointType;
    breakpoint: DebugProtocol.DataBreakpoint;
    /**
     * The respective response for the breakpoint.
     */
    response: DebugProtocol.SetDataBreakpointsResponse['body']['breakpoints'][0]
}

export interface TrackedBreakpoints {
    /**
     * Breakpoints set from external contributors.
     */
    external: TrackedBreakpoint[],
    /**
     * Breakpoints set from us.
     */
    internal: TrackedBreakpoint[]
}

export type TrackedBreakpointType = 'internal' | 'external';

export type SetDataBreakpointsArguments = DebugRequestTypes['setDataBreakpoints'][0];
export type SetDataBreakpointsResult = DebugRequestTypes['setDataBreakpoints'][1];
