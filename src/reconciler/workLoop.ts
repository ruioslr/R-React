import {IFiber as Fiber, Update as UpdateType, UpdateQueue} from "../type";
import {Lane, Lanes, NoLanes, SyncLane} from "./fiberLanes";
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
    ContentReset,
    DidCapture, HostEffectMask, Incomplete, NoEffect,
    PerformedWork,
    Placement,
    Ref,
    ShouldCapture,
    Snapshot,
    Update
} from "../share/SideEffectTags";
import {cloneUpdateQueue, enqueueUpdate} from "./updateQueue";
import {mountChildFibers, reconcileChildFibers} from "./reconcileChild";

let workInProgress: Fiber | null = null;
let didReceiveUpdate: boolean = false;

let renderLanes = NoLanes;
let currentlyRenderingFiber = null;

let currentHook = null;
let workInProgressHook = null;

let didScheduleRenderPhaseUpdate: boolean = false;


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
    // flushPassiveEffects();
    renderRootSync(root, SyncLane);



    // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.
    const finishedWork: Fiber = (root.current.alternate: any);
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    // 开始 Commit 阶段
    commitRoot(root);

    // Before exiting, make sure there's a callback scheduled for the next
    // pending level.
    ensureRootIsScheduled(root, now());

    return null;
}

function renderRootSync(root: FiberRoot, lanes: Lanes) {
    do {
        try {
            workLoopSync();
            break;
        } catch (thrownValue) {
            handleError();
        }
    } while (true);
}

function handleError() {
    console.error('renderRootSyncError')
}

function workLoopSync() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(unitOfWork: Fiber): void {
    const current = unitOfWork.alternate;

    let next;
    next = beginWork(current, unitOfWork, subtreeRenderLanes);

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
        context,
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
            hasContext,
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
        callComponentWillMount(workInProgress, instance);
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

    hasForceUpdate = false;


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
                newLanes = mergeLanes(newLanes, updateLane);
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
    update: Update<State>,
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
            hasForceUpdate = true;
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
    ReactCurrentOwner.current = workInProgress;
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

function markRef(current: Fiber | null, workInProgress: Fiber) {
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
        hasContext,
        renderLanes,
    );
    return nextUnitOfWork;
}

function constructClassInstance(
    workInProgress: Fiber,
    ctor: any,
    props: any,
): any {
    let context = emptyContextObject;


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
                nextContext,
            );
        }
    }

    const oldState = workInProgress.memoizedState;
    let newState = (instance.state = oldState);
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
            nextContext,
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
    instance.context = nextContext;

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
            unresolvedOldProps !== unresolvedNewProps ||
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

