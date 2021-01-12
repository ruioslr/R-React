import { IFiber as Fiber } from '../type';
import {
  Incomplete,
  NoEffect,
  PerformedWork, Ref,
  Update,
} from '../share/SideEffectTags';
import { Lanes, SyncLane } from './fiberLanes';
import {
  ClassComponent,
  FunctionComponent,
  HostComponent, HostPortal,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from '../share/WorkTag';
import { REACT_OPAQUE_ID_TYPE } from '../share/ReactSymbols';
import {updateHostComponent, updateHostContainer} from "../renderer/domOperator";
import {
  capturePhaseEvents,
  getListenerMapKey, getRawEventName, removeTrappedEventListener,
  shouldUpgradeListener,
  TOP_SELECTION_CHANGE,
  removeEventListener, addTrappedEventListener
} from "./domTopLevelEventTypes";
import {COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE} from "./workLoop";

export const registrationNameDependencies = {};
export const STYLE = 'style';

const enableModernEventSystem = true;

const randomKey = Math.random()
    .toString(36)
    .slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey;
const internalPropsKey = '__reactProps$' + randomKey;
const internalContainerInstanceKey = '__reactContainer$' + randomKey;
const internalEventHandlersKey = '__reactEvents$' + randomKey;
const internalEventHandlerListenersKey = '__reactListeners$' + randomKey;

const PLUGIN_EVENT_SYSTEM = 1;

function markRef(workInProgress: Fiber) {
  workInProgress.effectTag |= Ref;
}

export function completeWork(
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
      const rootContainerInstance = getRootHostContainer();
      const type = workInProgress.type;
      const currentHostContext = getHostContext();
      if (current !== null && workInProgress.stateNode != null) {
        updateHostComponent(current, workInProgress, type, newProps);
      } else {
        if (!newProps) {
          return null;
        }
        const instance = createInstance(
            type,
            newProps,
            rootContainerInstance,
            currentHostContext,
            workInProgress,
        );
        appendAllChildren(instance, workInProgress, false, false);
        workInProgress.stateNode = instance;





          if (
              finalizeInitialChildren(
                  instance,
                  type,
                  newProps,
                  rootContainerInstance,
                  currentHostContext,
              )
          ) {
            markUpdate(workInProgress);
          }


        if (workInProgress.ref !== null) {
          // If there is a ref on a host node we need to schedule a callback
          markRef(workInProgress);
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
        workInProgress.stateNode = createTextInstance(newText);
      }
      return null;
    }
  }
}

export function appendInitialChild(
    parentInstance: any,
    child: any,
): void {
  parentInstance.appendChild(child);
}

function appendAllChildren(
    parent: any,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
) {
  // We only have the top Fiber that was created but we need recurse down its
  // children to find all the terminal nodes.
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.tag === HostPortal) {
      // If we have a portal child, then we don't want to traverse
      // down its children. Instead, we'll get insertions from each child in
      // the portal directly.
    } else if (node.child !== null) {
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
}

export function finalizeInitialChildren(
    domElement: any,
    type: string,
    props: any,
    rootContainerInstance: any,
    hostContext: any,
): boolean {
  setInitialProperties(domElement, type, props, rootContainerInstance);
  // return shouldAutoFocusHostComponent(type, props);
  return false;
}

export function setInitialProperties(
    domElement: Element,
    tag: string,
    rawProps: Object,
    rootContainerElement: Element | Document,
): void {
  // const isCustomComponentTag = isCustomComponent(tag, rawProps);

  // TODO: Make sure that we check isMounted before firing any of these events.
  let props: Object;
  switch (tag) {
    case 'iframe':
    case 'object':
    case 'embed':
      props = rawProps;
      break;
    case 'video':
    case 'audio':

      props = rawProps;
      break;
    case 'source':
      props = rawProps;
      break;
    case 'img':
    case 'image':
    case 'link':

      props = rawProps;
      break;
    case 'form':

      props = rawProps;
      break;
    case 'details':

      props = rawProps;
      break;
    case 'input':
      ReactDOMInputInitWrapperState(domElement, rawProps);
      props = ReactDOMInputGetHostProps(domElement, rawProps);
      // For controlled components we always need to ensure we're listening
      // to onChange. Even if there is no listener.
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    case 'option':
      // ReactDOMOptionValidateProps(domElement, rawProps);
      props = ReactDOMOptionGetHostProps(domElement, rawProps);
      break;
    case 'select':
      // ReactDOMSelectInitWrapperState(domElement, rawProps);
      // props = ReactDOMSelectGetHostProps(domElement, rawProps);
      // if (!enableModernEventSystem) {
      //   legacyTrapBubbledEvent(TOP_INVALID, domElement);
      // }
      // For controlled components we always need to ensure we're listening
      // to onChange. Even if there is no listener.
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    case 'textarea':
      // ReactDOMTextareaInitWrapperState(domElement, rawProps);
      // props = ReactDOMTextareaGetHostProps(domElement, rawProps);
      // if (!enableModernEventSystem) {
      //   legacyTrapBubbledEvent(TOP_INVALID, domElement);
      // }
      // For controlled components we always need to ensure we're listening
      // to onChange. Even if there is no listener.
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    default:
      props = rawProps;
  }

  // assertValidProps(tag, props);

  // setInitialDOMProperties(
  //     tag,
  //     domElement,
  //     rootContainerElement,
  //     props,
  //     isCustomComponentTag,
  // );

  // switch (tag) {
  //   case 'input':
  //     // TODO: Make sure we check if this is still unmounted or do any clean
  //     // up necessary since we never stop tracking anymore.
  //     track((domElement: any));
  //     ReactDOMInputPostMountWrapper(domElement, rawProps, false);
  //     break;
  //   case 'textarea':
  //     // TODO: Make sure we check if this is still unmounted or do any clean
  //     // up necessary since we never stop tracking anymore.
  //     track((domElement: any));
  //     ReactDOMTextareaPostMountWrapper(domElement, rawProps);
  //     break;
  //   case 'option':
  //     ReactDOMOptionPostMountWrapper(domElement, rawProps);
  //     break;
  //   case 'select':
  //     ReactDOMSelectPostMountWrapper(domElement, rawProps);
  //     break;
  //   default:
  //     if (typeof props.onClick === 'function') {
  //       // TODO: This cast may not be sound for SVG, MathML or custom elements.
  //       trapClickOnNonInteractiveElement(((domElement: any): HTMLElement));
  //     }
  //     break;
  // }
}

