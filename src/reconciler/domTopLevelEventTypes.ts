
/**
 * To identify top level events in ReactDOM, we use constants defined by this
 * module. This is the only module that uses the unsafe* methods to express
 * that the constants actually correspond to the browser event names. This lets
 * us save some bundle size by avoiding a top level type -> event name map.
 * The rest of ReactDOM code should import top level types from this file.
 */
export const TOP_ABORT = unsafeCastStringToDOMTopLevelType('abort');
export const TOP_BLUR = unsafeCastStringToDOMTopLevelType('blur');
export const TOP_CAN_PLAY = unsafeCastStringToDOMTopLevelType('canplay');
export const TOP_CAN_PLAY_THROUGH = unsafeCastStringToDOMTopLevelType(
    'canplaythrough',
);
export const TOP_CANCEL = unsafeCastStringToDOMTopLevelType('cancel');
export const TOP_CHANGE = unsafeCastStringToDOMTopLevelType('change');
export const TOP_CLICK = unsafeCastStringToDOMTopLevelType('click');
export const TOP_CLOSE = unsafeCastStringToDOMTopLevelType('close');
export const TOP_COMPOSITION_END = unsafeCastStringToDOMTopLevelType(
    'compositionend',
);
export const TOP_COMPOSITION_START = unsafeCastStringToDOMTopLevelType(
    'compositionstart',
);
export const TOP_COMPOSITION_UPDATE = unsafeCastStringToDOMTopLevelType(
    'compositionupdate',
);
export const TOP_CONTEXT_MENU = unsafeCastStringToDOMTopLevelType(
    'contextmenu',
);
export const TOP_COPY = unsafeCastStringToDOMTopLevelType('copy');
export const TOP_CUT = unsafeCastStringToDOMTopLevelType('cut');
export const TOP_DOUBLE_CLICK = unsafeCastStringToDOMTopLevelType('dblclick');
export const TOP_AUX_CLICK = unsafeCastStringToDOMTopLevelType('auxclick');
export const TOP_DRAG = unsafeCastStringToDOMTopLevelType('drag');
export const TOP_DRAG_END = unsafeCastStringToDOMTopLevelType('dragend');
export const TOP_DRAG_ENTER = unsafeCastStringToDOMTopLevelType('dragenter');
export const TOP_DRAG_EXIT = unsafeCastStringToDOMTopLevelType('dragexit');
export const TOP_DRAG_LEAVE = unsafeCastStringToDOMTopLevelType('dragleave');
export const TOP_DRAG_OVER = unsafeCastStringToDOMTopLevelType('dragover');
export const TOP_DRAG_START = unsafeCastStringToDOMTopLevelType('dragstart');
export const TOP_DROP = unsafeCastStringToDOMTopLevelType('drop');
export const TOP_DURATION_CHANGE = unsafeCastStringToDOMTopLevelType(
    'durationchange',
);
export const TOP_EMPTIED = unsafeCastStringToDOMTopLevelType('emptied');
export const TOP_ENCRYPTED = unsafeCastStringToDOMTopLevelType('encrypted');
export const TOP_ENDED = unsafeCastStringToDOMTopLevelType('ended');
export const TOP_ERROR = unsafeCastStringToDOMTopLevelType('error');
export const TOP_FOCUS = unsafeCastStringToDOMTopLevelType('focus');
export const TOP_GOT_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType(
    'gotpointercapture',
);
export const TOP_INPUT = unsafeCastStringToDOMTopLevelType('input');
export const TOP_INVALID = unsafeCastStringToDOMTopLevelType('invalid');
export const TOP_KEY_DOWN = unsafeCastStringToDOMTopLevelType('keydown');
export const TOP_KEY_PRESS = unsafeCastStringToDOMTopLevelType('keypress');
export const TOP_KEY_UP = unsafeCastStringToDOMTopLevelType('keyup');
export const TOP_LOAD = unsafeCastStringToDOMTopLevelType('load');
export const TOP_LOAD_START = unsafeCastStringToDOMTopLevelType('loadstart');
export const TOP_LOADED_DATA = unsafeCastStringToDOMTopLevelType('loadeddata');
export const TOP_LOADED_METADATA = unsafeCastStringToDOMTopLevelType(
    'loadedmetadata',
);
export const TOP_LOST_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType(
    'lostpointercapture',
);
export const TOP_MOUSE_DOWN = unsafeCastStringToDOMTopLevelType('mousedown');
export const TOP_MOUSE_MOVE = unsafeCastStringToDOMTopLevelType('mousemove');
export const TOP_MOUSE_OUT = unsafeCastStringToDOMTopLevelType('mouseout');
export const TOP_MOUSE_OVER = unsafeCastStringToDOMTopLevelType('mouseover');
export const TOP_MOUSE_UP = unsafeCastStringToDOMTopLevelType('mouseup');
export const TOP_PASTE = unsafeCastStringToDOMTopLevelType('paste');
export const TOP_PAUSE = unsafeCastStringToDOMTopLevelType('pause');
export const TOP_PLAY = unsafeCastStringToDOMTopLevelType('play');
export const TOP_PLAYING = unsafeCastStringToDOMTopLevelType('playing');
export const TOP_POINTER_CANCEL = unsafeCastStringToDOMTopLevelType(
    'pointercancel',
);
export const TOP_POINTER_DOWN = unsafeCastStringToDOMTopLevelType(
    'pointerdown',
);
export const TOP_POINTER_ENTER = unsafeCastStringToDOMTopLevelType(
    'pointerenter',
);
export const TOP_POINTER_LEAVE = unsafeCastStringToDOMTopLevelType(
    'pointerleave',
);
export const TOP_POINTER_MOVE = unsafeCastStringToDOMTopLevelType(
    'pointermove',
);
export const TOP_POINTER_OUT = unsafeCastStringToDOMTopLevelType('pointerout');
export const TOP_POINTER_OVER = unsafeCastStringToDOMTopLevelType(
    'pointerover',
);
export const TOP_POINTER_UP = unsafeCastStringToDOMTopLevelType('pointerup');
export const TOP_PROGRESS = unsafeCastStringToDOMTopLevelType('progress');
export const TOP_RATE_CHANGE = unsafeCastStringToDOMTopLevelType('ratechange');
export const TOP_RESET = unsafeCastStringToDOMTopLevelType('reset');
export const TOP_SCROLL = unsafeCastStringToDOMTopLevelType('scroll');
export const TOP_SEEKED = unsafeCastStringToDOMTopLevelType('seeked');
export const TOP_SEEKING = unsafeCastStringToDOMTopLevelType('seeking');
export const TOP_SELECTION_CHANGE = unsafeCastStringToDOMTopLevelType(
    'selectionchange',
);
export const TOP_STALLED = unsafeCastStringToDOMTopLevelType('stalled');
export const TOP_SUBMIT = unsafeCastStringToDOMTopLevelType('submit');
export const TOP_SUSPEND = unsafeCastStringToDOMTopLevelType('suspend');
export const TOP_TEXT_INPUT = unsafeCastStringToDOMTopLevelType('textInput');
export const TOP_TIME_UPDATE = unsafeCastStringToDOMTopLevelType('timeupdate');
export const TOP_TOGGLE = unsafeCastStringToDOMTopLevelType('toggle');
export const TOP_TOUCH_CANCEL = unsafeCastStringToDOMTopLevelType(
    'touchcancel',
);
export const TOP_TOUCH_END = unsafeCastStringToDOMTopLevelType('touchend');
export const TOP_TOUCH_MOVE = unsafeCastStringToDOMTopLevelType('touchmove');
export const TOP_TOUCH_START = unsafeCastStringToDOMTopLevelType('touchstart');
// export const TOP_TRANSITION_END = unsafeCastStringToDOMTopLevelType(
//     getVendorPrefixedEventName('transitionend'),
// );
export const TOP_VOLUME_CHANGE = unsafeCastStringToDOMTopLevelType(
    'volumechange',
);
export const TOP_WAITING = unsafeCastStringToDOMTopLevelType('waiting');
export const TOP_WHEEL = unsafeCastStringToDOMTopLevelType('wheel');

