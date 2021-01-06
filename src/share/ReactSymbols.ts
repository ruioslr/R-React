/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
export const REACT_ELEMENT_TYPE = 0xeac7;
export const REACT_PORTAL_TYPE = 0xeaca;
export const REACT_FRAGMENT_TYPE = 0xeacb;
export const REACT_STRICT_MODE_TYPE = 0xeacc;
export const REACT_PROFILER_TYPE = 0xead2;
export const REACT_PROVIDER_TYPE = 0xeacd;
export const REACT_CONTEXT_TYPE = 0xeace;
export const REACT_FORWARD_REF_TYPE = 0xead0;
export const REACT_SUSPENSE_TYPE = 0xead1;
export const REACT_SUSPENSE_LIST_TYPE = 0xead8;
export const REACT_MEMO_TYPE = 0xead3;
export const REACT_LAZY_TYPE = 0xead4;
export const REACT_BLOCK_TYPE = 0xead9;
export const REACT_SERVER_BLOCK_TYPE = 0xeada;
export const REACT_FUNDAMENTAL_TYPE = 0xead5;
export const REACT_RESPONDER_TYPE = 0xead6;
export const REACT_SCOPE_TYPE = 0xead7;
export const REACT_OPAQUE_ID_TYPE = 0xeae0;
export const REACT_DEBUG_TRACING_MODE_TYPE = 0xeae1;
export const REACT_OFFSCREEN_TYPE = 0xeae2;
export const REACT_LEGACY_HIDDEN_TYPE = 0xeae3;

const MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export function getIteratorFn(maybeIterable: any) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
