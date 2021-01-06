export const disableInputAttributeSyncing = false;



export function getFiberCurrentPropsFromNode(
    node: any
): any {
    return node[internalPropsKey] || null;
}

export function checkControlledValueProps(
    tagName: string,
    props: Object,
): void {
}
export const ATTRIBUTE_NAME_START_CHAR =
    ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
/* eslint-enable max-len */
export const ATTRIBUTE_NAME_CHAR =
    ATTRIBUTE_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040';

export const ID_ATTRIBUTE_NAME = 'data-reactid';
export const ROOT_ATTRIBUTE_NAME = 'data-reactroot';
export const VALID_ATTRIBUTE_NAME_REGEX = new RegExp(
    '^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$',
);
const hasOwnProperty = Object.prototype.hasOwnProperty;
const illegalAttributeNameCache = {};
const validatedAttributeNameCache = {};

export const BOOLEAN = 3;


export function isAttributeNameSafe(attributeName: string): boolean {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {
        return true;
    }
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {
        return false;
    }
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
        validatedAttributeNameCache[attributeName] = true;
        return true;
    }
    illegalAttributeNameCache[attributeName] = true;

    return false;
}
export function shouldRemoveAttribute(
    name: string,
    value: any,
    propertyInfo: any,
    isCustomComponentTag: boolean,
): boolean {
    if (value === null || typeof value === 'undefined') {
        return true;
    }
    if (
        shouldRemoveAttributeWithWarning(
            name,
            value,
            propertyInfo,
            isCustomComponentTag,
        )
    ) {
        return true;
    }
    if (isCustomComponentTag) {
        return false;
    }
    if (propertyInfo !== null) {
        if (enableFilterEmptyStringAttributesDOM) {
            if (propertyInfo.removeEmptyString && value === '') {
                if (__DEV__) {
                    if (name === 'src') {
                        console.error(
                            'An empty string ("") was passed to the %s attribute. ' +
                            'This may cause the browser to download the whole page again over the network. ' +
                            'To fix this, either do not render the element at all ' +
                            'or pass null to %s instead of an empty string.',
                            name,
                            name,
                        );
                    } else {
                        console.error(
                            'An empty string ("") was passed to the %s attribute. ' +
                            'To fix this, either do not render the element at all ' +
                            'or pass null to %s instead of an empty string.',
                            name,
                            name,
                        );
                    }
                }
                return true;
            }
        }

        switch (propertyInfo.type) {
            case BOOLEAN:
                return !value;
            case OVERLOADED_BOOLEAN:
                return value === false;
            case NUMERIC:
                return isNaN(value);
            case POSITIVE_NUMERIC:
                return isNaN(value) || (value: any) < 1;
        }
    }
    return false;
}

export function setValueForProperty(
    node: Element,
    name: string,
    value: any,
    isCustomComponentTag: boolean,
) {
    const propertyInfo = getPropertyInfo(name);
    if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {
        return;
    }
    if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {
        value = null;
    }
    // If the prop isn't in the special list, treat it as a simple attribute.
    if (isCustomComponentTag || propertyInfo === null) {
        if (isAttributeNameSafe(name)) {
            const attributeName = name;
            if (value === null) {
                node.removeAttribute(attributeName);
            } else {
                node.setAttribute(
                    attributeName,
                    value)
            }
        }
        return;
    }
    const {mustUseProperty} = propertyInfo;
    if (mustUseProperty) {
        const {propertyName} = propertyInfo;
        if (value === null) {
            const {type} = propertyInfo;
            node[propertyName] = type === BOOLEAN ? false : '';
        } else {
            // Contrary to `setAttribute`, object properties are properly
            // `toString`ed by IE8/9.
            node[propertyName] = value;
        }
        return;
    }
    // The rest are treated as attributes with special cases.
    const {attributeName, attributeNamespace} = propertyInfo;
    if (value === null) {
        node.removeAttribute(attributeName);
    } else {
        const {type} = propertyInfo;
        let attributeValue;
        if (type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true)) {
            // If attribute type is boolean, we know for sure it won't be an execution sink
            // and we won't require Trusted Type here.
            attributeValue = '';
        } else {
            // `setAttribute` with objects becomes only `[object]` in IE8/9,
            // ('' + value) makes it output the correct toString()-value.
            if (enableTrustedTypesIntegration) {
                attributeValue = (value: any);
            } else {
                attributeValue = '' + (value: any);
            }
            if (propertyInfo.sanitizeURL) {
                sanitizeURL(attributeValue.toString());
            }
        }
        if (attributeNamespace) {
            node.setAttributeNS(attributeNamespace, attributeName, attributeValue);
        } else {
            node.setAttribute(attributeName, attributeValue);
        }
    }
}

