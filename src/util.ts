export const isFn = (x: any): x is Function => typeof x === "function"
export const isStr = (s: any): s is number | string =>
    typeof s === "number" || typeof s === "string"
export const some = (v: any) => v != null && v !== false && v !== true
