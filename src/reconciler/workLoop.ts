import {IFiber as Fiber, Update as UpdateType, UpdateQueue} from "../type";
import {Lane, Lanes, NoLane, NoLanes, NoTimestamp, SyncLane} from "./fiberLanes";
import {FiberRoot} from "../renderer";
import {
    Block,
    ClassComponent,
    ContextConsumer,
    ContextProvider,
    ForwardRef,
    Fragment,
    FunctionComponent,
    FundamentalComponent,
    HostComponent,
    HostPortal,
    HostRoot,
    HostText,
    IncompleteClassComponent,
    IndeterminateComponent,
    LazyComponent, LegacyHiddenComponent,
    MemoComponent,
    Mode,
    OffscreenComponent,
    Profiler,
    ScopeComponent,
    SuspenseComponent,
    SuspenseListComponent
} from "../share/WorkTag";
import {markRootUpdated} from "./index";
import {
    Callback,
    ContentReset, Deletion,
    DidCapture, HostEffectMask, Incomplete, NoEffect, Passive,
    PerformedWork,
    Placement, PlacementAndUpdate,
    Ref,
    ShouldCapture,
    Snapshot,
    Update
} from "../share/SideEffectTags";
import {cloneUpdateQueue, enqueueUpdate, flushSyncCallbackQueue} from "./updateQueue";
import {mountChildFibers, reconcileChildFibers} from "./reconcileChild";
// import {completeUnitOfWork} from "./completeWork";
import {createWorkInProgress} from "./fiber";
import {completeWork} from "./completeWork";

let pendingPassiveHookEffectsMount: Array<any | Fiber> = [];

let rootDoesHavePassiveEffects: boolean = false;

const NESTED_UPDATE_LIMIT = 50;
let nestedUpdateCount: number = 0;



let workInProgress: Fiber | null = null;
let didReceiveUpdate: boolean = false;

let renderLanes = NoLanes;
let currentlyRenderingFiber = null;

let currentHook = null;
let workInProgressHook = null;

let didScheduleRenderPhaseUpdate: boolean = false;
let rootWithPendingPassiveEffects: FiberRoot | null = null;
let pendingPassiveEffectsLanes: Lanes = NoLanes;

let nestedPassiveUpdateCount: number = 0;

let workInProgressRoot: FiberRoot | null = null;
let nextEffect: Fiber | null = null;

let rootWithNestedUpdates: FiberRoot | null = null;


let workInProgressRootRenderLanes: Lanes = SyncLane;




export type HookEffectTag = number;


export type Effect = {
    tag: number,
    create: () => (() => void) | void,
    destroy: (() => void) | void,
    deps: Array<any> | null,
    next: Effect,
    };

let pendingPassiveHookEffectsUnmount: Array<any | Fiber> = [];



export type ReactPriorityLevel = 99 | 98 | 97 | 96 | 95 | 90;



export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;





export function scheduleUpdateOnFiber(
    fiber: Fiber,
    lane: Lane,
    eventTime: number,
) {
    checkForNestedUpdates();

    const root = markUpdateLaneFromFiberToRoot(fiber, lane);
    if (root === null) {
        return null;
    }

    // const priorityLevel = getCurrentPriorityLevel();
    performSyncWorkOnRoot(root);
}


export function checkForNestedUpdates() {
    if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
        nestedUpdateCount = 0;
        rootWithNestedUpdates = null;
        console.error('NestedUpdates!');
    }
}

function markUpdateLaneFromFiberToRoot(
    fiber: Fiber,
    lane: Lane,
): FiberRoot | null {
    // Update the source fiber's lanes
    fiber.lanes = SyncLane;
    let alternate = fiber.alternate;
    if (alternate !== null) {
        alternate.lanes = SyncLane;
    }
    let node = fiber.return;
    let root = null;
    if (node === null && fiber.tag === HostRoot) {
        root = fiber.stateNode;
    } else {
        while (node !== null) {
            alternate = node.alternate;
            node.childLanes = SyncLane;
            if (alternate !== null) {
                alternate.childLanes = SyncLane;
            }
            if (node.return === null && node.tag === HostRoot) {
                root = node.stateNode;
                break;
            }
            node = node.return;
        }
    }

    if (root !== null) {
        // Mark that the root has a pending update.
        markRootUpdated(root, lane);
    }

    return root;
}

function getCurrentPriorityLevel(){
    // 现在只返回ImmediatePriority
    return 99;
}

function performSyncWorkOnRoot(root) {
    // TODO: hooks相关
    flushPassiveEffects();
    renderRootSync(root, SyncLane);



    // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.
    const finishedWork: Fiber = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = SyncLane;
    // 开始 Commit 阶段
    commitRoot(root);

    // Before exiting, make sure there's a callback scheduled for the next
    // pending level.
    ensureRootIsScheduled(root, Date.now());

    return null;
}

function commitRoot(root) {
    const renderPriorityLevel = getCurrentPriorityLevel();
    runWithPriority(
        99,
        commitRootImpl.bind(null, root, renderPriorityLevel),
    );
    return null;
}

function detachFiberAfterEffects(fiber: Fiber): void {
    fiber.sibling = null;
}

function flushPassiveEffects() {
    function flushPassiveEffectsImpl() {
        if (rootWithPendingPassiveEffects === null) {
            return false;
        }

        const root = rootWithPendingPassiveEffects;
        const lanes = pendingPassiveEffectsLanes;
        rootWithPendingPassiveEffects = null;
        pendingPassiveEffectsLanes = NoLanes;


        const unmountEffects = pendingPassiveHookEffectsUnmount;
        pendingPassiveHookEffectsUnmount = [];
        for (let i = 0; i < unmountEffects.length; i += 2) {
            const effect = unmountEffects[i];
            const fiber = unmountEffects[i + 1];
            const destroy = effect.destroy;
            effect.destroy = undefined;

            if (typeof destroy === 'function') {
                try {
                    destroy();
                } catch (error) {
                    console.error("flushPassiveEffectsImpl error!")
                }
            }
        }
        // Second pass: Create new passive effects.
        const mountEffects = pendingPassiveHookEffectsMount;
        pendingPassiveHookEffectsMount = [];
        for (let i = 0; i < mountEffects.length; i += 2) {
            const effect = mountEffects[i];
            const fiber = mountEffects[i + 1];
            try {
                const create = effect.create;
                effect.destroy = create();
            } catch (error) {
                console.error("flushPassiveEffectsImpl... error!")
            }
        }

        let effect = root.current.firstEffect;
        while (effect !== null) {
            const nextNextEffect = effect.nextEffect;
            // Remove nextEffect pointer to assist GC
            effect.nextEffect = null;
            if (effect.effectTag & Deletion) {
                detachFiberAfterEffects(effect);
            }
            effect = nextNextEffect;
        }


        flushSyncCallbackQueue();

        // If additional passive effects were scheduled, increment a counter. If this
        // exceeds the limit, we'll fire a warning.
        nestedPassiveUpdateCount =
            rootWithPendingPassiveEffects === null ? 0 : nestedPassiveUpdateCount + 1;

        return true;
    }
    flushPassiveEffectsImpl();
}

function commitBeforeMutationEffectOnFiber(
    current: Fiber | null,
    finishedWork: Fiber,
): void {
    switch (finishedWork.tag) {
        case FunctionComponent:
        case ClassComponent: {
            return;
        }
        case HostRoot: {
            return;
        }
        case HostComponent:
        case HostText:
        case HostPortal:
        case IncompleteClassComponent:
            // Nothing to do for these component types
            return;
    }
}

