import {IFiber as Fiber} from "../type";
import {Incomplete, NoEffect, PerformedWork, Update} from "../share/SideEffectTags";
import {Lanes, SyncLane} from "./fiberLanes";
import {
    ClassComponent,
    FunctionComponent,
    HostComponent,
    HostRoot,
    HostText,
    IndeterminateComponent
} from "../share/WorkTag";

let workInProgress: any = null;

function completeUnitOfWork(unitOfWork: Fiber): void {

    let completedWork = unitOfWork;
    do {
        const current = completedWork.alternate;
        const returnFiber = completedWork.return;

        if ((completedWork.effectTag & Incomplete) === NoEffect) {
            let next;
            next = completeWork(current, completedWork, SyncLane);

            if (next !== null) {
                // Completing this fiber spawned new work. Work on that next.
                workInProgress = next;
                return;
            }


            if (
                returnFiber !== null &&
                // Do not append effects to parents if a sibling failed to complete
                (returnFiber.effectTag & Incomplete) === NoEffect
            ) {
                // Append all the effects of the subtree and this fiber onto the effect
                // list of the parent. The completion order of the children affects the
                // side-effect order.
                if (returnFiber.firstEffect === null) {
                    returnFiber.firstEffect = completedWork.firstEffect;
                }
                if (completedWork.lastEffect !== null) {
                    if (returnFiber.lastEffect !== null) {
                        returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
                    }
                    returnFiber.lastEffect = completedWork.lastEffect;
                }

                // If this fiber had side-effects, we append it AFTER the children's
                // side-effects. We can perform certain side-effects earlier if needed,
                // by doing multiple passes over the effect list. We don't want to
                // schedule our own side-effect on our own list because if end up
                // reusing children we'll schedule this effect onto itself since we're
                // at the end.
                const effectTag = completedWork.effectTag;

                // Skip both NoWork and PerformedWork tags when creating the effect
                // list. PerformedWork effect is read by React DevTools but shouldn't be
                // committed.
                if (effectTag > PerformedWork) {
                    if (returnFiber.lastEffect !== null) {
                        returnFiber.lastEffect.nextEffect = completedWork;
                    } else {
                        returnFiber.firstEffect = completedWork;
                    }
                    returnFiber.lastEffect = completedWork;
                }
            }
        }

        const siblingFiber = completedWork.sibling;
        if (siblingFiber !== null) {
            // If there is more work to do in this returnFiber, do that next.
            workInProgress = siblingFiber;
            return;
        }
        // Otherwise, return to the parent
        completedWork = returnFiber;
        workInProgress = completedWork;
    } while (completedWork !== null);
}


function completeWork(
    current: Fiber | null,
    workInProgress: Fiber,
    renderLanes: Lanes,
): Fiber | null {
    const newProps = workInProgress.pendingProps;

    switch (workInProgress.tag) {
        case IndeterminateComponent:
        case FunctionComponent:
        case ClassComponent: {
            const Component = workInProgress.type;
            return null;
        }
        case HostRoot: {
            const fiberRoot = workInProgress.stateNode;
            updateHostContainer(workInProgress);
            return null;
        }
        case HostComponent: {
            const type = workInProgress.type;
            if (current !== null && workInProgress.stateNode != null) {
                updateHostComponent(
                    current,
                    workInProgress,
                    type,
                    newProps,
                );
            } else {
                if (!newProps) {
                    return null;
                }
            }
            return null;
        }
        case HostText: {
            const newText = newProps;
            if (current && workInProgress.stateNode != null) {
                const oldText = current.memoizedProps;
                // If we have an alternate, that means this is an update and we need
                // to schedule a side-effect to do the updates.
                updateHostText(current, workInProgress, oldText, newText);
            } else {
                if (typeof newText !== 'string') {
                }
                workInProgress.stateNode = createTextInstance(
                    newText,
                );
            }
            return null;
        }
    }
}

function updateHostContainer (workInProgress: Fiber) {
    // const portalOrRoot: {
    //     containerInfo: any,
    // } = workInProgress.stateNode;
    // const childrenUnchanged = workInProgress.firstEffect === null;
    // if (childrenUnchanged) {
    //     // No changes, just reuse the existing instance.
    // } else {
    //     const container = portalOrRoot.containerInfo;
    //     const newChildSet = createContainerChildSet(container);
    //     // If children might have changed, we have to add them all to the set.
    //     appendAllChildrenToContainer(newChildSet, workInProgress, false, false);
    //     portalOrRoot.pendingChildren = newChildSet;
    //     // Schedule an update on the container to swap out the container.
    //     markUpdate(workInProgress);
    //     finalizeContainerChildren(container, newChildSet);
    // }
}