function ReactDOMOptionGetHostProps(element: any, props: any) {
  const hostProps = {children: undefined, ...props};
  // const content = flattenChildren(props.children);

  // if (content) {
  //   hostProps.children = content;
  // }

  return hostProps;
}

export function ensureListeningTo(
    rootContainerInstance: Element | Node,
    registrationName: string,
): void {
  if (enableModernEventSystem) {
    // If we have a comment node, then use the parent node,
    // which should be an element.
    const rootContainerElement =
        rootContainerInstance.nodeType === COMMENT_NODE
            ? rootContainerInstance.parentNode
            : rootContainerInstance;

    listenToEvent(registrationName, rootContainerElement);
  } else {
    // Legacy plugin event system path
    // const isDocumentOrFragment =
    //     rootContainerInstance.nodeType === DOCUMENT_NODE ||
    //     rootContainerInstance.nodeType === DOCUMENT_FRAGMENT_NODE;
    // const doc = isDocumentOrFragment
    //     ? rootContainerInstance
    //     : rootContainerInstance.ownerDocument;
    // legacyListenToEvent(registrationName, doc);
  }
}

export function getEventListenerMap(node: EventTarget): any {
  let elementListenerMap = node[internalEventHandlersKey];
  if (elementListenerMap === undefined) {
    elementListenerMap = node[internalEventHandlersKey] = new Map();
  }
  return elementListenerMap;
}

export function listenToEvent(
    registrationName: string,
    rootContainerElement: any,
): void {
  const listenerMap = getEventListenerMap(rootContainerElement);
  const dependencies = registrationNameDependencies[registrationName];

  for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];
    listenToTopLevelEvent(
        dependency,
        rootContainerElement,
        listenerMap,
        PLUGIN_EVENT_SYSTEM,
    );
  }
}

export function listenToTopLevelEvent(
    topLevelType: any,
    target: any,
    listenerMap: any,
    eventSystemFlags: any,
    passive?: boolean,
    priority?: any,
    capture?: boolean,
): void {
  // TOP_SELECTION_CHANGE needs to be attached to the document
  // otherwise it won't capture incoming events that are only
  // triggered on the document directly.
  if (topLevelType === TOP_SELECTION_CHANGE) {
    target = target.ownerDocument || target;
    listenerMap = getEventListenerMap(target);
  }
  capture =
      capture === undefined ? capturePhaseEvents.has(topLevelType) : capture;
  const listenerMapKey = getListenerMapKey(topLevelType, capture);
  const listenerEntry = listenerMap.get(
      listenerMapKey,
  );
  const shouldUpgrade = shouldUpgradeListener(listenerEntry, passive);

  // If the listener entry is empty or we should upgrade, then
  // we need to trap an event listener onto the target.
  if (listenerEntry === undefined || shouldUpgrade) {
    // If we should upgrade, then we need to remove the existing trapped
    // event listener for the target container.
    if (shouldUpgrade) {
      removeTrappedEventListener(
          target,
          topLevelType,
          capture,
          listenerEntry.listener,
      );
    }
    const listener = addTrappedEventListener(
        target,
        topLevelType,
        eventSystemFlags,
        capture,
        false,
        passive,
        priority,
    );
    listenerMap.set(listenerMapKey, {passive, listener});
  }
}