function commitBeforeMutationEffects() {
    while (nextEffect !== null) {
        const current = nextEffect.alternate;

        const effectTag = nextEffect.effectTag;
        // 调用 getSnapshotBeforeUpdate
        if ((effectTag & Snapshot) !== NoEffect) {

            commitBeforeMutationEffectOnFiber(current, nextEffect);
        }
        // *调度* useEffect
        if ((effectTag & Passive) !== NoEffect) {
            // If there are passive effects, schedule a callback to flush at
            // the earliest opportunity.
            if (!rootDoesHavePassiveEffects) {
                rootDoesHavePassiveEffects = true;
                flushPassiveEffects();
            }
        }
        nextEffect = nextEffect.nextEffect;
    }
}

function commitRootImpl(root, renderPriorityLevel) {
    do {
        flushPassiveEffects();
    } while (rootWithPendingPassiveEffects !== null);

    const finishedWork = root.finishedWork;
    const lanes = root.finishedLanes;
    if (finishedWork === null) {
        return null;
    }
    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    // commitRoot never returns a continuation; it always finishes synchronously.
    // So we can clear these now to allow a new callback to be scheduled.
    root.callbackNode = null;
    root.callbackId = NoLanes;

    // Update the first and last pending times on this root. The new first
    // pending time is whatever is left on the root fiber.


    if (root === workInProgressRoot) {
        // We can reset these now that they are finished.
        workInProgressRoot = null;
        workInProgress = null;
        workInProgressRootRenderLanes = NoLanes;
    } else {
        // This indicates that the last root we worked on is not the same one that
        // we're committing now. This most commonly happens when a suspended root
        // times out.
    }

    // Get the list of effects.
    let firstEffect;
    if (finishedWork.effectTag > PerformedWork) {
        // A fiber's effect list consists only of its children, not itself. So if
        // the root has an effect, we need to add it to the end of the list. The
        // resulting list is the set that would belong to the root's parent, if it
        // had one; that is, all the effects in the tree including the root.
        if (finishedWork.lastEffect !== null) {
            finishedWork.lastEffect.nextEffect = finishedWork;
            firstEffect = finishedWork.firstEffect;
        } else {
            firstEffect = finishedWork;
        }
    } else {
        // There is no effect on the root.
        firstEffect = finishedWork.firstEffect;
    }

    // ------ before mutation之前 ----

    // before mutation , mutation , layout
    if (firstEffect !== null) {

        nextEffect = firstEffect;
        do {
            {
                try {

                    /*
                      处理DOM节点渲染/删除后的 autoFocus、blur逻辑

                      调用getSnapshotBeforeUpdate生命周期钩子

                      调度useEffect
                     */
                    commitBeforeMutationEffects();
                } catch (error) {
                    console.error('commitRootImpl---',error);
                    nextEffect = nextEffect.nextEffect;
                }
            }
        } while (nextEffect !== null);



        // The next phase is the mutation phase, where we mutate the host tree.
        // 下一个阶段是突变阶段，在此阶段我们对宿主树进行挂载
        nextEffect = firstEffect;
        do {
           {
                try {
                    // 这里会真真的执行Dom操作
                    commitMutationEffects(root, renderPriorityLevel);
                } catch (error) {
                    console.error('commitRootImpl++++')
                    nextEffect = nextEffect.nextEffect;
                }
            }
        } while (nextEffect !== null);


        root.current = finishedWork;

        nextEffect = firstEffect;
        do {
            try {
                /*
                  调用componentDidUpdate 或 componentDidMount 和 hook, 调用this.setState 的 第二个参数
                  useEffect 真正会在这里被调度
                */
                commitLayoutEffects(root, lanes);
            } catch (error) {
                console.log('commitRootImpl _+-=')
                nextEffect = nextEffect.nextEffect;
            }
        } while (nextEffect !== null);

        nextEffect = null;

    } else {
        // No effects.
        root.current = finishedWork;
    }


    // ------- layout 之后 --------
    const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

    if (rootDoesHavePassiveEffects) {
        // This commit has passive effects. Stash a reference to them. But don't
        // schedule a callback until after flushing layout work.
        rootDoesHavePassiveEffects = false;
        rootWithPendingPassiveEffects = root;
        pendingPassiveEffectsLanes = lanes;
    } else {
        // We are done with the effect chain at this point so let's clear the
        // nextEffect pointers to assist with GC. If we have passive effects, we'll
        // clear this in flushPassiveEffects.
        nextEffect = firstEffect;
        while (nextEffect !== null) {
            const nextNextEffect = nextEffect.nextEffect;
            nextEffect.nextEffect = null;
            if (nextEffect.effectTag & Deletion) {
                detachFiberAfterEffects(nextEffect);
            }
            nextEffect = nextNextEffect;
        }
    }



    // Always call this before exiting `commitRoot`, to ensure that any
    // additional work on this root is scheduled.
    ensureRootIsScheduled(root, Date.now());

    // If layout work was scheduled, flush it now.
    flushSyncCallbackQueue();

    return null;
}

function pickArbitraryLaneIndex(lanes: Lane | Lanes) {
    return 31 - Math.clz32(lanes);
}

export function markStarvedLanesAsExpired(
    root: FiberRoot,
    currentTime: number,
): void {

    const pendingLanes = root.pendingLanes;
    const suspendedLanes = root.suspendedLanes;
    const pingedLanes = root.pingedLanes;
    const expirationTimes = root.expirationTimes;

    let lanes = pendingLanes;
}

function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
    const existingCallbackNode = root.callbackNode;

    // Check if any lanes are being starved by other work. If so, mark them as
    // expired so we know to work on those next.
    // markStarvedLanesAsExpired(root, currentTime);

    // Determine the next lanes to work on, and their priority.
    const newCallbackId = SyncLane;

    // Check if there's an existing task. We may be able to reuse it.
    const existingCallbackId = root.callbackId;
    const existingCallbackPriority = root.callbackPriority;


    // Schedule a new callback.
    performSyncWorkOnRoot.bind(null, root);


    root.callbackId = newCallbackId;
    // root.callbackPriority = newCallbackPriority;
    // root.callbackNode = newCallbackNode;
}


export function commitUpdateQueue<State>(
    finishedWork: Fiber,
    finishedQueue: UpdateQueue<State>,
    instance: any,
): void {
    // Commit the effects
    const effects = finishedQueue.effects;
    finishedQueue.effects = null;
    if (effects !== null) {
        for (let i = 0; i < effects.length; i++) {
            const effect = effects[i];
            const callback = effect.callback;
            if (callback !== null) {
                effect.callback = null;
                callback();
            }
        }
    }
}

function commitLayoutEffectOnFiber(
    finishedRoot: FiberRoot,
    current: Fiber | null,
    finishedWork: Fiber,
    committedLanes: Lanes,
): void {
    switch (finishedWork.tag) {
        case FunctionComponent:
        case ClassComponent: {
            const instance = finishedWork.stateNode;
            if (finishedWork.effectTag & Update) {
                if (current === null) {
                    instance.componentDidMount();
                } else {
                    const prevProps =
                        finishedWork.elementType === finishedWork.type
                            ? current.memoizedProps
                            : resolveDefaultProps(finishedWork.type, current.memoizedProps);
                    const prevState = current.memoizedState;
                    instance.componentDidUpdate(
                        prevProps,
                        prevState,
                        instance.__reactInternalSnapshotBeforeUpdate,
                    );}
                }
            }

            const updateQueue = finishedWork.updateQueue;
            if (updateQueue !== null) {
                commitUpdateQueue(finishedWork, updateQueue, null);
            }
            return;
        case HostRoot: {
            // TODO: I think this is now always non-null by the time it reaches the
            // commit phase. Consider removing the type check.
            const updateQueue = finishedWork.updateQueue;
            if (updateQueue !== null) {
                let instance = null;
                if (finishedWork.child !== null) {
                    switch (finishedWork.child.tag) {
                        case HostComponent:
                            instance = finishedWork.child.stateNode;
                            break;
                        case ClassComponent:
                            instance = finishedWork.child.stateNode;
                            break;
                    }
                }
                commitUpdateQueue(finishedWork, updateQueue, instance);
            }
            return;
        }
        case HostComponent: {

            return;
        }
        case HostText: {
            // We have no life-cycles associated with text.
            return;
        }
        case HostPortal: {
            // We have no life-cycles associated with portals.
            return;
        }
    }
}

