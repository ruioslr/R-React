import {Lane, Lanes} from './reconciler/fiberLanes';
import {TypeOfMode} from "./reconciler/fiber";
import {SideEffectTag} from "./share/SideEffectTags";

export type Key = FreText;
export interface RefObject<T> {
  current: T;
}

export type RefCallback<T> = {
  bivarianceHack(instance: T | null): void;
}['bivarianceHack'];
export type Ref<T = any> = RefCallback<T> | RefObject<T> | null;

export interface Attributes extends Record<string, any> {
  key?: Key;
  children?: FreNode;
  ref?: Ref;
}

export interface FC<P extends Attributes = {}> {
  (props: P): ReElement<P> | null;
  fiber?: IFiber;
  tag?: number;
  type?: string;
}

export interface ReElement<P extends Attributes = any, T = any> {
  type: T;
  props: P;
  key: string;
}

export type HookTypes = 'list' | 'effect' | 'layout';

export interface IHook {
  list: IEffect[];
  layout: IEffect[];
  effect: IEffect[];
}

export type IRef = (
  e: HTMLElement | undefined,
) => void | { current?: HTMLElement };

export type HTMLElementEx = HTMLElement & { last: IFiber | null };
export type IEffect = [Function?, number?, Function?];

export type FreText = string | number;
export type FreNode =
  | FreText
  | ReElement
  | FreNode[]
  | boolean
  | null
  | undefined;
export type SetStateAction<S> = S | ((prevState: S) => S);
export type Dispatch<A> = (value: A, resume?: boolean) => void;
export type Reducer<S, A> = (prevState: S, action: A) => S;
export type IVoidCb = () => void;
export type EffectCallback = () => void | (IVoidCb | undefined);
export type DependencyList = Array<any>;

export interface PropsWithChildren {
  children?: FreNode;
}

/*------------------------------------------------------*/

// 之后需要按优先级或者timeout,现在先直接调用
export type ITaskCallback = ((time?: boolean) => boolean) | null;

export interface ITask {
  callback?: ITaskCallback;
  time: number;
}

export type DOM = HTMLElement | SVGElement;

export type Task = {
  priority: number;
  callback: () => void;
};

export interface IFiberRoot {
  current: IFiber;
}

export interface IFiber {
  next?: IFiber;
  sibling?: IFiber;
  parent?: IFiber | null;
  pendingProps: any;
  memoizedProps: any;
  memoizedState: any;
  key: null | string;
  stateNode: any;
  tag: WorkTag;
  type: any;
  elementType: any;
  return: IFiber | null;
  child: IFiber | null;
  index: number;
  updateQueue: UpdateQueue<any>;
  mode: TypeOfMode;

  effectTag: SideEffectTag;
  nextEffect: IFiber | null;
  firstEffect: IFiber | null;
  lastEffect: IFiber | null;

  alternate: IFiber | null;

  lanes: Lanes;
  childLanes: Lanes;
  ref: any;

  dependencies: any;
}

export type WorkTag =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export type Update<State> = {
  eventTime: number;
  lane: Lane;
  // 现在只有null
  suspenseConfig?: null;

  tag: 0 | 1 | 2 | 3;
  payload: any;
  callback: Function | null;

  next: Update<State> | null;
};

export type UpdateQueue<State> = {
  baseState: State; // 在跳过某一个更新前时的 State
  firstBaseUpdate: Update<State> | null;
  lastBaseUpdate: Update<State> | null;
  shared: SharedQueue<State>;
  effects: Array<Update<State>> | null;
};

export type SharedQueue<State> = {
  pending: Update<State> | null; // 指向的是单向环状链表的尾结点， 这样 pending.next 就是头结点
};