export const TOP_AFTER_BLUR = unsafeCastStringToDOMTopLevelType('afterblur');
export const TOP_BEFORE_BLUR = unsafeCastStringToDOMTopLevelType('beforeblur');

// List of events that need to be individually attached to media elements.
// Note that events in this list will *not* be listened to at the top level
// unless they're explicitly whitelisted in `ReactBrowserEventEmitter.listenTo`.
export const mediaEventTypes = [
    TOP_ABORT,
    TOP_CAN_PLAY,
    TOP_CAN_PLAY_THROUGH,
    TOP_DURATION_CHANGE,
    TOP_EMPTIED,
    TOP_ENCRYPTED,
    TOP_ENDED,
    TOP_ERROR,
    TOP_LOADED_DATA,
    TOP_LOADED_METADATA,
    TOP_LOAD_START,
    TOP_PAUSE,
    TOP_PLAY,
    TOP_PLAYING,
    TOP_PROGRESS,
    TOP_RATE_CHANGE,
    TOP_SEEKED,
    TOP_SEEKING,
    TOP_STALLED,
    TOP_SUSPEND,
    TOP_TIME_UPDATE,
    TOP_VOLUME_CHANGE,
    TOP_WAITING,
];

export function getRawEventName(topLevelType: string): string {
    return unsafeCastDOMTopLevelTypeToString(topLevelType);
}