function commitLayoutEffects(root: FiberRoot, committedLanes: Lanes) {
    while (nextEffect !== null) {

        const effectTag = nextEffect.effectTag;
        // 调用componentDidUpdate 或 componentDidMount和 hook, 调用this.setState 的 第二个参数
        if (effectTag & (Update | Callback)) {
            const current = nextEffect.alternate;
            commitLayoutEffectOnFiber(root, current, nextEffect, committedLanes);
        }
        // 赋值ref

        nextEffect = nextEffect.nextEffect;
    }
}

export function runWithPriority<T>(
    reactPriorityLevel: ReactPriorityLevel,
    fn: () => T,
) {
    // const priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
    // return Scheduler_runWithPriority(priorityLevel, fn);
    fn();
}

function getHostParentFiber(fiber: Fiber): Fiber {
    let parent = fiber.return;
    while (parent !== null) {
        if (isHostParent(parent)) {
            return parent;
        }
        parent = parent.return;
    }
}

function commitPlacement(finishedWork: Fiber): void {

    // Recursively insert all host nodes into the parent.
    const parentFiber = getHostParentFiber(finishedWork);

    // Note: these two variables *must* always be updated together.
    let parent;
    let isContainer;
    const parentStateNode = parentFiber.stateNode;
    switch (parentFiber.tag) {
        case HostComponent:
            parent = parentStateNode;
            isContainer = false;
            break;
        case HostRoot:
            parent = parentStateNode.containerInfo;
            isContainer = true;
            break;
    }
    if (parentFiber.effectTag & ContentReset) {
        // Reset the text content of the parent before doing any insertions
        resetTextContent(parent);
        // Clear ContentReset from the effect tag
        parentFiber.effectTag &= ~ContentReset;
    }

    const before = getHostSibling(finishedWork);
    // We only have the top Fiber that was inserted but we need to recurse down its
    // children to find all the terminal nodes.
    if (isContainer) {
        insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
    } else {
        insertOrAppendPlacementNode(finishedWork, before, parent);
    }
}

export function insertBefore(
    parentInstance: any,
    child: any,
    beforeChild: any,
): void {
    parentInstance.insertBefore(child, beforeChild);
}

export function appendChild(
    parentInstance: any,
    child: any,
): void {
    parentInstance.appendChild(child);
}

function insertOrAppendPlacementNode(
    node: Fiber,
    before: any,
    parent: any,
): void {
    const {tag} = node;
    const isHost = tag === HostComponent || tag === HostText;
    if (isHost) {
    const stateNode = isHost ? node.stateNode : node.stateNode.instance;
    if (before) {
        insertBefore(parent, stateNode, before);
    } else {
        appendChild(parent, stateNode);
    }
} else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
} else {
    const child = node.child;
    if (child !== null) {
        insertOrAppendPlacementNode(child, before, parent);
        let sibling = child.sibling;
        while (sibling !== null) {
            insertOrAppendPlacementNode(sibling, before, parent);
            sibling = sibling.sibling;
        }
    }
}
}

function insertOrAppendPlacementNodeIntoContainer(
    node: Fiber,
    before: any,
    parent: any,
): void {
    const {tag} = node;
    const isHost = tag === HostComponent || tag === HostText;
    if (isHost) {
    const stateNode = isHost ? node.stateNode : node.stateNode.instance;

    // 这里 真真的执行dom操作
    if (before) {
        insertInContainerBefore(parent, stateNode, before);
    } else {
        appendChildToContainer(parent, stateNode);
    }
} else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
} else {
    const child = node.child;
    if (child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, before, parent);
        let sibling = child.sibling;
        while (sibling !== null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
            sibling = sibling.sibling;
        }
    }
}
}


export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;
export const DOCUMENT_FRAGMENT_NODE = 11;
export function insertInContainerBefore(
    container: any,
    child: any,
    beforeChild: any
): void {
    if (container.nodeType === COMMENT_NODE) {
        container.parentNode.insertBefore(child, beforeChild);
    } else {
        container.insertBefore(child, beforeChild);
    }
}

export function appendChildToContainer(
    container: any,
    child: any,
): void {
    let parentNode;
    if (container.nodeType === COMMENT_NODE) {
        parentNode = container.parentNode;
        parentNode.insertBefore(child, container);
    } else {
        parentNode = container;
        parentNode.appendChild(child);
    }
}


function isHostParent(fiber: Fiber): boolean {
    return (
        fiber.tag === HostComponent ||
        fiber.tag === HostRoot ||
        fiber.tag === HostPortal
    );
}

