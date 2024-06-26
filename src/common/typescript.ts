/********************************************************************************
 * Copyright (C) 2024 EclipseSource and others.
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

export function tryToNumber(value?: string | number): number | undefined {
    const asNumber = Number(value);
    if (value === '' || isNaN(asNumber)) { return undefined; }
    return asNumber;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringifyWithBigInts(object: any, space?: string | number): any {
    return JSON.stringify(object, (_key, value) => typeof value === 'bigint' ? value.toString() : value, space);
}

export interface Change<T> {
    from: T;
    to: T;
}

export function hasChanged<T, P extends keyof T>(change: Change<T>, prop: P): boolean {
    return change.from[prop] !== change.to[prop];
}

export function hasChangedTo<T, P extends keyof T>(change: Change<T>, prop: P, value: T[P]): boolean {
    return change.from[prop] !== change.to[prop] && change.to[prop] === value;
}
