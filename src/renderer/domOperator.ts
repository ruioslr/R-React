import {IFiber as Fiber} from "../type";
import {HostComponent, HostPortal, HostText} from "../share/WorkTag";
import {NoEffect, Update} from "../share/SideEffectTags";
import {markUpdate, prepareUpdate} from "../reconciler/completeWork";


let instanceCounter = 0;
let hostDiffCounter = 0;
let hostUpdateCounter = 0;
let hostCloneCounter = 0;

const UPPERCASE_CONTEXT = {};


export function updateHostContainer(workInProgress: Fiber) {
    const portalOrRoot: {
        containerInfo: any;
    } = workInProgress.stateNode;
    const childrenUnchanged = workInProgress.firstEffect === null;
    if (childrenUnchanged) {
        // No changes, just reuse the existing instance.
    } else {
        const container = portalOrRoot.containerInfo;
        const newChildSet = createContainerChildSet(container);
        // If children might have changed, we have to add them all to the set.
        appendAllChildrenToContainer(newChildSet, workInProgress, false, false);
        // portalOrRoot.pendingChildren = newChildSet;
        // Schedule an update on the container to swap out the container.
        markUpdate(workInProgress);
        finalizeContainerChildren(container, newChildSet);
    }
}

function createContainerChildSet(container: any): Array<any> {
    return [];
}

function appendAllChildrenToContainer(
    containerChildSet: any,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    let node = workInProgress.child;
    while (node !== null) {
        // eslint-disable-next-line no-labels
        branches: if (node.tag === HostComponent) {
            let instance = node.stateNode;
            if (needsVisibilityToggle && isHidden) {
                // This child is inside a timed out tree. Hide it.
                const props = node.memoizedProps;
                const type = node.type;
                instance = cloneHiddenInstance(instance, type, props, node);
            }
            appendChildToContainerChildSet(containerChildSet, instance);
        } else if (node.tag === HostText) {
            let instance = node.stateNode;
            if (needsVisibilityToggle && isHidden) {
                // This child is inside a timed out tree. Hide it.
                const text = node.memoizedProps;
                instance = cloneHiddenTextInstance(instance, text, node);
            }
            appendChildToContainerChildSet(containerChildSet, instance);
        } else if (node.tag === HostPortal) {
            // If we have a portal child, then we don't want to traverse
            // down its children. Instead, we'll get insertions from each child in
            // the portal directly.
        }else if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }
        if (node === workInProgress) {
            return;
        }
        while (node.sibling === null) {
            if (node.return === null || node.return === workInProgress) {
                return;
            }
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
};


export function updateHostComponent (
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

    const updatePayload = prepareUpdate(instance, type, oldProps, newProps);
    workInProgress.updateQueue = updatePayload;
    if (updatePayload) {
        markUpdate(workInProgress);
    }
};

function cloneHiddenInstance(
    instance: any,
    type: string,
    props: any,
    internalInstanceHandle: Object,
): any {
    const clone = cloneInstance(
        instance,
        null,
        type,
        props,
        props,
        internalInstanceHandle,
        true,
        null,
    );
    clone.hidden = true;
    return clone;
}

function cloneInstance(
    instance: any,
    updatePayload: null | Object,
    type: string,
    oldProps: any,
    newProps: any,
    internalInstanceHandle: Object,
    keepChildren: boolean,
    recyclableInstance: null | any,
): any {
    const clone = {
        id: instance.id,
        type: type,
        children: keepChildren ? instance.children : [],
        text: shouldSetTextContent(type, newProps)
            ? computeText(newProps.children + '', instance.context)
: null,
        prop: newProps.prop,
        hidden: newProps.hidden === true,
        context: instance.context,
};
    Object.defineProperty(clone, 'id', {
        value: clone.id,
        enumerable: false,
    });
    Object.defineProperty(clone, 'text', {
        value: clone.text,
        enumerable: false,
    });
    Object.defineProperty(clone, 'context', {
        value: clone.context,
        enumerable: false,
    });
    // hostCloneCounter++;
    return clone;
}

function shouldSetTextContent(type: string, props: any): boolean {
    if (type === 'errorInBeginPhase') {
        throw new Error('Error in host config.');
    }
    return (
        typeof props.children === 'string' || typeof props.children === 'number'
    );
}

function appendChildToContainerChildSet(
    childSet: Array<any>,
    child: any,
): void {
    childSet.push(child);
}

function cloneHiddenTextInstance(
    instance: any,
    text: string,
    internalInstanceHandle: Object,
): any {
    const clone = {
        text: instance.text,
        id: instanceCounter++,
        hidden: true,
        context: instance.context,
    };
    // Hide from unit tests
    Object.defineProperty(clone, 'id', {
        value: clone.id,
        enumerable: false,
    });
    Object.defineProperty(clone, 'context', {
        value: clone.context,
        enumerable: false,
    });
    return clone;
}


function finalizeContainerChildren(
    container: any,
    newChildren: Array<any>,
): void {
    container.pendingChildren = newChildren;
    if (
        newChildren.length === 1 &&
        newChildren[0] &&
        newChildren[0].text === 'Error when completing root'
    ) {
        // Trigger an error for testing purposes
        throw Error('Error when completing root');
    }
}

function computeText(rawText, hostContext) {
    return hostContext === UPPERCASE_CONTEXT ? rawText.toUpperCase() : rawText;
}