function getHostSibling(fiber: Fiber) {

    let node: Fiber = fiber;
    siblings: while (true) {
        // If we didn't find anything, let's try the next sibling.
        while (node.sibling === null) {
            if (node.return === null || isHostParent(node.return)) {
                // If we pop out of the root or hit the parent the fiber we are the
                // last sibling.
                return null;
            }
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
        while (
            node.tag !== HostComponent &&
            node.tag !== HostText
            ) {
            if (node.effectTag & Placement) {
                continue siblings;
            }
            if (node.child === null || node.tag === HostPortal) {
                continue siblings;
            } else {
                node.child.return = node;
                node = node.child;
            }
        }
        if (!(node.effectTag & Placement)) {
            return node.stateNode;
        }
    }
}

function resetTextContent(fiber: Fiber) {
    fiber.stateNode.text = null;
}

function commitMutationEffects(root: FiberRoot, renderPriorityLevel) {
    // TODO: Should probably move the bulk of this function to commitWork.
    while (nextEffect !== null) {

        const effectTag = nextEffect.effectTag;

        // 文字节点
        if (effectTag & ContentReset) {
            nextEffect.stateNode.text = null;
        }

        // 更新ref

        // The following switch statement is only concerned about placement,
        // updates, and deletions. To avoid needing to add a case for every possible
        // bitmap value, we remove the secondary effects from the effect tag and
        // switch on that value.
        const primaryEffectTag =
            effectTag & (Placement | Update | Deletion);
        switch (primaryEffectTag) {
            case Placement: {
                commitPlacement(nextEffect);
                // Clear the "placement" from effect tag so that we know that this is
                // inserted, before any life-cycles like componentDidMount gets called.
                // TODO: findDOMNode doesn't rely on this any more but isMounted does
                // and isMounted is deprecated anyway so we should be able to kill this.
                nextEffect.effectTag &= ~Placement;
                break;
            }
            case PlacementAndUpdate: {
                // Placement
                commitPlacement(nextEffect);
                // Clear the "placement" from effect tag so that we know that this is
                // inserted, before any life-cycles like componentDidMount gets called.
                nextEffect.effectTag &= ~Placement;

                // Update
                const current = nextEffect.alternate;
                commitWork(current, nextEffect);
                break;
            }
            case Update: {
                const current = nextEffect.alternate;
                commitWork(current, nextEffect);
                break;
            }
            case Deletion: {
                /*
                  递归调用Fiber节点及其子孙Fiber节点的componentWillUnmount生命周期钩子，从页面移除Fiber节点对应DOM节点
                  解绑ref
                  *调度* useEffect的销毁函数
                */
                commitDeletion(root, nextEffect);
                break;
            }
        }

        nextEffect = nextEffect.nextEffect;
    }
}

function commitUpdate(
    instance: any,
    updatePayload: Object,
    type: string,
    oldProps: any,
    newProps: any,
): void {
    if (oldProps === null) {
        throw new Error('Should have old props');
    }
    instance.prop = newProps.prop;
    instance.hidden = !!newProps.hidden;
    instance.text = newProps.children;
}

function commitWork(current: Fiber | null, finishedWork: Fiber): void {

    switch (finishedWork.tag) {
        case FunctionComponent:
        case ForwardRef:
        case MemoComponent:
        case ClassComponent: {
            return;
        }
        case HostComponent: {
            const instance: any = finishedWork.stateNode;
            if (instance != null) {
                // Commit the work prepared earlier.
                const newProps = finishedWork.memoizedProps;
                // For hydration we reuse the update path but we treat the oldProps
                // as the newProps. The updatePayload will contain the real change in
                // this case.
                const oldProps = current !== null ? current.memoizedProps : newProps;
                const type = finishedWork.type;
                // TODO: Type the updateQueue to be specific to host components.
                const updatePayload: any = finishedWork.updateQueue;
                finishedWork.updateQueue = null;
                if (updatePayload !== null) {
                    commitUpdate(
                        instance,
                        updatePayload,
                        type,
                        oldProps,
                        newProps,
                    );
                }
            }
            return;
        }
        case HostText: {
            const textInstance: any = finishedWork.stateNode;
            const newText: string = finishedWork.memoizedProps;

            const oldText: string =
                current !== null ? current.memoizedProps : newText;
            textInstance.text = newText;
            return;
        }
        case HostRoot: {

            return;
        }
    }
}

function prepareFreshStack(root: FiberRoot, lanes: Lanes) {
    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    // const timeoutHandle = root.timeoutHandle;
    // if (timeoutHandle !== noTimeout) {
    //     // The root previous suspended and scheduled a timeout to commit a fallback
    //     // state. Now that we have additional work, cancel the timeout.
    //     root.timeoutHandle = noTimeout;
    //     // $FlowFixMe Complains noTimeout is not a TimeoutID, despite the check above
    //     cancelTimeout(timeoutHandle);
    // }

    // if (workInProgress !== null) {
    //     let interruptedWork = workInProgress.return;
    //     while (interruptedWork !== null) {
    //         unwindInterruptedWork(interruptedWork);
    //         interruptedWork = interruptedWork.return;
    //     }
    // }
    workInProgressRoot = root;
    workInProgress = createWorkInProgress(root.current, null);
    workInProgressRootRenderLanes = lanes;
    // workInProgressRootSkippedLanes = NoLanes;
    // workInProgressRootUpdatedLanes = NoLanes;
    // workInProgressRootPingedLanes = NoLanes;

}


function renderRootSync(root: FiberRoot, lanes: Lanes) {
    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        prepareFreshStack(root, SyncLane);
    }
    do {
        try {
            workLoopSync();
            break;
        } catch (error) {
            console.error(error);
            return;
        }
    } while (true);
}

function handleError() {
    console.error('renderRootSyncError')
}

function workLoopSync() {
    console.log('excute workLoopSync');
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(unitOfWork: Fiber): void {
    const current = unitOfWork.alternate;

    let next;
    next = beginWork(current, unitOfWork, SyncLane);

    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    // 此时next为 child， 如果child 为空 则会 将 workInProgress 赋值为 workInProgress.sibling
    if (next === null) {
        completeUnitOfWork(unitOfWork);
    } else {
        workInProgress = next;
    }
}

function beginWork(
    current: Fiber | null,
    workInProgress: Fiber,
    renderLanes: Lanes,
): Fiber | null {
    const updateLanes = workInProgress.lanes;

    // 这里的current 是 workInProgress.alternate, 如果没有current,说明这个节点在其父节点reconciler Child 时，
    // 这个节点的workInProgress是新创建的，而不是根据其上次渲染的节点创建的（即，没有复用它上次渲染完成的一些属性，包括child）
    // 导致这个的原因一般是，type发生变化  child.elementType !== element.type
    if (current !== null) {
        const oldProps = current.memoizedProps;
        const newProps = workInProgress.pendingProps;

        if (
            oldProps !== newProps
        ) {
            didReceiveUpdate = true;
        } else if (!includesSomeLane(renderLanes, updateLanes)) {
            didReceiveUpdate = false;
            // TODO: 这里有bailout的逻辑
        }
    } else {
        didReceiveUpdate = false;
    }

    workInProgress.lanes = NoLanes;

    switch (workInProgress.tag) {
        // 这里是不知道它是函数组件还是类组件 () =>  {render: () => xxx, componentDidMount: () => xxx}, 说明肯定这个workInProgresss是新的fiber
        case IndeterminateComponent: {
            return mountIndeterminateComponent(
                current,
                workInProgress,
                workInProgress.type,
                renderLanes,
            );
        }
        case FunctionComponent: {
            const Component = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            const resolvedProps =
                workInProgress.elementType === Component
                    ? unresolvedProps
                    : resolveDefaultProps(Component, unresolvedProps);
            return updateFunctionComponent(
                current,
                workInProgress,
                Component,
                resolvedProps,
                renderLanes,
            );
        }
        case ClassComponent: {
            const Component = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            const resolvedProps =
                workInProgress.elementType === Component
                    ? unresolvedProps
                    : resolveDefaultProps(Component, unresolvedProps);
            return updateClassComponent(
                current,
                workInProgress,
                Component,
                resolvedProps,
                renderLanes,
            );
        }
        case HostRoot:
            return updateHostRoot(current, workInProgress, renderLanes);
        case HostComponent:
            return updateHostComponent(current, workInProgress, renderLanes);
        case HostText:
            return updateHostText(current, workInProgress);
    }
}



export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane) {
    return (a & b) !== NoLanes;
}

function mountIndeterminateComponent(
    _current,
    workInProgress,
    Component,
    renderLanes,
) {
    if (_current !== null) {
        _current.alternate = null;
        workInProgress.alternate = null;
        workInProgress.effectTag |= Placement;
    }

    const props = workInProgress.pendingProps;

    let value;

    value = renderWithHooks(
        null,
        workInProgress,
        Component,
        props,
        {},
        renderLanes,
    );
    // React DevTools reads this flag.
    workInProgress.effectTag |= PerformedWork;

    // 这里判断出到底是class还是functional, 并使用对应的逻辑调和子组件
    if (
        typeof value === 'object' &&
        value !== null &&
        typeof value.render === 'function' &&
        value.$$typeof === undefined
    ) {

        // Proceed under the assumption that this is a class instance
        workInProgress.tag = ClassComponent;

        // Throw out any hooks that were used.
        workInProgress.memoizedState = null;
        workInProgress.updateQueue = null;

        workInProgress.memoizedState =
            value.state !== null && value.state !== undefined ? value.state : null;

        initializeUpdateQueue(workInProgress);

        const getDerivedStateFromProps = Component.getDerivedStateFromProps;
        if (typeof getDerivedStateFromProps === 'function') {
            applyDerivedStateFromProps(
                workInProgress,
                Component,
                getDerivedStateFromProps,
                props,
            );
        }

        adoptClassInstance(workInProgress, value);
        mountClassInstance(workInProgress, Component, props, renderLanes);
        return finishClassComponent(
            null,
            workInProgress,
            Component,
            true,
            true,
            renderLanes,
        );
    } else {
        // Proceed under the assumption that this is a function component
        workInProgress.tag = FunctionComponent;
        reconcileChildren(null, workInProgress, value, renderLanes);

        return workInProgress.child;
    }
}