export function toString(value: ToStringValue): string {
    return '' + (value: any);
}

export function updateValueIfChanged(node: ElementWithValueTracker) {
    if (!node) {
        return false;
    }

    const tracker = getTracker(node);
    // if there is no tracker at this point it's unlikely
    // that trying again will succeed
    if (!tracker) {
        return true;
    }

    const lastValue = tracker.getValue();
    const nextValue = getValueFromNode(node);
    if (nextValue !== lastValue) {
        tracker.setValue(nextValue);
        return true;
    }
    return false;
}


export function getToStringValue(value: any): ToStringValue {
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

type InputWithWrapperState = any;

let didWarnValueDefaultValue = false;
let didWarnCheckedDefaultChecked = false;
let didWarnControlledToUncontrolled = false;
let didWarnUncontrolledToControlled = false;

function isControlled(props) {
    const usesChecked = props.type === 'checkbox' || props.type === 'radio';
    return usesChecked ? props.checked != null : props.value != null;
}

/**
 * Implements an <input> host component that allows setting these optional
 * props: `checked`, `value`, `defaultChecked`, and `defaultValue`.
 *
 * If `checked` or `value` are not supplied (or null/undefined), user actions
 * that affect the checked state or value will trigger updates to the element.
 *
 * If they are supplied (and not null/undefined), the rendered element will not
 * trigger updates to the element. Instead, the props must change in order for
 * the rendered element to be updated.
 *
 * The rendered element will be initialized as unchecked (or `defaultChecked`)
 * with an empty value (or `defaultValue`).
 *
 * See http://www.w3.org/TR/2012/WD-html5-20121025/the-input-element.html
 */

export function getHostProps(element: Element, props: Object) {
    const node = ((element: any): InputWithWrapperState);
    const checked = props.checked;

    const hostProps = Object.assign({}, props, {
        defaultChecked: undefined,
        defaultValue: undefined,
        value: undefined,
        checked: checked != null ? checked : node._wrapperState.initialChecked,
    });

    return hostProps;
}

export function initWrapperState(element: Element, props: Object) {
    if (__DEV__) {
        checkControlledValueProps('input', props);

        if (
            props.checked !== undefined &&
            props.defaultChecked !== undefined &&
            !didWarnCheckedDefaultChecked
        ) {
            console.error(
                '%s contains an input of type %s with both checked and defaultChecked props. ' +
                'Input elements must be either controlled or uncontrolled ' +
                '(specify either the checked prop, or the defaultChecked prop, but not ' +
                'both). Decide between using a controlled or uncontrolled input ' +
                'element and remove one of these props. More info: ' +
                'https://fb.me/react-controlled-components',
                getCurrentFiberOwnerNameInDevOrNull() || 'A component',
                props.type,
            );
            didWarnCheckedDefaultChecked = true;
        }
        if (
            props.value !== undefined &&
            props.defaultValue !== undefined &&
            !didWarnValueDefaultValue
        ) {
            console.error(
                '%s contains an input of type %s with both value and defaultValue props. ' +
                'Input elements must be either controlled or uncontrolled ' +
                '(specify either the value prop, or the defaultValue prop, but not ' +
                'both). Decide between using a controlled or uncontrolled input ' +
                'element and remove one of these props. More info: ' +
                'https://fb.me/react-controlled-components',
                getCurrentFiberOwnerNameInDevOrNull() || 'A component',
                props.type,
            );
            didWarnValueDefaultValue = true;
        }
    }

    const node = ((element: any): InputWithWrapperState);
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

export function updateChecked(element: Element, props: Object) {
    const node = ((element: any): InputWithWrapperState);
    const checked = props.checked;
    if (checked != null) {
        setValueForProperty(node, 'checked', checked, false);
    }
}

export function updateWrapper(element: Element, props: Object) {
    const node = ((element: any): InputWithWrapperState);
    if (__DEV__) {
        const controlled = isControlled(props);

        if (
            !node._wrapperState.controlled &&
            controlled &&
            !didWarnUncontrolledToControlled
        ) {
            console.error(
                'A component is changing an uncontrolled input to be controlled. ' +
                'This is likely caused by the value changing from undefined to ' +
                'a defined value, which should not happen. ' +
                'Decide between using a controlled or uncontrolled input ' +
                'element for the lifetime of the component. More info: https://fb.me/react-controlled-components',
            );
            didWarnUncontrolledToControlled = true;
        }
        if (
            node._wrapperState.controlled &&
            !controlled &&
            !didWarnControlledToUncontrolled
        ) {
            console.error(
                'A component is changing a controlled input to be uncontrolled. ' +
                'This is likely caused by the value changing from a defined to ' +
                'undefined, which should not happen. ' +
                'Decide between using a controlled or uncontrolled input ' +
                'element for the lifetime of the component. More info: https://fb.me/react-controlled-components',
            );
            didWarnControlledToUncontrolled = true;
        }
    }

    updateChecked(element, props);

    const value = getToStringValue(props.value);
    const type = props.type;

    if (value != null) {
        if (type === 'number') {
            if (
                (value === 0 && node.value === '') ||
                // We explicitly want to coerce to number here if possible.
                // eslint-disable-next-line
                node.value != (value: any)
            ) {
                node.value = toString((value: any));
            }
        } else if (node.value !== toString((value: any))) {
            node.value = toString((value: any));
        }
    } else if (type === 'submit' || type === 'reset') {
        // Submit/reset inputs need the attribute removed completely to avoid
        // blank-text buttons.
        node.removeAttribute('value');
        return;
    }

    if (disableInputAttributeSyncing) {
        // When not syncing the value attribute, React only assigns a new value
        // whenever the defaultValue React prop has changed. When not present,
        // React does nothing
        if (props.hasOwnProperty('defaultValue')) {
            setDefaultValue(node, props.type, getToStringValue(props.defaultValue));
        }
    } else {
        // When syncing the value attribute, the value comes from a cascade of
        // properties:
        //  1. The value React property
        //  2. The defaultValue React property
        //  3. Otherwise there should be no change
        if (props.hasOwnProperty('value')) {
            setDefaultValue(node, props.type, value);
        } else if (props.hasOwnProperty('defaultValue')) {
            setDefaultValue(node, props.type, getToStringValue(props.defaultValue));
        }
    }

    if (disableInputAttributeSyncing) {
        // When not syncing the checked attribute, the attribute is directly
        // controllable from the defaultValue React property. It needs to be
        // updated as new props come in.
        if (props.defaultChecked == null) {
            node.removeAttribute('checked');
        } else {
            node.defaultChecked = !!props.defaultChecked;
        }
    } else {
        // When syncing the checked attribute, it only changes when it needs
        // to be removed, such as transitioning from a checkbox into a text input
        if (props.checked == null && props.defaultChecked != null) {
            node.defaultChecked = !!props.defaultChecked;
        }
    }
}

export function postMountWrapper(
    element: Element,
    props: Object,
    isHydrating: boolean,
) {
    const node = ((element: any): InputWithWrapperState);

    // Do not assign value if it is already set. This prevents user text input
    // from being lost during SSR hydration.
    if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {
        const type = props.type;
        const isButton = type === 'submit' || type === 'reset';

        // Avoid setting value attribute on submit/reset inputs as it overrides the
        // default value provided by the browser. See: #12872
        if (isButton && (props.value === undefined || props.value === null)) {
            return;
        }

        const initialValue = toString(node._wrapperState.initialValue);

        // Do not assign value if it is already set. This prevents user text input
        // from being lost during SSR hydration.
        if (!isHydrating) {
            if (disableInputAttributeSyncing) {
                const value = getToStringValue(props.value);

                // When not syncing the value attribute, the value property points
                // directly to the React prop. Only assign it if it exists.
                if (value != null) {
                    // Always assign on buttons so that it is possible to assign an
                    // empty string to clear button text.
                    //
                    // Otherwise, do not re-assign the value property if is empty. This
                    // potentially avoids a DOM write and prevents Firefox (~60.0.1) from
                    // prematurely marking required inputs as invalid. Equality is compared
                    // to the current value in case the browser provided value is not an
                    // empty string.
                    if (isButton || value !== node.value) {
                        node.value = toString(value);
                    }
                }
            } else {
                // When syncing the value attribute, the value property should use
                // the wrapperState._initialValue property. This uses:
                //
                //   1. The value React property when present
                //   2. The defaultValue React property when present
                //   3. An empty string
                if (initialValue !== node.value) {
                    node.value = initialValue;
                }
            }
        }

        if (disableInputAttributeSyncing) {
            // When not syncing the value attribute, assign the value attribute
            // directly from the defaultValue React property (when present)
            const defaultValue = getToStringValue(props.defaultValue);
            if (defaultValue != null) {
                node.defaultValue = toString(defaultValue);
            }
        } else {
            // Otherwise, the value attribute is synchronized to the property,
            // so we assign defaultValue to the same thing as the value property
            // assignment step above.
            node.defaultValue = initialValue;
        }
    }

    // Normally, we'd just do `node.checked = node.checked` upon initial mount, less this bug
    // this is needed to work around a chrome bug where setting defaultChecked
    // will sometimes influence the value of checked (even after detachment).
    // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=608416
    // We need to temporarily unset name to avoid disrupting radio button groups.
    const name = node.name;
    if (name !== '') {
        node.name = '';
    }

    if (disableInputAttributeSyncing) {
        // When not syncing the checked attribute, the checked property
        // never gets assigned. It must be manually set. We don't want
        // to do this when hydrating so that existing user input isn't
        // modified
        if (!isHydrating) {
            updateChecked(element, props);
        }

        // Only assign the checked attribute if it is defined. This saves
        // a DOM write when controlling the checked attribute isn't needed
        // (text inputs, submit/reset)
        if (props.hasOwnProperty('defaultChecked')) {
            node.defaultChecked = !node.defaultChecked;
            node.defaultChecked = !!props.defaultChecked;
        }
    } else {
        // When syncing the checked attribute, both the checked property and
        // attribute are assigned at the same time using defaultChecked. This uses:
        //
        //   1. The checked React property when present
        //   2. The defaultChecked React property when present
        //   3. Otherwise, false
        node.defaultChecked = !node.defaultChecked;
        node.defaultChecked = !!node._wrapperState.initialChecked;
    }

    if (name !== '') {
        node.name = name;
    }
}

export function restoreControlledState(element: Element, props: Object) {
    const node = ((element: any): InputWithWrapperState);
    updateWrapper(node, props);
    updateNamedCousins(node, props);
}

function updateNamedCousins(rootNode, props) {
    const name = props.name;
    if (props.type === 'radio' && name != null) {
        let queryRoot: Element = rootNode;

        while (queryRoot.parentNode) {
            queryRoot = ((queryRoot.parentNode: any): Element);
        }

        // If `rootNode.form` was non-null, then we could try `form.elements`,
        // but that sometimes behaves strangely in IE8. We could also try using
        // `form.getElementsByName`, but that will only return direct children
        // and won't include inputs that use the HTML5 `form=` attribute. Since
        // the input might not even be in a form. It might not even be in the
        // document. Let's just use the local `querySelectorAll` to ensure we don't
        // miss anything.
        const group = queryRoot.querySelectorAll(
            'input[name=' + JSON.stringify('' + name) + '][type="radio"]',
        );

        for (let i = 0; i < group.length; i++) {
            const otherNode = ((group[i]: any): HTMLInputElement);
            if (otherNode === rootNode || otherNode.form !== rootNode.form) {
                continue;
            }
            // This will throw if radio buttons rendered by different copies of React
            // and the same name are rendered into the same form (same as #1939).
            // That's probably okay; we don't support it just as we don't support
            // mixing React radio buttons with non-React ones.
            const otherProps = getFiberCurrentPropsFromNode(otherNode);
            invariant(
                otherProps,
                'ReactDOMInput: Mixing React and non-React radio inputs with the ' +
                'same `name` is not supported.',
            );

            // We need update the tracked value on the named cousin since the value
            // was changed but the input saw no event or value set
            updateValueIfChanged(otherNode);

            // If this is a controlled radio button group, forcing the input that
            // was previously checked to update will cause it to be come re-checked
            // as appropriate.
            updateWrapper(otherNode, otherProps);
        }
    }
}

// In Chrome, assigning defaultValue to certain input types triggers input validation.
// For number inputs, the display value loses trailing decimal points. For email inputs,
// Chrome raises "The specified value <x> is not a valid email address".
//
// Here we check to see if the defaultValue has actually changed, avoiding these problems
// when the user is inputting text
//
// https://github.com/facebook/react/issues/7253
export function setDefaultValue(
    node: InputWithWrapperState,
    type: ?string,
    value: *,
) {
    if (
        // Focused number inputs synchronize on blur. See ChangeEventPlugin.js
        type !== 'number' ||
        node.ownerDocument.activeElement !== node
    ) {
        if (value == null) {
            node.defaultValue = toString(node._wrapperState.initialValue);
        } else if (node.defaultValue !== toString(value)) {
            node.defaultValue = toString(value);
        }
    }
}

export function shouldIgnoreAttribute(
    name: string,
    propertyInfo: any,
    isCustomComponentTag: boolean,
): boolean {
    if (propertyInfo !== null) {
        return propertyInfo.type === RESERVED;
    }
    if (isCustomComponentTag) {
        return false;
    }
    if (
        name.length > 2 &&
        (name[0] === 'o' || name[0] === 'O') &&
        (name[1] === 'n' || name[1] === 'N')
    ) {
        return true;
    }
    return false;
}