export function unsafeCastStringToDOMTopLevelType(s: string){
    return s;
}

export function unsafeCastDOMTopLevelTypeToString(s: string) {
    return s;
}

export const capturePhaseEvents: Set<any> = new Set([
    TOP_FOCUS,
    TOP_BLUR,
    TOP_SCROLL,
    TOP_LOAD,
    TOP_ABORT,
    TOP_CANCEL,
    TOP_CLOSE,
    TOP_INVALID,
    TOP_RESET,
    TOP_SUBMIT,
    TOP_ABORT,
    TOP_CAN_PLAY,
    TOP_CAN_PLAY_THROUGH,
    TOP_DURATION_CHANGE,
    TOP_EMPTIED,
    TOP_ENCRYPTED,
    TOP_ENDED,
    TOP_ERROR,
    TOP_LOADED_DATA,
    TOP_LOADED_METADATA,
    TOP_LOAD_START,
    TOP_PAUSE,
    TOP_PLAY,
    TOP_PLAYING,
    TOP_PROGRESS,
    TOP_RATE_CHANGE,
    TOP_SEEKED,
    TOP_SEEKING,
    TOP_STALLED,
    TOP_SUSPEND,
    TOP_TIME_UPDATE,
    TOP_VOLUME_CHANGE,
    TOP_WAITING,
]);

export function getListenerMapKey(
    topLevelType: any,
    capture: boolean,
): string {
    return `${getRawEventName(topLevelType)}__${capture ? 'capture' : 'bubble'}`;
}

export function shouldUpgradeListener(
    listenerEntry: any,
    passive: void | boolean,
): boolean {
    return (
        listenerEntry !== undefined && listenerEntry.passive === true && !passive
    );
}

export function removeTrappedEventListener(
    targetContainer: EventTarget,
    topLevelType: any,
    capture: boolean,
    listener: any,
): void {
    const rawEventName = getRawEventName(topLevelType);
    removeEventListener(targetContainer, rawEventName, listener, capture);
}

export function removeEventListener(
    target: EventTarget,
    eventType: string,
    listener: any,
    capture: boolean,
): void {
    target.removeEventListener(eventType, listener, capture);
}

export function addTrappedEventListener(
    targetContainer: any,
    topLevelType: any,
    eventSystemFlags: any,
    capture: boolean,
    isDeferredListenerForLegacyFBSupport?: boolean,
    passive?: boolean,
    priority?: any,
) {
    // TODO: 事件系统
    return targetContainer.addEventListener((e) => {
        console.log('触发事件', e)
    })


//     let listener = createEventListenerWrapperWithPriority(
//         targetContainer,
//         topLevelType,
//         eventSystemFlags,
//         priority,
//     );
//     // If passive option is not supported, then the event will be
//     // active and not passive.
//     if (passive === true && !passiveBrowserEventsSupported) {
//     passive = false;
// }
//
// targetContainer =
//     enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport
//         ? (targetContainer: any).ownerDocument
//     : targetContainer;
//
// const rawEventName = getRawEventName(topLevelType);
//
// let unsubscribeListener;
// // When legacyFBSupport is enabled, it's for when we
// // want to add a one time event listener to a container.
// // This should only be used with enableLegacyFBSupport
// // due to requirement to provide compatibility with
// // internal FB www event tooling. This works by removing
// // the event listener as soon as it is invoked. We could
// // also attempt to use the {once: true} param on
// // addEventListener, but that requires support and some
// // browsers do not support this today, and given this is
// // to support legacy code patterns, it's likely they'll
// // need support for such browsers.
// if (enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport) {
//     const originalListener = listener;
//     listener = function(...p) {
//         try {
//             return originalListener.apply(this, p);
//         } finally {
//             removeEventListener(
//                 targetContainer,
//                 rawEventName,
//                 unsubscribeListener,
//                 capture,
//             );
//         }
//     };
// }
// if (capture) {
//     if (enableCreateEventHandleAPI && passive !== undefined) {
//         unsubscribeListener = addEventCaptureListenerWithPassiveFlag(
//             targetContainer,
//             rawEventName,
//             listener,
//             passive,
//         );
//     } else {
//         unsubscribeListener = addEventCaptureListener(
//             targetContainer,
//             rawEventName,
//             listener,
//         );
//     }
// } else {
//     if (enableCreateEventHandleAPI && passive !== undefined) {
//         unsubscribeListener = addEventBubbleListenerWithPassiveFlag(
//             targetContainer,
//             rawEventName,
//             listener,
//             passive,
//         );
//     } else {
//         unsubscribeListener = addEventBubbleListener(
//             targetContainer,
//             rawEventName,
//             listener,
//         );
//     }
// }
// return unsubscribeListener;
}