export function initializeUpdateQueue<State>(fiber: Fiber): void {
    const queue: UpdateQueue<State> = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
            pending: null,
        },
        effects: null,
    };
    fiber.updateQueue = queue;
}


export function applyDerivedStateFromProps(
    workInProgress: Fiber,
    ctor: any,
    getDerivedStateFromProps: (props: any, state: any) => any,
    nextProps: any,
) {
    const prevState = workInProgress.memoizedState;


    const partialState = getDerivedStateFromProps(nextProps, prevState);

    // Merge the partial state and the previous state.
    const memoizedState =
        partialState === null || partialState === undefined
            ? prevState
            : Object.assign({}, prevState, partialState);
    workInProgress.memoizedState = memoizedState;

    if (workInProgress.lanes === NoLanes) {
        // Queue is always non-null for classes
        const updateQueue: UpdateQueue<any> = workInProgress.updateQueue;
        updateQueue.baseState = memoizedState;
    }
}

function adoptClassInstance(workInProgress: Fiber, instance: any): void {
    instance.updater = classComponentUpdater;
    workInProgress.stateNode = instance;
    setInstance(instance, workInProgress);
}

const classComponentUpdater = {
    enqueueSetState(inst, payload, callback) {
        const eventTime = null;
        const lane = SyncLane;
        const fiber = getInstance(inst);
        const update = createUpdate(eventTime, lane, null);
        update.payload = payload;
        if (callback !== undefined && callback !== null) {
            update.callback = callback;
        }
        enqueueUpdate(fiber, update);
        scheduleUpdateOnFiber(fiber, lane, eventTime);
    },
    enqueueReplaceState(inst, payload, callback) {
        const fiber = getInstance(inst);
        const eventTime = null;
        const suspenseConfig = null;
        const lane = SyncLane;

        const update = createUpdate(eventTime, lane, suspenseConfig);
        update.tag = ReplaceState;
        update.payload = payload;

        if (callback !== undefined && callback !== null) {
            update.callback = callback;
        }

        enqueueUpdate(fiber, update);
        scheduleUpdateOnFiber(fiber, lane, eventTime);
    },
    enqueueForceUpdate(inst, callback) {
        const fiber = getInstance(inst);
        const eventTime = null;
        const suspenseConfig = null;
        const lane = SyncLane;

        const update = createUpdate(eventTime, lane, suspenseConfig);
        update.tag = ForceUpdate;

        if (callback !== undefined && callback !== null) {
            update.callback = callback;
        }

        enqueueUpdate(fiber, update);
        scheduleUpdateOnFiber(fiber, lane, eventTime);
    },
};

export function createUpdate(
    eventTime: number | null,
    lane: Lane,
    suspenseConfig: null,
): UpdateType<any> {
    const update: UpdateType<any> = {
        eventTime: new Date().getTime(),
        lane,
        suspenseConfig,

        tag: UpdateState,
        payload: null,
        callback: null,

        next: null,
    };
    return update;
}

function mountClassInstance(
    workInProgress: Fiber,
    ctor: any,
    newProps: any,
    renderLanes: Lanes,
): void {
    const instance = workInProgress.stateNode;
    instance.props = newProps;
    instance.state = workInProgress.memoizedState;
    instance.refs = {};

    initializeUpdateQueue(workInProgress);

    processUpdateQueue(workInProgress, newProps, instance, renderLanes);
    instance.state = workInProgress.memoizedState;

    const getDerivedStateFromProps = ctor.getDerivedStateFromProps;
    if (typeof getDerivedStateFromProps === 'function') {
        applyDerivedStateFromProps(
            workInProgress,
            ctor,
            getDerivedStateFromProps,
            newProps,
        );
        instance.state = workInProgress.memoizedState;
    }

    // In order to support react-lifecycles-compat polyfilled components,
    // Unsafe lifecycles should not be invoked for components using the new APIs.
    if (
        typeof ctor.getDerivedStateFromProps !== 'function' &&
        typeof instance.getSnapshotBeforeUpdate !== 'function' &&
        (typeof instance.UNSAFE_componentWillMount === 'function' ||
            typeof instance.componentWillMount === 'function')
    ) {
        instance.componentWillMount(instance);
        // If we had additional state updates during this life-cycle, let's
        // process them now.
        processUpdateQueue(workInProgress, newProps, instance, renderLanes);
        instance.state = workInProgress.memoizedState;
    }

    if (typeof instance.componentDidMount === 'function') {
        workInProgress.effectTag |= Update;
    }
}

