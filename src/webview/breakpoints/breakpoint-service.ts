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

import { DataBreakpoints, TrackedBreakpointType } from '../../common/breakpoint';

export interface BreakpointMetadata {
    type?: TrackedBreakpointType,
}

export class BreakpointService {
    protected dataBreakpoints: DataBreakpoints = { external: [], internal: [] };

    update(dataBreakpoints: DataBreakpoints): void {
        this.dataBreakpoints = dataBreakpoints;
    }

    isExternal(dataId: string): boolean {
        return this.dataBreakpoints.external.some(bp => bp.dataId === dataId);
    }

    isInternal(dataId: string): boolean {
        return this.dataBreakpoints.internal.some(bp => bp.dataId === dataId);
    }

    metadata(dataId: string): BreakpointMetadata | undefined {
        if (this.isExternal(dataId)) {
            return {
                type: 'external'
            };
        } else if (this.isInternal(dataId)) {
            return {
                type: 'internal'
            };
        }

        return undefined;
    }
}

export namespace BreakpointService {
    export namespace style {
        export const dataBreakpoint = 'data-breakpoint';
        export const dataBreakpointExternal = 'data-breakpoint-external';
    }
}

export function breakpointClassNames(metadata?: BreakpointMetadata): string[] {
    const classes: string[] = [];

    if (metadata) {
        if (metadata.type === 'external') {
            classes.push(BreakpointService.style.dataBreakpoint, BreakpointService.style.dataBreakpointExternal);
        } else if (metadata.type === 'internal') {
            classes.push(BreakpointService.style.dataBreakpoint);
        }
    }

    return classes;
}

export const breakpointService = new BreakpointService();
