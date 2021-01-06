import {Lane, SyncLane} from "./fiberLanes";
import {IFiber, Update} from "../type";
import {enqueueUpdate} from "./updateQueue";
import {FiberRoot, FiberRootNode} from '../renderer'
import {HostRoot} from "../share/WorkTag";

const NESTED_UPDATE_LIMIT = 50;
let nestedUpdateCount: number = 0;
let rootWithNestedUpdates: FiberRoot | null = null;

export function updateContainer(
    element: any,
    container: any,
    parentComponent: any,
    callback?: Function,
): Lane {
    const current = container.current;
    // TODO: 现在只以同步模式
    const lane = SyncLane;

    const update = createUpdate(eventTime, lane);

    update.payload = {element};

    callback = callback === undefined ? null : callback;
    if (callback !== null) {
        update.callback = callback;
    }

    enqueueUpdate(current, update);
    scheduleUpdateOnFiber(current, lane, eventTime);

    return lane;
}

export function createUpdate(
    eventTime: number,
    lane: Lane,
): Update<any>{
    const update: Update<any> = {
        eventTime,
        lane,
        tag: UpdateState,
        payload: null,
        callback: null,
        next: null,
    };
    return update;
}

export function markRootUpdated(root: FiberRoot, updateLane: Lane){
    root.suspendedLanes = SyncLane;
    root.pingedLanes = SyncLane;
}

export function getPublicRootInstance(
    container: FiberRoot,
) {
    const containerFiber = container.current;
    if (!containerFiber.child) {
        return null;
    }
    switch (containerFiber.child.tag) {
        case HostComponent:
            return containerFiber.child.stateNode;
        default:
            return containerFiber.child.stateNode;
    }
}
