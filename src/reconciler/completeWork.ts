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
import {REACT_OPAQUE_ID_TYPE} from "../share/ReactSymbols";

let workInProgress: any = null;

export const registrationNameDependencies = {};
export const STYLE = "style";


export function completeUnitOfWork(unitOfWork: Fiber): void {

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
    type: any,
    newProps: any,
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
    return getOwnerDocumentFromRootContainer().createTextNode(
        text,
    );
}

function getOwnerDocumentFromRootContainer(
): Document {
    return document;
}

export function prepareUpdate(
    domElement: any,
    type: string,
    oldProps: any,
    newProps: any,
): any {
    return diffProperties(
        domElement,
        type,
        oldProps,
        newProps,
    );
}

export function diffProperties(
    domElement: Element,
    tag: string,
    lastRawProps: Object,
    nextRawProps: Object,
): any {
    // TODO: 没有Diff
    return {};
}