export function ReactDOMInputGetHostProps(element: any, props: any) {
  const node = element;
  const checked = props.checked;

  const hostProps = Object.assign({}, props, {
    defaultChecked: undefined,
    defaultValue: undefined,
    value: undefined,
    checked: checked != null ? checked : node._wrapperState.initialChecked,
  });

  return hostProps;
}

export function getToStringValue(value: any): string {
  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'object':
    case 'string':
    case 'undefined':
      return value;
    default:
      // function, symbol are assigned as empty strings
      return '';
  }
}

function isControlled(props) {
  const usesChecked = props.type === 'checkbox' || props.type === 'radio';
  return usesChecked ? props.checked != null : props.value != null;
}

export function ReactDOMInputInitWrapperState(element: any, props: any) {
  const node = element;
  const defaultValue = props.defaultValue == null ? '' : props.defaultValue;

  node._wrapperState = {
    initialChecked:
        props.checked != null ? props.checked : props.defaultChecked,
    initialValue: getToStringValue(
        props.value != null ? props.value : defaultValue,
    ),
    controlled: isControlled(props),
  };
}


export function markUpdate(workInProgress: Fiber) {
  // Tag the fiber with an update effect. This turns a Placement into
  // a PlacementAndUpdate.
  workInProgress.effectTag |= Update;
}

export function createInstance(
    type: string,
    props: any,
    rootContainerInstance: any,
    hostContext: any,
    internalInstanceHandle: any,
): any {
  let parentNamespace: string = hostContext;
  const domElement: any = createElement(
      type,
      props,
      rootContainerInstance,
      parentNamespace,
  );
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}

export function updateFiberProps(
    node: any,
    props: any,
): void {
  node[internalPropsKey] = props;
}

export function precacheFiberNode(
    hostInst: Fiber,
    node: any,
): void {
  node[internalInstanceKey] = hostInst;
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const Namespaces = {
  html: HTML_NAMESPACE,
  mathml: MATH_NAMESPACE,
  svg: SVG_NAMESPACE,
};

export function getIntrinsicNamespace(type: string): string {
  switch (type) {
    case 'svg':
      return SVG_NAMESPACE;
    case 'math':
      return MATH_NAMESPACE;
    default:
      return HTML_NAMESPACE;
  }
}

export function createElement(
    type: string,
    props: any,
    rootContainerElement: Element | Document,
    parentNamespace: string,
): Element {
  let isCustomComponentTag;

  // We create tags in the namespace of their parent container, except HTML
  // tags get no namespace.
  const ownerDocument: Document = getOwnerDocumentFromRootContainer();
  let domElement: any;
  let namespaceURI = parentNamespace;
  if (namespaceURI === HTML_NAMESPACE) {
    namespaceURI = getIntrinsicNamespace(type);
  }
  if (namespaceURI === HTML_NAMESPACE) {
    const lowerCaseType = type.toLowerCase();

    if (lowerCaseType === 'script') {
      // Create the script via .innerHTML so its "parser-inserted" flag is
      // set to true and it does not execute
      const div = ownerDocument.createElement('div');
      div.innerHTML = '<script><' + '/script>'; // eslint-disable-line
      // This is guaranteed to yield a script element.
      const firstChild = div.firstChild;
      domElement = div.removeChild(firstChild);
    } else if (typeof props.is === 'string') {
      // $FlowIssue `createElement` should be updated for Web Components
      domElement = ownerDocument.createElement(type, {is: props.is});
    } else {
      // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
      // See discussion in https://github.com/facebook/react/pull/6896
      // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
      domElement = ownerDocument.createElement(type);
      // Normally attributes are assigned in `setInitialDOMProperties`, however the `multiple` and `size`
      // attributes on `select`s needs to be added before `option`s are inserted.
      // This prevents:
      // - a bug where the `select` does not scroll to the correct option because singular
      //  `select` elements automatically pick the first item #13222
      // - a bug where the `select` set the first item as selected despite the `size` attribute #14239
      // See https://github.com/facebook/react/issues/13222
      // and https://github.com/facebook/react/issues/14239
      if (type === 'select') {
        const node: any = domElement;
        if (props.multiple) {
          node.multiple = true;
        } else if (props.size) {
          // Setting a size greater than 1 causes a select to behave like `multiple=true`, where
          // it is possible that no option is selected.
          //
          // This is only necessary when a select in "single selection mode".
          node.size = props.size;
        }
      }
    }
  } else {
    domElement = ownerDocument.createElementNS(namespaceURI, type);
  }
  return domElement;
}

function getRootHostContainer() {
  return document.getElementById('root');
}

function getHostContext() {
  return 'http://www.w3.org/1999/xhtml'
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

export function createTextInstance(text: string) {
  const textNode = createTextNode(text);
  return textNode;
}

export function createTextNode(text: string): Text {
  return getOwnerDocumentFromRootContainer().createTextNode(text);
}

function getOwnerDocumentFromRootContainer(): Document {
  return document;
}

export function prepareUpdate(
  domElement: any,
  type: string,
  oldProps: any,
  newProps: any,
): any {
  return diffProperties(domElement, type, oldProps, newProps);
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