const updateHostComponent = function(
    current: Fiber,
    workInProgress: Fiber,
    type: Type,
    newProps: Props,
) {
    // If we have an alternate, that means this is an update and we need to
    // schedule a side-effect to do the updates.
    const oldProps = current.memoizedProps;
    if (oldProps === newProps) {
        // In mutation mode, this is sufficient for a bailout because
        // we won't touch this node even if children changed.
        return;
    }
    const instance: any = workInProgress.stateNode;

    const updatePayload = prepareUpdate(
        instance,
        type,
        oldProps,
        newProps,
        rootContainerInstance,
    );
    workInProgress.updateQueue = updatePayload;
    if (updatePayload) {
        markUpdate(workInProgress);
    }
};

function markUpdate(workInProgress: Fiber) {
    // Tag the fiber with an update effect. This turns a Placement into
    // a PlacementAndUpdate.
    workInProgress.effectTag |= Update;
}

const updateHostText = function(
    current: Fiber,
    workInProgress: Fiber,
    oldText: string,
    newText: string,
) {
    // If the text differs, mark it as an update. All the work in done in commitWork.
    if (oldText !== newText) {
        markUpdate(workInProgress);
    }
};

export function createTextInstance(
    text: string,
) {

    const textNode = createTextNode(text);
    return textNode;
}

export function createTextNode(
    text: string,
): Text {
    return getOwnerDocumentFromRootContainer(null).createTextNode(
        text,
    );
}

function getOwnerDocumentFromRootContainer(
    rootContainerElement: Element | Document,
): Document {
    return document;
}

export function prepareUpdate(
    domElement: any,
    type: string,
    oldProps: any,
    newProps: any,
    rootContainerInstance: any,
): null | Array<any> {
    return diffProperties(
        domElement,
        type,
        oldProps,
        newProps,
        rootContainerInstance,
    );
}