export function processUpdateQueue<State>(
    workInProgress: Fiber,
    props: any,
    instance: any,
    renderLanes: Lanes,
): void {
    const queue: UpdateQueue<State> = workInProgress.updateQueue;

    // hasForceUpdate = false;


    let firstBaseUpdate = queue.firstBaseUpdate;
    let lastBaseUpdate = queue.lastBaseUpdate;

    // Check if there are pending updates. If so, transfer them to the base queue.
    let pendingQueue = queue.shared.pending;
    if (pendingQueue !== null) {
        queue.shared.pending = null;

        // The pending queue is circular. Disconnect the pointer between first
        // and last so that it's non-circular.
        const lastPendingUpdate = pendingQueue;
        const firstPendingUpdate = lastPendingUpdate.next;
        lastPendingUpdate.next = null;
        // Append pending updates to base queue
        // 这里是说 baseUpdate 这个单向链表是空的，即 这个fiber 不存在没有更新完的 update
        if (lastBaseUpdate === null) {
            firstBaseUpdate = firstPendingUpdate;
        } else {
            lastBaseUpdate.next = firstPendingUpdate;
        }
        lastBaseUpdate = lastPendingUpdate;

        // If there's a current queue, and it's different from the base queue, then
        // we need to transfer the updates to that queue, too. Because the base
        // queue is a singly-linked list with no cycles, we can append to both
        // lists and take advantage of structural sharing.
        // TODO: Pass `current` as argument

        // 这里会把shared.pending也同时追加在current.updateQueue.baseUpdate后面， 以保证这次更新被中断后，更新不会丢失（workInProgress.updateQueue 是由 current.updateQueue产生）
        const current = workInProgress.alternate;
        if (current !== null) {
            // This is always non-null on a ClassComponent or HostRoot
            const currentQueue: UpdateQueue<State> = current.updateQueue;
            const currentLastBaseUpdate = currentQueue.lastBaseUpdate;
            if (currentLastBaseUpdate !== lastBaseUpdate) {
                if (currentLastBaseUpdate === null) {
                    currentQueue.firstBaseUpdate = firstPendingUpdate;
                } else {
                    currentLastBaseUpdate.next = firstPendingUpdate;
                }
                currentQueue.lastBaseUpdate = lastPendingUpdate;
            }
        }
    }

    // These values may change as we process the queue.
    if (firstBaseUpdate !== null) {
        // Iterate through the list of updates to compute the result.
        let newState = queue.baseState;
        // from the original lanes.
        let newLanes = NoLanes;

        let newBaseState = null;
        let newFirstBaseUpdate = null;
        let newLastBaseUpdate = null;

        let update = firstBaseUpdate;
        do {
            const updateLane = update.lane;
            const updateEventTime = update.eventTime;
            if (!isSubsetOfLanes(renderLanes, updateLane)) {
                // 跳过这个更新
                // Priority is insufficient. Skip this update. If this is the first
                // skipped update, the previous update/state is the new base
                // update/state.
                const clone: UpdateType<State> = {
                    eventTime: updateEventTime,
                    lane: updateLane,
                    suspenseConfig: update.suspenseConfig,

                    tag: update.tag,
                    payload: update.payload,
                    callback: update.callback,

                    next: null,
                };
                // 这里就是 形成一个 newFirstBaseUpdate -> ... -> newLastBaseUpdate 的单向链表
                if (newLastBaseUpdate === null) {
                    newFirstBaseUpdate = newLastBaseUpdate = clone;
                    newBaseState = newState;
                } else {
                    newLastBaseUpdate = newLastBaseUpdate.next = clone;
                }
                // Update the remaining priority in the queue.
                newLanes = SyncLane;
            } else {
                // 这里不用跳过
                // This update does have sufficient priority.

                // 把这次更新追加在那个 newLastBaseUpdate链上
                if (newLastBaseUpdate !== null) {
                    const clone: UpdateType<State> = {
                        eventTime: updateEventTime,
                        // This update is going to be committed so we never want uncommit
                        // it. Using NoLane works because 0 is a subset of all bitmasks, so
                        // this will never be skipped by the check above.
                        lane: NoLane,
                        suspenseConfig: update.suspenseConfig,

                        tag: update.tag,
                        payload: update.payload,
                        callback: update.callback,

                        next: null,
                    };
                    newLastBaseUpdate = newLastBaseUpdate.next = clone;
                }

                // Mark the event time of this update as relevant to this render pass.
                // markRenderEventTimeAndConfig(updateEventTime, update.suspenseConfig);

                // 真正开始执行更新
                // Process this update.
                newState = getStateFromUpdate(
                    workInProgress,
                    queue,
                    update,
                    newState,
                    props,
                    instance,
                );
                const callback = update.callback;
                // 把有callback的update放入updateQueue的effects队列中，并把这个fiber加上 'Callback'的 EffectTag
                if (callback !== null) {
                    workInProgress.effectTag |= Callback;
                    const effects = queue.effects;
                    if (effects === null) {
                        queue.effects = [update];
                    } else {
                        effects.push(update);
                    }
                }
            }
            update = update.next;
            // 更新都执行完了
            if (update === null) {
                pendingQueue = queue.shared.pending;
                if (pendingQueue === null) {
                    break;
                } else {
                    // 如果此时 pendingQueue 又有了更新， 则继续执行产生的更新
                    // An update was scheduled from inside a reducer. Add the new
                    // pending updates to the end of the list and keep processing.
                    const lastPendingUpdate = pendingQueue;
                    // Intentionally unsound. Pending updates form a circular list, but we
                    // unravel them when transferring them to the base queue.
                    const firstPendingUpdate = lastPendingUpdate.next;
                    lastPendingUpdate.next = null;
                    update = firstPendingUpdate;
                    queue.lastBaseUpdate = lastPendingUpdate;
                    queue.shared.pending = null;
                }
            }
        } while (true);

        // 没有需要跳过的更新 || 要跳过的更新已经全部走完了
        if (newLastBaseUpdate === null) {
            newBaseState = newState;
        }

        queue.baseState = newBaseState;
        queue.firstBaseUpdate = newFirstBaseUpdate;
        queue.lastBaseUpdate = newLastBaseUpdate;

        // Set the remaining expiration time to be whatever is remaining in the queue.
        // This should be fine because the only two other things that contribute to
        // expiration time are props and context. We're already in the middle of the
        // begin phase by the time we start processing the queue, so we've already
        // dealt with the props. Context in components that specify
        // shouldComponentUpdate is tricky; but we'll have to account for
        // that regardless.

        // markSkippedUpdateLanes(newLanes);
        workInProgress.lanes = newLanes;
        workInProgress.memoizedState = newState;
    }
}

export function removeInstance(key) {
    key._reactInternals = undefined;
}

export function getInstance(key) {
    return key._reactInternals;
}

export function hasInstance(key) {
    return key._reactInternals !== undefined;
}

export function setInstance(key, value) {
    key._reactInternals = value;
}


export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane) {
    return (set & subset) === subset;
}

function getStateFromUpdate<State>(
    workInProgress: Fiber,
    queue: UpdateQueue<State>,
    update: UpdateType<State>,
    prevState: State,
    nextProps: any,
    instance: any,
): any {
    switch (update.tag) {
        case ReplaceState: {
            const payload = update.payload;
            if (typeof payload === 'function') {

                const nextState = payload.call(instance, prevState, nextProps);
                return nextState;
            }
            // State object
            return payload;
        }
        case CaptureUpdate: {
            workInProgress.effectTag =
                (workInProgress.effectTag & ~ShouldCapture) | DidCapture;
        }
        // Intentional fallthrough
        case UpdateState: {
            const payload = update.payload;
            let partialState;
            if (typeof payload === 'function') {
                // Updater function
                partialState = payload.call(instance, prevState, nextProps);
            } else {
                // Partial state object
                partialState = payload;
            }
            if (partialState === null || partialState === undefined) {
                // Null and undefined are treated as no-ops.
                return prevState;
            }
            // Merge the partial state and the previous state.
            return Object.assign({}, prevState, partialState);
        }
        case ForceUpdate: {
            return prevState;
        }
    }
    return prevState;
}

function finishClassComponent(
    current: Fiber | null,
    workInProgress: Fiber,
    Component: any,
    shouldUpdate: boolean,
    hasContext: boolean,
    renderLanes: Lanes,
) {
    // Refs should update even if shouldComponentUpdate returns false
    markRef(current, workInProgress);

    const didCaptureError = (workInProgress.effectTag & DidCapture) !== NoEffect;

    if (!shouldUpdate && !didCaptureError) {

        // return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }

    const instance = workInProgress.stateNode;

    // Rerender
    // ReactCurrentOwner.current = workInProgress;
    let nextChildren;
    if (
        didCaptureError &&
        typeof Component.getDerivedStateFromError !== 'function'
    ) {
        nextChildren = null;
    } else {
        nextChildren = instance.render();
    }

    // React DevTools reads this flag.
    workInProgress.effectTag |= PerformedWork;

    reconcileChildren(current, workInProgress, nextChildren, renderLanes);

    // Memoize state using the values we just used to render.
    // TODO: Restructure so we never read values from the instance.
    workInProgress.memoizedState = instance.state;

    // The context might have changed so we need to recalculate it.

    return workInProgress.child;
}

export function markRef(current: Fiber | null, workInProgress: Fiber) {
    const ref = workInProgress.ref;
    if (
        (current === null && ref !== null) ||
        (current !== null && current.ref !== ref)
    ) {
        // Schedule a Ref effect
        workInProgress.effectTag |= Ref;
    }
}

export function reconcileChildren(
    current: Fiber | null,
    workInProgress: Fiber,
    nextChildren: any,
    renderLanes: Lanes,
) {
    if (current === null) {
        workInProgress.child = mountChildFibers(
            workInProgress,
            null,
            nextChildren,
            renderLanes,
        );
    } else {
        workInProgress.child = reconcileChildFibers(
            workInProgress,
            current.child,
            nextChildren,
            renderLanes,
        );
    }
}


export function renderWithHooks<Props, SecondArg>(
    current: Fiber | null,
    workInProgress: Fiber,
    Component: (p: Props, arg: SecondArg) => any,
    props: Props,
    secondArg: SecondArg,
    nextRenderLanes: Lanes,
): any {
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;
    workInProgress.lanes = NoLanes;


    // 这里调用函数组件方法体，同时会触发useState 和 useReducer在update阶段的对应声明方法（updateReducer）
    let children = Component(props, secondArg);


    renderLanes = NoLanes;
    currentlyRenderingFiber = null;

    currentHook = null;
    workInProgressHook = null;


    didScheduleRenderPhaseUpdate = false;


    return children;
}


export function resolveDefaultProps(Component: any, baseProps: Object): Object {
    if (Component && Component.defaultProps) {
        // Resolve default props. Taken from ReactElement
        const props = Object.assign({}, baseProps);
        const defaultProps = Component.defaultProps;
        for (const propName in defaultProps) {
            if (props[propName] === undefined) {
                props[propName] = defaultProps[propName];
            }
        }
        return props;
    }
    return baseProps;
}

function updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps: any,
    renderLanes,
) {
    let context;

    let nextChildren;
    nextChildren = renderWithHooks(
        current,
        workInProgress,
        Component,
        nextProps,
        context,
        renderLanes,
    );

    // if (current !== null && !didReceiveUpdate) {
    //     bailoutHooks(current, workInProgress, renderLanes);
    //     return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    // }

    // React DevTools reads this flag.
    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}

