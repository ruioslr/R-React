import {ReElement, IFiber, ITaskCallback, Task, IFiberRoot, WorkTag} from '../type';
import {scheduleCallback} from '../scheduler';
import {NoLanes} from "../reconciler/fiberLanes";
import {LegacyRoot} from "../share/RootTags";
import {createHostRootFiber} from "../reconciler/fiber";
import {getPublicRootInstance, updateContainer} from "../reconciler";
import {initializeUpdateQueue} from "../reconciler/workLoop";


export function render(element: ReElement, container: HTMLElement & {_reactRootContainer: any}, done?: () => void) {
    let reactRoot: {_internalRoot: IFiberRoot} | undefined = container._reactRootContainer;
    let fiberRoot;
    if(!reactRoot){
        reactRoot = container._reactRootContainer = createReactRoot(container, LegacyRoot);
        fiberRoot = reactRoot._internalRoot;
    }else {
        fiberRoot = reactRoot._internalRoot;
    }
    // 现在只有同步方式
    updateContainer(element, fiberRoot, null, done);
    return getPublicRootInstance(fiberRoot);
}

function createReactRoot(container, tag: WorkTag) {
    return {
        _internalRoot: createFiberRoot(container, tag)
    }
}

function createFiberRoot(container, tag: WorkTag): IFiberRoot {
    const root = new FiberRootNode(container, tag);
    root.current = createHostRootFiber(tag);
    root.current.stateNode = root;
    initializeUpdateQueue(root.current);
    return root as IFiberRoot;
}

export function FiberRootNode(containerInfo, tag) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.current = null;
    this.pingCache = null;
    this.finishedWork = null;
    // this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.callbackNode = null;
    this.callbackId = NoLanes;
    // this.callbackPriority = NoLanePriority;
    // this.expirationTimes = createLaneMap(NoTimestamp);

    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.mutableReadLanes = NoLanes;
    this.finishedLanes = NoLanes;

    this.entangledLanes = NoLanes;
    // this.entanglements = createLaneMap(NoLanes);
}

// export type FiberRoot = ReturnType<typeof FiberRootNode>;
export type FiberRoot = any;