export function diffProperties(
    domElement: Element,
    tag: string,
    lastRawProps: Object,
    nextRawProps: Object,
    rootContainerElement: Element | Document,
): null | Array<any> {

    let updatePayload: any = null;

    let lastProps: Object;
    let nextProps: Object;
    switch (tag) {
        case 'input':
            lastProps = ReactDOMInputGetHostProps(domElement, lastRawProps);
            nextProps = ReactDOMInputGetHostProps(domElement, nextRawProps);
            updatePayload = [];
            break;
        case 'option':
            lastProps = ReactDOMOptionGetHostProps(domElement, lastRawProps);
            nextProps = ReactDOMOptionGetHostProps(domElement, nextRawProps);
            updatePayload = [];
            break;
        case 'select':
            lastProps = ReactDOMSelectGetHostProps(domElement, lastRawProps);
            nextProps = ReactDOMSelectGetHostProps(domElement, nextRawProps);
            updatePayload = [];
            break;
        case 'textarea':
            lastProps = ReactDOMTextareaGetHostProps(domElement, lastRawProps);
            nextProps = ReactDOMTextareaGetHostProps(domElement, nextRawProps);
            updatePayload = [];
            break;
        default:
            lastProps = lastRawProps;
            nextProps = nextRawProps;
            if (
                typeof lastProps.onClick !== 'function' &&
                typeof nextProps.onClick === 'function'
            ) {
                // TODO: This cast may not be sound for SVG, MathML or custom elements.
                trapClickOnNonInteractiveElement(((domElement: any): HTMLElement));
            }
            break;
    }

    assertValidProps(tag, nextProps);

    let propKey;
    let styleName;
    let styleUpdates = null;
    for (propKey in lastProps) {
        if (
            nextProps.hasOwnProperty(propKey) ||
            !lastProps.hasOwnProperty(propKey) ||
            lastProps[propKey] == null
        ) {
            continue;
        }
        if (propKey === STYLE) {
            const lastStyle = lastProps[propKey];
            for (styleName in lastStyle) {
                if (lastStyle.hasOwnProperty(styleName)) {
                    if (!styleUpdates) {
                        styleUpdates = {};
                    }
                    styleUpdates[styleName] = '';
                }
            }
        } else if (propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN) {
            // Noop. This is handled by the clear text mechanism.
        } else if (
            (enableDeprecatedFlareAPI && propKey === DEPRECATED_flareListeners) ||
            propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
            propKey === SUPPRESS_HYDRATION_WARNING
        ) {
            // Noop
        } else if (propKey === AUTOFOCUS) {
            // Noop. It doesn't work on updates anyway.
        } else if (registrationNameDependencies.hasOwnProperty(propKey)) {
            // This is a special case. If any listener updates we need to ensure
            // that the "current" fiber pointer gets updated so we need a commit
            // to update this element.
            if (!updatePayload) {
                updatePayload = [];
            }
        } else {
            // For all other deleted properties we add it to the queue. We use
            // the allowed property list in the commit phase instead.
            (updatePayload = updatePayload || []).push(propKey, null);
        }
    }
    for (propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps != null ? lastProps[propKey] : undefined;
        if (
            !nextProps.hasOwnProperty(propKey) ||
            nextProp === lastProp ||
            (nextProp == null && lastProp == null)
        ) {
            continue;
        }
        if (propKey === STYLE) {
            if (__DEV__) {
                if (nextProp) {
                    // Freeze the next style object so that we can assume it won't be
                    // mutated. We have already warned for this in the past.
                    Object.freeze(nextProp);
                }
            }
            if (lastProp) {
                // Unset styles on `lastProp` but not on `nextProp`.
                for (styleName in lastProp) {
                    if (
                        lastProp.hasOwnProperty(styleName) &&
                        (!nextProp || !nextProp.hasOwnProperty(styleName))
                    ) {
                        if (!styleUpdates) {
                            styleUpdates = {};
                        }
                        styleUpdates[styleName] = '';
                    }
                }
                // Update styles that changed since `lastProp`.
                for (styleName in nextProp) {
                    if (
                        nextProp.hasOwnProperty(styleName) &&
                        lastProp[styleName] !== nextProp[styleName]
                    ) {
                        if (!styleUpdates) {
                            styleUpdates = {};
                        }
                        styleUpdates[styleName] = nextProp[styleName];
                    }
                }
            } else {
                // Relies on `updateStylesByID` not mutating `styleUpdates`.
                if (!styleUpdates) {
                    if (!updatePayload) {
                        updatePayload = [];
                    }
                    updatePayload.push(propKey, styleUpdates);
                }
                styleUpdates = nextProp;
            }
        } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
            const nextHtml = nextProp ? nextProp[HTML] : undefined;
            const lastHtml = lastProp ? lastProp[HTML] : undefined;
            if (nextHtml != null) {
                if (lastHtml !== nextHtml) {
                    (updatePayload = updatePayload || []).push(propKey, nextHtml);
                }
            } else {
                // TODO: It might be too late to clear this if we have children
                // inserted already.
            }
        } else if (propKey === CHILDREN) {
            if (typeof nextProp === 'string' || typeof nextProp === 'number') {
                (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
            }
        } else if (
            (enableDeprecatedFlareAPI && propKey === DEPRECATED_flareListeners) ||
            propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
            propKey === SUPPRESS_HYDRATION_WARNING
        ) {
            // Noop
        } else if (registrationNameDependencies.hasOwnProperty(propKey)) {
            if (nextProp != null) {
                // We eagerly listen to this even though we haven't committed yet.
                if (__DEV__ && typeof nextProp !== 'function') {
                    warnForInvalidEventListener(propKey, nextProp);
                }
                ensureListeningTo(rootContainerElement, propKey);
            }
            if (!updatePayload && lastProp !== nextProp) {
                // This is a special case. If any listener updates we need to ensure
                // that the "current" props pointer gets updated so we need a commit
                // to update this element.
                updatePayload = [];
            }
        } else if (
            typeof nextProp === 'object' &&
            nextProp !== null &&
            nextProp.$$typeof === REACT_OPAQUE_ID_TYPE
        ) {
            // If we encounter useOpaqueReference's opaque object, this means we are hydrating.
            // In this case, call the opaque object's toString function which generates a new client
            // ID so client and server IDs match and throws to rerender.
            nextProp.toString();
        } else {
            // For any other property we always add it to the queue and then we
            // filter it out using the allowed property list during the commit.
            (updatePayload = updatePayload || []).push(propKey, nextProp);
        }
    }
    if (styleUpdates) {
        if (__DEV__) {
            validateShorthandPropertyCollisionInDev(styleUpdates, nextProps[STYLE]);
        }
        (updatePayload = updatePayload || []).push(STYLE, styleUpdates);
    }
    return updatePayload;
}