function updateClassComponent(
    current: Fiber | null,
    workInProgress: Fiber,
    Component: any,
    nextProps: any,
    renderLanes: Lanes,
) {
    const instance = workInProgress.stateNode;
    let shouldUpdate;
    if (instance === null) {
        if (current !== null) {
            // A class component without an instance only mounts if it suspended
            // inside a non-concurrent tree, in an inconsistent state. We want to
            // treat it like a new mount, even though an empty version of it already
            // committed. Disconnect the alternate pointers.
            current.alternate = null;
            workInProgress.alternate = null;
            // Since this is conceptually a new fiber, schedule a Placement effect
            workInProgress.effectTag |= Placement;
        }
        // In the initial pass we might need to construct the instance.
        constructClassInstance(workInProgress, Component, nextProps);
        mountClassInstance(workInProgress, Component, nextProps, renderLanes);
        shouldUpdate = true;
    } else if (current === null) {
        // In a resume, we'll already have an instance we can reuse.
        shouldUpdate = resumeMountClassInstance(
            workInProgress,
            Component,
            nextProps,
            renderLanes,
        );
    } else {
        shouldUpdate = updateClassInstance(
            current,
            workInProgress,
            Component,
            nextProps,
            renderLanes,
        );
    }
    const nextUnitOfWork = finishClassComponent(
        current,
        workInProgress,
        Component,
        shouldUpdate,
        true,
        renderLanes,
    );
    return nextUnitOfWork;
}

function constructClassInstance(
    workInProgress: Fiber,
    ctor: any,
    props: any,
): any {
    let context = {};


    const instance = new ctor(props, context);
    const state = (workInProgress.memoizedState =
        instance.state !== null && instance.state !== undefined
            ? instance.state
            : null);
    adoptClassInstance(workInProgress, instance);

    return instance;
}

function resumeMountClassInstance(
    workInProgress: Fiber,
    ctor: any,
    newProps: any,
    renderLanes: Lanes,
): boolean {
    const instance = workInProgress.stateNode;

    const oldProps = workInProgress.memoizedProps;
    instance.props = oldProps;

    const oldContext = instance.context;

    const getDerivedStateFromProps = ctor.getDerivedStateFromProps;
    const hasNewLifecycles =
        typeof getDerivedStateFromProps === 'function' ||
        typeof instance.getSnapshotBeforeUpdate === 'function';
    if (
        !hasNewLifecycles &&
        (typeof instance.UNSAFE_componentWillReceiveProps === 'function' ||
            typeof instance.componentWillReceiveProps === 'function')
    ) {
        if (oldProps !== newProps) {
            callComponentWillReceiveProps(
                workInProgress,
                instance,
                newProps,
                {},
            );
        }
    }

    const oldState = workInProgress.memoizedState;
    let newState = instance.state = oldState;
    processUpdateQueue(workInProgress, newProps, instance, renderLanes);
    newState = workInProgress.memoizedState;
    if (
        oldProps === newProps &&
        oldState === newState
    ) {
        // If an update was already in progress, we should schedule an Update
        // effect even though we're bailing out, so that cWU/cDU are called.
        if (typeof instance.componentDidMount === 'function') {
            workInProgress.effectTag |= Update;
        }
        return false;
    }

    if (typeof getDerivedStateFromProps === 'function') {
        applyDerivedStateFromProps(
            workInProgress,
            ctor,
            getDerivedStateFromProps,
            newProps,
        );
        newState = workInProgress.memoizedState;
    }

    const shouldUpdate =
        checkShouldComponentUpdate(
            workInProgress,
            ctor,
            oldProps,
            newProps,
            oldState,
            newState,
            {},
        );

    if (shouldUpdate) {
        if (
            !hasNewLifecycles &&
            (typeof instance.UNSAFE_componentWillMount === 'function' ||
                typeof instance.componentWillMount === 'function')
        ) {
            if (typeof instance.componentWillMount === 'function') {
                instance.componentWillMount();
            }
            if (typeof instance.UNSAFE_componentWillMount === 'function') {
                instance.UNSAFE_componentWillMount();
            }
        }
        if (typeof instance.componentDidMount === 'function') {
            workInProgress.effectTag |= Update;
        }
    } else {
        if (typeof instance.componentDidMount === 'function') {
            workInProgress.effectTag |= Update;
        }

        workInProgress.memoizedProps = newProps;
        workInProgress.memoizedState = newState;
    }

    // Update the existing instance's state, props, and context pointers even
    // if shouldComponentUpdate returns false.
    instance.props = newProps;
    instance.state = newState;
    // instance.context = nextContext;

    return shouldUpdate;
}

function callComponentWillReceiveProps(
    workInProgress,
    instance,
    newProps,
    nextContext,
) {
    const oldState = instance.state;
    if (typeof instance.componentWillReceiveProps === 'function') {
        instance.componentWillReceiveProps(newProps, nextContext);
    }
    if (typeof instance.UNSAFE_componentWillReceiveProps === 'function') {
        instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    }

    if (instance.state !== oldState) {
        classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
    }
}

function checkShouldComponentUpdate(
    workInProgress,
    ctor,
    oldProps,
    newProps,
    oldState,
    newState,
    nextContext,
) {
    const instance = workInProgress.stateNode;
    if (typeof instance.shouldComponentUpdate === 'function') {
        const shouldUpdate = instance.shouldComponentUpdate(
            newProps,
            newState,
            nextContext,
        );


        return shouldUpdate;
    }

    return true;
}

