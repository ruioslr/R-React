import {IFiber, ReElement, WorkTag} from "../type";
import {ClassComponent, HostComponent, HostRoot, IndeterminateComponent} from "../share/WorkTag";
import {Lanes, NoLanes} from "./fiberLanes";
import {NoEffect} from "../share/SideEffectTags";

export type TypeOfMode = number;

export const NoMode = 0b00000;
export const StrictMode = 0b00001;

export const createFiber = function(
    tag: WorkTag,
    pendingProps: any,
    key: null | string,
    mode: TypeOfMode,
): IFiber {
    return new FiberNode(tag, pendingProps, key, mode);
};

function FiberNode(
    tag: WorkTag,
    pendingProps: any,
    key: null | string,
    mode: TypeOfMode,
) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null;

    // Fiber
    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;

    this.mode = mode;

    // Effects
    this.effectTag = NoEffect;
    this.nextEffect = null;

    this.firstEffect = null;
    this.lastEffect = null;

    this.lanes = NoLanes;
    this.childLanes = NoLanes;

    this.alternate = null;
}

export function createHostRootFiber(tag: WorkTag): IFiber {
    return createFiber(HostRoot, null, null, NoMode);
}

export function createFiberFromElement(
    element: ReElement,
    mode: TypeOfMode,
    lanes: Lanes,
): IFiber {
    let owner = null;

    const type = element.type;
    const key = element.key;
    const pendingProps = element.props;
    const fiber = createFiberFromTypeAndProps(
        type,
        key,
        pendingProps,
        owner,
        mode,
        lanes,
    );
    return fiber;
}

export function createFiberFromTypeAndProps(
    type: any, // React$ElementType
    key: null | string,
    pendingProps: any,
    owner: null | IFiber,
    mode: TypeOfMode,
    lanes: Lanes,
): IFiber {

    function shouldConstruct(Component: Function) {
        const prototype = Component.prototype;
        return !!(prototype && prototype.isReactComponent);
    }

    let fiberTag = IndeterminateComponent;
    let resolvedType = type;
    if (typeof type === 'function') {
        if (shouldConstruct(type)) {
            fiberTag = ClassComponent;
        } else {

        }
    } else if (typeof type === 'string') {
        fiberTag = HostComponent;
    }

    const fiber = createFiber(fiberTag as WorkTag, pendingProps, key, mode);
    fiber.elementType = type;
    fiber.type = resolvedType;
    fiber.lanes = lanes;

    return fiber;
}

export function createWorkInProgress(current: IFiber, pendingProps: any): IFiber {

    let workInProgress = current.alternate;
    // 这里是判断上上次更新的fiber是否存在，如果存在，则改变下属性了之后复用，不存在则创建一个新的
    if (workInProgress === null) {
        // We use a double buffering pooling technique because we know that we'll
        // only ever need at most two versions of a tree. We pool the "other" unused
        // node that we're free to reuse. This is lazily created to avoid allocating
        // extra objects for things that are never updated. It also allow us to
        // reclaim the extra memory if needed.
        // 这里会使用pendingProps
        workInProgress = createFiber(
            current.tag,
            pendingProps,
            current.key,
            current.mode,
        );
        workInProgress.elementType = current.elementType;
        workInProgress.type = current.type;
        // 这里连stateNode都复用了
        workInProgress.stateNode = current.stateNode;

        workInProgress.alternate = current;
        current.alternate = workInProgress;
    } else {
        // 能进入这个else分支，代表stateNode也是有的，所以不需要在赋值
        workInProgress.pendingProps = pendingProps;
        // Needed because Blocks store data on type.
        workInProgress.type = current.type;

        // We already have an alternate.
        // Reset the effect tag.
        workInProgress.effectTag = NoEffect;

        // The effect list is no longer valid.
        workInProgress.nextEffect = null;
        workInProgress.firstEffect = null;
        workInProgress.lastEffect = null;
    }

    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
        currentDependencies === null
            ? null
            : {
                lanes: currentDependencies.lanes,
                firstContext: currentDependencies.firstContext,
                responders: currentDependencies.responders,
            };

    // These will be overridden during the parent's reconciliation
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;

    return workInProgress;
}

