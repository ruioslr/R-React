import {Deletion, Placement} from "../share/SideEffectTags";
import {IFiber as Fiber, ReElement} from "../type";

import {
    getIteratorFn,
    REACT_ELEMENT_TYPE,
    REACT_FRAGMENT_TYPE,
    REACT_PORTAL_TYPE,
    REACT_LAZY_TYPE,
    REACT_BLOCK_TYPE,
} from '../share/ReactSymbols';
import {createFiber, createFiberFromElement, createWorkInProgress, TypeOfMode} from "./fiber";
import {Lanes} from "./fiberLanes";
import {ClassComponent, Fragment, HostText} from "../share/WorkTag";

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);


function ChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
        if (!shouldTrackSideEffects) {
            // Noop.
            return;
        }
        const last = returnFiber.lastEffect;
        if (last !== null) {
            last.nextEffect = childToDelete;
            returnFiber.lastEffect = childToDelete;
        } else {
            returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
        }
        childToDelete.nextEffect = null;
        childToDelete.effectTag = Deletion;
    }

    function deleteRemainingChildren(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
    ): null {
        if (!shouldTrackSideEffects) {
            // Noop.
            return null;
        }

        let childToDelete = currentFirstChild;
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
        return null;
    }

    function mapRemainingChildren(
        returnFiber: Fiber,
        currentFirstChild: Fiber,
    ): Map<string | number, Fiber> {
        // Add the remaining children to a temporary map so that we can find them by
        // keys quickly. Implicit (null) keys get added to this set with their index
        // instead.
        const existingChildren: Map<string | number, Fiber> = new Map();

        let existingChild = currentFirstChild;
        while (existingChild !== null) {
            if (existingChild.key !== null) {
                existingChildren.set(existingChild.key, existingChild);
            } else {
                existingChildren.set(existingChild.index, existingChild);
            }
            existingChild = existingChild.sibling;
        }
        return existingChildren;
    }

    function useFiber(fiber: Fiber, pendingProps: any): Fiber {
        const clone = createWorkInProgress(fiber, pendingProps);
        clone.index = 0;
        clone.sibling = null;
        return clone;
    }

    function placeChild(
        newFiber: Fiber,
        lastPlacedIndex: number,
        newIndex: number,
    ): number {
        newFiber.index = newIndex;
        if (!shouldTrackSideEffects) {
            // Noop.
            return lastPlacedIndex;
        }
        const current = newFiber.alternate;
        // 复用了
        if (current !== null) {
            const oldIndex = current.index;
            if (oldIndex < lastPlacedIndex) {
                // This is a move.
                newFiber.effectTag = Placement;
                return lastPlacedIndex;
            } else {
                // This item can stay in place.
                return oldIndex;
            }
        } else {
            // This is an insertion.
            newFiber.effectTag = Placement;
            return lastPlacedIndex;
        }
    }

    function placeSingleChild(newFiber: Fiber): Fiber {
        // This is simpler for the single child case. We only need to do a
        // placement for inserting new children.
        if (shouldTrackSideEffects && newFiber.alternate === null) {
            newFiber.effectTag = Placement;
        }
        return newFiber;
    }

    function updateTextNode(
        returnFiber: Fiber,
        current: Fiber | null,
        textContent: string,
        lanes: Lanes,
    ) {
        if (current === null || current.tag !== HostText) {
            // Insert
            const created = createFiberFromText(textContent, returnFiber.mode, lanes);
            created.return = returnFiber;
            return created;
        } else {
            // Update
            const existing = useFiber(current, textContent);
            existing.return = returnFiber;
            return existing;
        }
    }

    function updateElement(
        returnFiber: Fiber,
        current: Fiber | null,
        element: ReElement,
        lanes: Lanes,
    ): Fiber {
        if (current !== null) {
            if (
                current.elementType === element.type
            ) {
                // Move based on index
                // 当节点类型前后一样时，根据之前的fiber创建**新的fiber**
                const existing = useFiber(current, element.props);
                // existing.ref = coerceRef(returnFiber, current, element);
                existing.return = returnFiber;
                return existing;
            }
        }
        // Insert 此时 key相同，但是type不相同，所以此时created.alternate === null
        const created = createFiberFromElement(element, returnFiber.mode, lanes);
        // created.ref = coerceRef(returnFiber, current, element);
        created.return = returnFiber;
        return created;
    }

    function createChild(
        returnFiber: Fiber,
        newChild: any,
        lanes: Lanes,
    ): Fiber | null {
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            const created = createFiberFromText(
                '' + newChild,
                returnFiber.mode,
                lanes,
            );
            created.return = returnFiber;
            return created;
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE: {
                    const created = createFiberFromElement(
                        newChild,
                        returnFiber.mode,
                        lanes,
                    );
                    // created.ref = coerceRef(returnFiber, null, newChild);
                    created.return = returnFiber;
                    return created;
                }
            }
        }

        return null;
    }

    // 这个方法用来生成新的fiber，如果key相同，且类型相同，即current.elementType === element.type
    // 则
    function updateSlot(
        returnFiber: Fiber,
        oldFiber: Fiber | null,
        newChild: any,
        lanes: Lanes,
    ): Fiber | null {
        // Update the fiber if the keys match, otherwise return null.

        const key = oldFiber !== null ? oldFiber.key : null;

        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // Text nodes don't have keys. If the previous node is implicitly keyed
            // we can continue to replace it without aborting even if it is not a text
            // node.
            if (key !== null) {
                return null;
            }
            return updateTextNode(returnFiber, oldFiber, '' + newChild, lanes);
        }

        return null;
    }

    function updateFromMap(
        existingChildren: Map<string | number, Fiber>,
        returnFiber: Fiber,
        newIdx: number,
        newChild: any,
        lanes: Lanes,
    ): Fiber | null {
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // Text nodes don't have keys, so we neither have to check the old nor
            // new node for the key. If both are text nodes, they match.
            const matchedFiber = existingChildren.get(newIdx) || null;
            return updateTextNode(returnFiber, matchedFiber, '' + newChild, lanes);
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE: {
                    const matchedFiber =
                        existingChildren.get(
                            newChild.key === null ? newIdx : newChild.key,
                        ) || null;
                    return updateElement(returnFiber, matchedFiber, newChild, lanes);
                }
            }
        }


        return null;
    }

    /**
     * Warns if there is a duplicate or missing key
     */
    function warnOnInvalidKey(
        child: any,
        knownKeys: Set<string> | null,
        returnFiber: Fiber,
    ): Set<string> | null {
        return knownKeys;
    }

    function reconcileChildrenArray(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        newChildren: Array<any>,
    lanes: Lanes,
): Fiber | null {
        // This algorithm can't optimize by searching from both ends since we
        // don't have backpointers on fibers. I'm trying to see how far we can get
        // with that model. If it ends up not being worth the tradeoffs, we can
        // add it later.

        // Even with a two ended optimization, we'd want to optimize for the case
        // where there are few changes and brute force the comparison instead of
        // going for the Map. It'd like to explore hitting that path first in
        // forward-only mode and only go for the Map once we notice that we need
        // lots of look ahead. This doesn't handle reversal as well as two ended
        // search but that's unusual. Besides, for the two ended optimization to
        // work on Iterables, we'd need to copy the whole set.

        // In this first iteration, we'll just live with hitting the bad case
        // (adding everything to a Map) in for every insert/move.

        // If you change this code, also update reconcileChildrenIterator() which
        // uses the same algorithm.


        let resultingFirstChild: Fiber | null = null;
        let previousNewFiber: Fiber | null = null;

        let oldFiber = currentFirstChild;
        let lastPlacedIndex = 0;
        let newIdx = 0;
        let nextOldFiber = null;
        for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
            if (oldFiber.index > newIdx) {
                nextOldFiber = oldFiber;
                oldFiber = null;
            } else {
                nextOldFiber = oldFiber.sibling;
            }
            const newFiber = updateSlot(
                returnFiber,
                oldFiber,
                newChildren[newIdx],
                lanes,
            );
            if (newFiber === null) {
                // TODO: This breaks on empty slots like null children. That's
                // unfortunate because it triggers the slow path all the time. We need
                // a better way to communicate whether this was a miss or null,
                // boolean, undefined, etc.
                if (oldFiber === null) {
                    oldFiber = nextOldFiber;
                }
                break;
            }
            if (shouldTrackSideEffects) {
                if (oldFiber && newFiber.alternate === null) {
                    // 这里是没有复用 key 相同但是type不同，所以没有复用
                    // We matched the slot, but we didn't reuse the existing fiber, so we
                    // need to delete the existing child.
                    deleteChild(returnFiber, oldFiber);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                // TODO: Move out of the loop. This only happens for the first run.
                resultingFirstChild = newFiber;
            } else {
                // TODO: Defer siblings if we're not at the right index for this slot.
                // I.e. if we had null values before, then we want to defer this
                // for each null value. However, we also don't want to call updateSlot
                // with the previous one.
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }

        // new Children 已经遍历完的情况
        if (newIdx === newChildren.length) {
            // We've reached the end of the new children. We can delete the rest.
            deleteRemainingChildren(returnFiber, oldFiber);
            return resultingFirstChild;
        }

        // oldFiber  已经遍历完的情况
        if (oldFiber === null) {
            // If we don't have any more existing children we can choose a fast path
            // since the rest will all be insertions.
            for (; newIdx < newChildren.length; newIdx++) {
                const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
                if (newFiber === null) {
                    continue;
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    // TODO: Move out of the loop. This only happens for the first run.
                    resultingFirstChild = newFiber;
                } else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
            return resultingFirstChild;
        }


        // 到这里说明，new children 和 oldFiber 都没遍历完，即：碰到了 oldFiber.key !== newChild.key的情况
        // Add all children to a key map for quick lookups.
        const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

        // Keep scanning and use the map to restore deleted items as moves.
        for (; newIdx < newChildren.length; newIdx++) {
            const newFiber = updateFromMap(
                existingChildren,
                returnFiber,
                newIdx,
                newChildren[newIdx],
                lanes,
            );
            if (newFiber !== null) {
                if (shouldTrackSideEffects) {
                    // 复用了，所以会有 alternate， 下面英文的注释也可以看
                    if (newFiber.alternate !== null) {
                        // The new fiber is a work in progress, but if there exists a
                        // current, that means that we reused the fiber. We need to delete
                        // it from the child list so that we don't add it to the deletion
                        // list.
                        existingChildren.delete(
                            newFiber.key === null ? newIdx : newFiber.key,
                        );
                    }
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = newFiber;
                } else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
        }

        if (shouldTrackSideEffects) {
            // Any existing children that weren't consumed above were deleted. We need
            // to add them to the deletion list.
            existingChildren.forEach(child => deleteChild(returnFiber, child));
        }

        return resultingFirstChild;
    }

    function reconcileChildrenIterator(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        newChildrenIterable: Iterable<any>,
    lanes: Lanes,
): Fiber | null {
        // This is the same implementation as reconcileChildrenArray(),
        // but using the iterator instead.

        const iteratorFn = getIteratorFn(newChildrenIterable);


        const newChildren = iteratorFn.call(newChildrenIterable);

        let resultingFirstChild: Fiber | null = null;
        let previousNewFiber: Fiber | null = null;

        let oldFiber = currentFirstChild;
        let lastPlacedIndex = 0;
        let newIdx = 0;
        let nextOldFiber = null;

        let step = newChildren.next();
        for (
            ;
            oldFiber !== null && !step.done;
            newIdx++, step = newChildren.next()
        ) {
            if (oldFiber.index > newIdx) {
                nextOldFiber = oldFiber;
                oldFiber = null;
            } else {
                nextOldFiber = oldFiber.sibling;
            }
            const newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
            if (newFiber === null) {
                // TODO: This breaks on empty slots like null children. That's
                // unfortunate because it triggers the slow path all the time. We need
                // a better way to communicate whether this was a miss or null,
                // boolean, undefined, etc.
                if (oldFiber === null) {
                    oldFiber = nextOldFiber;
                }
                break;
            }
            if (shouldTrackSideEffects) {
                if (oldFiber && newFiber.alternate === null) {
                    // We matched the slot, but we didn't reuse the existing fiber, so we
                    // need to delete the existing child.
                    deleteChild(returnFiber, oldFiber);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                // TODO: Move out of the loop. This only happens for the first run.
                resultingFirstChild = newFiber;
            } else {
                // TODO: Defer siblings if we're not at the right index for this slot.
                // I.e. if we had null values before, then we want to defer this
                // for each null value. However, we also don't want to call updateSlot
                // with the previous one.
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }

        if (step.done) {
            // We've reached the end of the new children. We can delete the rest.
            deleteRemainingChildren(returnFiber, oldFiber);
            return resultingFirstChild;
        }

        if (oldFiber === null) {
            // If we don't have any more existing children we can choose a fast path
            // since the rest will all be insertions.
            for (; !step.done; newIdx++, step = newChildren.next()) {
                const newFiber = createChild(returnFiber, step.value, lanes);
                if (newFiber === null) {
                    continue;
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    // TODO: Move out of the loop. This only happens for the first run.
                    resultingFirstChild = newFiber;
                } else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
            return resultingFirstChild;
        }

        // Add all children to a key map for quick lookups.
        const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

        // Keep scanning and use the map to restore deleted items as moves.
        for (; !step.done; newIdx++, step = newChildren.next()) {
            const newFiber = updateFromMap(
                existingChildren,
                returnFiber,
                newIdx,
                step.value,
                lanes,
            );
            if (newFiber !== null) {
                if (shouldTrackSideEffects) {
                    if (newFiber.alternate !== null) {
                        // The new fiber is a work in progress, but if there exists a
                        // current, that means that we reused the fiber. We need to delete
                        // it from the child list so that we don't add it to the deletion
                        // list.
                        existingChildren.delete(
                            newFiber.key === null ? newIdx : newFiber.key,
                        );
                    }
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = newFiber;
                } else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
        }

        if (shouldTrackSideEffects) {
            // Any existing children that weren't consumed above were deleted. We need
            // to add them to the deletion list.
            existingChildren.forEach(child => deleteChild(returnFiber, child));
        }

        return resultingFirstChild;
    }

    function reconcileSingleTextNode(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        textContent: string,
        lanes: Lanes,
    ): Fiber {
        // There's no need to check for keys on text nodes since we don't have a
        // way to define them.
        if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
            // We already have an existing node so let's just update it and delete
            // the rest.
            deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
            const existing = useFiber(currentFirstChild, textContent);
            existing.return = returnFiber;
            return existing;
        }
        // The existing first child is not a text node so we need to create one
        // and delete the existing ones.
        deleteRemainingChildren(returnFiber, currentFirstChild);
        const created = createFiberFromText(textContent, returnFiber.mode, lanes);
        created.return = returnFiber;
        return created;
    }

    function reconcileSingleElement(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        element: ReElement,
        lanes: Lanes,
    ): Fiber {
        const key = element.key;
        let child = currentFirstChild;
        while (child !== null) {
            // TODO: If key === null and child.key === null, then this only applies to
            // the first item in the list.
            if (child.key === key) {
                switch (child.tag) {

                    default: {
                        if (
                            child.elementType === element.type
                            // Keep this check inline so it only runs on the false path:
                        ) {
                            deleteRemainingChildren(returnFiber, child.sibling);
                            const existing = useFiber(child, element.props);
                            // existing.ref = coerceRef(returnFiber, child, element);
                            existing.return = returnFiber;
                            return existing;
                        }
                        break;
                    }
                }
                // Didn't match.
                // 这里指的是： 如果 key相同， 但是elementType不同， 则删掉全部的 child, 因为 key 是唯一的， 相同的那个key却类型不同，那么就找不到，key相同的了
                deleteRemainingChildren(returnFiber, child);
                break;
            } else {
                deleteChild(returnFiber, child);
            }
            child = child.sibling;
        }

        const created = createFiberFromElement(element, returnFiber.mode, lanes);
        // created.ref = coerceRef(returnFiber, currentFirstChild, element);
        created.return = returnFiber;
        return created;
    }

    // This API will tag the children with the side-effect of the reconciliation
    // itself. They will be added to the side-effect list as we pass through the
    // children and the parent.
    function reconcileChildFibers(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        newChild: any,
        lanes: Lanes,
    ): Fiber | null {
        // This function is not recursive.
        // If the top level item is an array, we treat it as a set of children,
        // not as a fragment. Nested arrays on the other hand will be treated as
        // fragment nodes. Recursion happens at the normal flow.

        // Handle top level unkeyed fragments as if they were arrays.
        // This leads to an ambiguity between <>{[...]}</> and <>...</>.
        // We treat the ambiguous cases above the same.
        const isUnkeyedTopLevelFragment =
            typeof newChild === 'object' &&
            newChild !== null &&
            newChild.type === REACT_FRAGMENT_TYPE &&
            newChild.key === null;
        if (isUnkeyedTopLevelFragment) {
            newChild = newChild.props.children;
        }

        // Handle object types
        const isObject = typeof newChild === 'object' && newChild !== null;

        if (isObject) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(
                        reconcileSingleElement(
                            returnFiber,
                            currentFirstChild,
                            newChild,
                            lanes,
                        ),
                    );
            }
        }

        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // 这里好像永远也进不来，因为文本节点的处理作为一个update payload {children: xxx}, 在commitUpdate -> updateProperties下被处理
            return placeSingleChild(
                reconcileSingleTextNode(
                    returnFiber,
                    currentFirstChild,
                    '' + newChild,
                    lanes,
                ),
            );
        }

        if (isArray(newChild)) {
            return reconcileChildrenArray(
                returnFiber,
                currentFirstChild,
                newChild,
                lanes,
            );
        }

        if (getIteratorFn(newChild)) {
            return reconcileChildrenIterator(
                returnFiber,
                currentFirstChild,
                newChild,
                lanes,
            );
        }

        // Remaining cases are all treated as empty.
        return deleteRemainingChildren(returnFiber, currentFirstChild);
    }

    return reconcileChildFibers;
}

const isArray = Array.isArray;

export function createFiberFromText(
    content: string,
    mode: TypeOfMode,
    lanes: Lanes,
): Fiber {
    const fiber = createFiber(HostText, content, null, mode);
    fiber.lanes = lanes;
    return fiber;
}