function updateClassInstance(
    current: Fiber,
    workInProgress: Fiber,
    ctor: any,
    newProps: any,
    renderLanes: Lanes,
): boolean {
    const instance = workInProgress.stateNode;

    cloneUpdateQueue(current, workInProgress);

    const unresolvedOldProps = workInProgress.memoizedProps;
    const oldProps =
        workInProgress.type === workInProgress.elementType
            ? unresolvedOldProps
            : resolveDefaultProps(workInProgress.type, unresolvedOldProps);
    instance.props = oldProps;
    const unresolvedNewProps = workInProgress.pendingProps;

    const getDerivedStateFromProps = ctor.getDerivedStateFromProps;
    const hasNewLifecycles =
        typeof getDerivedStateFromProps === 'function' ||
        typeof instance.getSnapshotBeforeUpdate === 'function';

    // Note: During these life-cycles, instance.props/instance.state are what
    // ever the previously attempted to render - not the "current". However,
    // during componentDidUpdate we pass the "current" props.

    // In order to support react-lifecycles-compat polyfilled components,
    // Unsafe lifecycles should not be invoked for components using the new APIs.
    if (
        !hasNewLifecycles &&
        (typeof instance.UNSAFE_componentWillReceiveProps === 'function' ||
            typeof instance.componentWillReceiveProps === 'function')
    ) {
        if (
            unresolvedOldProps !== unresolvedNewProps
        ) {
            callComponentWillReceiveProps(
                workInProgress,
                instance,
                newProps,
                {},
            );
        }
    }


    const oldState = workInProgress.memoizedState;
    let newState = (instance.state = oldState);
    processUpdateQueue(workInProgress, newProps, instance, renderLanes);
    newState = workInProgress.memoizedState;

    if (
        unresolvedOldProps === unresolvedNewProps &&
        oldState === newState
    ) {
        // If an update was already in progress, we should schedule an Update
        // effect even though we're bailing out, so that cWU/cDU are called.
        if (typeof instance.componentDidUpdate === 'function') {
            if (
                unresolvedOldProps !== current.memoizedProps ||
                oldState !== current.memoizedState
            ) {
                workInProgress.effectTag |= Update;
            }
        }
        if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            if (
                unresolvedOldProps !== current.memoizedProps ||
                oldState !== current.memoizedState
            ) {
                workInProgress.effectTag |= Snapshot;
            }
        }
        return false;
    }

    if (typeof getDerivedStateFromProps === 'function') {
        applyDerivedStateFromProps(
            workInProgress,
            ctor,
            getDerivedStateFromProps,
            newProps,
        );
        newState = workInProgress.memoizedState;
    }

    const shouldUpdate =
        checkShouldComponentUpdate(
            workInProgress,
            ctor,
            oldProps,
            newProps,
            oldState,
            newState,
            {},
        );

    if (shouldUpdate) {
        // In order to support react-lifecycles-compat polyfilled components,
        // Unsafe lifecycles should not be invoked for components using the new APIs.
        if (
            !hasNewLifecycles &&
            (typeof instance.UNSAFE_componentWillUpdate === 'function' ||
                typeof instance.componentWillUpdate === 'function')
        ) {
            if (typeof instance.componentWillUpdate === 'function') {
                instance.componentWillUpdate(newProps, newState, {});
            }
            if (typeof instance.UNSAFE_componentWillUpdate === 'function') {
                instance.UNSAFE_componentWillUpdate(newProps, newState, {});
            }
        }
        if (typeof instance.componentDidUpdate === 'function') {
            workInProgress.effectTag |= Update;
        }
        if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            workInProgress.effectTag |= Snapshot;
        }
    } else {
        // If an update was already in progress, we should schedule an Update
        // effect even though we're bailing out, so that cWU/cDU are called.
        if (typeof instance.componentDidUpdate === 'function') {
            if (
                unresolvedOldProps !== current.memoizedProps ||
                oldState !== current.memoizedState
            ) {
                workInProgress.effectTag |= Update;
            }
        }
        if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            if (
                unresolvedOldProps !== current.memoizedProps ||
                oldState !== current.memoizedState
            ) {
                workInProgress.effectTag |= Snapshot;
            }
        }

        // If shouldComponentUpdate returned false, we should still update the
        // memoized props/state to indicate that this work can be reused.
        workInProgress.memoizedProps = newProps;
        workInProgress.memoizedState = newState;
    }

    // Update the existing instance's state, props, and context pointers even
    // if shouldComponentUpdate returns false.
    instance.props = newProps;
    instance.state = newState;
    instance.context = {};

    return shouldUpdate;
}

function updateHostRoot(current, workInProgress, renderLanes) {
    const updateQueue = workInProgress.updateQueue;
    const nextProps = workInProgress.pendingProps;
    const prevState = workInProgress.memoizedState;
    const prevChildren = prevState !== null ? prevState.element : null;
    cloneUpdateQueue(current, workInProgress);
    processUpdateQueue(workInProgress, nextProps, null, renderLanes);
    const nextState = workInProgress.memoizedState;
    // Caution: React DevTools currently depends on this property
    // being called "element".
    const nextChildren = nextState.element;
    // if (nextChildren === prevChildren) {
    //     resetHydrationState();
    //     return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    // }
    const root: FiberRoot = workInProgress.stateNode;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}

export function shouldSetTextContent(type: string, props: any): boolean {
    return (
        type === 'textarea' ||
        type === 'option' ||
        type === 'noscript' ||
        typeof props.children === 'string' ||
        typeof props.children === 'number' ||
        (typeof props.dangerouslySetInnerHTML === 'object' &&
            props.dangerouslySetInnerHTML !== null &&
            props.dangerouslySetInnerHTML.__html != null)
    );
}

function updateHostComponent(
    current: Fiber | null,
    workInProgress: Fiber,
    renderLanes: Lanes,
) {
    const type = workInProgress.type;
    const nextProps = workInProgress.pendingProps;
    const prevProps = current !== null ? current.memoizedProps : null;
    let nextChildren = nextProps.children;
    const isDirectTextChild = shouldSetTextContent(type, nextProps);

    if (isDirectTextChild) {
        nextChildren = null;
    } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
        workInProgress.effectTag |= ContentReset;
    }

    markRef(current, workInProgress);
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}

function updateHostText(current, workInProgress) {
    // Nothing to do here. This is terminal. We'll do the completion step
    // immediately after.
    return null;
}


function commitUnmount(
    finishedRoot: FiberRoot,
    current: Fiber,
    renderPriorityLevel: ReactPriorityLevel,
): void {

    switch (current.tag) {
        case FunctionComponent:
        case ClassComponent: {
            const instance = current.stateNode;
            if (typeof instance.componentWillUnmount === 'function') {
                instance.componentWillUnmount();
            }
            return;
        }
        case HostComponent: {
            return;
        }
    }
}

function commitNestedUnmounts(
    finishedRoot: FiberRoot,
    root: Fiber,
    renderPriorityLevel: ReactPriorityLevel,
): void {
    // While we're inside a removed host node we don't want to call
    // removeChild on the inner nodes because they're removed by the top
    // call anyway. We also want to call componentWillUnmount on all
    // composites before this host node is removed from the tree. Therefore
    // we do an inner loop while we're still inside the host node.
    let node: Fiber = root;
    while (true) {
        commitUnmount(finishedRoot, node, renderPriorityLevel);
        // Visit children because they may contain more composite or host nodes.
        // Skip portals because commitUnmount() currently visits them recursively.
        if (
            node.child !== null &&
            // If we use mutation we drill down into portals using commitUnmount above.
            // If we don't use mutation we drill down into portals here instead.
            node.tag !== HostPortal
        ) {
            node.child.return = node;
            node = node.child;
            continue;
        }
        if (node === root) {
            return;
        }
        while (node.sibling === null) {
            if (node.return === null || node.return === root) {
                return;
            }
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}

function commitDeletion(
    finishedRoot: FiberRoot,
    current: Fiber,
): void {
    commitNestedUnmounts(finishedRoot, current, 99);
    const alternate = current.alternate;
    detachFiberMutation(current);
    if (alternate !== null) {
        detachFiberMutation(alternate);
    }
}

function detachFiberMutation(fiber: Fiber) {
    fiber.alternate = null;
    fiber.child = null;
    fiber.dependencies = null;
    fiber.firstEffect = null;
    fiber.lastEffect = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.return = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
}

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
