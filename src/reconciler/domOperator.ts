import {Namespaces} from "./completeWork";
import {TEXT_NODE} from "./workLoop";

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
export const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
export const SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
export const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
export const AUTOFOCUS = 'autoFocus';
export const CHILDREN = 'children';
export const STYLE = 'style';
export const HTML = '__html';
export const DEPRECATED_flareListeners = 'DEPRECATED_flareListeners';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const validatedAttributeNameCache = {};
const illegalAttributeNameCache = {};


export const enableFilterEmptyStringAttributesDOM = false;
export const enableTrustedTypesIntegration = false;
export const disableJavaScriptURLs = false;
// A reserved attribute.
// It is handled by React separately and shouldn't be written to the DOM.
export const RESERVED = 0;

// A simple string attribute.
// Attributes that aren't in the whitelist are presumed to have this type.
export const STRING = 1;

// A string attribute that accepts booleans in React. In HTML, these are called
// "enumerated" attributes with "true" and "false" as possible values.
// When true, it should be set to a "true" string.
// When false, it should be set to a "false" string.
export const BOOLEANISH_STRING = 2;

// A real boolean attribute.
// When true, it should be present (set either to an empty string or its name).
// When false, it should be omitted.
export const BOOLEAN = 3;

// An attribute that can be used as a flag as well as with a value.
// When true, it should be present (set either to an empty string or its name).
// When false, it should be omitted.
// For any other value, should be present with that value.
export const OVERLOADED_BOOLEAN = 4;

// An attribute that must be numeric or parse as a numeric.
// When falsy, it should be removed.
export const NUMERIC = 5;

// An attribute that must be positive numeric or parse as a positive numeric.
// When falsy, it should be removed.
export const POSITIVE_NUMERIC = 6;

const properties = {};


export function setValueForStyles(node, styles) {
    const style = node.style;
    for (let styleName in styles) {
        if (!styles.hasOwnProperty(styleName)) {
            continue;
        }
        const isCustomProperty = styleName.indexOf('--') === 0;

        const styleValue = dangerousStyleValue(
            styleName,
            styles[styleName],
            isCustomProperty,
        );
        if (styleName === 'float') {
            styleName = 'cssFloat';
        }
        if (isCustomProperty) {
            style.setProperty(styleName, styleValue);
        } else {
            style[styleName] = styleValue;
        }
    }
}

function dangerousStyleValue(name, value, isCustomProperty) {
    // Note that we've removed escapeTextForBrowser() calls here since the
    // whole string will be escaped when the attribute is injected into
    // the markup. If you provide unsafe user data here they can inject
    // arbitrary CSS which may be problematic (I couldn't repro this):
    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
    // This is not an XSS hole but instead a potential CSS injection issue
    // which has lead to a greater discussion about how we're going to
    // trust URLs moving forward. See #2115901

    const isEmpty = value == null || typeof value === 'boolean' || value === '';
    if (isEmpty) {
        return '';
    }

    if (
        !isCustomProperty &&
        typeof value === 'number' &&
        value !== 0 &&
        !(isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])
    ) {
        return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers
    }

    return ('' + value).trim();
}

export const isUnitlessNumber = {
    animationIterationCount: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    columns: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridArea: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowSpan: true,
    gridRowStart: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnSpan: true,
    gridColumnStart: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,

    // SVG-related properties
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true,
};


let reusableSVGContainer;

export const setInnerHTML = function(
    node: any,
    html
): void {
    if (node.namespaceURI === Namespaces.svg) {
        if (!('innerHTML' in node)) {
            // IE does not have innerHTML for SVG nodes, so instead we inject the
            // new markup in a temp node and then move the child nodes across into
            // the target node
            reusableSVGContainer =
                reusableSVGContainer || document.createElement('div');
            reusableSVGContainer.innerHTML =
                '<svg>' + html.valueOf().toString() + '</svg>';
            const svgNode = reusableSVGContainer.firstChild;
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            while (svgNode.firstChild) {
                node.appendChild(svgNode.firstChild);
            }
            return;
        }
    }
    node.innerHTML = html;
};


export const setTextContent = function(node: Element, text: string): void {
    if (text) {
        const firstChild = node.firstChild;

        if (
            firstChild &&
            firstChild === node.lastChild &&
            firstChild.nodeType === TEXT_NODE
        ) {
            firstChild.nodeValue = text;
            return;
        }
    }
    node.textContent = text;
};


export function getPropertyInfo(name: string): any  {
    return properties.hasOwnProperty(name) ? properties[name] : null;
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
                    enableTrustedTypesIntegration ? value : '' + value,
            );
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
                attributeValue = value;
            } else {
                attributeValue = '' + value;
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

export function shouldIgnoreAttribute(
    name: string,
    propertyInfo,
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

export function shouldRemoveAttribute(
    name: string,
    value: any,
    propertyInfo: any | null,
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
                return isNaN(value) || value < 1;
        }
    }
    return false;
}


export function shouldRemoveAttributeWithWarning(
    name: string,
    value: any,
    propertyInfo: any | null,
    isCustomComponentTag: boolean,
): boolean {
    if (propertyInfo !== null && propertyInfo.type === RESERVED) {
        return false;
    }
    switch (typeof value) {
        case 'function':
        // $FlowIssue symbol is perfectly valid here
        case 'symbol': // eslint-disable-line
            return true;
        case 'boolean': {
            if (isCustomComponentTag) {
                return false;
            }
            if (propertyInfo !== null) {
                return !propertyInfo.acceptsBooleans;
            } else {
                const prefix = name.toLowerCase().slice(0, 5);
                return prefix !== 'data-' && prefix !== 'aria-';
            }
        }
        default:
            return false;
    }
}


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
function sanitizeURL(url: string) {

}
