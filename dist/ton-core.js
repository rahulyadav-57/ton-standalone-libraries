(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":5}],4:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

const base64 = require('base64-js')
const ieee754 = require('ieee754')
const customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

const K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    const arr = new Uint8Array(1)
    const proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  const valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  const b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  const length = byteLength(string, encoding) | 0
  let buf = createBuffer(length)

  const actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0
  const buf = createBuffer(length)
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  let buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0
    const buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  let x = a.length
  let y = b.length

  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  let i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  const buffer = Buffer.allocUnsafe(length)
  let pos = 0
  for (i = 0; i < list.length; ++i) {
    let buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
        buf.copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  const len = string.length
  const mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  let loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  const i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  const len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (let i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  const len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (let i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  const len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (let i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  const length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  let str = ''
  const max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  let x = thisEnd - thisStart
  let y = end - start
  const len = Math.min(x, y)

  const thisCopy = this.slice(thisStart, thisEnd)
  const targetCopy = target.slice(start, end)

  for (let i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  let indexSize = 1
  let arrLength = arr.length
  let valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  let i
  if (dir) {
    let foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      let found = true
      for (let j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  const remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  const strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  let i
  for (i = 0; i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  const remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  const res = []

  let i = start
  while (i < end) {
    const firstByte = buf[i]
    let codePoint = null
    let bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  const len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  let out = ''
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  const bytes = buf.slice(start, end)
  let res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (let i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  const len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  const newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  let val = this[offset + --byteLength]
  let mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const lo = first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24

  const hi = this[++offset] +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    last * 2 ** 24

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
})

Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const hi = first * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  const lo = this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
})

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let i = byteLength
  let mul = 1
  let val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = this[offset + 4] +
    this[offset + 5] * 2 ** 8 +
    this[offset + 6] * 2 ** 16 +
    (last << 24) // Overflow

  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24)
})

Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  return (BigInt(val) << BigInt(32)) +
    BigInt(this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last)
})

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let mul = 1
  let i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let i = byteLength - 1
  let mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function wrtBigUInt64LE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  return offset
}

function wrtBigUInt64BE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset + 7] = lo
  lo = lo >> 8
  buf[offset + 6] = lo
  lo = lo >> 8
  buf[offset + 5] = lo
  lo = lo >> 8
  buf[offset + 4] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset + 3] = hi
  hi = hi >> 8
  buf[offset + 2] = hi
  hi = hi >> 8
  buf[offset + 1] = hi
  hi = hi >> 8
  buf[offset] = hi
  return offset + 8
}

Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = 0
  let mul = 1
  let sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = byteLength - 1
  let mul = 1
  let sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  const len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  let i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    const bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    const len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {}
function E (sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor () {
      super()

      Object.defineProperty(this, 'message', {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      })

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`
      // Access the stack to generate the error message including the error code
      // from the name.
      this.stack // eslint-disable-line no-unused-expressions
      // Reset the name to the actual name.
      delete this.name
    }

    get code () {
      return sym
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    toString () {
      return `${this.name} [${sym}]: ${this.message}`
    }
  }
}

E('ERR_BUFFER_OUT_OF_BOUNDS',
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }

    return 'Attempt to access memory outside buffer bounds'
  }, RangeError)
E('ERR_INVALID_ARG_TYPE',
  function (name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }, TypeError)
E('ERR_OUT_OF_RANGE',
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`
    let received = input
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    }
    msg += ` It must be ${range}. Received ${received}`
    return msg
  }, RangeError)

function addNumericalSeparator (val) {
  let res = ''
  let i = val.length
  const start = val[0] === '-' ? 1 : 0
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`
  }
  return `${val.slice(0, i)}${res}`
}

// CHECK FUNCTIONS
// ===============

function checkBounds (buf, offset, byteLength) {
  validateNumber(offset, 'offset')
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1))
  }
}

function checkIntBI (value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === 'bigint' ? 'n' : ''
    let range
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                `${(byteLength + 1) * 8 - 1}${n}`
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`
    }
    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
  }
  checkBounds(buf, offset, byteLength)
}

function validateNumber (value, name) {
  if (typeof value !== 'number') {
    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
}

function boundsError (value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type)
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
  }

  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                    `>= ${type ? 1 : 0} and <= ${length}`,
                                    value)
}

// HELPER FUNCTIONS
// ================

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  let codePoint
  const length = string.length
  let leadSurrogate = null
  const bytes = []

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  let c, hi, lo
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  let i
  for (i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef'
  const table = new Array(256)
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

// Return not function with Error if BigInt not supported
function defineBigIntMethod (fn) {
  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
}

function BufferBigIntNotDefined () {
  throw new Error('BigInt not supported')
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":5}],5:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],7:[function(require,module,exports){
/**
 * A JavaScript implementation of the SHA family of hashes - defined in FIPS PUB 180-4, FIPS PUB 202,
 * and SP 800-185 - as well as the corresponding HMAC implementation as defined in FIPS PUB 198-1.
 *
 * Copyright 2008-2020 Brian Turek, 1998-2009 Paul Johnston & Contributors
 * Distributed under the BSD License
 * See http://caligatio.github.com/jsSHA/ for more information
 *
 * Two ECMAScript polyfill functions carry the following license:
 *
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
 * MERCHANTABLITY OR NON-INFRINGEMENT.
 *
 * See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
 */
!function(n,r){"object"==typeof exports&&"undefined"!=typeof module?module.exports=r():"function"==typeof define&&define.amd?define(r):(n="undefined"!=typeof globalThis?globalThis:n||self).jsSHA=r()}(this,(function(){"use strict";var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";function r(n,r,t,e){var i,o,u,f=r||[0],w=(t=t||0)>>>3,s=-1===e?3:0;for(i=0;i<n.length;i+=1)o=(u=i+w)>>>2,f.length<=o&&f.push(0),f[o]|=n[i]<<8*(s+e*(u%4));return{value:f,binLen:8*n.length+t}}function t(t,e,i){switch(e){case"UTF8":case"UTF16BE":case"UTF16LE":break;default:throw new Error("encoding must be UTF8, UTF16BE, or UTF16LE")}switch(t){case"HEX":return function(n,r,t){return function(n,r,t,e){var i,o,u,f;if(0!=n.length%2)throw new Error("String of HEX type must be in byte increments");var w=r||[0],s=(t=t||0)>>>3,a=-1===e?3:0;for(i=0;i<n.length;i+=2){if(o=parseInt(n.substr(i,2),16),isNaN(o))throw new Error("String of HEX type contains invalid characters");for(u=(f=(i>>>1)+s)>>>2;w.length<=u;)w.push(0);w[u]|=o<<8*(a+e*(f%4))}return{value:w,binLen:4*n.length+t}}(n,r,t,i)};case"TEXT":return function(n,r,t){return function(n,r,t,e,i){var o,u,f,w,s,a,h,c,v=0,A=t||[0],E=(e=e||0)>>>3;if("UTF8"===r)for(h=-1===i?3:0,f=0;f<n.length;f+=1)for(u=[],128>(o=n.charCodeAt(f))?u.push(o):2048>o?(u.push(192|o>>>6),u.push(128|63&o)):55296>o||57344<=o?u.push(224|o>>>12,128|o>>>6&63,128|63&o):(f+=1,o=65536+((1023&o)<<10|1023&n.charCodeAt(f)),u.push(240|o>>>18,128|o>>>12&63,128|o>>>6&63,128|63&o)),w=0;w<u.length;w+=1){for(s=(a=v+E)>>>2;A.length<=s;)A.push(0);A[s]|=u[w]<<8*(h+i*(a%4)),v+=1}else for(h=-1===i?2:0,c="UTF16LE"===r&&1!==i||"UTF16LE"!==r&&1===i,f=0;f<n.length;f+=1){for(o=n.charCodeAt(f),!0===c&&(o=(w=255&o)<<8|o>>>8),s=(a=v+E)>>>2;A.length<=s;)A.push(0);A[s]|=o<<8*(h+i*(a%4)),v+=2}return{value:A,binLen:8*v+e}}(n,e,r,t,i)};case"B64":return function(r,t,e){return function(r,t,e,i){var o,u,f,w,s,a,h=0,c=t||[0],v=(e=e||0)>>>3,A=-1===i?3:0,E=r.indexOf("=");if(-1===r.search(/^[a-zA-Z0-9=+/]+$/))throw new Error("Invalid character in base-64 string");if(r=r.replace(/=/g,""),-1!==E&&E<r.length)throw new Error("Invalid '=' found in base-64 string");for(o=0;o<r.length;o+=4){for(w=r.substr(o,4),f=0,u=0;u<w.length;u+=1)f|=n.indexOf(w.charAt(u))<<18-6*u;for(u=0;u<w.length-1;u+=1){for(s=(a=h+v)>>>2;c.length<=s;)c.push(0);c[s]|=(f>>>16-8*u&255)<<8*(A+i*(a%4)),h+=1}}return{value:c,binLen:8*h+e}}(r,t,e,i)};case"BYTES":return function(n,r,t){return function(n,r,t,e){var i,o,u,f,w=r||[0],s=(t=t||0)>>>3,a=-1===e?3:0;for(o=0;o<n.length;o+=1)i=n.charCodeAt(o),u=(f=o+s)>>>2,w.length<=u&&w.push(0),w[u]|=i<<8*(a+e*(f%4));return{value:w,binLen:8*n.length+t}}(n,r,t,i)};case"ARRAYBUFFER":try{new ArrayBuffer(0)}catch(n){throw new Error("ARRAYBUFFER not supported by this environment")}return function(n,t,e){return function(n,t,e,i){return r(new Uint8Array(n),t,e,i)}(n,t,e,i)};case"UINT8ARRAY":try{new Uint8Array(0)}catch(n){throw new Error("UINT8ARRAY not supported by this environment")}return function(n,t,e){return r(n,t,e,i)};default:throw new Error("format must be HEX, TEXT, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY")}}function e(r,t,e,i){switch(r){case"HEX":return function(n){return function(n,r,t,e){var i,o,u="",f=r/8,w=-1===t?3:0;for(i=0;i<f;i+=1)o=n[i>>>2]>>>8*(w+t*(i%4)),u+="0123456789abcdef".charAt(o>>>4&15)+"0123456789abcdef".charAt(15&o);return e.outputUpper?u.toUpperCase():u}(n,t,e,i)};case"B64":return function(r){return function(r,t,e,i){var o,u,f,w,s,a="",h=t/8,c=-1===e?3:0;for(o=0;o<h;o+=3)for(w=o+1<h?r[o+1>>>2]:0,s=o+2<h?r[o+2>>>2]:0,f=(r[o>>>2]>>>8*(c+e*(o%4))&255)<<16|(w>>>8*(c+e*((o+1)%4))&255)<<8|s>>>8*(c+e*((o+2)%4))&255,u=0;u<4;u+=1)a+=8*o+6*u<=t?n.charAt(f>>>6*(3-u)&63):i.b64Pad;return a}(r,t,e,i)};case"BYTES":return function(n){return function(n,r,t){var e,i,o="",u=r/8,f=-1===t?3:0;for(e=0;e<u;e+=1)i=n[e>>>2]>>>8*(f+t*(e%4))&255,o+=String.fromCharCode(i);return o}(n,t,e)};case"ARRAYBUFFER":try{new ArrayBuffer(0)}catch(n){throw new Error("ARRAYBUFFER not supported by this environment")}return function(n){return function(n,r,t){var e,i=r/8,o=new ArrayBuffer(i),u=new Uint8Array(o),f=-1===t?3:0;for(e=0;e<i;e+=1)u[e]=n[e>>>2]>>>8*(f+t*(e%4))&255;return o}(n,t,e)};case"UINT8ARRAY":try{new Uint8Array(0)}catch(n){throw new Error("UINT8ARRAY not supported by this environment")}return function(n){return function(n,r,t){var e,i=r/8,o=-1===t?3:0,u=new Uint8Array(i);for(e=0;e<i;e+=1)u[e]=n[e>>>2]>>>8*(o+t*(e%4))&255;return u}(n,t,e)};default:throw new Error("format must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY")}}var i=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298],o=[3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428],u=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],f="Chosen SHA variant is not supported";function w(n,r){var t,e,i=n.binLen>>>3,o=r.binLen>>>3,u=i<<3,f=4-i<<3;if(i%4!=0){for(t=0;t<o;t+=4)e=i+t>>>2,n.value[e]|=r.value[t>>>2]<<u,n.value.push(0),n.value[e+1]|=r.value[t>>>2]>>>f;return(n.value.length<<2)-4>=o+i&&n.value.pop(),{value:n.value,binLen:n.binLen+r.binLen}}return{value:n.value.concat(r.value),binLen:n.binLen+r.binLen}}function s(n){var r={outputUpper:!1,b64Pad:"=",outputLen:-1},t=n||{},e="Output length must be a multiple of 8";if(r.outputUpper=t.outputUpper||!1,t.b64Pad&&(r.b64Pad=t.b64Pad),t.outputLen){if(t.outputLen%8!=0)throw new Error(e);r.outputLen=t.outputLen}else if(t.shakeLen){if(t.shakeLen%8!=0)throw new Error(e);r.outputLen=t.shakeLen}if("boolean"!=typeof r.outputUpper)throw new Error("Invalid outputUpper formatting option");if("string"!=typeof r.b64Pad)throw new Error("Invalid b64Pad formatting option");return r}function a(n,r,e,i){var o=n+" must include a value and format";if(!r){if(!i)throw new Error(o);return i}if(void 0===r.value||!r.format)throw new Error(o);return t(r.format,r.encoding||"UTF8",e)(r.value)}var h=function(){function n(n,r,t){var e=t||{};if(this.t=r,this.i=e.encoding||"UTF8",this.numRounds=e.numRounds||1,isNaN(this.numRounds)||this.numRounds!==parseInt(this.numRounds,10)||1>this.numRounds)throw new Error("numRounds must a integer >= 1");this.o=n,this.u=[],this.s=0,this.h=!1,this.v=0,this.A=!1,this.l=[],this.H=[]}return n.prototype.update=function(n){var r,t=0,e=this.S>>>5,i=this.p(n,this.u,this.s),o=i.binLen,u=i.value,f=o>>>5;for(r=0;r<f;r+=e)t+this.S<=o&&(this.m=this.R(u.slice(r,r+e),this.m),t+=this.S);this.v+=t,this.u=u.slice(t>>>5),this.s=o%this.S,this.h=!0},n.prototype.getHash=function(n,r){var t,i,o=this.U,u=s(r);if(this.T){if(-1===u.outputLen)throw new Error("Output length must be specified in options");o=u.outputLen}var f=e(n,o,this.C,u);if(this.A&&this.F)return f(this.F(u));for(i=this.K(this.u.slice(),this.s,this.v,this.B(this.m),o),t=1;t<this.numRounds;t+=1)this.T&&o%32!=0&&(i[i.length-1]&=16777215>>>24-o%32),i=this.K(i,o,0,this.L(this.o),o);return f(i)},n.prototype.setHMACKey=function(n,r,e){if(!this.g)throw new Error("Variant does not support HMAC");if(this.h)throw new Error("Cannot set MAC key after calling update");var i=t(r,(e||{}).encoding||"UTF8",this.C);this.k(i(n))},n.prototype.k=function(n){var r,t=this.S>>>3,e=t/4-1;if(1!==this.numRounds)throw new Error("Cannot set numRounds with MAC");if(this.A)throw new Error("MAC key already set");for(t<n.binLen/8&&(n.value=this.K(n.value,n.binLen,0,this.L(this.o),this.U));n.value.length<=e;)n.value.push(0);for(r=0;r<=e;r+=1)this.l[r]=909522486^n.value[r],this.H[r]=1549556828^n.value[r];this.m=this.R(this.l,this.m),this.v=this.S,this.A=!0},n.prototype.getHMAC=function(n,r){var t=s(r);return e(n,this.U,this.C,t)(this.Y())},n.prototype.Y=function(){var n;if(!this.A)throw new Error("Cannot call getHMAC without first setting MAC key");var r=this.K(this.u.slice(),this.s,this.v,this.B(this.m),this.U);return n=this.R(this.H,this.L(this.o)),n=this.K(r,this.U,this.S,n,this.U)},n}(),c=function(n,r){return(c=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,r){n.__proto__=r}||function(n,r){for(var t in r)Object.prototype.hasOwnProperty.call(r,t)&&(n[t]=r[t])})(n,r)};function v(n,r){function t(){this.constructor=n}c(n,r),n.prototype=null===r?Object.create(r):(t.prototype=r.prototype,new t)}function A(n,r){return n<<r|n>>>32-r}function E(n,r){return n>>>r|n<<32-r}function l(n,r){return n>>>r}function b(n,r,t){return n^r^t}function H(n,r,t){return n&r^~n&t}function d(n,r,t){return n&r^n&t^r&t}function S(n){return E(n,2)^E(n,13)^E(n,22)}function p(n,r){var t=(65535&n)+(65535&r);return(65535&(n>>>16)+(r>>>16)+(t>>>16))<<16|65535&t}function m(n,r,t,e){var i=(65535&n)+(65535&r)+(65535&t)+(65535&e);return(65535&(n>>>16)+(r>>>16)+(t>>>16)+(e>>>16)+(i>>>16))<<16|65535&i}function y(n,r,t,e,i){var o=(65535&n)+(65535&r)+(65535&t)+(65535&e)+(65535&i);return(65535&(n>>>16)+(r>>>16)+(t>>>16)+(e>>>16)+(i>>>16)+(o>>>16))<<16|65535&o}function R(n){return E(n,7)^E(n,18)^l(n,3)}function U(n){return E(n,6)^E(n,11)^E(n,25)}function T(n){return[1732584193,4023233417,2562383102,271733878,3285377520]}function C(n,r){var t,e,i,o,u,f,w,s=[];for(t=r[0],e=r[1],i=r[2],o=r[3],u=r[4],w=0;w<80;w+=1)s[w]=w<16?n[w]:A(s[w-3]^s[w-8]^s[w-14]^s[w-16],1),f=w<20?y(A(t,5),H(e,i,o),u,1518500249,s[w]):w<40?y(A(t,5),b(e,i,o),u,1859775393,s[w]):w<60?y(A(t,5),d(e,i,o),u,2400959708,s[w]):y(A(t,5),b(e,i,o),u,3395469782,s[w]),u=o,o=i,i=A(e,30),e=t,t=f;return r[0]=p(t,r[0]),r[1]=p(e,r[1]),r[2]=p(i,r[2]),r[3]=p(o,r[3]),r[4]=p(u,r[4]),r}function F(n,r,t,e){for(var i,o=15+(r+65>>>9<<4),u=r+t;n.length<=o;)n.push(0);for(n[r>>>5]|=128<<24-r%32,n[o]=4294967295&u,n[o-1]=u/4294967296|0,i=0;i<n.length;i+=16)e=C(n.slice(i,i+16),e);return e}var K=function(n){function r(r,e,i){var o=this;if("SHA-1"!==r)throw new Error(f);var u=i||{};return(o=n.call(this,r,e,i)||this).g=!0,o.F=o.Y,o.C=-1,o.p=t(o.t,o.i,o.C),o.R=C,o.B=function(n){return n.slice()},o.L=T,o.K=F,o.m=[1732584193,4023233417,2562383102,271733878,3285377520],o.S=512,o.U=160,o.T=!1,u.hmacKey&&o.k(a("hmacKey",u.hmacKey,o.C)),o}return v(r,n),r}(h);function B(n){return"SHA-224"==n?o.slice():u.slice()}function L(n,r){var t,e,o,u,f,w,s,a,h,c,v,A,b=[];for(t=r[0],e=r[1],o=r[2],u=r[3],f=r[4],w=r[5],s=r[6],a=r[7],v=0;v<64;v+=1)b[v]=v<16?n[v]:m(E(A=b[v-2],17)^E(A,19)^l(A,10),b[v-7],R(b[v-15]),b[v-16]),h=y(a,U(f),H(f,w,s),i[v],b[v]),c=p(S(t),d(t,e,o)),a=s,s=w,w=f,f=p(u,h),u=o,o=e,e=t,t=p(h,c);return r[0]=p(t,r[0]),r[1]=p(e,r[1]),r[2]=p(o,r[2]),r[3]=p(u,r[3]),r[4]=p(f,r[4]),r[5]=p(w,r[5]),r[6]=p(s,r[6]),r[7]=p(a,r[7]),r}var g=function(n){function r(r,e,i){var o=this;if("SHA-224"!==r&&"SHA-256"!==r)throw new Error(f);var u=i||{};return(o=n.call(this,r,e,i)||this).F=o.Y,o.g=!0,o.C=-1,o.p=t(o.t,o.i,o.C),o.R=L,o.B=function(n){return n.slice()},o.L=B,o.K=function(n,t,e,i){return function(n,r,t,e,i){for(var o,u=15+(r+65>>>9<<4),f=r+t;n.length<=u;)n.push(0);for(n[r>>>5]|=128<<24-r%32,n[u]=4294967295&f,n[u-1]=f/4294967296|0,o=0;o<n.length;o+=16)e=L(n.slice(o,o+16),e);return"SHA-224"===i?[e[0],e[1],e[2],e[3],e[4],e[5],e[6]]:e}(n,t,e,i,r)},o.m=B(r),o.S=512,o.U="SHA-224"===r?224:256,o.T=!1,u.hmacKey&&o.k(a("hmacKey",u.hmacKey,o.C)),o}return v(r,n),r}(h),k=function(n,r){this.N=n,this.I=r};function Y(n,r){var t;return r>32?(t=64-r,new k(n.I<<r|n.N>>>t,n.N<<r|n.I>>>t)):0!==r?(t=32-r,new k(n.N<<r|n.I>>>t,n.I<<r|n.N>>>t)):n}function N(n,r){var t;return r<32?(t=32-r,new k(n.N>>>r|n.I<<t,n.I>>>r|n.N<<t)):(t=64-r,new k(n.I>>>r|n.N<<t,n.N>>>r|n.I<<t))}function I(n,r){return new k(n.N>>>r,n.I>>>r|n.N<<32-r)}function M(n,r,t){return new k(n.N&r.N^~n.N&t.N,n.I&r.I^~n.I&t.I)}function X(n,r,t){return new k(n.N&r.N^n.N&t.N^r.N&t.N,n.I&r.I^n.I&t.I^r.I&t.I)}function z(n){var r=N(n,28),t=N(n,34),e=N(n,39);return new k(r.N^t.N^e.N,r.I^t.I^e.I)}function O(n,r){var t,e;t=(65535&n.I)+(65535&r.I);var i=(65535&(e=(n.I>>>16)+(r.I>>>16)+(t>>>16)))<<16|65535&t;return t=(65535&n.N)+(65535&r.N)+(e>>>16),e=(n.N>>>16)+(r.N>>>16)+(t>>>16),new k((65535&e)<<16|65535&t,i)}function j(n,r,t,e){var i,o;i=(65535&n.I)+(65535&r.I)+(65535&t.I)+(65535&e.I);var u=(65535&(o=(n.I>>>16)+(r.I>>>16)+(t.I>>>16)+(e.I>>>16)+(i>>>16)))<<16|65535&i;return i=(65535&n.N)+(65535&r.N)+(65535&t.N)+(65535&e.N)+(o>>>16),o=(n.N>>>16)+(r.N>>>16)+(t.N>>>16)+(e.N>>>16)+(i>>>16),new k((65535&o)<<16|65535&i,u)}function _(n,r,t,e,i){var o,u;o=(65535&n.I)+(65535&r.I)+(65535&t.I)+(65535&e.I)+(65535&i.I);var f=(65535&(u=(n.I>>>16)+(r.I>>>16)+(t.I>>>16)+(e.I>>>16)+(i.I>>>16)+(o>>>16)))<<16|65535&o;return o=(65535&n.N)+(65535&r.N)+(65535&t.N)+(65535&e.N)+(65535&i.N)+(u>>>16),u=(n.N>>>16)+(r.N>>>16)+(t.N>>>16)+(e.N>>>16)+(i.N>>>16)+(o>>>16),new k((65535&u)<<16|65535&o,f)}function P(n,r){return new k(n.N^r.N,n.I^r.I)}function x(n){var r=N(n,1),t=N(n,8),e=I(n,7);return new k(r.N^t.N^e.N,r.I^t.I^e.I)}function V(n){var r=N(n,14),t=N(n,18),e=N(n,41);return new k(r.N^t.N^e.N,r.I^t.I^e.I)}var Z=[new k(i[0],3609767458),new k(i[1],602891725),new k(i[2],3964484399),new k(i[3],2173295548),new k(i[4],4081628472),new k(i[5],3053834265),new k(i[6],2937671579),new k(i[7],3664609560),new k(i[8],2734883394),new k(i[9],1164996542),new k(i[10],1323610764),new k(i[11],3590304994),new k(i[12],4068182383),new k(i[13],991336113),new k(i[14],633803317),new k(i[15],3479774868),new k(i[16],2666613458),new k(i[17],944711139),new k(i[18],2341262773),new k(i[19],2007800933),new k(i[20],1495990901),new k(i[21],1856431235),new k(i[22],3175218132),new k(i[23],2198950837),new k(i[24],3999719339),new k(i[25],766784016),new k(i[26],2566594879),new k(i[27],3203337956),new k(i[28],1034457026),new k(i[29],2466948901),new k(i[30],3758326383),new k(i[31],168717936),new k(i[32],1188179964),new k(i[33],1546045734),new k(i[34],1522805485),new k(i[35],2643833823),new k(i[36],2343527390),new k(i[37],1014477480),new k(i[38],1206759142),new k(i[39],344077627),new k(i[40],1290863460),new k(i[41],3158454273),new k(i[42],3505952657),new k(i[43],106217008),new k(i[44],3606008344),new k(i[45],1432725776),new k(i[46],1467031594),new k(i[47],851169720),new k(i[48],3100823752),new k(i[49],1363258195),new k(i[50],3750685593),new k(i[51],3785050280),new k(i[52],3318307427),new k(i[53],3812723403),new k(i[54],2003034995),new k(i[55],3602036899),new k(i[56],1575990012),new k(i[57],1125592928),new k(i[58],2716904306),new k(i[59],442776044),new k(i[60],593698344),new k(i[61],3733110249),new k(i[62],2999351573),new k(i[63],3815920427),new k(3391569614,3928383900),new k(3515267271,566280711),new k(3940187606,3454069534),new k(4118630271,4000239992),new k(116418474,1914138554),new k(174292421,2731055270),new k(289380356,3203993006),new k(460393269,320620315),new k(685471733,587496836),new k(852142971,1086792851),new k(1017036298,365543100),new k(1126000580,2618297676),new k(1288033470,3409855158),new k(1501505948,4234509866),new k(1607167915,987167468),new k(1816402316,1246189591)];function q(n){return"SHA-384"===n?[new k(3418070365,o[0]),new k(1654270250,o[1]),new k(2438529370,o[2]),new k(355462360,o[3]),new k(1731405415,o[4]),new k(41048885895,o[5]),new k(3675008525,o[6]),new k(1203062813,o[7])]:[new k(u[0],4089235720),new k(u[1],2227873595),new k(u[2],4271175723),new k(u[3],1595750129),new k(u[4],2917565137),new k(u[5],725511199),new k(u[6],4215389547),new k(u[7],327033209)]}function D(n,r){var t,e,i,o,u,f,w,s,a,h,c,v,A,E,l,b,H=[];for(t=r[0],e=r[1],i=r[2],o=r[3],u=r[4],f=r[5],w=r[6],s=r[7],c=0;c<80;c+=1)c<16?(v=2*c,H[c]=new k(n[v],n[v+1])):H[c]=j((A=H[c-2],E=void 0,l=void 0,b=void 0,E=N(A,19),l=N(A,61),b=I(A,6),new k(E.N^l.N^b.N,E.I^l.I^b.I)),H[c-7],x(H[c-15]),H[c-16]),a=_(s,V(u),M(u,f,w),Z[c],H[c]),h=O(z(t),X(t,e,i)),s=w,w=f,f=u,u=O(o,a),o=i,i=e,e=t,t=O(a,h);return r[0]=O(t,r[0]),r[1]=O(e,r[1]),r[2]=O(i,r[2]),r[3]=O(o,r[3]),r[4]=O(u,r[4]),r[5]=O(f,r[5]),r[6]=O(w,r[6]),r[7]=O(s,r[7]),r}var G=function(n){function r(r,e,i){var o=this;if("SHA-384"!==r&&"SHA-512"!==r)throw new Error(f);var u=i||{};return(o=n.call(this,r,e,i)||this).F=o.Y,o.g=!0,o.C=-1,o.p=t(o.t,o.i,o.C),o.R=D,o.B=function(n){return n.slice()},o.L=q,o.K=function(n,t,e,i){return function(n,r,t,e,i){for(var o,u=31+(r+129>>>10<<5),f=r+t;n.length<=u;)n.push(0);for(n[r>>>5]|=128<<24-r%32,n[u]=4294967295&f,n[u-1]=f/4294967296|0,o=0;o<n.length;o+=32)e=D(n.slice(o,o+32),e);return"SHA-384"===i?[(e=e)[0].N,e[0].I,e[1].N,e[1].I,e[2].N,e[2].I,e[3].N,e[3].I,e[4].N,e[4].I,e[5].N,e[5].I]:[e[0].N,e[0].I,e[1].N,e[1].I,e[2].N,e[2].I,e[3].N,e[3].I,e[4].N,e[4].I,e[5].N,e[5].I,e[6].N,e[6].I,e[7].N,e[7].I]}(n,t,e,i,r)},o.m=q(r),o.S=1024,o.U="SHA-384"===r?384:512,o.T=!1,u.hmacKey&&o.k(a("hmacKey",u.hmacKey,o.C)),o}return v(r,n),r}(h),J=[new k(0,1),new k(0,32898),new k(2147483648,32906),new k(2147483648,2147516416),new k(0,32907),new k(0,2147483649),new k(2147483648,2147516545),new k(2147483648,32777),new k(0,138),new k(0,136),new k(0,2147516425),new k(0,2147483658),new k(0,2147516555),new k(2147483648,139),new k(2147483648,32905),new k(2147483648,32771),new k(2147483648,32770),new k(2147483648,128),new k(0,32778),new k(2147483648,2147483658),new k(2147483648,2147516545),new k(2147483648,32896),new k(0,2147483649),new k(2147483648,2147516424)],Q=[[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];function W(n){var r,t=[];for(r=0;r<5;r+=1)t[r]=[new k(0,0),new k(0,0),new k(0,0),new k(0,0),new k(0,0)];return t}function $(n){var r,t=[];for(r=0;r<5;r+=1)t[r]=n[r].slice();return t}function nn(n,r){var t,e,i,o,u,f,w,s,a,h=[],c=[];if(null!==n)for(e=0;e<n.length;e+=2)r[(e>>>1)%5][(e>>>1)/5|0]=P(r[(e>>>1)%5][(e>>>1)/5|0],new k(n[e+1],n[e]));for(t=0;t<24;t+=1){for(o=W(),e=0;e<5;e+=1)h[e]=(u=r[e][0],f=r[e][1],w=r[e][2],s=r[e][3],a=r[e][4],new k(u.N^f.N^w.N^s.N^a.N,u.I^f.I^w.I^s.I^a.I));for(e=0;e<5;e+=1)c[e]=P(h[(e+4)%5],Y(h[(e+1)%5],1));for(e=0;e<5;e+=1)for(i=0;i<5;i+=1)r[e][i]=P(r[e][i],c[e]);for(e=0;e<5;e+=1)for(i=0;i<5;i+=1)o[i][(2*e+3*i)%5]=Y(r[e][i],Q[e][i]);for(e=0;e<5;e+=1)for(i=0;i<5;i+=1)r[e][i]=P(o[e][i],new k(~o[(e+1)%5][i].N&o[(e+2)%5][i].N,~o[(e+1)%5][i].I&o[(e+2)%5][i].I));r[0][0]=P(r[0][0],J[t])}return r}function rn(n){var r,t,e=0,i=[0,0],o=[4294967295&n,n/4294967296&2097151];for(r=6;r>=0;r--)0===(t=o[r>>2]>>>8*r&255)&&0===e||(i[e+1>>2]|=t<<8*(e+1),e+=1);return e=0!==e?e:1,i[0]|=e,{value:e+1>4?i:[i[0]],binLen:8+8*e}}function tn(n){return w(rn(n.binLen),n)}function en(n,r){var t,e=rn(r),i=r>>>2,o=(i-(e=w(e,n)).value.length%i)%i;for(t=0;t<o;t++)e.value.push(0);return e.value}var on=function(n){function r(r,e,i){var o=this,u=6,w=0,s=i||{};if(1!==(o=n.call(this,r,e,i)||this).numRounds){if(s.kmacKey||s.hmacKey)throw new Error("Cannot set numRounds with MAC");if("CSHAKE128"===o.o||"CSHAKE256"===o.o)throw new Error("Cannot set numRounds for CSHAKE variants")}switch(o.C=1,o.p=t(o.t,o.i,o.C),o.R=nn,o.B=$,o.L=W,o.m=W(),o.T=!1,r){case"SHA3-224":o.S=w=1152,o.U=224,o.g=!0,o.F=o.Y;break;case"SHA3-256":o.S=w=1088,o.U=256,o.g=!0,o.F=o.Y;break;case"SHA3-384":o.S=w=832,o.U=384,o.g=!0,o.F=o.Y;break;case"SHA3-512":o.S=w=576,o.U=512,o.g=!0,o.F=o.Y;break;case"SHAKE128":u=31,o.S=w=1344,o.U=-1,o.T=!0,o.g=!1,o.F=null;break;case"SHAKE256":u=31,o.S=w=1088,o.U=-1,o.T=!0,o.g=!1,o.F=null;break;case"KMAC128":u=4,o.S=w=1344,o.M(i),o.U=-1,o.T=!0,o.g=!1,o.F=o.X;break;case"KMAC256":u=4,o.S=w=1088,o.M(i),o.U=-1,o.T=!0,o.g=!1,o.F=o.X;break;case"CSHAKE128":o.S=w=1344,u=o.O(i),o.U=-1,o.T=!0,o.g=!1,o.F=null;break;case"CSHAKE256":o.S=w=1088,u=o.O(i),o.U=-1,o.T=!0,o.g=!1,o.F=null;break;default:throw new Error(f)}return o.K=function(n,r,t,e,i){return function(n,r,t,e,i,o,u){var f,w,s=0,a=[],h=i>>>5,c=r>>>5;for(f=0;f<c&&r>=i;f+=h)e=nn(n.slice(f,f+h),e),r-=i;for(n=n.slice(f),r%=i;n.length<h;)n.push(0);for(n[(f=r>>>3)>>2]^=o<<f%4*8,n[h-1]^=2147483648,e=nn(n,e);32*a.length<u&&(w=e[s%5][s/5|0],a.push(w.I),!(32*a.length>=u));)a.push(w.N),0==64*(s+=1)%i&&(nn(null,e),s=0);return a}(n,r,0,e,w,u,i)},s.hmacKey&&o.k(a("hmacKey",s.hmacKey,o.C)),o}return v(r,n),r.prototype.O=function(n,r){var t=function(n){var r=n||{};return{funcName:a("funcName",r.funcName,1,{value:[],binLen:0}),customization:a("Customization",r.customization,1,{value:[],binLen:0})}}(n||{});r&&(t.funcName=r);var e=w(tn(t.funcName),tn(t.customization));if(0!==t.customization.binLen||0!==t.funcName.binLen){for(var i=en(e,this.S>>>3),o=0;o<i.length;o+=this.S>>>5)this.m=this.R(i.slice(o,o+(this.S>>>5)),this.m),this.v+=this.S;return 4}return 31},r.prototype.M=function(n){var r=function(n){var r=n||{};return{kmacKey:a("kmacKey",r.kmacKey,1),funcName:{value:[1128353099],binLen:32},customization:a("Customization",r.customization,1,{value:[],binLen:0})}}(n||{});this.O(n,r.funcName);for(var t=en(tn(r.kmacKey),this.S>>>3),e=0;e<t.length;e+=this.S>>>5)this.m=this.R(t.slice(e,e+(this.S>>>5)),this.m),this.v+=this.S;this.A=!0},r.prototype.X=function(n){var r=w({value:this.u.slice(),binLen:this.s},function(n){var r,t,e=0,i=[0,0],o=[4294967295&n,n/4294967296&2097151];for(r=6;r>=0;r--)0==(t=o[r>>2]>>>8*r&255)&&0===e||(i[e>>2]|=t<<8*e,e+=1);return i[(e=0!==e?e:1)>>2]|=e<<8*e,{value:e+1>4?i:[i[0]],binLen:8+8*e}}(n.outputLen));return this.K(r.value,r.binLen,this.v,this.B(this.m),n.outputLen)},r}(h);return function(){function n(n,r,t){if("SHA-1"==n)this.j=new K(n,r,t);else if("SHA-224"==n||"SHA-256"==n)this.j=new g(n,r,t);else if("SHA-384"==n||"SHA-512"==n)this.j=new G(n,r,t);else{if("SHA3-224"!=n&&"SHA3-256"!=n&&"SHA3-384"!=n&&"SHA3-512"!=n&&"SHAKE128"!=n&&"SHAKE256"!=n&&"CSHAKE128"!=n&&"CSHAKE256"!=n&&"KMAC128"!=n&&"KMAC256"!=n)throw new Error(f);this.j=new on(n,r,t)}}return n.prototype.update=function(n){this.j.update(n)},n.prototype.getHash=function(n,r){return this.j.getHash(n,r)},n.prototype.setHMACKey=function(n,r,t){this.j.setHMACKey(n,r,t)},n.prototype.getHMAC=function(n,r){return this.j.getHMAC(n,r)},n}()}));


},{}],8:[function(require,module,exports){
"use strict";
/**
 * <symbol> that can be used to declare custom inspect functions.
 *
 * same as Symbol.for('nodejs.util.inspect.custom')
 * same as util.inspect.custom
 */
const SymbolInspect = Symbol.for('nodejs.util.inspect.custom');
module.exports = SymbolInspect;

},{}],9:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADNLAddress = void 0;
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
const base32_1 = require("../utils/base32");
const crc16_1 = require("../utils/crc16");
class ADNLAddress {
    static parseFriendly(src) {
        if (src.length !== 55) {
            throw Error('Invalid address');
        }
        // Decoding
        src = 'f' + src;
        let decoded = (0, base32_1.base32Decode)(src);
        if (decoded[0] !== 0x2d) {
            throw Error('Invalid address');
        }
        let gotHash = decoded.slice(33);
        let hash = (0, crc16_1.crc16)(decoded.slice(0, 33));
        if (!hash.equals(gotHash)) {
            throw Error('Invalid address');
        }
        return new ADNLAddress(decoded.slice(1, 33));
    }
    static parseRaw(src) {
        const data = Buffer.from(src, 'base64');
        return new ADNLAddress(data);
    }
    constructor(address) {
        this.toRaw = () => {
            return this.address.toString('hex').toUpperCase();
        };
        this.toString = () => {
            let data = Buffer.concat([Buffer.from([0x2D]), this.address]);
            let hash = (0, crc16_1.crc16)(data);
            data = Buffer.concat([data, hash]);
            return (0, base32_1.base32Encode)(data).slice(1);
        };
        this[_a] = () => this.toString();
        if (address.length !== 32) {
            throw Error('Invalid address');
        }
        this.address = address;
    }
    equals(b) {
        return this.address.equals(b.address);
    }
}
exports.ADNLAddress = ADNLAddress;
_a = symbol_inspect_1.default;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../utils/base32":79,"../utils/crc16":82,"buffer":3,"symbol.inspect":8}],10:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.address = exports.Address = void 0;
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
const crc16_1 = require("../utils/crc16");
const bounceable_tag = 0x11;
const non_bounceable_tag = 0x51;
const test_flag = 0x80;
function parseFriendlyAddress(src) {
    const data = Buffer.isBuffer(src) ? src : Buffer.from(src, 'base64');
    // 1byte tag + 1byte workchain + 32 bytes hash + 2 byte crc
    if (data.length !== 36) {
        throw new Error('Unknown address type: byte length is not equal to 36');
    }
    // Prepare data
    const addr = data.subarray(0, 34);
    const crc = data.subarray(34, 36);
    const calcedCrc = (0, crc16_1.crc16)(addr);
    if (!(calcedCrc[0] === crc[0] && calcedCrc[1] === crc[1])) {
        throw new Error('Invalid checksum: ' + src);
    }
    // Parse tag
    let tag = addr[0];
    let isTestOnly = false;
    let isBounceable = false;
    if (tag & test_flag) {
        isTestOnly = true;
        tag = tag ^ test_flag;
    }
    if ((tag !== bounceable_tag) && (tag !== non_bounceable_tag))
        throw "Unknown address tag";
    isBounceable = tag === bounceable_tag;
    let workchain = null;
    if (addr[1] === 0xff) { // TODO we should read signed integer here
        workchain = -1;
    }
    else {
        workchain = addr[1];
    }
    const hashPart = addr.subarray(2, 34);
    return { isTestOnly, isBounceable, workchain, hashPart };
}
class Address {
    static isAddress(src) {
        return src instanceof Address;
    }
    static isFriendly(source) {
        return source.indexOf(':') < 0;
    }
    static normalize(source) {
        if (typeof source === 'string') {
            return Address.parse(source).toString();
        }
        else {
            return source.toString();
        }
    }
    static parse(source) {
        if (Address.isFriendly(source)) {
            return this.parseFriendly(source).address;
        }
        else {
            return this.parseRaw(source);
        }
    }
    static parseRaw(source) {
        let workChain = parseInt(source.split(":")[0]);
        let hash = Buffer.from(source.split(":")[1], 'hex');
        return new Address(workChain, hash);
    }
    static parseFriendly(source) {
        if (Buffer.isBuffer(source)) {
            let r = parseFriendlyAddress(source);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        }
        else {
            let addr = source.replace(/\-/g, '+').replace(/_/g, '\/'); // Convert from url-friendly to true base64
            let r = parseFriendlyAddress(addr);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        }
    }
    constructor(workChain, hash) {
        this.toRawString = () => {
            return this.workChain + ':' + this.hash.toString('hex');
        };
        this.toRaw = () => {
            const addressWithChecksum = Buffer.alloc(36);
            addressWithChecksum.set(this.hash);
            addressWithChecksum.set([this.workChain, this.workChain, this.workChain, this.workChain], 32);
            return addressWithChecksum;
        };
        this.toStringBuffer = (args) => {
            let testOnly = (args && args.testOnly !== undefined) ? args.testOnly : false;
            let bounceable = (args && args.bounceable !== undefined) ? args.bounceable : true;
            let tag = bounceable ? bounceable_tag : non_bounceable_tag;
            if (testOnly) {
                tag |= test_flag;
            }
            const addr = Buffer.alloc(34);
            addr[0] = tag;
            addr[1] = this.workChain;
            addr.set(this.hash, 2);
            const addressWithChecksum = Buffer.alloc(36);
            addressWithChecksum.set(addr);
            addressWithChecksum.set((0, crc16_1.crc16)(addr), 34);
            return addressWithChecksum;
        };
        this.toString = (args) => {
            let urlSafe = (args && args.urlSafe !== undefined) ? args.urlSafe : true;
            let buffer = this.toStringBuffer(args);
            if (urlSafe) {
                return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
            }
            else {
                return buffer.toString('base64');
            }
        };
        this[_a] = () => this.toString();
        this.workChain = workChain;
        this.hash = hash;
        Object.freeze(this);
    }
    equals(src) {
        if (src.workChain !== this.workChain) {
            return false;
        }
        return src.hash.equals(this.hash);
    }
}
exports.Address = Address;
_a = symbol_inspect_1.default;
function address(src) {
    return Address.parse(src);
}
exports.address = address;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../utils/crc16":82,"buffer":3,"symbol.inspect":8}],11:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalAddress = void 0;
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
class ExternalAddress {
    static isAddress(src) {
        return src instanceof ExternalAddress;
    }
    constructor(value, bits) {
        this[_a] = () => this.toString();
        this.value = value;
        this.bits = bits;
    }
    toString() {
        return `External<${this.bits}:${this.value}>`;
    }
}
exports.ExternalAddress = ExternalAddress;
_a = symbol_inspect_1.default;

},{"symbol.inspect":8}],12:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractAddress = void 0;
const Builder_1 = require("../boc/Builder");
const StateInit_1 = require("../types/StateInit");
const Address_1 = require("./Address");
function contractAddress(workchain, init) {
    let hash = (0, Builder_1.beginCell)()
        .store((0, StateInit_1.storeStateInit)(init))
        .endCell()
        .hash();
    return new Address_1.Address(workchain, hash);
}
exports.contractAddress = contractAddress;

},{"../boc/Builder":16,"../types/StateInit":65,"./Address":10}],13:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitBuilder = void 0;
const Address_1 = require("../address/Address");
const ExternalAddress_1 = require("../address/ExternalAddress");
const BitString_1 = require("./BitString");
/**
 * Class for building bit strings
 */
class BitBuilder {
    constructor(size = 1023) {
        this._buffer = Buffer.alloc(Math.ceil(size / 8));
        this._length = 0;
    }
    /**
     * Current number of bits written
     */
    get length() {
        return this._length;
    }
    /**
     * Write a single bit
     * @param value bit to write, true or positive number for 1, false or zero or negative for 0
     */
    writeBit(value) {
        // Check overflow
        let n = this._length;
        if (n > this._buffer.length * 8) {
            throw new Error("BitBuilder overflow");
        }
        // Set bit
        if (value === true || value > 0) {
            this._buffer[(n / 8) | 0] |= 1 << (7 - (n % 8));
        }
        // Advance
        this._length++;
    }
    /**
     * Copy bits from BitString
     * @param src source bits
     */
    writeBits(src) {
        for (let i = 0; i < src.length; i++) {
            this.writeBit(src.at(i));
        }
    }
    /**
     * Write bits from buffer
     * @param src source buffer
     */
    writeBuffer(src) {
        // Special case for aligned offsets
        if (this._length % 8 === 0) {
            if (this._length + src.length * 8 > this._buffer.length * 8) {
                throw new Error("BitBuilder overflow");
            }
            src.copy(this._buffer, this._length / 8);
            this._length += src.length * 8;
        }
        else {
            for (let i = 0; i < src.length; i++) {
                this.writeUint(src[i], 8);
            }
        }
    }
    /**
     * Write uint value
     * @param value value as bigint or number
     * @param bits number of bits to write
     */
    writeUint(value, bits) {
        // Special case for 8 bits
        if (bits === 8 && this._length % 8 === 0) {
            let v = Number(value);
            if (v < 0 || v > 255 || !Number.isSafeInteger(v)) {
                throw Error(`value is out of range for ${bits} bits. Got ${value}`);
            }
            this._buffer[this._length / 8] = Number(value);
            this._length += 8;
            return;
        }
        // Special case for 16 bits
        if (bits === 16 && this._length % 8 === 0) {
            let v = Number(value);
            if (v < 0 || v > 65536 || !Number.isSafeInteger(v)) {
                throw Error(`value is out of range for ${bits} bits. Got ${value}`);
            }
            this._buffer[this._length / 8] = v >> 8;
            this._buffer[this._length / 8 + 1] = v & 0xff;
            this._length += 16;
            return;
        }
        // Generic case
        let v = BigInt(value);
        if (bits < 0 || !Number.isSafeInteger(bits)) {
            throw Error(`invalid bit length. Got ${bits}`);
        }
        // Corner case for zero bits
        if (bits === 0) {
            if (value !== 0n) {
                throw Error(`value is not zero for ${bits} bits. Got ${value}`);
            }
            else {
                return;
            }
        }
        // Check input
        let vBits = (1n << BigInt(bits));
        if (v < 0 || v >= vBits) {
            throw Error(`bitLength is too small for a value ${value}. Got ${bits}`);
        }
        // Convert number to bits
        let b = [];
        while (v > 0) {
            b.push(v % 2n === 1n);
            v /= 2n;
        }
        // Write bits
        for (let i = 0; i < bits; i++) {
            let off = bits - i - 1;
            if (off < b.length) {
                this.writeBit(b[off]);
            }
            else {
                this.writeBit(false);
            }
        }
    }
    /**
     * Write int value
     * @param value value as bigint or number
     * @param bits number of bits to write
     */
    writeInt(value, bits) {
        let v = BigInt(value);
        if (bits < 0 || !Number.isSafeInteger(bits)) {
            throw Error(`invalid bit length. Got ${bits}`);
        }
        // Corner case for zero bits
        if (bits === 0) {
            if (value !== 0n) {
                throw Error(`value is not zero for ${bits} bits. Got ${value}`);
            }
            else {
                return;
            }
        }
        // Corner case for one bit
        if (bits === 1) {
            if (value !== -1n && value !== 0n) {
                throw Error(`value is not zero or -1 for ${bits} bits. Got ${value}`);
            }
            else {
                this.writeBit(value === -1n);
                return;
            }
        }
        // Check input
        let vBits = 1n << (BigInt(bits) - 1n);
        if (v < -vBits || v >= vBits) {
            throw Error(`value is out of range for ${bits} bits. Got ${value}`);
        }
        // Write sign
        if (v < 0) {
            this.writeBit(true);
            v = (1n << (BigInt(bits) - 1n)) + v;
        }
        else {
            this.writeBit(false);
        }
        // Write value
        this.writeUint(v, bits - 1);
    }
    /**
     * Wrtie var uint value, used for serializing coins
     * @param value value to write as bigint or number
     * @param bits header bits to write size
     */
    writeVarUint(value, bits) {
        let v = BigInt(value);
        if (bits < 0 || !Number.isSafeInteger(bits)) {
            throw Error(`invalid bit length. Got ${bits}`);
        }
        if (v < 0) {
            throw Error(`value is negative. Got ${value}`);
        }
        // Corner case for zero
        if (v === 0n) {
            // Write zero size
            this.writeUint(0, bits);
            return;
        }
        // Calculate size
        const sizeBytes = Math.ceil((v.toString(2).length) / 8); // Fastest way in most environments
        const sizeBits = sizeBytes * 8;
        // Write size
        this.writeUint(sizeBytes, bits);
        // Write number
        this.writeUint(v, sizeBits);
    }
    /**
     * Wrtie var int value, used for serializing coins
     * @param value value to write as bigint or number
     * @param bits header bits to write size
     */
    writeVarInt(value, bits) {
        let v = BigInt(value);
        if (bits < 0 || !Number.isSafeInteger(bits)) {
            throw Error(`invalid bit length. Got ${bits}`);
        }
        // Corner case for zero
        if (v === 0n) {
            // Write zero size
            this.writeUint(0, bits);
            return;
        }
        // Calculate size
        let v2 = v > 0 ? v : -v;
        const sizeBytes = 1 + Math.ceil((v2.toString(2).length) / 8); // Fastest way in most environments
        const sizeBits = sizeBytes * 8;
        // Write size
        this.writeUint(sizeBytes, bits);
        // Write number
        this.writeInt(v, sizeBits);
    }
    /**
     * Write coins in var uint format
     * @param amount amount to write
     */
    writeCoins(amount) {
        this.writeVarUint(amount, 4);
    }
    /**
     * Write address
     * @param address write address or address external
     */
    writeAddress(address) {
        // Is empty address
        if (address === null || address === undefined) {
            this.writeUint(0, 2); // Empty address
            return;
        }
        // Is Internal Address
        if (Address_1.Address.isAddress(address)) {
            this.writeUint(2, 2); // Internal address
            this.writeUint(0, 1); // No anycast
            this.writeInt(address.workChain, 8);
            this.writeBuffer(address.hash);
            return;
        }
        // Is External Address
        if (ExternalAddress_1.ExternalAddress.isAddress(address)) {
            this.writeUint(1, 2); // External address
            this.writeUint(address.bits, 9);
            this.writeUint(address.value, address.bits);
            return;
        }
        // Invalid address
        throw Error(`Invalid address. Got ${address}`);
    }
    /**
     * Build BitString
     * @returns result bit string
     */
    build() {
        return new BitString_1.BitString(this._buffer, 0, this._length);
    }
    /**
     * Build into Buffer
     * @returns result buffer
     */
    buffer() {
        if (this._length % 8 !== 0) {
            throw new Error("BitBuilder buffer is not byte aligned");
        }
        return this._buffer.subarray(0, this._length / 8);
    }
}
exports.BitBuilder = BitBuilder;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../address/Address":10,"../address/ExternalAddress":11,"./BitString":15,"buffer":3}],14:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitReader = void 0;
const Address_1 = require("../address/Address");
const ExternalAddress_1 = require("../address/ExternalAddress");
/**
 * Class for reading bit strings
 */
class BitReader {
    constructor(bits, offset = 0) {
        this._checkpoints = [];
        this._bits = bits;
        this._offset = offset;
    }
    /**
     * Number of bits remaining
     */
    get remaining() {
        return this._bits.length - this._offset;
    }
    /**
     * Skip bits
     * @param bits number of bits to skip
     */
    skip(bits) {
        if (bits < 0 || this._offset + bits > this._bits.length) {
            throw new Error(`Index ${this._offset + bits} is out of bounds`);
        }
        this._offset += bits;
    }
    /**
     * Reset to the beginning or latest checkpoint
     */
    reset() {
        if (this._checkpoints.length > 0) {
            this._offset = this._checkpoints.pop();
        }
        else {
            this._offset = 0;
        }
    }
    /**
     * Save checkpoint
     */
    save() {
        this._checkpoints.push(this._offset);
    }
    /**
     * Load a single bit
     * @returns true if the bit is set, false otherwise
     */
    loadBit() {
        let r = this._bits.at(this._offset);
        this._offset++;
        return r;
    }
    /**
     * Preload bit
     * @returns true if the bit is set, false otherwise
     */
    preloadBit() {
        return this._bits.at(this._offset);
    }
    /**
     * Load bit string
     * @param bits number of bits to read
     * @returns new bitstring
     */
    loadBits(bits) {
        let r = this._bits.substring(this._offset, bits);
        this._offset += bits;
        return r;
    }
    /**
     * Preload bit string
     * @param bits number of bits to read
     * @returns new bitstring
     */
    preloadBits(bits) {
        return this._bits.substring(this._offset, bits);
    }
    /**
     * Load buffer
     * @param bytes number of bytes
     * @returns new buffer
     */
    loadBuffer(bytes) {
        let buf = this._preloadBuffer(bytes, this._offset);
        this._offset += bytes * 8;
        return buf;
    }
    /**
     * Preload buffer
     * @param bytes number of bytes
     * @returns new buffer
     */
    preloadBuffer(bytes) {
        return this._preloadBuffer(bytes, this._offset);
    }
    /**
     * Load uint value
     * @param bits uint bits
     * @returns read value as number
     */
    loadUint(bits) {
        return Number(this.loadUintBig(bits));
    }
    /**
     * Load uint value as bigint
     * @param bits uint bits
     * @returns read value as bigint
     */
    loadUintBig(bits) {
        let loaded = this.preloadUintBig(bits);
        this._offset += bits;
        return loaded;
    }
    /**
     * Preload uint value
     * @param bits uint bits
     * @returns read value as number
     */
    preloadUint(bits) {
        return Number(this._preloadUint(bits, this._offset));
    }
    /**
     * Preload uint value as bigint
     * @param bits uint bits
     * @returns read value as bigint
     */
    preloadUintBig(bits) {
        return this._preloadUint(bits, this._offset);
    }
    /**
     * Load int value
     * @param bits int bits
     * @returns read value as bigint
     */
    loadInt(bits) {
        let res = this._preloadInt(bits, this._offset);
        this._offset += bits;
        return Number(res);
    }
    /**
     * Load int value as bigint
     * @param bits int bits
     * @returns read value as bigint
     */
    loadIntBig(bits) {
        let res = this._preloadInt(bits, this._offset);
        this._offset += bits;
        return res;
    }
    /**
     * Preload int value
     * @param bits int bits
     * @returns read value as bigint
     */
    preloadInt(bits) {
        return Number(this._preloadInt(bits, this._offset));
    }
    /**
     * Preload int value
     * @param bits int bits
     * @returns read value as bigint
     */
    preloadIntBig(bits) {
        return this._preloadInt(bits, this._offset);
    }
    /**
     * Load varuint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    loadVarUint(bits) {
        let size = Number(this.loadUint(bits));
        return Number(this.loadUintBig(size * 8));
    }
    /**
     * Load varuint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    loadVarUintBig(bits) {
        let size = Number(this.loadUint(bits));
        return this.loadUintBig(size * 8);
    }
    /**
     * Preload varuint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    preloadVarUint(bits) {
        let size = Number(this._preloadUint(bits, this._offset));
        return Number(this._preloadUint(size * 8, this._offset + bits));
    }
    /**
     * Preload varuint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    preloadVarUintBig(bits) {
        let size = Number(this._preloadUint(bits, this._offset));
        return this._preloadUint(size * 8, this._offset + bits);
    }
    /**
     * Load varint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    loadVarInt(bits) {
        let size = Number(this.loadUint(bits));
        return Number(this.loadIntBig(size * 8));
    }
    /**
     * Load varint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    loadVarIntBig(bits) {
        let size = Number(this.loadUint(bits));
        return this.loadIntBig(size * 8);
    }
    /**
     * Preload varint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    preloadVarInt(bits) {
        let size = Number(this._preloadUint(bits, this._offset));
        return Number(this._preloadInt(size * 8, this._offset + bits));
    }
    /**
     * Preload varint value
     * @param bits number of bits to read the size
     * @returns read value as bigint
     */
    preloadVarIntBig(bits) {
        let size = Number(this._preloadUint(bits, this._offset));
        return this._preloadInt(size * 8, this._offset + bits);
    }
    /**
     * Load coins value
     * @returns read value as bigint
     */
    loadCoins() {
        return this.loadVarUintBig(4);
    }
    /**
     * Preload coins value
     * @returns read value as bigint
     */
    preloadCoins() {
        return this.preloadVarUintBig(4);
    }
    /**
     * Load Address
     * @returns Address
     */
    loadAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type === 2) {
            return this._loadInternalAddress();
        }
        else {
            throw new Error("Invalid address: " + type);
        }
    }
    /**
     * Load internal address
     * @returns Address or null
     */
    loadMaybeAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type === 0) {
            this._offset += 2;
            return null;
        }
        else if (type === 2) {
            return this._loadInternalAddress();
        }
        else {
            throw new Error("Invalid address");
        }
    }
    /**
     * Load external address
     * @returns ExternalAddress
     */
    loadExternalAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type === 1) {
            return this._loadExternalAddress();
        }
        else {
            throw new Error("Invalid address");
        }
    }
    /**
     * Load external address
     * @returns ExternalAddress or null
     */
    loadMaybeExternalAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type === 0) {
            this._offset += 2;
            return null;
        }
        else if (type === 1) {
            return this._loadExternalAddress();
        }
        else {
            throw new Error("Invalid address");
        }
    }
    /**
     * Read address of any type
     * @returns Address or ExternalAddress or null
     */
    loadAddressAny() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type === 0) {
            this._offset += 2;
            return null;
        }
        else if (type === 2) {
            return this._loadInternalAddress();
        }
        else if (type === 1) {
            return this._loadExternalAddress();
        }
        else if (type === 3) {
            throw Error('Unsupported');
        }
        else {
            throw Error('Unreachable');
        }
    }
    /**
     * Load bit string that was padded to make it byte alligned. Used in BOC serialization
     * @param bytes number of bytes to read
     */
    loadPaddedBits(bits) {
        // Check that number of bits is byte alligned
        if (bits % 8 !== 0) {
            throw new Error("Invalid number of bits");
        }
        // Skip padding
        let length = bits;
        while (true) {
            if (this._bits.at(this._offset + length - 1)) {
                length--;
                break;
            }
            else {
                length--;
            }
        }
        // Read substring
        let r = this._bits.substring(this._offset, length);
        this._offset += bits;
        return r;
    }
    /**
     * Clone BitReader
     */
    clone() {
        return new BitReader(this._bits, this._offset);
    }
    /**
     * Preload int from specific offset
     * @param bits bits to preload
     * @param offset offset to start from
     * @returns read value as bigint
     */
    _preloadInt(bits, offset) {
        if (bits == 0) {
            return 0n;
        }
        let sign = this._bits.at(offset);
        let res = 0n;
        for (let i = 0; i < bits - 1; i++) {
            if (this._bits.at(offset + 1 + i)) {
                res += 1n << BigInt(bits - i - 1 - 1);
            }
        }
        if (sign) {
            res = res - (1n << BigInt(bits - 1));
        }
        return res;
    }
    /**
     * Preload uint from specific offset
     * @param bits bits to preload
     * @param offset offset to start from
     * @returns read value as bigint
     */
    _preloadUint(bits, offset) {
        if (bits == 0) {
            return 0n;
        }
        let res = 0n;
        for (let i = 0; i < bits; i++) {
            if (this._bits.at(offset + i)) {
                res += 1n << BigInt(bits - i - 1);
            }
        }
        return res;
    }
    _preloadBuffer(bytes, offset) {
        // Try to load fast
        let fastBuffer = this._bits.subbuffer(offset, bytes * 8);
        if (fastBuffer) {
            return fastBuffer;
        }
        // Load slow
        let buf = Buffer.alloc(bytes);
        for (let i = 0; i < bytes; i++) {
            buf[i] = Number(this._preloadUint(8, offset + i * 8));
        }
        return buf;
    }
    _loadInternalAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type !== 2) {
            throw Error('Invalid address');
        }
        // No Anycast supported
        if (this._preloadUint(1, this._offset + 2) !== 0n) {
            throw Error('Invalid address');
        }
        // Read address
        let wc = Number(this._preloadInt(8, this._offset + 3));
        let hash = this._preloadBuffer(32, this._offset + 11);
        // Update offset
        this._offset += 267;
        return new Address_1.Address(wc, hash);
    }
    _loadExternalAddress() {
        let type = Number(this._preloadUint(2, this._offset));
        if (type !== 1) {
            throw Error('Invalid address');
        }
        // Load length
        let bits = Number(this._preloadUint(9, this._offset + 2));
        // Load address
        let value = this._preloadUint(bits, this._offset + 11);
        // Update offset
        this._offset += 11 + bits;
        return new ExternalAddress_1.ExternalAddress(value, bits);
    }
}
exports.BitReader = BitReader;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../address/Address":10,"../address/ExternalAddress":11,"buffer":3}],15:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitString = void 0;
const paddedBits_1 = require("./utils/paddedBits");
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
/**
 * BitString is a class that represents a bitstring in a buffer with a specified offset and length
 */
class BitString {
    /**
     * Constructing BitString from a buffer
     * @param data data that contains the bitstring data. NOTE: We are expecting this buffer to be NOT modified
     * @param offset offset in bits from the start of the buffer
     * @param length length of the bitstring in bits
     */
    constructor(data, offset, length) {
        this[_a] = () => this.toString();
        // Check bounds
        if (length < 0) {
            throw new Error(`Length ${length} is out of bounds`);
        }
        this._length = length;
        this._data = data;
        this._offset = offset;
    }
    /**
     * Returns the length of the bitstring
     */
    get length() {
        return this._length;
    }
    /**
     * Returns the bit at the specified index
     * @param index index of the bit
     * @throws Error if index is out of bounds
     * @returns true if the bit is set, false otherwise
     */
    at(index) {
        // Check bounds
        if (index >= this._length) {
            throw new Error(`Index ${index} > ${this._length} is out of bounds`);
        }
        if (index < 0) {
            throw new Error(`Index ${index} < 0 is out of bounds`);
        }
        // Calculcate offsets
        let byteIndex = (this._offset + index) >> 3;
        let bitIndex = 7 - ((this._offset + index) % 8); // NOTE: We are using big endian
        // Return the bit
        return (this._data[byteIndex] & (1 << bitIndex)) !== 0;
    }
    /**
     * Get a subscring of the bitstring
     * @param offset
     * @param length
     * @returns
     */
    substring(offset, length) {
        // Corner case of empty string
        if (length === 0 && offset === this._length) {
            return BitString.EMPTY;
        }
        // Check offset
        if (offset >= this._length) {
            throw new Error(`Offset(${offset}) > ${this._length} is out of bounds`);
        }
        if (offset < 0) {
            throw new Error(`Offset(${offset}) < 0 is out of bounds`);
        }
        if (offset + length > this._length) {
            throw new Error(`Offset ${offset} + Length ${length} > ${this._length} is out of bounds`);
        }
        // Create substring
        return new BitString(this._data, this._offset + offset, length);
    }
    /**
     * Try to get a buffer from the bitstring without allocations
     * @param offset offset in bits
     * @param length length in bits
     * @returns buffer if the bitstring is aligned to bytes, null otherwise
     */
    subbuffer(offset, length) {
        // Check offset
        if (offset >= this._length) {
            throw new Error(`Offset ${offset} is out of bounds`);
        }
        if (offset < 0) {
            throw new Error(`Offset ${offset} is out of bounds`);
        }
        if (offset + length > this._length) {
            throw new Error(`Offset + Lenght = ${offset + length} is out of bounds`);
        }
        // Check alignment
        if (length % 8 !== 0) {
            return null;
        }
        if ((this._offset + offset) % 8 !== 0) {
            return null;
        }
        // Create substring
        let start = ((this._offset + offset) >> 3);
        let end = start + (length >> 3);
        return this._data.subarray(start, end);
    }
    /**
     * Checks for equality
     * @param b other bitstring
     * @returns true if the bitstrings are equal, false otherwise
     */
    equals(b) {
        if (this._length !== b._length) {
            return false;
        }
        for (let i = 0; i < this._length; i++) {
            if (this.at(i) !== b.at(i)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Format to canonical string
     * @returns formatted bits as a string
     */
    toString() {
        const padded = (0, paddedBits_1.bitsToPaddedBuffer)(this);
        if (this._length % 4 === 0) {
            const s = padded.subarray(0, Math.ceil(this._length / 8)).toString('hex').toUpperCase();
            if (this._length % 8 === 0) {
                return s;
            }
            else {
                return s.substring(0, s.length - 1);
            }
        }
        else {
            const hex = padded.toString('hex').toUpperCase();
            if (this._length % 8 <= 4) {
                return hex.substring(0, hex.length - 1) + '_';
            }
            else {
                return hex + '_';
            }
        }
    }
}
exports.BitString = BitString;
_a = symbol_inspect_1.default;
BitString.EMPTY = new BitString(Buffer.alloc(0), 0, 0);

}).call(this)}).call(this,require("buffer").Buffer)
},{"./utils/paddedBits":30,"buffer":3,"symbol.inspect":8}],16:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Builder = exports.beginCell = void 0;
const BitBuilder_1 = require("./BitBuilder");
const Cell_1 = require("./Cell");
const strings_1 = require("./utils/strings");
/**
 * Start building a cell
 * @returns a new builder
 */
function beginCell() {
    return new Builder();
}
exports.beginCell = beginCell;
/**
 * Builder for Cells
 */
class Builder {
    constructor() {
        this._bits = new BitBuilder_1.BitBuilder();
        this._refs = [];
    }
    /**
     * Bits written so far
     */
    get bits() {
        return this._bits.length;
    }
    /**
     * References written so far
     */
    get refs() {
        return this._refs.length;
    }
    /**
     * Available bits
     */
    get availableBits() {
        return 1023 - this.bits;
    }
    /**
     * Available references
     */
    get availableRefs() {
        return 4 - this.refs;
    }
    /**
     * Write a single bit
     * @param value bit to write, true or positive number for 1, false or zero or negative for 0
     * @returns this builder
     */
    storeBit(value) {
        this._bits.writeBit(value);
        return this;
    }
    /**
     * Write bits from BitString
     * @param src source bits
     * @returns this builder
     */
    storeBits(src) {
        this._bits.writeBits(src);
        return this;
    }
    /**
     * Store Buffer
     * @param src source buffer
     * @param bytes optional number of bytes to write
     * @returns this builder
     */
    storeBuffer(src, bytes) {
        if (bytes !== undefined && bytes !== null) {
            if (src.length !== bytes) {
                throw Error(`Buffer length ${src.length} is not equal to ${bytes}`);
            }
        }
        this._bits.writeBuffer(src);
        return this;
    }
    /**
     * Store Maybe Buffer
     * @param src source buffer or null
     * @param bytes optional number of bytes to write
     * @returns this builder
     */
    storeMaybeBuffer(src, bytes) {
        if (src !== null) {
            this.storeBit(1);
            this.storeBuffer(src, bytes);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store uint value
     * @param value value as bigint or number
     * @param bits number of bits to write
     * @returns this builder
     */
    storeUint(value, bits) {
        this._bits.writeUint(value, bits);
        return this;
    }
    /**
     * Store maybe uint value
     * @param value value as bigint or number, null or undefined
     * @param bits number of bits to write
     * @returns this builder
     */
    storeMaybeUint(value, bits) {
        if (value !== null && value !== undefined) {
            this.storeBit(1);
            this.storeUint(value, bits);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store int value
     * @param value value as bigint or number
     * @param bits number of bits to write
     * @returns this builder
     */
    storeInt(value, bits) {
        this._bits.writeInt(value, bits);
        return this;
    }
    /**
     * Store maybe int value
     * @param value value as bigint or number, null or undefined
     * @param bits number of bits to write
     * @returns this builder
     */
    storeMaybeInt(value, bits) {
        if (value !== null && value !== undefined) {
            this.storeBit(1);
            this.storeInt(value, bits);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store varuint value
     * @param value value as bigint or number
     * @param bits number of bits to write to header
     * @returns this builder
     */
    storeVarUint(value, bits) {
        this._bits.writeVarUint(value, bits);
        return this;
    }
    /**
     * Store maybe varuint value
     * @param value value as bigint or number, null or undefined
     * @param bits number of bits to write to header
     * @returns this builder
     */
    storeMaybeVarUint(value, bits) {
        if (value !== null && value !== undefined) {
            this.storeBit(1);
            this.storeVarUint(value, bits);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store varint value
     * @param value value as bigint or number
     * @param bits number of bits to write to header
     * @returns this builder
     */
    storeVarInt(value, bits) {
        this._bits.writeVarInt(value, bits);
        return this;
    }
    /**
     * Store maybe varint value
     * @param value value as bigint or number, null or undefined
     * @param bits number of bits to write to header
     * @returns this builder
     */
    storeMaybeVarInt(value, bits) {
        if (value !== null && value !== undefined) {
            this.storeBit(1);
            this.storeVarInt(value, bits);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store coins value
     * @param amount amount of coins
     * @returns this builder
     */
    storeCoins(amount) {
        this._bits.writeCoins(amount);
        return this;
    }
    /**
     * Store maybe coins value
     * @param amount amount of coins, null or undefined
     * @returns this builder
     */
    storeMaybeCoins(amount) {
        if (amount !== null && amount !== undefined) {
            this.storeBit(1);
            this.storeCoins(amount);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store address
     * @param addres address to store
     * @returns this builder
     */
    storeAddress(address) {
        this._bits.writeAddress(address);
        return this;
    }
    /**
     * Store reference
     * @param cell cell or builder to store
     * @returns this builder
     */
    storeRef(cell) {
        // Check refs
        if (this._refs.length >= 4) {
            throw new Error("Too many references");
        }
        // Store reference
        if (cell instanceof Cell_1.Cell) {
            this._refs.push(cell);
        }
        else if (cell instanceof Builder) {
            this._refs.push(cell.endCell());
        }
        else {
            throw new Error("Invalid argument");
        }
        return this;
    }
    /**
     * Store reference if not null
     * @param cell cell or builder to store
     * @returns this builder
     */
    storeMaybeRef(cell) {
        if (cell) {
            this.storeBit(1);
            this.storeRef(cell);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store slice it in this builder
     * @param src source slice
     */
    storeSlice(src) {
        let c = src.clone();
        if (c.remainingBits > 0) {
            this.storeBits(c.loadBits(c.remainingBits));
        }
        while (c.remainingRefs > 0) {
            this.storeRef(c.loadRef());
        }
        return this;
    }
    /**
     * Store slice in this builder if not null
     * @param src source slice
     */
    storeMaybeSlice(src) {
        if (src) {
            this.storeBit(1);
            this.storeSlice(src);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store builder
     * @param src builder to store
     * @returns this builder
     */
    storeBuilder(src) {
        return this.storeSlice(src.endCell().beginParse());
    }
    /**
     * Store builder if not null
     * @param src builder to store
     * @returns this builder
     */
    storeMaybeBuilder(src) {
        if (src) {
            this.storeBit(1);
            this.storeBuilder(src);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store writer or builder
     * @param writer writer or builder to store
     * @returns this builder
     */
    storeWritable(writer) {
        if (typeof writer === 'object') {
            writer.writeTo(this);
        }
        else {
            writer(this);
        }
        return this;
    }
    /**
     * Store writer or builder if not null
     * @param writer writer or builder to store
     * @returns this builder
     */
    storeMaybeWritable(writer) {
        if (writer) {
            this.storeBit(1);
            this.storeWritable(writer);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store object in this builder
     * @param writer Writable or writer functuin
     */
    store(writer) {
        this.storeWritable(writer);
        return this;
    }
    /**
     * Store string tail
     * @param src source string
     * @returns this builder
     */
    storeStringTail(src) {
        (0, strings_1.writeString)(src, this);
        return this;
    }
    /**
     * Store string tail
     * @param src source string
     * @returns this builder
     */
    storeMaybeStringTail(src) {
        if (src !== null && src !== undefined) {
            this.storeBit(1);
            (0, strings_1.writeString)(src, this);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store string tail in ref
     * @param src source string
     * @returns this builder
     */
    storeStringRefTail(src) {
        this.storeRef(beginCell()
            .storeStringTail(src));
        return this;
    }
    /**
     * Store maybe string tail in ref
     * @param src source string
     * @returns this builder
     */
    storeMaybeStringRefTail(src) {
        if (src !== null && src !== undefined) {
            this.storeBit(1);
            this.storeStringRefTail(src);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store dictionary in this builder
     * @param dict dictionary to store
     * @returns this builder
     */
    storeDict(dict, key, value) {
        if (dict) {
            dict.store(this, key, value);
        }
        else {
            this.storeBit(0);
        }
        return this;
    }
    /**
     * Store dictionary in this builder directly
     * @param dict dictionary to store
     * @returns this builder
     */
    storeDictDirect(dict, key, value) {
        dict.storeDirect(this, key, value);
        return this;
    }
    /**
     * Complete cell
     * @returns cell
     */
    endCell() {
        return new Cell_1.Cell({
            bits: this._bits.build(),
            refs: this._refs
        });
    }
    /**
     * Convert to cell
     * @returns cell
     */
    asCell() {
        return this.endCell();
    }
    /**
     * Convert to slice
     * @returns slice
     */
    asSlice() {
        return this.endCell().beginParse();
    }
}
exports.Builder = Builder;

},{"./BitBuilder":13,"./Cell":17,"./utils/strings":31}],17:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cell = void 0;
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
const BitString_1 = require("./BitString");
const CellType_1 = require("./CellType");
const Slice_1 = require("./Slice");
const resolveExotic_1 = require("./cell/resolveExotic");
const wonderCalculator_1 = require("./cell/wonderCalculator");
const serialization_1 = require("./cell/serialization");
const BitReader_1 = require("./BitReader");
const Builder_1 = require("./Builder");
/**
 * Cell as described in TVM spec
 */
class Cell {
    /**
     * Deserialize cells from BOC
     * @param src source buffer
     * @returns array of cells
     */
    static fromBoc(src) {
        return (0, serialization_1.deserializeBoc)(src);
    }
    /**
     * Helper class that deserializes a single cell from BOC in base64
     * @param src source string
     */
    static fromBase64(src) {
        let parsed = Cell.fromBoc(Buffer.from(src, 'base64'));
        if (parsed.length !== 1) {
            throw new Error("Deserialized more than one cell");
        }
        return parsed[0];
    }
    constructor(opts) {
        // Level and depth information
        this._hashes = [];
        this._depths = [];
        /**
         * Beging cell parsing
         * @returns a new slice
         */
        this.beginParse = (allowExotic = false) => {
            if (this.isExotic && !allowExotic) {
                throw new Error("Exotic cells cannot be parsed");
            }
            return new Slice_1.Slice(new BitReader_1.BitReader(this.bits), this.refs);
        };
        /**
         * Get cell hash
         * @param level level
         * @returns cell hash
         */
        this.hash = (level = 3) => {
            return this._hashes[Math.min(this._hashes.length - 1, level)];
        };
        /**
         * Get cell depth
         * @param level level
         * @returns cell depth
         */
        this.depth = (level = 3) => {
            return this._depths[Math.min(this._depths.length - 1, level)];
        };
        /**
         * Get cell level
         * @returns cell level
         */
        this.level = () => {
            return this.mask.level;
        };
        /**
         * Checks cell to be euqal to another cell
         * @param other other cell
         * @returns true if cells are equal
         */
        this.equals = (other) => {
            return this.hash().equals(other.hash());
        };
        this[_a] = () => this.toString();
        // Resolve bits
        let bits = BitString_1.BitString.EMPTY;
        if (opts && opts.bits) {
            bits = opts.bits;
        }
        // Resolve refs
        let refs = [];
        if (opts && opts.refs) {
            refs = [...opts.refs];
        }
        // Resolve type
        let hashes;
        let depths;
        let mask;
        let type = CellType_1.CellType.Ordinary;
        if (opts && opts.exotic) {
            // Resolve exotic cell
            let resolved = (0, resolveExotic_1.resolveExotic)(bits, refs);
            // Perform wonders
            let wonders = (0, wonderCalculator_1.wonderCalculator)(resolved.type, bits, refs);
            // Copy results
            mask = wonders.mask;
            depths = wonders.depths;
            hashes = wonders.hashes;
            type = resolved.type;
        }
        else {
            // Check correctness
            if (refs.length > 4) {
                throw new Error("Invalid number of references");
            }
            if (bits.length > 1023) {
                throw new Error(`Bits overflow: ${bits.length} > 1023`);
            }
            // Perform wonders
            let wonders = (0, wonderCalculator_1.wonderCalculator)(CellType_1.CellType.Ordinary, bits, refs);
            // Copy results
            mask = wonders.mask;
            depths = wonders.depths;
            hashes = wonders.hashes;
            type = CellType_1.CellType.Ordinary;
        }
        // Set fields
        this.type = type;
        this.bits = bits;
        this.refs = refs;
        this.mask = mask;
        this._depths = depths;
        this._hashes = hashes;
        Object.freeze(this);
        Object.freeze(this.refs);
        Object.freeze(this.bits);
        Object.freeze(this.mask);
        Object.freeze(this._depths);
        Object.freeze(this._hashes);
    }
    /**
     * Check if cell is exotic
     */
    get isExotic() {
        return this.type !== CellType_1.CellType.Ordinary;
    }
    /**
     * Serializes cell to BOC
     * @param opts options
     */
    toBoc(opts) {
        let idx = (opts && opts.idx !== null && opts.idx !== undefined) ? opts.idx : false;
        let crc32 = (opts && opts.crc32 !== null && opts.crc32 !== undefined) ? opts.crc32 : true;
        return (0, serialization_1.serializeBoc)(this, { idx, crc32 });
    }
    /**
     * Format cell to string
     * @param indent indentation
     * @returns string representation
     */
    toString(indent) {
        let id = indent || '';
        let t = 'x';
        if (this.isExotic) {
            if (this.type === CellType_1.CellType.MerkleProof) {
                t = 'p';
            }
            else if (this.type === CellType_1.CellType.MerkleUpdate) {
                t = 'u';
            }
            else if (this.type === CellType_1.CellType.PrunedBranch) {
                t = 'p';
            }
        }
        let s = id + (this.isExotic ? t : 'x') + '{' + this.bits.toString() + '}';
        for (let k in this.refs) {
            const i = this.refs[k];
            s += '\n' + i.toString(id + ' ');
        }
        return s;
    }
    /**
     * Covnert cell to slice
     * @returns slice
     */
    asSlice() {
        return this.beginParse();
    }
    /**
     * Convert cell to a builder that has this cell stored
     * @returns builder
     */
    asBuilder() {
        return (0, Builder_1.beginCell)().storeSlice(this.asSlice());
    }
}
exports.Cell = Cell;
_a = symbol_inspect_1.default;
Cell.EMPTY = new Cell();

}).call(this)}).call(this,require("buffer").Buffer)
},{"./BitReader":14,"./BitString":15,"./Builder":16,"./CellType":18,"./Slice":19,"./cell/resolveExotic":26,"./cell/serialization":27,"./cell/wonderCalculator":29,"buffer":3,"symbol.inspect":8}],18:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CellType = void 0;
var CellType;
(function (CellType) {
    CellType[CellType["Ordinary"] = -1] = "Ordinary";
    CellType[CellType["PrunedBranch"] = 1] = "PrunedBranch";
    CellType[CellType["Library"] = 2] = "Library";
    CellType[CellType["MerkleProof"] = 3] = "MerkleProof";
    CellType[CellType["MerkleUpdate"] = 4] = "MerkleUpdate";
})(CellType = exports.CellType || (exports.CellType = {}));

},{}],19:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slice = void 0;
const symbol_inspect_1 = __importDefault(require("symbol.inspect"));
const Dictionary_1 = require("../dict/Dictionary");
const Builder_1 = require("./Builder");
const strings_1 = require("./utils/strings");
/**
 * Slice is a class that allows to read cell data
 */
class Slice {
    constructor(reader, refs) {
        this[_a] = () => this.toString();
        this._reader = reader.clone();
        this._refs = [...refs];
    }
    /**
     * Get remaining bits
     */
    get remainingBits() {
        return this._reader.remaining;
    }
    /**
     * Get remaining refs
     */
    get remainingRefs() {
        return this._refs.length;
    }
    /**
     * Skip bits
     * @param bits
     */
    skip(bits) {
        this._reader.skip(bits);
        return this;
    }
    /**
     * Load a single bit
     * @returns true or false depending on the bit value
     */
    loadBit() {
        return this._reader.loadBit();
    }
    /**
     * Preload a signle bit
     * @returns true or false depending on the bit value
     */
    preloadBit() {
        return this._reader.preloadBit();
    }
    /**
     * Load a boolean
     * @returns true or false depending on the bit value
     */
    loadBoolean() {
        return this.loadBit();
    }
    /**
     * Load maybe boolean
     * @returns true or false depending on the bit value or null
     */
    loadMaybeBoolean() {
        if (this.loadBit()) {
            return this.loadBoolean();
        }
        else {
            return null;
        }
    }
    /**
     * Load bits as a new BitString
     * @param bits number of bits to read
     * @returns new BitString
     */
    loadBits(bits) {
        return this._reader.loadBits(bits);
    }
    /**
     * Preload bits as a new BitString
     * @param bits number of bits to read
     * @returns new BitString
     */
    preloadBits(bits) {
        return this._reader.preloadBits(bits);
    }
    /**
     * Load uint
     * @param bits number of bits to read
     * @returns uint value
     */
    loadUint(bits) {
        return this._reader.loadUint(bits);
    }
    /**
     * Load uint
     * @param bits number of bits to read
     * @returns uint value
     */
    loadUintBig(bits) {
        return this._reader.loadUintBig(bits);
    }
    /**
     * Preload uint
     * @param bits number of bits to read
     * @returns uint value
     */
    preloadUint(bits) {
        return this._reader.preloadUint(bits);
    }
    /**
     * Preload uint
     * @param bits number of bits to read
     * @returns uint value
     */
    preloadUintBig(bits) {
        return this._reader.preloadUintBig(bits);
    }
    /**
     * Load maybe uint
     * @param bits number of bits to read
     * @returns uint value or null
     */
    loadMaybeUint(bits) {
        if (this.loadBit()) {
            return this.loadUint(bits);
        }
        else {
            return null;
        }
    }
    /**
     * Load maybe uint
     * @param bits number of bits to read
     * @returns uint value or null
     */
    loadMaybeUintBig(bits) {
        if (this.loadBit()) {
            return this.loadUintBig(bits);
        }
        else {
            return null;
        }
    }
    /**
     * Load int
     * @param bits number of bits to read
     * @returns int value
     */
    loadInt(bits) {
        return this._reader.loadInt(bits);
    }
    /**
     * Load int
     * @param bits number of bits to read
     * @returns int value
     */
    loadIntBig(bits) {
        return this._reader.loadIntBig(bits);
    }
    /**
     * Preload int
     * @param bits number of bits to read
     * @returns int value
     */
    preloadInt(bits) {
        return this._reader.preloadInt(bits);
    }
    /**
     * Preload int
     * @param bits number of bits to read
     * @returns int value
     */
    preloadIntBig(bits) {
        return this._reader.preloadIntBig(bits);
    }
    /**
     * Load maybe uint
     * @param bits number of bits to read
     * @returns uint value or null
     */
    loadMaybeInt(bits) {
        if (this.loadBit()) {
            return this.loadInt(bits);
        }
        else {
            return null;
        }
    }
    /**
     * Load maybe uint
     * @param bits number of bits to read
     * @returns uint value or null
     */
    loadMaybeIntBig(bits) {
        if (this.loadBit()) {
            return this.loadIntBig(bits);
        }
        else {
            return null;
        }
    }
    /**
     * Load varuint
     * @param bits number of bits to read in header
     * @returns varuint value
     */
    loadVarUint(bits) {
        return this._reader.loadVarUint(bits);
    }
    /**
     * Load varuint
     * @param bits number of bits to read in header
     * @returns varuint value
     */
    loadVarUintBig(bits) {
        return this._reader.loadVarUintBig(bits);
    }
    /**
     * Preload varuint
     * @param bits number of bits to read in header
     * @returns varuint value
     */
    preloadVarUint(bits) {
        return this._reader.preloadVarUint(bits);
    }
    /**
     * Preload varuint
     * @param bits number of bits to read in header
     * @returns varuint value
     */
    preloadVarUintBig(bits) {
        return this._reader.preloadVarUintBig(bits);
    }
    /**
     * Load varint
     * @param bits number of bits to read in header
     * @returns varint value
     */
    loadVarInt(bits) {
        return this._reader.loadVarInt(bits);
    }
    /**
     * Load varint
     * @param bits number of bits to read in header
     * @returns varint value
     */
    loadVarIntBig(bits) {
        return this._reader.loadVarIntBig(bits);
    }
    /**
     * Preload varint
     * @param bits number of bits to read in header
     * @returns varint value
     */
    preloadVarInt(bits) {
        return this._reader.preloadVarInt(bits);
    }
    /**
     * Preload varint
     * @param bits number of bits to read in header
     * @returns varint value
     */
    preloadVarIntBig(bits) {
        return this._reader.preloadVarIntBig(bits);
    }
    /**
     * Load coins
     * @returns coins value
     */
    loadCoins() {
        return this._reader.loadCoins();
    }
    /**
     * Preload coins
     * @returns coins value
     */
    preloadCoins() {
        return this._reader.preloadCoins();
    }
    /**
     * Load maybe coins
     * @returns coins value or null
     */
    loadMaybeCoins() {
        if (this._reader.loadBit()) {
            return this._reader.loadCoins();
        }
        else {
            return null;
        }
    }
    /**
     * Load internal Address
     * @returns Address
     */
    loadAddress() {
        return this._reader.loadAddress();
    }
    /**
     * Load optional internal Address
     * @returns Address or null
     */
    loadMaybeAddress() {
        return this._reader.loadMaybeAddress();
    }
    /**
     * Load external address
     * @returns ExternalAddress
     */
    loadExternalAddress() {
        return this._reader.loadExternalAddress();
    }
    /**
     * Load optional external address
     * @returns ExternalAddress or null
     */
    loadMaybeExternalAddress() {
        return this._reader.loadMaybeExternalAddress();
    }
    /**
     * Load address
     * @returns Address, ExternalAddress or null
     */
    loadAddressAny() {
        return this._reader.loadAddressAny();
    }
    /**
     * Load reference
     * @returns Cell
     */
    loadRef() {
        if (this._refs.length === 0) {
            throw new Error("No more references");
        }
        return this._refs.shift();
    }
    /**
     * Preload reference
     * @returns Cell
     */
    preloadRef() {
        if (this._refs.length === 0) {
            throw new Error("No more references");
        }
        return this._refs[0];
    }
    /**
     * Load optional reference
     * @returns Cell or null
     */
    loadMaybeRef() {
        if (this.loadBit()) {
            return this.loadRef();
        }
        else {
            return null;
        }
    }
    /**
     * Preload optional reference
     * @returns Cell or null
     */
    preloadMaybeRef() {
        if (this.preloadBit()) {
            return this.preloadRef();
        }
        else {
            return null;
        }
    }
    /**
     * Load byte buffer
     * @param bytes number of bytes to load
     * @returns Buffer
     */
    loadBuffer(bytes) {
        return this._reader.loadBuffer(bytes);
    }
    /**
     * Load byte buffer
     * @param bytes number of bytes to load
     * @returns Buffer
     */
    preloadBuffer(bytes) {
        return this._reader.preloadBuffer(bytes);
    }
    /**
     * Load string tail
     */
    loadStringTail() {
        return (0, strings_1.readString)(this);
    }
    /**
     * Load maybe string tail
     * @returns string or null
     */
    loadMaybeStringTail() {
        if (this.loadBit()) {
            return (0, strings_1.readString)(this);
        }
        else {
            return null;
        }
    }
    /**
     * Load string tail from ref
     * @returns string
     */
    loadStringRefTail() {
        return (0, strings_1.readString)(this.loadRef().beginParse());
    }
    /**
     * Load maybe string tail from ref
     * @returns string or null
     */
    loadMaybeStringRefTail() {
        const ref = this.loadMaybeRef();
        if (ref) {
            return (0, strings_1.readString)(ref.beginParse());
        }
        else {
            return null;
        }
    }
    /**
     * Loads dictionary
     * @param key key description
     * @param value value description
     * @returns Dictionary<K, V>
     */
    loadDict(key, value) {
        return Dictionary_1.Dictionary.load(key, value, this);
    }
    /**
     * Loads dictionary directly from current slice
     * @param key key description
     * @param value value description
     * @returns Dictionary<K, V>
     */
    loadDictDirect(key, value) {
        return Dictionary_1.Dictionary.loadDirect(key, value, this);
    }
    /**
     * Checks if slice is empty
     */
    endParse() {
        if (this.remainingBits > 0 || this.remainingRefs > 0) {
            throw new Error("Slice is not empty");
        }
    }
    /**
     * Convert slice to cell
     */
    asCell() {
        return (0, Builder_1.beginCell)().storeSlice(this).endCell();
    }
    /**
     *
     * @returns
     */
    asBuilder() {
        return (0, Builder_1.beginCell)().storeSlice(this);
    }
    /**
     * Clone slice
     * @returns cloned slice
     */
    clone() {
        return new Slice(this._reader, this._refs);
    }
    /**
     * Print slice as string by converting it to cell
     * @returns string
     */
    toString() {
        return this.asCell().toString();
    }
}
exports.Slice = Slice;
_a = symbol_inspect_1.default;

},{"../dict/Dictionary":35,"./Builder":16,"./utils/strings":31,"symbol.inspect":8}],20:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelMask = void 0;
class LevelMask {
    constructor(mask = 0) {
        this._mask = 0;
        this._mask = mask;
        this._hashIndex = countSetBits(this._mask);
        this._hashCount = this._hashIndex + 1;
    }
    get value() {
        return this._mask;
    }
    get level() {
        return 32 - Math.clz32(this._mask);
    }
    get hashIndex() {
        return this._hashIndex;
    }
    get hashCount() {
        return this._hashCount;
    }
    apply(level) {
        return new LevelMask(this._mask & ((1 << level) - 1));
    }
    isSignificant(level) {
        let res = level === 0 || (this._mask >> (level - 1)) % 2 !== 0;
        return res;
        // bool res = level == 0 | | ( (mask_ >> (level -1)) % 2 != 0);
    }
}
exports.LevelMask = LevelMask;
function countSetBits(n) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
}

},{}],21:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepr = exports.getBitsDescriptor = exports.getRefsDescriptor = void 0;
const CellType_1 = require("../CellType");
const paddedBits_1 = require("../utils/paddedBits");
function getRefsDescriptor(refs, level, type) {
    return refs.length + (type !== CellType_1.CellType.Ordinary ? 1 : 0) * 8 + level * 32;
}
exports.getRefsDescriptor = getRefsDescriptor;
function getBitsDescriptor(bits) {
    let len = bits.length;
    return Math.ceil(len / 8) + Math.floor(len / 8);
}
exports.getBitsDescriptor = getBitsDescriptor;
function getRepr(bits, refs, level, type) {
    // Allocate
    const bitsLen = Math.ceil(bits.length / 8);
    const repr = Buffer.alloc(2 + bitsLen + (2 + 32) * refs.length);
    // Write descriptors
    let reprCursor = 0;
    repr[reprCursor++] = getRefsDescriptor(refs, level, type);
    repr[reprCursor++] = getBitsDescriptor(bits);
    // Write bits
    (0, paddedBits_1.bitsToPaddedBuffer)(bits).copy(repr, reprCursor);
    reprCursor += bitsLen;
    // Write refs
    for (const c of refs) {
        let childDepth;
        if (type == CellType_1.CellType.MerkleProof || type == CellType_1.CellType.MerkleUpdate) {
            childDepth = c.depth(level + 1);
        }
        else {
            childDepth = c.depth(level);
        }
        repr[reprCursor++] = Math.floor(childDepth / 256);
        repr[reprCursor++] = childDepth % 256;
    }
    for (const c of refs) {
        let childHash;
        if (type == CellType_1.CellType.MerkleProof || type == CellType_1.CellType.MerkleUpdate) {
            childHash = c.hash(level + 1);
        }
        else {
            childHash = c.hash(level);
        }
        childHash.copy(repr, reprCursor);
        reprCursor += 32;
    }
    // Result
    return repr;
}
exports.getRepr = getRepr;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../CellType":18,"../utils/paddedBits":30,"buffer":3}],22:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exoticLibrary = void 0;
const BitReader_1 = require("../BitReader");
function exoticLibrary(bits, refs) {
    const reader = new BitReader_1.BitReader(bits);
    // type + hash
    const size = 8 + 256;
    if (bits.length !== size) {
        throw new Error(`Library cell must have exactly (8 + 256) bits, got "${bits.length}"`);
    }
    // Check type
    let type = reader.loadUint(8);
    if (type !== 2) {
        throw new Error(`Library cell must have type 2, got "${type}"`);
    }
    return {};
}
exports.exoticLibrary = exoticLibrary;

},{"../BitReader":14}],23:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exoticMerkleProof = void 0;
const BitReader_1 = require("../BitReader");
function exoticMerkleProof(bits, refs) {
    const reader = new BitReader_1.BitReader(bits);
    // type + hash + depth
    const size = 8 + 256 + 16;
    if (bits.length !== size) {
        throw new Error(`Merkle Proof cell must have exactly (8 + 256 + 16) bits, got "${bits.length}"`);
    }
    if (refs.length !== 1) {
        throw new Error(`Merkle Proof cell must have exactly 1 ref, got "${refs.length}"`);
    }
    // Check type
    let type = reader.loadUint(8);
    if (type !== 3) {
        throw new Error(`Merkle Proof cell must have type 3, got "${type}"`);
    }
    // Check data
    const proofHash = reader.loadBuffer(32);
    const proofDepth = reader.loadUint(16);
    const refHash = refs[0].hash(0);
    const refDepth = refs[0].depth(0);
    if (proofDepth !== refDepth) {
        throw new Error(`Merkle Proof cell ref depth must be exactly "${proofDepth}", got "${refDepth}"`);
    }
    if (!proofHash.equals(refHash)) {
        throw new Error(`Merkle Proof cell ref hash must be exactly "${proofHash.toString('hex')}", got "${refHash.toString('hex')}"`);
    }
    return {
        proofDepth,
        proofHash
    };
}
exports.exoticMerkleProof = exoticMerkleProof;

},{"../BitReader":14}],24:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exoticMerkleUpdate = void 0;
const BitReader_1 = require("../BitReader");
function exoticMerkleUpdate(bits, refs) {
    const reader = new BitReader_1.BitReader(bits);
    // type + hash + hash + depth + depth
    const size = 8 + (2 * (256 + 16));
    if (bits.length !== size) {
        throw new Error(`Merkle Update cell must have exactly (8 + (2 * (256 + 16))) bits, got "${bits.length}"`);
    }
    if (refs.length !== 2) {
        throw new Error(`Merkle Update cell must have exactly 2 refs, got "${refs.length}"`);
    }
    let type = reader.loadUint(8);
    if (type !== 4) {
        throw new Error(`Merkle Update cell type must be exactly 4, got "${type}"`);
    }
    const proofHash1 = reader.loadBuffer(32);
    const proofHash2 = reader.loadBuffer(32);
    const proofDepth1 = reader.loadUint(16);
    const proofDepth2 = reader.loadUint(16);
    if (proofDepth1 !== refs[0].depth(0)) {
        throw new Error(`Merkle Update cell ref depth must be exactly "${proofDepth1}", got "${refs[0].depth(0)}"`);
    }
    if (!proofHash1.equals(refs[0].hash(0))) {
        throw new Error(`Merkle Update cell ref hash must be exactly "${proofHash1.toString('hex')}", got "${refs[0].hash(0).toString('hex')}"`);
    }
    if (proofDepth2 !== refs[1].depth(0)) {
        throw new Error(`Merkle Update cell ref depth must be exactly "${proofDepth2}", got "${refs[1].depth(0)}"`);
    }
    if (!proofHash2.equals(refs[1].hash(0))) {
        throw new Error(`Merkle Update cell ref hash must be exactly "${proofHash2.toString('hex')}", got "${refs[1].hash(0).toString('hex')}"`);
    }
    return {
        proofDepth1,
        proofDepth2,
        proofHash1,
        proofHash2
    };
}
exports.exoticMerkleUpdate = exoticMerkleUpdate;

},{"../BitReader":14}],25:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exoticPruned = void 0;
const BitReader_1 = require("../BitReader");
const LevelMask_1 = require("./LevelMask");
function exoticPruned(bits, refs) {
    let reader = new BitReader_1.BitReader(bits);
    // Check type
    let type = reader.loadUint(8);
    if (type !== 1) {
        throw new Error(`Pruned branch cell must have type 1, got "${type}"`);
    }
    // Check refs
    if (refs.length !== 0) {
        throw new Error(`Pruned Branch cell can't has refs, got "${refs.length}"`);
    }
    // Resolve cell
    let mask;
    if (bits.length === 280) {
        // Special case for config proof
        // This test proof is generated in the moment of voting for a slashing
        // it seems that tools generate it incorrectly and therefore doesn't have mask in it
        // so we need to hardcode it equal to 1
        mask = new LevelMask_1.LevelMask(1);
    }
    else {
        // Check level
        mask = new LevelMask_1.LevelMask(reader.loadUint(8));
        if (mask.level < 1 || mask.level > 3) {
            throw new Error(`Pruned Branch cell level must be >= 1 and <= 3, got "${mask.level}/${mask.value}"`);
        }
        // Read pruned
        const size = 8 + 8 + (mask.apply(mask.level - 1).hashCount * (256 /* Hash */ + 16 /* Depth */));
        if (bits.length !== size) {
            throw new Error(`Pruned branch cell must have exactly ${size} bits, got "${bits.length}"`);
        }
    }
    // Read pruned
    let pruned = [];
    let hashes = [];
    let depths = [];
    for (let i = 0; i < mask.level; i++) {
        hashes.push(reader.loadBuffer(32));
    }
    for (let i = 0; i < mask.level; i++) {
        depths.push(reader.loadUint(16));
    }
    for (let i = 0; i < mask.level; i++) {
        pruned.push({
            depth: depths[i],
            hash: hashes[i]
        });
    }
    return {
        mask: mask.value,
        pruned
    };
}
exports.exoticPruned = exoticPruned;

},{"../BitReader":14,"./LevelMask":20}],26:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExotic = void 0;
const BitReader_1 = require("../BitReader");
const CellType_1 = require("../CellType");
const exoticLibrary_1 = require("./exoticLibrary");
const exoticMerkleProof_1 = require("./exoticMerkleProof");
const exoticMerkleUpdate_1 = require("./exoticMerkleUpdate");
const exoticPruned_1 = require("./exoticPruned");
const LevelMask_1 = require("./LevelMask");
function resolvePruned(bits, refs) {
    // Parse pruned cell
    let pruned = (0, exoticPruned_1.exoticPruned)(bits, refs);
    // Calculate parameters
    let depths = [];
    let hashes = [];
    let mask = new LevelMask_1.LevelMask(pruned.mask);
    for (let i = 0; i < pruned.pruned.length; i++) {
        depths.push(pruned.pruned[i].depth);
        hashes.push(pruned.pruned[i].hash);
    }
    return {
        type: CellType_1.CellType.PrunedBranch,
        depths,
        hashes,
        mask
    };
}
function resolveLibrary(bits, refs) {
    // Parse library cell
    let pruned = (0, exoticLibrary_1.exoticLibrary)(bits, refs);
    // Calculate parameters
    let depths = [];
    let hashes = [];
    let mask = new LevelMask_1.LevelMask();
    return {
        type: CellType_1.CellType.Library,
        depths,
        hashes,
        mask
    };
}
function resolveMerkleProof(bits, refs) {
    // Parse merkle proof cell
    let merkleProof = (0, exoticMerkleProof_1.exoticMerkleProof)(bits, refs);
    // Calculate parameters
    let depths = [];
    let hashes = [];
    let mask = new LevelMask_1.LevelMask(refs[0].level() >> 1);
    return {
        type: CellType_1.CellType.MerkleProof,
        depths,
        hashes,
        mask
    };
}
function resolveMerkleUpdate(bits, refs) {
    // Parse merkle proof cell
    let merkleUpdate = (0, exoticMerkleUpdate_1.exoticMerkleUpdate)(bits, refs);
    // Calculate parameters
    let depths = [];
    let hashes = [];
    let mask = new LevelMask_1.LevelMask((refs[0].level() | refs[1].level()) >> 1);
    return {
        type: CellType_1.CellType.MerkleUpdate,
        depths,
        hashes,
        mask
    };
}
function resolveExotic(bits, refs) {
    let reader = new BitReader_1.BitReader(bits);
    let type = reader.preloadUint(8);
    if (type === 1) {
        return resolvePruned(bits, refs);
    }
    if (type === 2) {
        return resolveLibrary(bits, refs);
    }
    if (type === 3) {
        return resolveMerkleProof(bits, refs);
    }
    if (type === 4) {
        return resolveMerkleUpdate(bits, refs);
    }
    throw Error('Invalid exotic cell type: ' + type);
}
exports.resolveExotic = resolveExotic;

},{"../BitReader":14,"../CellType":18,"./LevelMask":20,"./exoticLibrary":22,"./exoticMerkleProof":23,"./exoticMerkleUpdate":24,"./exoticPruned":25}],27:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBoc = exports.deserializeBoc = exports.parseBoc = void 0;
const BitReader_1 = require("../BitReader");
const BitString_1 = require("../BitString");
const Cell_1 = require("../Cell");
const topologicalSort_1 = require("./utils/topologicalSort");
const bitsForNumber_1 = require("../../utils/bitsForNumber");
const BitBuilder_1 = require("../BitBuilder");
const descriptor_1 = require("./descriptor");
const paddedBits_1 = require("../utils/paddedBits");
const crc32c_1 = require("../../utils/crc32c");
function readCell(reader, sizeBytes) {
    // D1
    const d1 = reader.loadUint(8);
    const refsCount = d1 % 8;
    const exotic = !!(d1 & 8);
    // D2
    const d2 = reader.loadUint(8);
    const dataBytesize = Math.ceil(d2 / 2);
    const paddingAdded = !!(d2 % 2);
    // Bits
    let bits = BitString_1.BitString.EMPTY;
    if (dataBytesize > 0) {
        if (paddingAdded) {
            bits = reader.loadPaddedBits(dataBytesize * 8);
        }
        else {
            bits = reader.loadBits(dataBytesize * 8);
        }
    }
    // Refs
    let refs = [];
    for (let i = 0; i < refsCount; i++) {
        refs.push(reader.loadUint(sizeBytes * 8));
    }
    // Result
    return {
        bits,
        refs,
        exotic
    };
}
function calcCellSize(cell, sizeBytes) {
    return 2 /* D1+D2 */ + Math.ceil(cell.bits.length / 8) + cell.refs.length * sizeBytes;
}
function parseBoc(src) {
    let reader = new BitReader_1.BitReader(new BitString_1.BitString(src, 0, src.length * 8));
    let magic = reader.loadUint(32);
    if (magic === 0x68ff65f3) {
        let size = reader.loadUint(8);
        let offBytes = reader.loadUint(8);
        let cells = reader.loadUint(size * 8);
        let roots = reader.loadUint(size * 8); // Must be 1
        let absent = reader.loadUint(size * 8);
        let totalCellSize = reader.loadUint(offBytes * 8);
        let index = reader.loadBuffer(cells * offBytes);
        let cellData = reader.loadBuffer(totalCellSize);
        return {
            size,
            offBytes,
            cells,
            roots,
            absent,
            totalCellSize,
            index,
            cellData,
            root: [0]
        };
    }
    else if (magic === 0xacc3a728) {
        let size = reader.loadUint(8);
        let offBytes = reader.loadUint(8);
        let cells = reader.loadUint(size * 8);
        let roots = reader.loadUint(size * 8); // Must be 1
        let absent = reader.loadUint(size * 8);
        let totalCellSize = reader.loadUint(offBytes * 8);
        let index = reader.loadBuffer(cells * offBytes);
        let cellData = reader.loadBuffer(totalCellSize);
        let crc32 = reader.loadBuffer(4);
        if (!(0, crc32c_1.crc32c)(src.subarray(0, src.length - 4)).equals(crc32)) {
            throw Error('Invalid CRC32C');
        }
        return {
            size,
            offBytes,
            cells,
            roots,
            absent,
            totalCellSize,
            index,
            cellData,
            root: [0]
        };
    }
    else if (magic === 0xb5ee9c72) {
        let hasIdx = reader.loadUint(1);
        let hasCrc32c = reader.loadUint(1);
        let hasCacheBits = reader.loadUint(1);
        let flags = reader.loadUint(2); // Must be 0
        let size = reader.loadUint(3);
        let offBytes = reader.loadUint(8);
        let cells = reader.loadUint(size * 8);
        let roots = reader.loadUint(size * 8);
        let absent = reader.loadUint(size * 8);
        let totalCellSize = reader.loadUint(offBytes * 8);
        let root = [];
        for (let i = 0; i < roots; i++) {
            root.push(reader.loadUint(size * 8));
        }
        let index = null;
        if (hasIdx) {
            index = reader.loadBuffer(cells * offBytes);
        }
        let cellData = reader.loadBuffer(totalCellSize);
        if (hasCrc32c) {
            let crc32 = reader.loadBuffer(4);
            if (!(0, crc32c_1.crc32c)(src.subarray(0, src.length - 4)).equals(crc32)) {
                throw Error('Invalid CRC32C');
            }
        }
        return {
            size,
            offBytes,
            cells,
            roots,
            absent,
            totalCellSize,
            index,
            cellData,
            root
        };
    }
    else {
        throw Error('Invalid magic');
    }
}
exports.parseBoc = parseBoc;
function deserializeBoc(src) {
    //
    // Parse BOC
    //
    let boc = parseBoc(src);
    let reader = new BitReader_1.BitReader(new BitString_1.BitString(boc.cellData, 0, boc.cellData.length * 8));
    //
    // Load cells
    //
    let cells = [];
    for (let i = 0; i < boc.cells; i++) {
        let cll = readCell(reader, boc.size);
        cells.push({ ...cll, result: null });
    }
    //
    // Build cells
    //
    for (let i = cells.length - 1; i >= 0; i--) {
        if (cells[i].result) {
            throw Error('Impossible');
        }
        let refs = [];
        for (let r of cells[i].refs) {
            if (!cells[r].result) {
                throw Error('Invalid BOC file');
            }
            refs.push(cells[r].result);
        }
        cells[i].result = new Cell_1.Cell({ bits: cells[i].bits, refs, exotic: cells[i].exotic });
    }
    //
    // Load roots
    //
    let roots = [];
    for (let i = 0; i < boc.root.length; i++) {
        roots.push(cells[boc.root[i]].result);
    }
    //
    // Return
    //
    return roots;
}
exports.deserializeBoc = deserializeBoc;
function writeCellToBuilder(cell, refs, sizeBytes, to) {
    let d1 = (0, descriptor_1.getRefsDescriptor)(cell.refs, cell.level(), cell.type);
    let d2 = (0, descriptor_1.getBitsDescriptor)(cell.bits);
    to.writeUint(d1, 8);
    to.writeUint(d2, 8);
    to.writeBuffer((0, paddedBits_1.bitsToPaddedBuffer)(cell.bits));
    for (let r of refs) {
        to.writeUint(r, sizeBytes * 8);
    }
}
function serializeBoc(root, opts) {
    // Sort cells
    let allCells = (0, topologicalSort_1.topologicalSort)(root);
    // Calculcate parameters
    let cellsNum = allCells.length;
    let has_idx = opts.idx;
    let has_crc32c = opts.crc32;
    let has_cache_bits = false;
    let flags = 0;
    let sizeBytes = Math.max(Math.ceil((0, bitsForNumber_1.bitsForNumber)(cellsNum, 'uint') / 8), 1);
    let totalCellSize = 0;
    let index = [];
    for (let c of allCells) {
        let sz = calcCellSize(c.cell, sizeBytes);
        index.push(totalCellSize);
        totalCellSize += sz;
    }
    let offsetBytes = Math.max(Math.ceil((0, bitsForNumber_1.bitsForNumber)(totalCellSize, 'uint') / 8), 1);
    let totalSize = (4 + // magic
        1 + // flags and s_bytes
        1 + // offset_bytes
        3 * sizeBytes + // cells_num, roots, complete
        offsetBytes + // full_size
        1 * sizeBytes + // root_idx
        (has_idx ? cellsNum * offsetBytes : 0) +
        totalCellSize +
        (has_crc32c ? 4 : 0)) * 8;
    // Serialize
    let builder = new BitBuilder_1.BitBuilder(totalSize);
    builder.writeUint(0xb5ee9c72, 32); // Magic
    builder.writeBit(has_idx); // Has index
    builder.writeBit(has_crc32c); // Has crc32c
    builder.writeBit(has_cache_bits); // Has cache bits
    builder.writeUint(flags, 2); // Flags
    builder.writeUint(sizeBytes, 3); // Size bytes
    builder.writeUint(offsetBytes, 8); // Offset bytes
    builder.writeUint(cellsNum, sizeBytes * 8); // Cells num
    builder.writeUint(1, sizeBytes * 8); // Roots num
    builder.writeUint(0, sizeBytes * 8); // Absent num
    builder.writeUint(totalCellSize, offsetBytes * 8); // Total cell size
    builder.writeUint(0, sizeBytes * 8); // Root id == 0
    if (has_idx) { // Index
        for (let i = 0; i < cellsNum; i++) {
            builder.writeUint(index[i], offsetBytes * 8);
        }
    }
    for (let i = 0; i < cellsNum; i++) { // Cells
        writeCellToBuilder(allCells[i].cell, allCells[i].refs, sizeBytes, builder);
    }
    if (has_crc32c) {
        let crc32 = (0, crc32c_1.crc32c)(builder.buffer()); // builder.buffer() is fast since it doesn't allocate new memory
        builder.writeBuffer(crc32);
    }
    // Sanity Check
    let res = builder.buffer();
    if (res.length !== totalSize / 8) {
        throw Error('Internal error');
    }
    return res;
}
exports.serializeBoc = serializeBoc;

},{"../../utils/bitsForNumber":80,"../../utils/crc32c":83,"../BitBuilder":13,"../BitReader":14,"../BitString":15,"../Cell":17,"../utils/paddedBits":30,"./descriptor":21,"./utils/topologicalSort":28}],28:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologicalSort = void 0;
function topologicalSort(src) {
    let pending = [src];
    let allCells = new Map();
    let notPermCells = new Set();
    let sorted = [];
    while (pending.length > 0) {
        const cells = [...pending];
        pending = [];
        for (let cell of cells) {
            const hash = cell.hash().toString('hex');
            if (allCells.has(hash)) {
                continue;
            }
            notPermCells.add(hash);
            allCells.set(hash, { cell: cell, refs: cell.refs.map((v) => v.hash().toString('hex')) });
            for (let r of cell.refs) {
                pending.push(r);
            }
        }
    }
    let tempMark = new Set();
    function visit(hash) {
        if (!notPermCells.has(hash)) {
            return;
        }
        if (tempMark.has(hash)) {
            throw Error('Not a DAG');
        }
        tempMark.add(hash);
        for (let c of allCells.get(hash).refs) {
            visit(c);
        }
        sorted.unshift(hash);
        tempMark.delete(hash);
        notPermCells.delete(hash);
    }
    while (notPermCells.size > 0) {
        const id = Array.from(notPermCells)[0];
        visit(id);
    }
    let indexes = new Map();
    for (let i = 0; i < sorted.length; i++) {
        indexes.set(sorted[i], i);
    }
    let result = [];
    for (let ent of sorted) {
        const rrr = allCells.get(ent);
        result.push({ cell: rrr.cell, refs: rrr.refs.map((v) => indexes.get(v)) });
    }
    return result;
}
exports.topologicalSort = topologicalSort;

},{}],29:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wonderCalculator = void 0;
const BitString_1 = require("../BitString");
const CellType_1 = require("../CellType");
const LevelMask_1 = require("./LevelMask");
const exoticPruned_1 = require("./exoticPruned");
const exoticMerkleProof_1 = require("./exoticMerkleProof");
const descriptor_1 = require("./descriptor");
const ton_crypto_1 = require("ton-crypto");
const exoticMerkleUpdate_1 = require("./exoticMerkleUpdate");
const exoticLibrary_1 = require("./exoticLibrary");
//
// This function replicates unknown logic of resolving cell data
// https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/crypto/vm/cells/DataCell.cpp#L214
//
function wonderCalculator(type, bits, refs) {
    //
    // Resolving level mask
    //
    let levelMask;
    let pruned = null;
    if (type === CellType_1.CellType.Ordinary) {
        let mask = 0;
        for (let r of refs) {
            mask = mask | r.mask.value;
        }
        levelMask = new LevelMask_1.LevelMask(mask);
    }
    else if (type === CellType_1.CellType.PrunedBranch) {
        // Parse pruned
        pruned = (0, exoticPruned_1.exoticPruned)(bits, refs);
        // Load level
        levelMask = new LevelMask_1.LevelMask(pruned.mask);
    }
    else if (type === CellType_1.CellType.MerkleProof) {
        // Parse proof
        let loaded = (0, exoticMerkleProof_1.exoticMerkleProof)(bits, refs);
        // Load level
        levelMask = new LevelMask_1.LevelMask(refs[0].mask.value >> 1);
    }
    else if (type === CellType_1.CellType.MerkleUpdate) {
        // Parse update
        let loaded = (0, exoticMerkleUpdate_1.exoticMerkleUpdate)(bits, refs);
        // Load level
        levelMask = new LevelMask_1.LevelMask((refs[0].mask.value | refs[1].mask.value) >> 1);
    }
    else if (type === CellType_1.CellType.Library) {
        // Parse library
        let loaded = (0, exoticLibrary_1.exoticLibrary)(bits, refs);
        // Load level
        levelMask = new LevelMask_1.LevelMask();
    }
    else {
        throw new Error("Unsupported exotic type");
    }
    //
    // Calculate hashes and depths
    // NOTE: https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/crypto/vm/cells/DataCell.cpp#L214
    //
    let depths = [];
    let hashes = [];
    let hashCount = type === CellType_1.CellType.PrunedBranch ? 1 : levelMask.hashCount;
    let totalHashCount = levelMask.hashCount;
    let hashIOffset = totalHashCount - hashCount;
    for (let levelI = 0, hashI = 0; levelI <= levelMask.level; levelI++) {
        if (!levelMask.isSignificant(levelI)) {
            continue;
        }
        if (hashI < hashIOffset) {
            hashI++;
            continue;
        }
        //
        // Bits
        //
        let currentBits;
        if (hashI === hashIOffset) {
            if (!(levelI === 0 || type === CellType_1.CellType.PrunedBranch)) {
                throw Error('Invalid');
            }
            currentBits = bits;
        }
        else {
            if (!(levelI !== 0 && type !== CellType_1.CellType.PrunedBranch)) {
                throw Error('Invalid: ' + levelI + ', ' + type);
            }
            currentBits = new BitString_1.BitString(hashes[hashI - hashIOffset - 1], 0, 256);
        }
        //
        // Depth
        //
        let currentDepth = 0;
        for (let c of refs) {
            let childDepth;
            if (type == CellType_1.CellType.MerkleProof || type == CellType_1.CellType.MerkleUpdate) {
                childDepth = c.depth(levelI + 1);
            }
            else {
                childDepth = c.depth(levelI);
            }
            currentDepth = Math.max(currentDepth, childDepth);
        }
        if (refs.length > 0) {
            currentDepth++;
        }
        //
        // Hash
        //
        let repr = (0, descriptor_1.getRepr)(currentBits, refs, levelI, type);
        let hash = (0, ton_crypto_1.sha256_sync)(repr);
        //
        // Persist next
        //
        let destI = hashI - hashIOffset;
        depths[destI] = currentDepth;
        hashes[destI] = hash;
        //
        // Next
        //
        hashI++;
    }
    //
    // Calculate hash and depth for all levels
    //
    let resolvedHashes = [];
    let resolvedDepths = [];
    if (pruned) {
        for (let i = 0; i < 4; i++) {
            const { hashIndex } = levelMask.apply(i);
            const { hashIndex: thisHashIndex } = levelMask;
            if (hashIndex !== thisHashIndex) {
                resolvedHashes.push(pruned.pruned[hashIndex].hash);
                resolvedDepths.push(pruned.pruned[hashIndex].depth);
            }
            else {
                resolvedHashes.push(hashes[0]);
                resolvedDepths.push(depths[0]);
            }
        }
    }
    else {
        for (let i = 0; i < 4; i++) {
            resolvedHashes.push(hashes[levelMask.apply(i).hashIndex]);
            resolvedDepths.push(depths[levelMask.apply(i).hashIndex]);
        }
    }
    //
    // Result
    //
    return {
        mask: levelMask,
        hashes: resolvedHashes,
        depths: resolvedDepths
    };
}
exports.wonderCalculator = wonderCalculator;

},{"../BitString":15,"../CellType":18,"./LevelMask":20,"./descriptor":21,"./exoticLibrary":22,"./exoticMerkleProof":23,"./exoticMerkleUpdate":24,"./exoticPruned":25,"ton-crypto":94}],30:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitsToPaddedBuffer = void 0;
const BitBuilder_1 = require("../BitBuilder");
function bitsToPaddedBuffer(bits) {
    // Create builder
    let builder = new BitBuilder_1.BitBuilder(Math.ceil(bits.length / 8) * 8);
    builder.writeBits(bits);
    // Apply padding
    let padding = Math.ceil(bits.length / 8) * 8 - bits.length;
    for (let i = 0; i < padding; i++) {
        if (i === 0) {
            builder.writeBit(1);
        }
        else {
            builder.writeBit(0);
        }
    }
    return builder.buffer();
}
exports.bitsToPaddedBuffer = bitsToPaddedBuffer;

},{"../BitBuilder":13}],31:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeString = exports.stringToCell = exports.readString = void 0;
const Builder_1 = require("../Builder");
function readBuffer(slice) {
    // Check consistency
    if (slice.remainingBits % 8 !== 0) {
        throw new Error(`Invalid string length: ${slice.remainingBits}`);
    }
    if (slice.remainingRefs !== 0 && slice.remainingRefs !== 1) {
        throw new Error(`invalid number of refs: ${slice.remainingRefs}`);
    }
    if (slice.remainingRefs === 1 && (1023 - slice.remainingBits) > 7) {
        throw new Error(`invalid string length: ${slice.remainingBits / 8}`);
    }
    // Read string
    let res;
    if (slice.remainingBits === 0) {
        res = Buffer.alloc(0);
    }
    else {
        res = slice.loadBuffer(slice.remainingBits / 8);
    }
    // Read tail
    if (slice.remainingRefs === 1) {
        res = Buffer.concat([res, readBuffer(slice.loadRef().beginParse())]);
    }
    return res;
}
function readString(slice) {
    return readBuffer(slice).toString();
}
exports.readString = readString;
function writeBuffer(src, builder) {
    if (src.length > 0) {
        let bytes = Math.floor(builder.availableBits / 8);
        if (src.length > bytes) {
            let a = src.subarray(0, bytes);
            let t = src.subarray(bytes);
            builder = builder.storeBuffer(a);
            let bb = (0, Builder_1.beginCell)();
            writeBuffer(t, bb);
            builder = builder.storeRef(bb.endCell());
        }
        else {
            builder = builder.storeBuffer(src);
        }
    }
}
function stringToCell(src) {
    let builder = (0, Builder_1.beginCell)();
    writeBuffer(Buffer.from(src), builder);
    return builder.endCell();
}
exports.stringToCell = stringToCell;
function writeString(src, builder) {
    writeBuffer(Buffer.from(src), builder);
}
exports.writeString = writeString;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../Builder":16,"buffer":3}],32:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeError = void 0;
class ComputeError extends Error {
    constructor(message, exitCode, opts) {
        super(message);
        this.exitCode = exitCode;
        this.debugLogs = opts && opts.debugLogs ? opts.debugLogs : null;
        this.logs = opts && opts.logs ? opts.logs : null;
        Object.setPrototypeOf(this, ComputeError.prototype);
    }
}
exports.ComputeError = ComputeError;

},{}],33:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openContract = void 0;
const Address_1 = require("../address/Address");
const Cell_1 = require("../boc/Cell");
function openContract(src, factory) {
    // Resolve parameters
    let address;
    let init = null;
    if (!Address_1.Address.isAddress(src.address)) {
        throw Error('Invalid address');
    }
    address = src.address;
    if (src.init) {
        if (!(src.init.code instanceof Cell_1.Cell)) {
            throw Error('Invalid init.code');
        }
        if (!(src.init.data instanceof Cell_1.Cell)) {
            throw Error('Invalid init.data');
        }
        init = src.init;
    }
    // Create executor
    let executor = factory({ address, init });
    // Create proxy
    return new Proxy(src, {
        get(target, prop) {
            const value = target[prop];
            if (typeof prop === 'string' && (prop.startsWith('get') || prop.startsWith('send'))) {
                if (typeof value === 'function') {
                    return (...args) => value.apply(target, [executor, ...args]);
                }
            }
            return value;
        }
    });
}
exports.openContract = openContract;

},{"../address/Address":10,"../boc/Cell":17}],34:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeSignVerify = exports.safeSign = void 0;
const ton_crypto_1 = require("ton-crypto");
const MIN_SEED_LENGTH = 8;
const MAX_SEED_LENGTH = 64;
function createSafeSignHash(cell, seed) {
    let seedData = Buffer.from(seed);
    if (seedData.length > MAX_SEED_LENGTH) {
        throw Error('Seed can\t be longer than 64 bytes');
    }
    if (seedData.length < MIN_SEED_LENGTH) {
        throw Error('Seed must be at least 8 bytes');
    }
    return (0, ton_crypto_1.sha256_sync)(Buffer.concat([Buffer.from([0xff, 0xff]), seedData, cell.hash()]));
}
function safeSign(cell, secretKey, seed = 'ton-safe-sign-magic') {
    return (0, ton_crypto_1.sign)(createSafeSignHash(cell, seed), secretKey);
}
exports.safeSign = safeSign;
function safeSignVerify(cell, signature, publicKey, seed = 'ton-safe-sign-magic') {
    return (0, ton_crypto_1.signVerify)(createSafeSignHash(cell, seed), signature, publicKey);
}
exports.safeSignVerify = safeSignVerify;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"ton-crypto":94}],35:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dictionary = void 0;
const Address_1 = require("../address/Address");
const Builder_1 = require("../boc/Builder");
const Cell_1 = require("../boc/Cell");
const parseDict_1 = require("./parseDict");
const serializeDict_1 = require("./serializeDict");
const internalKeySerializer_1 = require("./utils/internalKeySerializer");
class Dictionary {
    /**
     * Create an empty map
     * @param key key type
     * @param value value type
     * @returns Dictionary<K, V>
     */
    static empty(key, value) {
        if (key && value) {
            return new Dictionary(new Map(), key, value);
        }
        else {
            return new Dictionary(new Map(), null, null);
        }
    }
    /**
     * Load dictionary from slice
     * @param key key description
     * @param value value description
     * @param src slice
     * @returns Dictionary<K, V>
     */
    static load(key, value, sc) {
        let slice;
        if (sc instanceof Cell_1.Cell) {
            if (sc.isExotic) {
                return Dictionary.empty(key, value);
            }
            slice = sc.beginParse();
        }
        else {
            slice = sc;
        }
        let cell = slice.loadMaybeRef();
        if (cell && !cell.isExotic) {
            return Dictionary.loadDirect(key, value, cell.beginParse());
        }
        else {
            return Dictionary.empty(key, value);
        }
    }
    /**
     * Low level method for rare dictionaries from system contracts.
     * Loads dictionary from slice directly without going to the ref.
     *
     * @param key key description
     * @param value value description
     * @param sc slice
     * @returns Dictionary<K, V>
     */
    static loadDirect(key, value, sc) {
        if (!sc) {
            return Dictionary.empty(key, value);
        }
        let slice;
        if (sc instanceof Cell_1.Cell) {
            slice = sc.beginParse();
        }
        else {
            slice = sc;
        }
        let values = (0, parseDict_1.parseDict)(slice, key.bits, value.parse);
        let prepare = new Map();
        for (let [k, v] of values) {
            prepare.set((0, internalKeySerializer_1.serializeInternalKey)(key.parse(k)), v);
        }
        return new Dictionary(prepare, key, value);
    }
    constructor(values, key, value) {
        this._key = key;
        this._value = value;
        this._map = values;
    }
    get size() {
        return this._map.size;
    }
    get(key) {
        return this._map.get((0, internalKeySerializer_1.serializeInternalKey)(key));
    }
    has(key) {
        return this._map.has((0, internalKeySerializer_1.serializeInternalKey)(key));
    }
    set(key, value) {
        this._map.set((0, internalKeySerializer_1.serializeInternalKey)(key), value);
        return this;
    }
    delete(key) {
        const k = (0, internalKeySerializer_1.serializeInternalKey)(key);
        return this._map.delete(k);
    }
    clear() {
        this._map.clear();
    }
    *[Symbol.iterator]() {
        for (const [k, v] of this._map) {
            const key = (0, internalKeySerializer_1.deserializeInternalKey)(k);
            yield [key, v];
        }
    }
    keys() {
        return Array.from(this._map.keys()).map((v) => (0, internalKeySerializer_1.deserializeInternalKey)(v));
    }
    values() {
        return Array.from(this._map.values());
    }
    store(builder, key, value) {
        if (this._map.size === 0) {
            builder.storeBit(0);
        }
        else {
            // Resolve serializer
            let resolvedKey = this._key;
            if (key !== null && key !== undefined) {
                resolvedKey = key;
            }
            let resolvedValue = this._value;
            if (value !== null && value !== undefined) {
                resolvedValue = value;
            }
            if (!resolvedKey) {
                throw Error('Key serializer is not defined');
            }
            if (!resolvedValue) {
                throw Error('Value serializer is not defined');
            }
            // Prepare map
            let prepared = new Map();
            for (const [k, v] of this._map) {
                prepared.set(resolvedKey.serialize((0, internalKeySerializer_1.deserializeInternalKey)(k)), v);
            }
            // Store
            builder.storeBit(1);
            let dd = (0, Builder_1.beginCell)();
            (0, serializeDict_1.serializeDict)(prepared, resolvedKey.bits, resolvedValue.serialize, dd);
            builder.storeRef(dd.endCell());
        }
    }
    storeDirect(builder, key, value) {
        if (this._map.size === 0) {
            throw Error('Cannot store empty dictionary directly');
        }
        // Resolve serializer
        let resolvedKey = this._key;
        if (key !== null && key !== undefined) {
            resolvedKey = key;
        }
        let resolvedValue = this._value;
        if (value !== null && value !== undefined) {
            resolvedValue = value;
        }
        if (!resolvedKey) {
            throw Error('Key serializer is not defined');
        }
        if (!resolvedValue) {
            throw Error('Value serializer is not defined');
        }
        // Prepare map
        let prepared = new Map();
        for (const [k, v] of this._map) {
            prepared.set(resolvedKey.serialize((0, internalKeySerializer_1.deserializeInternalKey)(k)), v);
        }
        // Store
        (0, serializeDict_1.serializeDict)(prepared, resolvedKey.bits, resolvedValue.serialize, builder);
    }
}
exports.Dictionary = Dictionary;
Dictionary.Keys = {
    /**
     * Standard address key
     * @returns DictionaryKey<Address>
     */
    Address: () => {
        return createAddressKey();
    },
    /**
     * Create standard big integer key
     * @param bits number of bits
     * @returns DictionaryKey<bigint>
     */
    BigInt: (bits) => {
        return createBigIntKey(bits);
    },
    /**
     * Create integer key
     * @param bits bits of integer
     * @returns DictionaryKey<number>
     */
    Int: (bits) => {
        return createIntKey(bits);
    },
    /**
     * Create standard unsigned big integer key
     * @param bits number of bits
     * @returns DictionaryKey<bigint>
     */
    BigUint: (bits) => {
        return createBigUintKey(bits);
    },
    /**
     * Create standard unsigned integer key
     * @param bits number of bits
     * @returns DictionaryKey<number>
     */
    Uint: (bits) => {
        return createUintKey(bits);
    },
    /**
     * Create standard buffer key
     * @param bytes number of bytes of a buffer
     * @returns DictionaryKey<Buffer>
     */
    Buffer: (bytes) => {
        return createBufferKey(bytes);
    }
};
Dictionary.Values = {
    /**
     * Create standard integer value
     * @returns DictionaryValue<bigint>
     */
    BigInt: (bits) => {
        return createBigIntValue(bits);
    },
    /**
     * Create standard integer value
     * @returns DictionaryValue<number>
     */
    Int: (bits) => {
        return createIntValue(bits);
    },
    /**
     * Create big var int
     * @param bits nubmer of header bits
     * @returns DictionaryValue<bigint>
     */
    BigVarInt: (bits) => {
        return createBigVarIntValue(bits);
    },
    /**
     * Create standard unsigned integer value
     * @param bits number of bits
     * @returns DictionaryValue<bigint>
     */
    BigUint: (bits) => {
        return createBigUintValue(bits);
    },
    /**
     * Create standard unsigned integer value
     * @param bits number of bits
     * @returns DictionaryValue<bigint>
     */
    Uint: (bits) => {
        return createUintValue(bits);
    },
    /**
     * Create big var int
     * @param bits nubmer of header bits
     * @returns DictionaryValue<bigint>
     */
    BigVarUint: (bits) => {
        return createBigVarUintValue(bits);
    },
    /**
     * Create standard boolean value
     * @returns DictionaryValue<boolean>
     */
    Bool: () => {
        return createBooleanValue();
    },
    /**
     * Create standard address value
     * @returns DictionaryValue<Address>
     */
    Address: () => {
        return createAddressValue();
    },
    /**
     * Create standard cell value
     * @returns DictionaryValue<Cell>
     */
    Cell: () => {
        return createCellValue();
    },
    /**
     * Create Builder value
     * @param bytes number of bytes of a buffer
     * @returns DictionaryValue<Builder>
     */
    Buffer: (bytes) => {
        return createBufferValue(bytes);
    },
    /**
     * Create dictionary value
     * @param key
     * @param value
     */
    Dictionary: (key, value) => {
        return createDictionaryValue(key, value);
    }
};
//
// Keys and Values
//
function createAddressKey() {
    return {
        bits: 267,
        serialize: (src) => {
            if (!Address_1.Address.isAddress(src)) {
                throw Error('Key is not an address');
            }
            return (0, Builder_1.beginCell)().storeAddress(src).endCell().beginParse().preloadUintBig(267);
        },
        parse: (src) => {
            return (0, Builder_1.beginCell)().storeUint(src, 267).endCell().beginParse().loadAddress();
        }
    };
}
function createBigIntKey(bits) {
    return {
        bits,
        serialize: (src) => {
            if (typeof src !== 'bigint') {
                throw Error('Key is not a bigint');
            }
            return (0, Builder_1.beginCell)().storeInt(src, bits).endCell().beginParse().loadUintBig(bits);
        },
        parse: (src) => {
            return (0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadIntBig(bits);
        }
    };
}
function createIntKey(bits) {
    return {
        bits: bits,
        serialize: (src) => {
            if (typeof src !== 'number') {
                throw Error('Key is not a number');
            }
            if (!Number.isSafeInteger(src)) {
                throw Error('Key is not a safe integer: ' + src);
            }
            return (0, Builder_1.beginCell)().storeInt(src, bits).endCell().beginParse().loadUintBig(bits);
        },
        parse: (src) => {
            return (0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadInt(bits);
        }
    };
}
function createBigUintKey(bits) {
    return {
        bits,
        serialize: (src) => {
            if (typeof src !== 'bigint') {
                throw Error('Key is not a bigint');
            }
            if (src < 0) {
                throw Error('Key is negative: ' + src);
            }
            return (0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadUintBig(bits);
        },
        parse: (src) => {
            return (0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadUintBig(bits);
        }
    };
}
function createUintKey(bits) {
    return {
        bits,
        serialize: (src) => {
            if (typeof src !== 'number') {
                throw Error('Key is not a number');
            }
            if (!Number.isSafeInteger(src)) {
                throw Error('Key is not a safe integer: ' + src);
            }
            if (src < 0) {
                throw Error('Key is negative: ' + src);
            }
            return (0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadUintBig(bits);
        },
        parse: (src) => {
            return Number((0, Builder_1.beginCell)().storeUint(src, bits).endCell().beginParse().loadUint(bits));
        }
    };
}
function createBufferKey(bytes) {
    return {
        bits: bytes * 8,
        serialize: (src) => {
            if (!Buffer.isBuffer(src)) {
                throw Error('Key is not a buffer');
            }
            return (0, Builder_1.beginCell)().storeBuffer(src).endCell().beginParse().loadUintBig(bytes * 8);
        },
        parse: (src) => {
            return (0, Builder_1.beginCell)().storeUint(src, bytes * 8).endCell().beginParse().loadBuffer(bytes);
        }
    };
}
function createIntValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeInt(src, bits);
        },
        parse: (src) => {
            return src.loadInt(bits);
        }
    };
}
function createBigIntValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeInt(src, bits);
        },
        parse: (src) => {
            return src.loadIntBig(bits);
        }
    };
}
function createBigVarIntValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeVarInt(src, bits);
        },
        parse: (src) => {
            return src.loadVarIntBig(bits);
        }
    };
}
function createBigVarUintValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeVarUint(src, bits);
        },
        parse: (src) => {
            return src.loadVarUintBig(bits);
        }
    };
}
function createUintValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeUint(src, bits);
        },
        parse: (src) => {
            return src.loadUint(bits);
        }
    };
}
function createBigUintValue(bits) {
    return {
        serialize: (src, buidler) => {
            buidler.storeUint(src, bits);
        },
        parse: (src) => {
            return src.loadUintBig(bits);
        }
    };
}
function createBooleanValue() {
    return {
        serialize: (src, buidler) => {
            buidler.storeBit(src);
        },
        parse: (src) => {
            return src.loadBit();
        }
    };
}
function createAddressValue() {
    return {
        serialize: (src, buidler) => {
            buidler.storeAddress(src);
        },
        parse: (src) => {
            return src.loadAddress();
        }
    };
}
function createCellValue() {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(src);
        },
        parse: (src) => {
            return src.loadRef();
        }
    };
}
function createDictionaryValue(key, value) {
    return {
        serialize: (src, buidler) => {
            src.store(buidler);
        },
        parse: (src) => {
            return Dictionary.load(key, value, src);
        }
    };
}
function createBufferValue(size) {
    return {
        serialize: (src, buidler) => {
            if (src.length !== size) {
                throw Error('Invalid buffer size');
            }
            buidler.storeBuffer(src);
        },
        parse: (src) => {
            return src.loadBuffer(size);
        }
    };
}

}).call(this)}).call(this,{"isBuffer":require("../../../is-buffer/index.js")})
},{"../../../is-buffer/index.js":6,"../address/Address":10,"../boc/Builder":16,"../boc/Cell":17,"./parseDict":36,"./serializeDict":37,"./utils/internalKeySerializer":39}],36:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDict = void 0;
function readUnaryLength(slice) {
    let res = 0;
    while (slice.loadBit()) {
        res++;
    }
    return res;
}
function doParse(prefix, slice, n, res, extractor) {
    // Reading label
    let lb0 = slice.loadBit() ? 1 : 0;
    let prefixLength = 0;
    let pp = prefix;
    if (lb0 === 0) {
        // Short label detected
        // Read 
        prefixLength = readUnaryLength(slice);
        // Read prefix
        for (let i = 0; i < prefixLength; i++) {
            pp += slice.loadBit() ? '1' : '0';
        }
    }
    else {
        let lb1 = slice.loadBit() ? 1 : 0;
        if (lb1 === 0) {
            // Long label detected
            prefixLength = slice.loadUint(Math.ceil(Math.log2(n + 1)));
            for (let i = 0; i < prefixLength; i++) {
                pp += slice.loadBit() ? '1' : '0';
            }
        }
        else {
            // Same label detected
            let bit = slice.loadBit() ? '1' : '0';
            prefixLength = slice.loadUint(Math.ceil(Math.log2(n + 1)));
            for (let i = 0; i < prefixLength; i++) {
                pp += bit;
            }
        }
    }
    if (n - prefixLength === 0) {
        res.set(BigInt('0b' + pp), extractor(slice));
    }
    else {
        let left = slice.loadRef();
        let right = slice.loadRef();
        // NOTE: Left and right branches are implicitly contain prefixes '0' and '1'
        if (!left.isExotic) {
            doParse(pp + '0', left.beginParse(), n - prefixLength - 1, res, extractor);
        }
        if (!right.isExotic) {
            doParse(pp + '1', right.beginParse(), n - prefixLength - 1, res, extractor);
        }
    }
}
function parseDict(sc, keySize, extractor) {
    let res = new Map();
    if (sc) {
        doParse('', sc, keySize, res, extractor);
    }
    return res;
}
exports.parseDict = parseDict;

},{}],37:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeDict = exports.detectLabelType = exports.writeLabelSame = exports.writeLabelLong = exports.writeLabelShort = exports.buildTree = void 0;
const Builder_1 = require("../boc/Builder");
const findCommonPrefix_1 = require("./utils/findCommonPrefix");
//
// Tree Build
//
function pad(src, size) {
    while (src.length < size) {
        src = '0' + src;
    }
    return src;
}
function removePrefixMap(src, length) {
    if (length === 0) {
        return src;
    }
    else {
        let res = new Map();
        for (let k of src.keys()) {
            let d = src.get(k);
            res.set(k.slice(length), d);
        }
        return res;
    }
}
function forkMap(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    let left = new Map();
    let right = new Map();
    for (let k of src.keys()) {
        let d = src.get(k);
        if (k.startsWith('0')) {
            left.set(k.substr(1), d);
        }
        else {
            right.set(k.substr(1), d);
        }
    }
    if (left.size === 0) {
        throw Error('Internal inconsistency. Left emtpy.');
    }
    if (right.size === 0) {
        throw Error('Internal inconsistency. Right emtpy.');
    }
    return { left, right };
}
function buildNode(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    if (src.size === 1) {
        return { type: 'leaf', value: Array.from(src.values())[0] };
    }
    let { left, right } = forkMap(src);
    return {
        type: 'fork',
        left: buildEdge(left),
        right: buildEdge(right)
    };
}
function buildEdge(src) {
    if (src.size === 0) {
        throw Error('Internal inconsistency');
    }
    const label = (0, findCommonPrefix_1.findCommonPrefix)(Array.from(src.keys()));
    return { label, node: buildNode(removePrefixMap(src, label.length)) };
}
function buildTree(src, keyLength) {
    // Convert map keys
    let converted = new Map();
    for (let k of Array.from(src.keys())) {
        const padded = pad(k.toString(2), keyLength);
        converted.set(padded, src.get(k));
    }
    // Calculate root label
    return buildEdge(converted);
}
exports.buildTree = buildTree;
//
// Serialization
//
function writeLabelShort(src, to) {
    // Header
    to.storeBit(0);
    // Unary length
    for (let i = 0; i < src.length; i++) {
        to.storeBit(1);
    }
    to.storeBit(0);
    // Value
    for (let i = 0; i < src.length; i++) {
        to.storeBit(src[i] === '1');
    }
    return to;
}
exports.writeLabelShort = writeLabelShort;
function labelShortLength(src) {
    return 1 + src.length + 1 + src.length;
}
function writeLabelLong(src, keyLength, to) {
    // Header
    to.storeBit(1);
    to.storeBit(0);
    // Length
    let length = Math.ceil(Math.log2(keyLength + 1));
    to.storeUint(src.length, length);
    // Value
    for (let i = 0; i < src.length; i++) {
        to.storeBit(src[i] === '1');
    }
    return to;
}
exports.writeLabelLong = writeLabelLong;
function labelLongLength(src, keyLength) {
    return 1 + 1 + Math.ceil(Math.log2(keyLength + 1)) + src.length;
}
function writeLabelSame(value, length, keyLength, to) {
    // Header
    to.storeBit(1);
    to.storeBit(1);
    // Value
    to.storeBit(value);
    // Length
    let lenLen = Math.ceil(Math.log2(keyLength + 1));
    to.storeUint(length, lenLen);
}
exports.writeLabelSame = writeLabelSame;
function labelSameLength(keyLength) {
    return 1 + 1 + 1 + Math.ceil(Math.log2(keyLength + 1));
}
function isSame(src) {
    if (src.length === 0 || src.length === 1) {
        return true;
    }
    for (let i = 1; i < src.length; i++) {
        if (src[i] !== src[0]) {
            return false;
        }
    }
    return true;
}
function detectLabelType(src, keyLength) {
    let kind = 'short';
    let kindLength = labelShortLength(src);
    let longLength = labelLongLength(src, keyLength);
    if (longLength < kindLength) {
        kindLength = longLength;
        kind = 'long';
    }
    if (isSame(src)) {
        let sameLength = labelSameLength(keyLength);
        if (sameLength < kindLength) {
            kindLength = sameLength;
            kind = 'same';
        }
    }
    return kind;
}
exports.detectLabelType = detectLabelType;
function writeLabel(src, keyLength, to) {
    let type = detectLabelType(src, keyLength);
    if (type === 'short') {
        writeLabelShort(src, to);
    }
    if (type === 'long') {
        writeLabelLong(src, keyLength, to);
    }
    if (type === 'same') {
        writeLabelSame(src[0] === '1', src.length, keyLength, to);
    }
}
function writeNode(src, keyLength, serializer, to) {
    if (src.type === 'leaf') {
        serializer(src.value, to);
    }
    if (src.type === 'fork') {
        const leftCell = (0, Builder_1.beginCell)();
        const rightCell = (0, Builder_1.beginCell)();
        writeEdge(src.left, keyLength - 1, serializer, leftCell);
        writeEdge(src.right, keyLength - 1, serializer, rightCell);
        to.storeRef(leftCell);
        to.storeRef(rightCell);
    }
}
function writeEdge(src, keyLength, serializer, to) {
    writeLabel(src.label, keyLength, to);
    writeNode(src.node, keyLength - src.label.length, serializer, to);
}
function serializeDict(src, keyLength, serializer, to) {
    const tree = buildTree(src, keyLength);
    writeEdge(tree, keyLength, serializer, to);
}
exports.serializeDict = serializeDict;

},{"../boc/Builder":16,"./utils/findCommonPrefix":38}],38:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCommonPrefix = void 0;
function findCommonPrefix(src) {
    // Corner cases
    if (src.length === 0) {
        return '';
    }
    if (src.length === 1) {
        return src[0];
    }
    // Searching for prefix
    const sorted = [...src].sort();
    let size = 0;
    for (let i = 0; i < sorted[0].length; i++) {
        if (sorted[0][i] !== sorted[sorted.length - 1][i]) {
            break;
        }
        size++;
    }
    return src[0].slice(0, size);
}
exports.findCommonPrefix = findCommonPrefix;

},{}],39:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeInternalKey = exports.serializeInternalKey = void 0;
const Address_1 = require("../../address/Address");
function serializeInternalKey(value) {
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw Error('Invalid key type: not a safe integer: ' + value);
        }
        return 'n:' + value.toString(10);
    }
    else if (typeof value === 'bigint') {
        return 'b:' + value.toString(10);
    }
    else if (Address_1.Address.isAddress(value)) {
        return 'a:' + value.toString();
    }
    else if (Buffer.isBuffer(value)) {
        return 'f:' + value.toString('hex');
    }
    else {
        throw Error('Invalid key type');
    }
}
exports.serializeInternalKey = serializeInternalKey;
function deserializeInternalKey(value) {
    let k = value.slice(0, 2);
    let v = value.slice(2);
    if (k === 'n:') {
        return parseInt(v, 10);
    }
    else if (k === 'b:') {
        return BigInt(v);
    }
    else if (k === 'a:') {
        return Address_1.Address.parse(v);
    }
    else if (k === 'f:') {
        return Buffer.from(v, 'hex');
    }
    throw Error('Invalid key type: ' + k);
}
exports.deserializeInternalKey = deserializeInternalKey;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../../address/Address":10,"buffer":3}],40:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeSignVerify = exports.safeSign = exports.getMethodId = exports.base32Encode = exports.base32Decode = exports.crc32c = exports.crc16 = exports.fromNano = exports.toNano = exports.ComputeError = exports.openContract = exports.TupleBuilder = exports.TupleReader = exports.serializeTuple = exports.parseTuple = exports.exoticPruned = exports.exoticMerkleUpdate = exports.exoticMerkleProof = exports.Dictionary = exports.Cell = exports.CellType = exports.Slice = exports.beginCell = exports.Builder = exports.BitBuilder = exports.BitReader = exports.BitString = exports.contractAddress = exports.ADNLAddress = exports.ExternalAddress = exports.address = exports.Address = void 0;
// Address
var Address_1 = require("./address/Address");
Object.defineProperty(exports, "Address", { enumerable: true, get: function () { return Address_1.Address; } });
Object.defineProperty(exports, "address", { enumerable: true, get: function () { return Address_1.address; } });
var ExternalAddress_1 = require("./address/ExternalAddress");
Object.defineProperty(exports, "ExternalAddress", { enumerable: true, get: function () { return ExternalAddress_1.ExternalAddress; } });
var ADNLAddress_1 = require("./address/ADNLAddress");
Object.defineProperty(exports, "ADNLAddress", { enumerable: true, get: function () { return ADNLAddress_1.ADNLAddress; } });
var contractAddress_1 = require("./address/contractAddress");
Object.defineProperty(exports, "contractAddress", { enumerable: true, get: function () { return contractAddress_1.contractAddress; } });
// BitString
var BitString_1 = require("./boc/BitString");
Object.defineProperty(exports, "BitString", { enumerable: true, get: function () { return BitString_1.BitString; } });
var BitReader_1 = require("./boc/BitReader");
Object.defineProperty(exports, "BitReader", { enumerable: true, get: function () { return BitReader_1.BitReader; } });
var BitBuilder_1 = require("./boc/BitBuilder");
Object.defineProperty(exports, "BitBuilder", { enumerable: true, get: function () { return BitBuilder_1.BitBuilder; } });
// Cell
var Builder_1 = require("./boc/Builder");
Object.defineProperty(exports, "Builder", { enumerable: true, get: function () { return Builder_1.Builder; } });
Object.defineProperty(exports, "beginCell", { enumerable: true, get: function () { return Builder_1.beginCell; } });
var Slice_1 = require("./boc/Slice");
Object.defineProperty(exports, "Slice", { enumerable: true, get: function () { return Slice_1.Slice; } });
var CellType_1 = require("./boc/CellType");
Object.defineProperty(exports, "CellType", { enumerable: true, get: function () { return CellType_1.CellType; } });
var Cell_1 = require("./boc/Cell");
Object.defineProperty(exports, "Cell", { enumerable: true, get: function () { return Cell_1.Cell; } });
// Dict
var Dictionary_1 = require("./dict/Dictionary");
Object.defineProperty(exports, "Dictionary", { enumerable: true, get: function () { return Dictionary_1.Dictionary; } });
// Exotics
var exoticMerkleProof_1 = require("./boc/cell/exoticMerkleProof");
Object.defineProperty(exports, "exoticMerkleProof", { enumerable: true, get: function () { return exoticMerkleProof_1.exoticMerkleProof; } });
var exoticMerkleUpdate_1 = require("./boc/cell/exoticMerkleUpdate");
Object.defineProperty(exports, "exoticMerkleUpdate", { enumerable: true, get: function () { return exoticMerkleUpdate_1.exoticMerkleUpdate; } });
var exoticPruned_1 = require("./boc/cell/exoticPruned");
Object.defineProperty(exports, "exoticPruned", { enumerable: true, get: function () { return exoticPruned_1.exoticPruned; } });
var tuple_1 = require("./tuple/tuple");
Object.defineProperty(exports, "parseTuple", { enumerable: true, get: function () { return tuple_1.parseTuple; } });
Object.defineProperty(exports, "serializeTuple", { enumerable: true, get: function () { return tuple_1.serializeTuple; } });
var reader_1 = require("./tuple/reader");
Object.defineProperty(exports, "TupleReader", { enumerable: true, get: function () { return reader_1.TupleReader; } });
var builder_1 = require("./tuple/builder");
Object.defineProperty(exports, "TupleBuilder", { enumerable: true, get: function () { return builder_1.TupleBuilder; } });
// Types
__exportStar(require("./types/_export"), exports);
var openContract_1 = require("./contract/openContract");
Object.defineProperty(exports, "openContract", { enumerable: true, get: function () { return openContract_1.openContract; } });
var ComputeError_1 = require("./contract/ComputeError");
Object.defineProperty(exports, "ComputeError", { enumerable: true, get: function () { return ComputeError_1.ComputeError; } });
// Utility
var convert_1 = require("./utils/convert");
Object.defineProperty(exports, "toNano", { enumerable: true, get: function () { return convert_1.toNano; } });
Object.defineProperty(exports, "fromNano", { enumerable: true, get: function () { return convert_1.fromNano; } });
var crc16_1 = require("./utils/crc16");
Object.defineProperty(exports, "crc16", { enumerable: true, get: function () { return crc16_1.crc16; } });
var crc32c_1 = require("./utils/crc32c");
Object.defineProperty(exports, "crc32c", { enumerable: true, get: function () { return crc32c_1.crc32c; } });
var base32_1 = require("./utils/base32");
Object.defineProperty(exports, "base32Decode", { enumerable: true, get: function () { return base32_1.base32Decode; } });
Object.defineProperty(exports, "base32Encode", { enumerable: true, get: function () { return base32_1.base32Encode; } });
var getMethodId_1 = require("./utils/getMethodId");
Object.defineProperty(exports, "getMethodId", { enumerable: true, get: function () { return getMethodId_1.getMethodId; } });
// Crypto
var safeSign_1 = require("./crypto/safeSign");
Object.defineProperty(exports, "safeSign", { enumerable: true, get: function () { return safeSign_1.safeSign; } });
Object.defineProperty(exports, "safeSignVerify", { enumerable: true, get: function () { return safeSign_1.safeSignVerify; } });

},{"./address/ADNLAddress":9,"./address/Address":10,"./address/ExternalAddress":11,"./address/contractAddress":12,"./boc/BitBuilder":13,"./boc/BitReader":14,"./boc/BitString":15,"./boc/Builder":16,"./boc/Cell":17,"./boc/CellType":18,"./boc/Slice":19,"./boc/cell/exoticMerkleProof":23,"./boc/cell/exoticMerkleUpdate":24,"./boc/cell/exoticPruned":25,"./contract/ComputeError":32,"./contract/openContract":33,"./crypto/safeSign":34,"./dict/Dictionary":35,"./tuple/builder":41,"./tuple/reader":42,"./tuple/tuple":43,"./types/_export":77,"./utils/base32":79,"./utils/convert":81,"./utils/crc16":82,"./utils/crc32c":83,"./utils/getMethodId":84}],41:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleBuilder = void 0;
const Builder_1 = require("../boc/Builder");
const Cell_1 = require("../boc/Cell");
const Slice_1 = require("../boc/Slice");
class TupleBuilder {
    constructor() {
        this._tuple = [];
    }
    writeNumber(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'int', value: BigInt(v) });
        }
    }
    writeBoolean(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'int', value: v ? -1n : 0n });
        }
    }
    writeBuffer(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'slice', cell: (0, Builder_1.beginCell)().storeBuffer(v).endCell() });
        }
    }
    writeString(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'slice', cell: (0, Builder_1.beginCell)().storeStringTail(v).endCell() });
        }
    }
    writeCell(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            if (v instanceof Cell_1.Cell) {
                this._tuple.push({ type: 'cell', cell: v });
            }
            else if (v instanceof Slice_1.Slice) {
                this._tuple.push({ type: 'cell', cell: v.asCell() });
            }
        }
    }
    writeSlice(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            if (v instanceof Cell_1.Cell) {
                this._tuple.push({ type: 'slice', cell: v });
            }
            else if (v instanceof Slice_1.Slice) {
                this._tuple.push({ type: 'slice', cell: v.asCell() });
            }
        }
    }
    writeBuilder(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            if (v instanceof Cell_1.Cell) {
                this._tuple.push({ type: 'builder', cell: v });
            }
            else if (v instanceof Slice_1.Slice) {
                this._tuple.push({ type: 'builder', cell: v.asCell() });
            }
        }
    }
    writeTuple(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'tuple', items: v });
        }
    }
    writeAddress(v) {
        if (v === null || v === undefined) {
            this._tuple.push({ type: 'null' });
        }
        else {
            this._tuple.push({ type: 'slice', cell: (0, Builder_1.beginCell)().storeAddress(v).endCell() });
        }
    }
    build() {
        return [...this._tuple];
    }
}
exports.TupleBuilder = TupleBuilder;

},{"../boc/Builder":16,"../boc/Cell":17,"../boc/Slice":19}],42:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleReader = void 0;
class TupleReader {
    constructor(items) {
        this.items = [...items];
    }
    get remaining() {
        return this.items.length;
    }
    peek() {
        if (this.items.length === 0) {
            throw Error('EOF');
        }
        return this.items[0];
    }
    pop() {
        if (this.items.length === 0) {
            throw Error('EOF');
        }
        let res = this.items[0];
        this.items.splice(0, 1);
        return res;
    }
    skip(num = 1) {
        for (let i = 0; i < num; i++) {
            this.pop();
        }
        return this;
    }
    readBigNumber() {
        let popped = this.pop();
        if (popped.type !== 'int') {
            throw Error('Not a number');
        }
        return popped.value;
    }
    readBigNumberOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'int') {
            throw Error('Not a number');
        }
        return popped.value;
    }
    readNumber() {
        return Number(this.readBigNumber());
    }
    readNumberOpt() {
        let r = this.readBigNumberOpt();
        if (r !== null) {
            return Number(r);
        }
        else {
            return null;
        }
    }
    readBoolean() {
        let res = this.readNumber();
        return res === 0 ? false : true;
    }
    readBooleanOpt() {
        let res = this.readNumberOpt();
        if (res !== null) {
            return res === 0 ? false : true;
        }
        else {
            return null;
        }
    }
    readAddress() {
        let r = this.readCell().beginParse().loadAddress();
        if (r !== null) {
            return r;
        }
        else {
            throw Error('Not an address');
        }
    }
    readAddressOpt() {
        let r = this.readCellOpt();
        if (r !== null) {
            return r.beginParse().loadMaybeAddress();
        }
        else {
            return null;
        }
    }
    readCell() {
        let popped = this.pop();
        if (popped.type !== 'cell' && popped.type !== 'slice' && popped.type !== 'builder') {
            throw Error('Not a cell: ' + popped.type);
        }
        return popped.cell;
    }
    readCellOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'cell' && popped.type !== 'slice' && popped.type !== 'builder') {
            throw Error('Not a cell');
        }
        return popped.cell;
    }
    readTuple() {
        let popped = this.pop();
        if (popped.type !== 'tuple') {
            throw Error('Not a number');
        }
        return new TupleReader(popped.items);
    }
    readTupleOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'tuple') {
            throw Error('Not a number');
        }
        return new TupleReader(popped.items);
    }
    readBuffer() {
        let s = this.readCell().beginParse();
        if (s.remainingRefs !== 0) {
            throw Error('Not a buffer');
        }
        if (s.remainingBits % 8 !== 0) {
            throw Error('Not a buffer');
        }
        return s.loadBuffer(s.remainingBits / 8);
    }
    readBufferOpt() {
        let popped = this.peek();
        if (popped.type === 'null') {
            return null;
        }
        let s = this.readCell().beginParse();
        if (s.remainingRefs !== 0) {
            throw Error('Not a buffer');
        }
        if (s.remainingBits % 8 !== 0) {
            throw Error('Not a buffer');
        }
        return s.loadBuffer(s.remainingBits / 8);
    }
    readString() {
        let s = this.readCell().beginParse();
        return s.loadStringTail();
    }
    readStringOpt() {
        let popped = this.peek();
        if (popped.type === 'null') {
            return null;
        }
        let s = this.readCell().beginParse();
        return s.loadStringTail();
    }
}
exports.TupleReader = TupleReader;

},{}],43:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTuple = exports.serializeTuple = void 0;
const Builder_1 = require("../boc/Builder");
const INT64_MIN = BigInt('-9223372036854775808');
const INT64_MAX = BigInt('9223372036854775807');
// vm_stk_null#00 = VmStackValue;
// vm_stk_tinyint#01 value:int64 = VmStackValue;
// vm_stk_int#0201_ value:int257 = VmStackValue;
// vm_stk_nan#02ff = VmStackValue;
// vm_stk_cell#03 cell:^Cell = VmStackValue;
//_ cell:^Cell st_bits:(## 10) end_bits:(## 10) { st_bits <= end_bits }
//   st_ref:(#<= 4) end_ref:(#<= 4) { st_ref <= end_ref } = VmCellSlice;
// vm_stk_slice#04 _:VmCellSlice = VmStackValue;
// vm_stk_builder#05 cell:^Cell = VmStackValue;
// vm_stk_cont#06 cont:VmCont = VmStackValue;
// vm_tupref_nil$_ = VmTupleRef 0;
// vm_tupref_single$_ entry:^VmStackValue = VmTupleRef 1;
// vm_tupref_any$_ {n:#} ref:^(VmTuple (n + 2)) = VmTupleRef (n + 2);
// vm_tuple_nil$_ = VmTuple 0;
// vm_tuple_tcons$_ {n:#} head:(VmTupleRef n) tail:^VmStackValue = VmTuple (n + 1);
// vm_stk_tuple#07 len:(## 16) data:(VmTuple len) = VmStackValue;
function serializeTupleItem(src, builder) {
    if (src.type === 'null') {
        builder.storeUint(0x00, 8);
    }
    else if (src.type === 'int') {
        if (src.value <= INT64_MAX && src.value >= INT64_MIN) {
            builder.storeUint(0x01, 8);
            builder.storeInt(src.value, 64);
        }
        else {
            builder.storeUint(0x0100, 15);
            builder.storeInt(src.value, 257);
        }
    }
    else if (src.type === 'nan') {
        builder.storeInt(0x02ff, 16);
    }
    else if (src.type === 'cell') {
        builder.storeUint(0x03, 8);
        builder.storeRef(src.cell);
    }
    else if (src.type === 'slice') {
        builder.storeUint(0x04, 8);
        builder.storeUint(0, 10);
        builder.storeUint(src.cell.bits.length, 10);
        builder.storeUint(0, 3);
        builder.storeUint(src.cell.refs.length, 3);
        builder.storeRef(src.cell);
    }
    else if (src.type === 'builder') {
        builder.storeUint(0x05, 8);
        builder.storeRef(src.cell);
    }
    else if (src.type === 'tuple') {
        let head = null;
        let tail = null;
        for (let i = 0; i < src.items.length; i++) {
            // Swap
            let s = head;
            head = tail;
            tail = s;
            if (i > 1) {
                head = (0, Builder_1.beginCell)()
                    .storeRef(tail)
                    .storeRef(head)
                    .endCell();
            }
            let bc = (0, Builder_1.beginCell)();
            serializeTupleItem(src.items[i], bc);
            tail = bc.endCell();
        }
        builder.storeUint(0x07, 8);
        builder.storeUint(src.items.length, 16);
        if (head) {
            builder.storeRef(head);
        }
        if (tail) {
            builder.storeRef(tail);
        }
    }
    else {
        throw Error('Invalid value');
    }
}
function parseStackItem(cs) {
    let kind = cs.loadUint(8);
    if (kind === 0) {
        return { type: 'null' };
    }
    else if (kind === 1) {
        return { type: 'int', value: cs.loadIntBig(64) };
    }
    else if (kind === 2) {
        if (cs.loadUint(7) === 0) {
            return { type: 'int', value: cs.loadIntBig(257) };
        }
        else {
            cs.loadBit(); // must eq 1
            return { type: 'nan' };
        }
    }
    else if (kind === 3) {
        return { type: 'cell', cell: cs.loadRef() };
    }
    else if (kind === 4) {
        let startBits = cs.loadUint(10);
        let endBits = cs.loadUint(10);
        let startRefs = cs.loadUint(3);
        let endRefs = cs.loadUint(3);
        // Copy to new cell
        let rs = cs.loadRef().beginParse();
        rs.skip(startBits);
        let dt = rs.loadBits(endBits - startBits);
        let builder = (0, Builder_1.beginCell)()
            .storeBits(dt);
        // Copy refs if exist
        if (startRefs < endRefs) {
            for (let i = 0; i < startRefs; i++) {
                rs.loadRef();
            }
            for (let i = 0; i < endRefs - startRefs; i++) {
                builder.storeRef(rs.loadRef());
            }
        }
        return { type: 'slice', cell: builder.endCell() };
    }
    else if (kind === 5) {
        return { type: 'builder', cell: cs.loadRef() };
    }
    else if (kind === 7) {
        let length = cs.loadUint(16);
        let items = [];
        if (length > 1) {
            let head = cs.loadRef().beginParse();
            let tail = cs.loadRef().beginParse();
            items.unshift(parseStackItem(tail));
            for (let i = 0; i < length - 2; i++) {
                let ohead = head;
                head = ohead.loadRef().beginParse();
                tail = ohead.loadRef().beginParse();
                items.unshift(parseStackItem(tail));
            }
            items.unshift(parseStackItem(head));
        }
        else if (length === 1) {
            items.push(parseStackItem(cs.loadRef().beginParse()));
        }
        return { type: 'tuple', items };
    }
    else {
        throw Error('Unsupported stack item');
    }
}
//
// Stack parsing
// Source: https://github.com/ton-foundation/ton/blob/ae5c0720143e231c32c3d2034cfe4e533a16d969/crypto/block/block.tlb#L783
//
// vm_stack#_ depth:(## 24) stack:(VmStackList depth) = VmStack;
// vm_stk_cons#_ {n:#} rest:^(VmStackList n) tos:VmStackValue = VmStackList (n + 1);
// vm_stk_nil#_ = VmStackList 0;
//
function serializeTupleTail(src, builder) {
    if (src.length > 0) {
        // rest:^(VmStackList n)
        let tail = (0, Builder_1.beginCell)();
        serializeTupleTail(src.slice(0, src.length - 1), tail);
        builder.storeRef(tail.endCell());
        // tos
        serializeTupleItem(src[src.length - 1], builder);
    }
}
function serializeTuple(src) {
    let builder = (0, Builder_1.beginCell)();
    builder.storeUint(src.length, 24);
    let r = [...src];
    serializeTupleTail(r, builder);
    return builder.endCell();
}
exports.serializeTuple = serializeTuple;
function parseTuple(src) {
    let res = [];
    let cs = src.beginParse();
    let size = cs.loadUint(24);
    for (let i = 0; i < size; i++) {
        let next = cs.loadRef();
        res.unshift(parseStackItem(cs));
        cs = next.beginParse();
    }
    return res;
}
exports.parseTuple = parseTuple;

},{"../boc/Builder":16}],44:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAccount = exports.loadAccount = void 0;
const AccountStorage_1 = require("./AccountStorage");
const StorageInto_1 = require("./StorageInto");
function loadAccount(slice) {
    return {
        addr: slice.loadAddress(),
        storageStats: (0, StorageInto_1.loadStorageInfo)(slice),
        storage: (0, AccountStorage_1.loadAccountStorage)(slice)
    };
}
exports.loadAccount = loadAccount;
function storeAccount(src) {
    return (builder) => {
        builder.storeAddress(src.addr);
        builder.store((0, StorageInto_1.storeStorageInfo)(src.storageStats));
        builder.store((0, AccountStorage_1.storeAccountStorage)(src.storage));
    };
}
exports.storeAccount = storeAccount;

},{"./AccountStorage":48,"./StorageInto":66}],45:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAccountState = exports.loadAccountState = void 0;
const StateInit_1 = require("./StateInit");
function loadAccountState(cs) {
    if (cs.loadBit()) {
        return { type: 'active', state: (0, StateInit_1.loadStateInit)(cs) };
    }
    else if (cs.loadBit()) {
        return { type: 'frozen', stateHash: cs.loadUintBig(256) };
    }
    else {
        return { type: 'uninit' };
    }
}
exports.loadAccountState = loadAccountState;
function storeAccountState(src) {
    return (builder) => {
        if (src.type === 'active') {
            builder.storeBit(true);
            builder.store((0, StateInit_1.storeStateInit)(src.state));
        }
        else if (src.type === 'frozen') {
            builder.storeBit(false);
            builder.storeBit(true);
            builder.storeUint(src.stateHash, 256);
        }
        else if (src.type === 'uninit') {
            builder.storeBit(false);
            builder.storeBit(false);
        }
    };
}
exports.storeAccountState = storeAccountState;

},{"./StateInit":65}],46:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAccountStatus = exports.loadAccountStatus = void 0;
/**
 * Load account state from slice
 * @param slice
 * @returns AccountState
 */
function loadAccountStatus(slice) {
    const status = slice.loadUint(2);
    if (status === 0x00) {
        return 'uninitialized';
    }
    if (status === 0x01) {
        return 'frozen';
    }
    if (status === 0x02) {
        return 'active';
    }
    if (status === 0x03) {
        return 'non-existing';
    }
    throw Error('Invalid data');
}
exports.loadAccountStatus = loadAccountStatus;
/**
 * Store account state to builder
 * @param src account state
 * @param builder buidler
 */
function storeAccountStatus(src) {
    return (builder) => {
        if (src === 'uninitialized') {
            builder.storeUint(0x00, 2);
        }
        else if (src === 'frozen') {
            builder.storeUint(0x01, 2);
        }
        else if (src === 'active') {
            builder.storeUint(0x02, 2);
        }
        else if (src === 'non-existing') {
            builder.storeUint(0x03, 2);
        }
        else {
            throw Error('Invalid data');
        }
        return builder;
    };
}
exports.storeAccountStatus = storeAccountStatus;

},{}],47:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAccountStatusChange = exports.loadAccountStatusChange = void 0;
function loadAccountStatusChange(slice) {
    if (!slice.loadBit()) {
        return 'unchanged';
    }
    if (slice.loadBit()) {
        return 'frozen';
    }
    else {
        return 'deleted';
    }
}
exports.loadAccountStatusChange = loadAccountStatusChange;
function storeAccountStatusChange(src) {
    return (builder) => {
        if (src == 'unchanged') {
            builder.storeBit(0);
        }
        else if (src === 'frozen') {
            builder.storeBit(1);
            builder.storeBit(0);
        }
        else if (src === 'deleted') {
            builder.storeBit(1);
            builder.storeBit(1);
        }
        else {
            throw Error('Invalid account status change');
        }
    };
}
exports.storeAccountStatusChange = storeAccountStatusChange;

},{}],48:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAccountStorage = exports.loadAccountStorage = void 0;
const AccountState_1 = require("./AccountState");
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadAccountStorage(slice) {
    return {
        lastTransLt: slice.loadUintBig(64),
        balance: (0, CurrencyCollection_1.loadCurrencyCollection)(slice),
        state: (0, AccountState_1.loadAccountState)(slice)
    };
}
exports.loadAccountStorage = loadAccountStorage;
function storeAccountStorage(src) {
    return (builder) => {
        builder.storeUint(src.lastTransLt, 64);
        builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(src.balance));
        builder.store((0, AccountState_1.storeAccountState)(src.state));
    };
}
exports.storeAccountStorage = storeAccountStorage;

},{"./AccountState":45,"./CurrencyCollection":52}],49:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeCommonMessageInfo = exports.loadCommonMessageInfo = void 0;
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadCommonMessageInfo(slice) {
    // Internal message
    if (!slice.loadBit()) {
        const ihrDisabled = slice.loadBit();
        const bounce = slice.loadBit();
        const bounced = slice.loadBit();
        const src = slice.loadAddress();
        const dest = slice.loadAddress();
        const value = (0, CurrencyCollection_1.loadCurrencyCollection)(slice);
        const ihrFee = slice.loadCoins();
        const forwardFee = slice.loadCoins();
        const createdLt = slice.loadUintBig(64);
        const createdAt = slice.loadUint(32);
        return {
            type: 'internal',
            ihrDisabled,
            bounce,
            bounced,
            src,
            dest,
            value,
            ihrFee,
            forwardFee,
            createdLt,
            createdAt,
        };
    }
    // External In mesage
    if (!slice.loadBit()) {
        const src = slice.loadMaybeExternalAddress();
        const dest = slice.loadAddress();
        const importFee = slice.loadCoins();
        return {
            type: 'external-in',
            src,
            dest,
            importFee,
        };
    }
    // External Out message
    const src = slice.loadAddress();
    const dest = slice.loadMaybeExternalAddress();
    const createdLt = slice.loadUintBig(64);
    const createdAt = slice.loadUint(32);
    return {
        type: 'external-out',
        src,
        dest,
        createdLt,
        createdAt,
    };
}
exports.loadCommonMessageInfo = loadCommonMessageInfo;
function storeCommonMessageInfo(source) {
    return (builder) => {
        if (source.type === 'internal') {
            builder.storeBit(0);
            builder.storeBit(source.ihrDisabled);
            builder.storeBit(source.bounce);
            builder.storeBit(source.bounced);
            builder.storeAddress(source.src);
            builder.storeAddress(source.dest);
            builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(source.value));
            builder.storeCoins(source.ihrFee);
            builder.storeCoins(source.forwardFee);
            builder.storeUint(source.createdLt, 64);
            builder.storeUint(source.createdAt, 32);
        }
        else if (source.type === 'external-in') {
            builder.storeBit(1);
            builder.storeBit(0);
            builder.storeAddress(source.src);
            builder.storeAddress(source.dest);
            builder.storeCoins(source.importFee);
        }
        else if (source.type === 'external-out') {
            builder.storeBit(1);
            builder.storeBit(1);
            builder.storeAddress(source.src);
            builder.storeAddress(source.dest);
            builder.storeUint(source.createdLt, 64);
            builder.storeUint(source.createdAt, 32);
        }
        else {
            throw new Error('Unknown CommonMessageInfo type');
        }
    };
}
exports.storeCommonMessageInfo = storeCommonMessageInfo;

},{"./CurrencyCollection":52}],50:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeCommonMessageInfoRelaxed = exports.loadCommonMessageInfoRelaxed = void 0;
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadCommonMessageInfoRelaxed(slice) {
    // Internal message
    if (!slice.loadBit()) {
        const ihrDisabled = slice.loadBit();
        const bounce = slice.loadBit();
        const bounced = slice.loadBit();
        const src = slice.loadMaybeAddress();
        const dest = slice.loadAddress();
        const value = (0, CurrencyCollection_1.loadCurrencyCollection)(slice);
        const ihrFee = slice.loadCoins();
        const forwardFee = slice.loadCoins();
        const createdLt = slice.loadUintBig(64);
        const createdAt = slice.loadUint(32);
        return {
            type: 'internal',
            ihrDisabled,
            bounce,
            bounced,
            src,
            dest,
            value,
            ihrFee,
            forwardFee,
            createdLt,
            createdAt,
        };
    }
    // External In mesage
    if (!slice.loadBit()) {
        throw Error('External In message is not possible for CommonMessageInfoRelaxed');
    }
    // External Out message
    const src = slice.loadMaybeAddress();
    const dest = slice.loadMaybeExternalAddress();
    const createdLt = slice.loadUintBig(64);
    const createdAt = slice.loadUint(32);
    return {
        type: 'external-out',
        src,
        dest,
        createdLt,
        createdAt,
    };
}
exports.loadCommonMessageInfoRelaxed = loadCommonMessageInfoRelaxed;
function storeCommonMessageInfoRelaxed(source) {
    return (builder) => {
        if (source.type === 'internal') {
            builder.storeBit(0);
            builder.storeBit(source.ihrDisabled);
            builder.storeBit(source.bounce);
            builder.storeBit(source.bounced);
            builder.storeAddress(source.src);
            builder.storeAddress(source.dest);
            builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(source.value));
            builder.storeCoins(source.ihrFee);
            builder.storeCoins(source.forwardFee);
            builder.storeUint(source.createdLt, 64);
            builder.storeUint(source.createdAt, 32);
        }
        else if (source.type === 'external-out') {
            builder.storeBit(1);
            builder.storeBit(1);
            builder.storeAddress(source.src);
            builder.storeAddress(source.dest);
            builder.storeUint(source.createdLt, 64);
            builder.storeUint(source.createdAt, 32);
        }
        else {
            throw new Error('Unknown CommonMessageInfo type');
        }
    };
}
exports.storeCommonMessageInfoRelaxed = storeCommonMessageInfoRelaxed;

},{"./CurrencyCollection":52}],51:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeComputeSkipReason = exports.loadComputeSkipReason = void 0;
function loadComputeSkipReason(slice) {
    let reason = slice.loadUint(2);
    if (reason === 0x00) {
        return 'no-state';
    }
    else if (reason === 0x01) {
        return 'bad-state';
    }
    else if (reason === 0x02) {
        return 'no-gas';
    }
    throw new Error(`Unknown ComputeSkipReason: ${reason}`);
}
exports.loadComputeSkipReason = loadComputeSkipReason;
function storeComputeSkipReason(src) {
    return (builder) => {
        if (src === 'no-state') {
            builder.storeUint(0x00, 2);
        }
        else if (src === 'bad-state') {
            builder.storeUint(0x01, 2);
        }
        else if (src === 'no-gas') {
            builder.storeUint(0x02, 2);
        }
        else {
            throw new Error(`Unknown ComputeSkipReason: ${src}`);
        }
    };
}
exports.storeComputeSkipReason = storeComputeSkipReason;

},{}],52:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeCurrencyCollection = exports.loadCurrencyCollection = void 0;
const Dictionary_1 = require("../dict/Dictionary");
;
function loadCurrencyCollection(slice) {
    const coins = slice.loadCoins();
    const other = slice.loadDict(Dictionary_1.Dictionary.Keys.Uint(32), Dictionary_1.Dictionary.Values.BigVarUint(5 /* log2(32) */));
    if (other.size === 0) {
        return { coins };
    }
    else {
        return { other, coins };
    }
}
exports.loadCurrencyCollection = loadCurrencyCollection;
function storeCurrencyCollection(collection) {
    return (builder) => {
        builder.storeCoins(collection.coins);
        if (collection.other) {
            builder.storeDict(collection.other);
        }
        else {
            builder.storeBit(0);
        }
    };
}
exports.storeCurrencyCollection = storeCurrencyCollection;

},{"../dict/Dictionary":35}],53:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeDepthBalanceInfo = exports.loadDepthBalanceInfo = void 0;
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadDepthBalanceInfo(slice) {
    let splitDepth = slice.loadUint(5);
    return {
        splitDepth,
        balance: (0, CurrencyCollection_1.loadCurrencyCollection)(slice)
    };
}
exports.loadDepthBalanceInfo = loadDepthBalanceInfo;
function storeDepthBalanceInfo(src) {
    return (builder) => {
        builder.storeUint(src.splitDepth, 5);
        builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(src.balance));
    };
}
exports.storeDepthBalanceInfo = storeDepthBalanceInfo;

},{"./CurrencyCollection":52}],54:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeHashUpdate = exports.loadHashUpdate = void 0;
function loadHashUpdate(slice) {
    if (slice.loadUint(8) !== 0x72) {
        throw Error('Invalid data');
    }
    const oldHash = slice.loadBuffer(32);
    const newHash = slice.loadBuffer(32);
    return { oldHash, newHash };
}
exports.loadHashUpdate = loadHashUpdate;
function storeHashUpdate(src) {
    return (builder) => {
        builder.storeUint(0x72, 8);
        builder.storeBuffer(src.oldHash);
        builder.storeBuffer(src.newHash);
    };
}
exports.storeHashUpdate = storeHashUpdate;

},{}],55:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMasterchainStateExtra = void 0;
const Dictionary_1 = require("../dict/Dictionary");
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadMasterchainStateExtra(cs) {
    // Check magic
    if (cs.loadUint(16) !== 0xcc26) {
        throw Error('Invalid data');
    }
    // Skip shard_hashes
    if (cs.loadBit()) {
        cs.loadRef();
    }
    // Read config
    let configAddress = cs.loadUintBig(256);
    let config = Dictionary_1.Dictionary.load(Dictionary_1.Dictionary.Keys.Int(32), Dictionary_1.Dictionary.Values.Cell(), cs);
    // Rad global balance
    const globalBalance = (0, CurrencyCollection_1.loadCurrencyCollection)(cs);
    return {
        config,
        configAddress,
        globalBalance
    };
}
exports.loadMasterchainStateExtra = loadMasterchainStateExtra;

},{"../dict/Dictionary":35,"./CurrencyCollection":52}],56:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageValue = exports.storeMessage = exports.loadMessage = void 0;
const Builder_1 = require("../boc/Builder");
const CommonMessageInfo_1 = require("./CommonMessageInfo");
const StateInit_1 = require("./StateInit");
function loadMessage(slice) {
    const info = (0, CommonMessageInfo_1.loadCommonMessageInfo)(slice);
    let init = null;
    if (slice.loadBit()) {
        if (!slice.loadBit()) {
            init = (0, StateInit_1.loadStateInit)(slice);
        }
        else {
            init = (0, StateInit_1.loadStateInit)(slice.loadRef().beginParse());
        }
    }
    const body = slice.loadBit() ? slice.loadRef() : slice.asCell();
    return {
        info,
        init,
        body
    };
}
exports.loadMessage = loadMessage;
function storeMessage(message, opts) {
    return (builder) => {
        // Store CommonMsgInfo
        builder.store((0, CommonMessageInfo_1.storeCommonMessageInfo)(message.info));
        // Store init
        if (message.init) {
            builder.storeBit(true);
            let initCell = (0, Builder_1.beginCell)().store((0, StateInit_1.storeStateInit)(message.init));
            // Check if need to store it in ref
            let needRef = false;
            if (opts && opts.forceRef) {
                needRef = true;
            }
            else if (builder.availableBits - 2 /* At least on byte for ref flag */ >= initCell.bits) {
                needRef = false;
            }
            else {
                needRef = true;
            }
            // Persist init
            if (needRef) {
                builder.storeBit(true);
                builder.storeRef(initCell);
            }
            else {
                builder.storeBit(false);
                builder.storeBuilder(initCell);
            }
        }
        else {
            builder.storeBit(false);
        }
        // Store body
        let needRef = false;
        if (opts && opts.forceRef) {
            needRef = true;
        }
        else {
            if (builder.availableBits - 1 /* At least on byte for ref flag */ >= message.body.bits.length &&
                builder.refs + message.body.refs.length <= 4) {
                needRef = false;
            }
            else {
                needRef = true;
            }
        }
        if (needRef) {
            builder.storeBit(true);
            builder.storeRef(message.body);
        }
        else {
            builder.storeBit(false);
            builder.storeBuilder(message.body.asBuilder());
        }
    };
}
exports.storeMessage = storeMessage;
exports.MessageValue = {
    serialize(src, builder) {
        builder.storeRef((0, Builder_1.beginCell)()
            .store(storeMessage(src)));
    },
    parse(slice) {
        return loadMessage(slice.loadRef().beginParse());
    }
};

},{"../boc/Builder":16,"./CommonMessageInfo":49,"./StateInit":65}],57:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeMessageRelaxed = exports.loadMessageRelaxed = void 0;
const Builder_1 = require("../boc/Builder");
const CommonMessageInfoRelaxed_1 = require("./CommonMessageInfoRelaxed");
const StateInit_1 = require("./StateInit");
function loadMessageRelaxed(slice) {
    const info = (0, CommonMessageInfoRelaxed_1.loadCommonMessageInfoRelaxed)(slice);
    let init = null;
    if (slice.loadBit()) {
        if (!slice.loadBit()) {
            init = (0, StateInit_1.loadStateInit)(slice);
        }
        else {
            init = (0, StateInit_1.loadStateInit)(slice.loadRef().beginParse());
        }
    }
    const body = slice.loadBit() ? slice.loadRef() : slice.asCell();
    return {
        info,
        init,
        body
    };
}
exports.loadMessageRelaxed = loadMessageRelaxed;
function storeMessageRelaxed(message, opts) {
    return (builder) => {
        // Store CommonMsgInfo
        builder.store((0, CommonMessageInfoRelaxed_1.storeCommonMessageInfoRelaxed)(message.info));
        // Store init
        if (message.init) {
            builder.storeBit(true);
            let initCell = (0, Builder_1.beginCell)().store((0, StateInit_1.storeStateInit)(message.init));
            // Check if ref is needed
            let needRef = false;
            if (opts && opts.forceRef) {
                needRef = true;
            }
            else {
                if (builder.availableBits - 2 /* At least on byte for ref flag */ >= initCell.bits) {
                    needRef = false;
                }
                else {
                    needRef = true;
                }
            }
            // Store ref
            if (needRef) {
                builder.storeBit(true);
                builder.storeRef(initCell);
            }
            else {
                builder.storeBit(false);
                builder.storeBuilder(initCell);
            }
        }
        else {
            builder.storeBit(false);
        }
        // Store body
        let needRef = false;
        if (opts && opts.forceRef) {
            needRef = true;
        }
        else {
            if (builder.availableBits - 1 /* At least on byte for ref flag */ >= message.body.bits.length &&
                builder.refs + message.body.refs.length <= 4) {
                needRef = false;
            }
            else {
                needRef = true;
            }
        }
        if (needRef) {
            builder.storeBit(true);
            builder.storeRef(message.body);
        }
        else {
            builder.storeBit(false);
            builder.storeBuilder(message.body.asBuilder());
        }
    };
}
exports.storeMessageRelaxed = storeMessageRelaxed;

},{"../boc/Builder":16,"./CommonMessageInfoRelaxed":50,"./StateInit":65}],58:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMode = void 0;
var SendMode;
(function (SendMode) {
    SendMode[SendMode["CARRY_ALL_REMAINING_BALANCE"] = 128] = "CARRY_ALL_REMAINING_BALANCE";
    SendMode[SendMode["CARRY_ALL_REMAINING_INCOMING_VALUE"] = 64] = "CARRY_ALL_REMAINING_INCOMING_VALUE";
    SendMode[SendMode["DESTROY_ACCOUNT_IF_ZERO"] = 32] = "DESTROY_ACCOUNT_IF_ZERO";
    SendMode[SendMode["PAY_GAS_SEPARATELY"] = 1] = "PAY_GAS_SEPARATELY";
    SendMode[SendMode["IGNORE_ERRORS"] = 2] = "IGNORE_ERRORS";
    SendMode[SendMode["NONE"] = 0] = "NONE";
})(SendMode = exports.SendMode || (exports.SendMode = {}));

},{}],59:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeShardAccount = exports.loadShardAccount = void 0;
const Builder_1 = require("../boc/Builder");
const Account_1 = require("./Account");
function loadShardAccount(slice) {
    let accountRef = slice.loadRef();
    let account = undefined;
    if (!accountRef.isExotic) {
        let accountSlice = accountRef.beginParse();
        if (accountSlice.loadBit()) {
            account = (0, Account_1.loadAccount)(accountSlice);
        }
    }
    return {
        account,
        lastTransactionHash: slice.loadUintBig(256),
        lastTransactionLt: slice.loadUintBig(64)
    };
}
exports.loadShardAccount = loadShardAccount;
function storeShardAccount(src) {
    return (builder) => {
        if (src.account) {
            builder.storeRef((0, Builder_1.beginCell)()
                .storeBit(true)
                .store((0, Account_1.storeAccount)(src.account)));
        }
        else {
            builder.storeRef((0, Builder_1.beginCell)()
                .storeBit(false));
        }
        builder.storeUint(src.lastTransactionHash, 256);
        builder.storeUint(src.lastTransactionLt, 64);
    };
}
exports.storeShardAccount = storeShardAccount;

},{"../boc/Builder":16,"./Account":44}],60:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeShardAccounts = exports.loadShardAccounts = exports.ShardAccountRefValue = void 0;
const Dictionary_1 = require("../dict/Dictionary");
const DepthBalanceInfo_1 = require("./DepthBalanceInfo");
const ShardAccount_1 = require("./ShardAccount");
exports.ShardAccountRefValue = {
    parse: (cs) => {
        let depthBalanceInfo = (0, DepthBalanceInfo_1.loadDepthBalanceInfo)(cs);
        let shardAccount = (0, ShardAccount_1.loadShardAccount)(cs);
        return {
            depthBalanceInfo,
            shardAccount
        };
    },
    serialize(src, builder) {
        builder.store((0, DepthBalanceInfo_1.storeDepthBalanceInfo)(src.depthBalanceInfo));
        builder.store((0, ShardAccount_1.storeShardAccount)(src.shardAccount));
    },
};
function loadShardAccounts(cs) {
    return Dictionary_1.Dictionary.load(Dictionary_1.Dictionary.Keys.BigUint(256), exports.ShardAccountRefValue, cs);
}
exports.loadShardAccounts = loadShardAccounts;
function storeShardAccounts(src) {
    return (Builder) => {
        Builder.storeDict(src);
    };
}
exports.storeShardAccounts = storeShardAccounts;

},{"../dict/Dictionary":35,"./DepthBalanceInfo":53,"./ShardAccount":59}],61:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeShardIdent = exports.loadShardIdent = void 0;
function loadShardIdent(slice) {
    if (slice.loadUint(2) !== 0) {
        throw Error('Invalid data');
    }
    return {
        shardPrefixBits: slice.loadUint(6),
        workchainId: slice.loadInt(32),
        shardPrefix: slice.loadUintBig(64)
    };
}
exports.loadShardIdent = loadShardIdent;
function storeShardIdent(src) {
    return (builder) => {
        builder.storeUint(0, 2);
        builder.storeUint(src.shardPrefixBits, 6);
        builder.storeInt(src.workchainId, 32);
        builder.storeUint(src.shardPrefix, 64);
    };
}
exports.storeShardIdent = storeShardIdent;

},{}],62:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadShardStateUnsplit = void 0;
const MasterchainStateExtra_1 = require("./MasterchainStateExtra");
const ShardAccounts_1 = require("./ShardAccounts");
const ShardIdent_1 = require("./ShardIdent");
function loadShardStateUnsplit(cs) {
    if (cs.loadUint(32) !== 0x9023afe2) {
        throw Error('Invalid data');
    }
    let globalId = cs.loadInt(32);
    let shardId = (0, ShardIdent_1.loadShardIdent)(cs);
    let seqno = cs.loadUint(32);
    let vertSeqNo = cs.loadUint(32);
    let genUtime = cs.loadUint(32);
    let genLt = cs.loadUintBig(64);
    let minRefMcSeqno = cs.loadUint(32);
    // Skip OutMsgQueueInfo: usually exotic
    cs.loadRef();
    let beforeSplit = cs.loadBit();
    // Parse accounts
    let shardAccountsRef = cs.loadRef();
    let accounts = undefined;
    if (!shardAccountsRef.isExotic) {
        accounts = (0, ShardAccounts_1.loadShardAccounts)(shardAccountsRef.beginParse());
    }
    // Skip (not used by apps)
    cs.loadRef();
    // Parse extras
    let mcStateExtra = cs.loadBit();
    let extras = null;
    if (mcStateExtra) {
        let cell = cs.loadRef();
        if (!cell.isExotic) {
            extras = (0, MasterchainStateExtra_1.loadMasterchainStateExtra)(cell.beginParse());
        }
    }
    ;
    return {
        globalId,
        shardId,
        seqno,
        vertSeqNo,
        genUtime,
        genLt,
        minRefMcSeqno,
        beforeSplit,
        accounts,
        extras
    };
}
exports.loadShardStateUnsplit = loadShardStateUnsplit;

},{"./MasterchainStateExtra":55,"./ShardAccounts":60,"./ShardIdent":61}],63:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLibraryValue = exports.storeSimpleLibrary = exports.loadSimpleLibrary = void 0;
function loadSimpleLibrary(slice) {
    return {
        public: slice.loadBit(),
        root: slice.loadRef()
    };
}
exports.loadSimpleLibrary = loadSimpleLibrary;
function storeSimpleLibrary(src) {
    return (builder) => {
        builder.storeBit(src.public);
        builder.storeRef(src.root);
    };
}
exports.storeSimpleLibrary = storeSimpleLibrary;
exports.SimpleLibraryValue = {
    serialize(src, builder) {
        storeSimpleLibrary(src)(builder);
    },
    parse(src) {
        return loadSimpleLibrary(src);
    },
};

},{}],64:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeSplitMergeInfo = exports.loadSplitMergeInfo = void 0;
function loadSplitMergeInfo(slice) {
    let currentShardPrefixLength = slice.loadUint(6);
    let accountSplitDepth = slice.loadUint(6);
    let thisAddress = slice.loadUintBig(256);
    let siblingAddress = slice.loadUintBig(256);
    return {
        currentShardPrefixLength,
        accountSplitDepth,
        thisAddress,
        siblingAddress
    };
}
exports.loadSplitMergeInfo = loadSplitMergeInfo;
function storeSplitMergeInfo(src) {
    return (builder) => {
        builder.storeUint(src.currentShardPrefixLength, 6);
        builder.storeUint(src.accountSplitDepth, 6);
        builder.storeUint(src.thisAddress, 256);
        builder.storeUint(src.siblingAddress, 256);
    };
}
exports.storeSplitMergeInfo = storeSplitMergeInfo;

},{}],65:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeStateInit = exports.loadStateInit = void 0;
const Dictionary_1 = require("../dict/Dictionary");
const SimpleLibrary_1 = require("./SimpleLibrary");
const TickTock_1 = require("./TickTock");
;
function loadStateInit(slice) {
    // Split Depth
    let splitDepth;
    if (slice.loadBit()) {
        splitDepth = slice.loadUint(5);
    }
    // TickTock
    let special;
    if (slice.loadBit()) {
        special = (0, TickTock_1.loadTickTock)(slice);
    }
    // Code and Data
    let code = slice.loadMaybeRef();
    let data = slice.loadMaybeRef();
    // Libs
    let libraries = slice.loadDict(Dictionary_1.Dictionary.Keys.BigUint(256), SimpleLibrary_1.SimpleLibraryValue);
    if (libraries.size === 0) {
        libraries = undefined;
    }
    return {
        splitDepth,
        special,
        code,
        data,
        libraries
    };
}
exports.loadStateInit = loadStateInit;
function storeStateInit(src) {
    return (builder) => {
        if (src.splitDepth !== null && src.splitDepth !== undefined) {
            builder.storeBit(true);
            builder.storeUint(src.splitDepth, 5);
        }
        else {
            builder.storeBit(false);
        }
        if (src.special !== null && src.special !== undefined) {
            builder.storeBit(true);
            builder.store((0, TickTock_1.storeTickTock)(src.special));
        }
        else {
            builder.storeBit(false);
        }
        builder.storeMaybeRef(src.code);
        builder.storeMaybeRef(src.data);
        builder.storeDict(src.libraries);
    };
}
exports.storeStateInit = storeStateInit;

},{"../dict/Dictionary":35,"./SimpleLibrary":63,"./TickTock":69}],66:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeStorageInfo = exports.loadStorageInfo = void 0;
const StorageUsed_1 = require("./StorageUsed");
function loadStorageInfo(slice) {
    return {
        used: (0, StorageUsed_1.loadStorageUsed)(slice),
        lastPaid: slice.loadUint(32),
        duePayment: slice.loadMaybeCoins()
    };
}
exports.loadStorageInfo = loadStorageInfo;
function storeStorageInfo(src) {
    return (builder) => {
        builder.store((0, StorageUsed_1.storeStorageUsed)(src.used));
        builder.storeUint(src.lastPaid, 32);
        builder.storeMaybeCoins(src.duePayment);
    };
}
exports.storeStorageInfo = storeStorageInfo;

},{"./StorageUsed":67}],67:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeStorageUsed = exports.loadStorageUsed = void 0;
function loadStorageUsed(cs) {
    return {
        cells: cs.loadVarUintBig(3),
        bits: cs.loadVarUintBig(3),
        publicCells: cs.loadVarUintBig(3),
    };
}
exports.loadStorageUsed = loadStorageUsed;
function storeStorageUsed(src) {
    return (builder) => {
        builder.storeVarUint(src.cells, 3);
        builder.storeVarUint(src.bits, 3);
        builder.storeVarUint(src.publicCells, 3);
    };
}
exports.storeStorageUsed = storeStorageUsed;

},{}],68:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeStorageUsedShort = exports.loadStorageUsedShort = void 0;
function loadStorageUsedShort(slice) {
    let cells = slice.loadVarUintBig(3);
    let bits = slice.loadVarUintBig(3);
    return {
        cells,
        bits
    };
}
exports.loadStorageUsedShort = loadStorageUsedShort;
function storeStorageUsedShort(src) {
    return (builder) => {
        builder.storeVarUint(src.cells, 3);
        builder.storeVarUint(src.bits, 3);
    };
}
exports.storeStorageUsedShort = storeStorageUsedShort;

},{}],69:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTickTock = exports.loadTickTock = void 0;
function loadTickTock(slice) {
    return {
        tick: slice.loadBit(),
        tock: slice.loadBit()
    };
}
exports.loadTickTock = loadTickTock;
function storeTickTock(src) {
    return (builder) => {
        builder.storeBit(src.tick);
        builder.storeBit(src.tock);
    };
}
exports.storeTickTock = storeTickTock;

},{}],70:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransaction = exports.loadTransaction = void 0;
const Builder_1 = require("../boc/Builder");
const Dictionary_1 = require("../dict/Dictionary");
const AccountStatus_1 = require("./AccountStatus");
const CurrencyCollection_1 = require("./CurrencyCollection");
const HashUpdate_1 = require("./HashUpdate");
const Message_1 = require("./Message");
const TransactionDescription_1 = require("./TransactionDescription");
function loadTransaction(slice) {
    if (slice.loadUint(4) !== 0x07) {
        throw Error('Invalid data');
    }
    let address = slice.loadUintBig(256);
    let lt = slice.loadUintBig(64);
    let prevTransactionHash = slice.loadUintBig(256);
    let prevTransactionLt = slice.loadUintBig(64);
    let now = slice.loadUint(32);
    let outMessagesCount = slice.loadUint(15);
    let oldStatus = (0, AccountStatus_1.loadAccountStatus)(slice);
    let endStatus = (0, AccountStatus_1.loadAccountStatus)(slice);
    let msgRef = slice.loadRef();
    let msgSlice = msgRef.beginParse();
    let inMessage = msgSlice.loadBit() ? (0, Message_1.loadMessage)(msgSlice.loadRef().beginParse()) : undefined;
    let outMessages = msgSlice.loadDict(Dictionary_1.Dictionary.Keys.Uint(15), Message_1.MessageValue);
    msgSlice.endParse();
    let totalFees = (0, CurrencyCollection_1.loadCurrencyCollection)(slice);
    let stateUpdate = (0, HashUpdate_1.loadHashUpdate)(slice.loadRef().beginParse());
    let description = (0, TransactionDescription_1.loadTransactionDescription)(slice.loadRef().beginParse());
    return {
        address,
        lt,
        prevTransactionHash,
        prevTransactionLt,
        now,
        outMessagesCount,
        oldStatus,
        endStatus,
        inMessage,
        outMessages,
        totalFees,
        stateUpdate,
        description,
    };
}
exports.loadTransaction = loadTransaction;
function storeTransaction(src) {
    return (builder) => {
        builder.storeUint(0x07, 4);
        builder.storeUint(src.address, 256);
        builder.storeUint(src.lt, 64);
        builder.storeUint(src.prevTransactionHash, 256);
        builder.storeUint(src.prevTransactionLt, 64);
        builder.storeUint(src.now, 32);
        builder.storeUint(src.outMessagesCount, 15);
        builder.store((0, AccountStatus_1.storeAccountStatus)(src.oldStatus));
        builder.store((0, AccountStatus_1.storeAccountStatus)(src.endStatus));
        let msgBuilder = (0, Builder_1.beginCell)();
        if (src.inMessage) {
            msgBuilder.storeBit(true);
            msgBuilder.storeRef((0, Builder_1.beginCell)().store((0, Message_1.storeMessage)(src.inMessage)));
        }
        else {
            msgBuilder.storeBit(false);
        }
        msgBuilder.storeDict(src.outMessages);
        builder.storeRef(msgBuilder);
        builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(src.totalFees));
        builder.storeRef((0, Builder_1.beginCell)().store((0, HashUpdate_1.storeHashUpdate)(src.stateUpdate)));
        builder.storeRef((0, Builder_1.beginCell)().store((0, TransactionDescription_1.storeTransactionDescription)(src.description)));
    };
}
exports.storeTransaction = storeTransaction;

},{"../boc/Builder":16,"../dict/Dictionary":35,"./AccountStatus":46,"./CurrencyCollection":52,"./HashUpdate":54,"./Message":56,"./TransactionDescription":75}],71:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionActionPhase = exports.loadTransactionActionPhase = void 0;
const AccountStatusChange_1 = require("./AccountStatusChange");
const StorageUsedShort_1 = require("./StorageUsedShort");
function loadTransactionActionPhase(slice) {
    let success = slice.loadBit();
    let valid = slice.loadBit();
    let noFunds = slice.loadBit();
    let statusChange = (0, AccountStatusChange_1.loadAccountStatusChange)(slice);
    let totalFwdFees = slice.loadBit() ? slice.loadCoins() : undefined;
    let totalActionFees = slice.loadBit() ? slice.loadCoins() : undefined;
    let resultCode = slice.loadInt(32);
    let resultArg = slice.loadBit() ? slice.loadInt(32) : undefined;
    let totalActions = slice.loadUint(16);
    let specActions = slice.loadUint(16);
    let skippedActions = slice.loadUint(16);
    let messagesCreated = slice.loadUint(16);
    let actionListHash = slice.loadUintBig(256);
    let totalMessageSize = (0, StorageUsedShort_1.loadStorageUsedShort)(slice);
    return {
        success,
        valid,
        noFunds,
        statusChange,
        totalFwdFees,
        totalActionFees,
        resultCode,
        resultArg,
        totalActions,
        specActions,
        skippedActions,
        messagesCreated,
        actionListHash,
        totalMessageSize
    };
}
exports.loadTransactionActionPhase = loadTransactionActionPhase;
function storeTransactionActionPhase(src) {
    return (builder) => {
        builder.storeBit(src.success);
        builder.storeBit(src.valid);
        builder.storeBit(src.noFunds);
        builder.store((0, AccountStatusChange_1.storeAccountStatusChange)(src.statusChange));
        builder.storeMaybeCoins(src.totalFwdFees);
        builder.storeMaybeCoins(src.totalActionFees);
        builder.storeInt(src.resultCode, 32);
        builder.storeMaybeInt(src.resultArg, 32);
        builder.storeUint(src.totalActions, 16);
        builder.storeUint(src.specActions, 16);
        builder.storeUint(src.skippedActions, 16);
        builder.storeUint(src.messagesCreated, 16);
        builder.storeUint(src.actionListHash, 256);
        builder.store((0, StorageUsedShort_1.storeStorageUsedShort)(src.totalMessageSize));
    };
}
exports.storeTransactionActionPhase = storeTransactionActionPhase;

},{"./AccountStatusChange":47,"./StorageUsedShort":68}],72:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionBouncePhase = exports.loadTransactionBouncePhase = void 0;
const StorageUsedShort_1 = require("./StorageUsedShort");
function loadTransactionBouncePhase(slice) {
    // Ok
    if (slice.loadBit()) {
        let messageSize = (0, StorageUsedShort_1.loadStorageUsedShort)(slice);
        let messageFees = slice.loadCoins();
        let forwardFees = slice.loadCoins();
        return {
            type: "ok",
            messageSize,
            messageFees,
            forwardFees,
        };
    }
    // No funds
    if (slice.loadBit()) {
        let messageSize = (0, StorageUsedShort_1.loadStorageUsedShort)(slice);
        let requiredForwardFees = slice.loadCoins();
        return {
            type: "no-funds",
            messageSize,
            requiredForwardFees,
        };
    }
    // Negative funds
    return {
        type: "negative-funds",
    };
}
exports.loadTransactionBouncePhase = loadTransactionBouncePhase;
function storeTransactionBouncePhase(src) {
    return (builder) => {
        if (src.type === 'ok') {
            builder.storeBit(true);
            builder.store((0, StorageUsedShort_1.storeStorageUsedShort)(src.messageSize));
            builder.storeCoins(src.messageFees);
            builder.storeCoins(src.forwardFees);
        }
        else if (src.type === 'negative-funds') {
            builder.storeBit(false);
            builder.storeBit(false);
        }
        else if (src.type === 'no-funds') {
            builder.storeBit(false);
            builder.storeBit(true);
            builder.store((0, StorageUsedShort_1.storeStorageUsedShort)(src.messageSize));
            builder.storeCoins(src.requiredForwardFees);
        }
        else {
            throw new Error("Invalid TransactionBouncePhase type");
        }
    };
}
exports.storeTransactionBouncePhase = storeTransactionBouncePhase;

},{"./StorageUsedShort":68}],73:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionComputePhase = exports.loadTransactionComputePhase = void 0;
const Builder_1 = require("../boc/Builder");
const ComputeSkipReason_1 = require("./ComputeSkipReason");
function loadTransactionComputePhase(slice) {
    // Skipped
    if (!slice.loadBit()) {
        let reason = (0, ComputeSkipReason_1.loadComputeSkipReason)(slice);
        return {
            type: 'skipped',
            reason
        };
    }
    let success = slice.loadBit();
    let messageStateUsed = slice.loadBit();
    let accountActivated = slice.loadBit();
    let gasFees = slice.loadCoins();
    const vmState = slice.loadRef().beginParse();
    let gasUsed = vmState.loadVarUintBig(3);
    let gasLimit = vmState.loadVarUintBig(3);
    let gasCredit = vmState.loadBit() ? vmState.loadVarUintBig(2) : undefined;
    let mode = vmState.loadUint(8);
    let exitCode = vmState.loadUint(32);
    let exitArg = vmState.loadBit() ? vmState.loadInt(32) : undefined;
    let vmSteps = vmState.loadUint(32);
    let vmInitStateHash = vmState.loadUintBig(256);
    let vmFinalStateHash = vmState.loadUintBig(256);
    return {
        type: 'vm',
        success,
        messageStateUsed,
        accountActivated,
        gasFees,
        gasUsed,
        gasLimit,
        gasCredit,
        mode,
        exitCode,
        exitArg,
        vmSteps,
        vmInitStateHash,
        vmFinalStateHash
    };
}
exports.loadTransactionComputePhase = loadTransactionComputePhase;
function storeTransactionComputePhase(src) {
    return (builder) => {
        if (src.type === 'skipped') {
            builder.storeBit(0);
            builder.store((0, ComputeSkipReason_1.storeComputeSkipReason)(src.reason));
            return;
        }
        builder.storeBit(1);
        builder.storeBit(src.success);
        builder.storeBit(src.messageStateUsed);
        builder.storeBit(src.accountActivated);
        builder.storeCoins(src.gasFees);
        builder.storeRef((0, Builder_1.beginCell)()
            .storeVarUint(src.gasUsed, 3)
            .storeVarUint(src.gasLimit, 3)
            .store((b) => (src.gasCredit !== undefined && src.gasCredit !== null) ? b.storeBit(1).storeVarUint(src.gasCredit, 2) : b.storeBit(0))
            .storeUint(src.mode, 8)
            .storeUint(src.exitCode, 32)
            .store((b) => (src.exitArg !== undefined && src.exitArg !== null) ? b.storeBit(1).storeInt(src.exitArg, 32) : b.storeBit(0))
            .storeUint(src.vmSteps, 32)
            .storeUint(src.vmInitStateHash, 256)
            .storeUint(src.vmFinalStateHash, 256)
            .endCell());
    };
}
exports.storeTransactionComputePhase = storeTransactionComputePhase;

},{"../boc/Builder":16,"./ComputeSkipReason":51}],74:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionCreditPhase = exports.loadTransactionCreditPhase = void 0;
const CurrencyCollection_1 = require("./CurrencyCollection");
function loadTransactionCreditPhase(slice) {
    const dueFeesColelcted = slice.loadBit() ? slice.loadCoins() : undefined;
    const credit = (0, CurrencyCollection_1.loadCurrencyCollection)(slice);
    return {
        dueFeesColelcted,
        credit
    };
}
exports.loadTransactionCreditPhase = loadTransactionCreditPhase;
function storeTransactionCreditPhase(src) {
    return (builder) => {
        if (src.dueFeesColelcted === null || src.dueFeesColelcted === undefined) {
            builder.storeBit(false);
        }
        else {
            builder.storeBit(true);
            builder.storeCoins(src.dueFeesColelcted);
        }
        builder.store((0, CurrencyCollection_1.storeCurrencyCollection)(src.credit));
    };
}
exports.storeTransactionCreditPhase = storeTransactionCreditPhase;

},{"./CurrencyCollection":52}],75:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionDescription = exports.loadTransactionDescription = void 0;
const Builder_1 = require("../boc/Builder");
const SplitMergeInfo_1 = require("./SplitMergeInfo");
const Transaction_1 = require("./Transaction");
const TransactionActionPhase_1 = require("./TransactionActionPhase");
const TransactionBouncePhase_1 = require("./TransactionBouncePhase");
const TransactionComputePhase_1 = require("./TransactionComputePhase");
const TransactionCreditPhase_1 = require("./TransactionCreditPhase");
const TransactionStoragePhase_1 = require("./TransactionStoragePhase");
function loadTransactionDescription(slice) {
    let type = slice.loadUint(4);
    if (type === 0x00) {
        const creditFirst = slice.loadBit();
        let storagePhase = undefined;
        if (slice.loadBit()) {
            storagePhase = (0, TransactionStoragePhase_1.loadTransactionStoragePhase)(slice);
        }
        let creditPhase = undefined;
        if (slice.loadBit()) {
            creditPhase = (0, TransactionCreditPhase_1.loadTransactionCreditPhase)(slice);
        }
        let computePhase = (0, TransactionComputePhase_1.loadTransactionComputePhase)(slice);
        let actionPhase = undefined;
        if (slice.loadBit()) {
            actionPhase = (0, TransactionActionPhase_1.loadTransactionActionPhase)(slice.loadRef().beginParse());
        }
        let aborted = slice.loadBit();
        let bouncePhase = undefined;
        if (slice.loadBit()) {
            bouncePhase = (0, TransactionBouncePhase_1.loadTransactionBouncePhase)(slice);
        }
        const destroyed = slice.loadBit();
        return {
            type: 'generic',
            creditFirst,
            storagePhase,
            creditPhase,
            computePhase,
            actionPhase,
            bouncePhase,
            aborted,
            destroyed
        };
    }
    if (type === 0x01) {
        return {
            type: 'storage',
            storagePhase: (0, TransactionStoragePhase_1.loadTransactionStoragePhase)(slice)
        };
    }
    if (type === 0x2 || type === 0x03) {
        const isTock = type === 0x03;
        let storagePhase = (0, TransactionStoragePhase_1.loadTransactionStoragePhase)(slice);
        let computePhase = (0, TransactionComputePhase_1.loadTransactionComputePhase)(slice);
        let actionPhase = undefined;
        if (slice.loadBit()) {
            actionPhase = (0, TransactionActionPhase_1.loadTransactionActionPhase)(slice.loadRef().beginParse());
        }
        const aborted = slice.loadBit();
        const destroyed = slice.loadBit();
        return {
            type: 'tick-tock',
            isTock,
            storagePhase,
            computePhase,
            actionPhase,
            aborted,
            destroyed
        };
    }
    if (type === 0x04) {
        let splitInfo = (0, SplitMergeInfo_1.loadSplitMergeInfo)(slice);
        let storagePhase = undefined;
        if (slice.loadBit()) {
            storagePhase = (0, TransactionStoragePhase_1.loadTransactionStoragePhase)(slice);
        }
        let computePhase = (0, TransactionComputePhase_1.loadTransactionComputePhase)(slice);
        let actionPhase = undefined;
        if (slice.loadBit()) {
            actionPhase = (0, TransactionActionPhase_1.loadTransactionActionPhase)(slice.loadRef().beginParse());
        }
        const aborted = slice.loadBit();
        const destroyed = slice.loadBit();
        return {
            type: 'split-prepare',
            splitInfo,
            storagePhase,
            computePhase,
            actionPhase,
            aborted,
            destroyed
        };
    }
    if (type === 0x05) {
        let splitInfo = (0, SplitMergeInfo_1.loadSplitMergeInfo)(slice);
        let prepareTransaction = (0, Transaction_1.loadTransaction)(slice.loadRef().beginParse());
        const installed = slice.loadBit();
        return {
            type: 'split-install',
            splitInfo,
            prepareTransaction,
            installed
        };
    }
    throw Error(`Unsupported transaction description type ${type}`);
}
exports.loadTransactionDescription = loadTransactionDescription;
function storeTransactionDescription(src) {
    return (builder) => {
        if (src.type === 'generic') {
            builder.storeUint(0x00, 4);
            builder.storeBit(src.creditFirst);
            if (src.storagePhase) {
                builder.storeBit(true);
                builder.store((0, TransactionStoragePhase_1.storeTransactionsStoragePhase)(src.storagePhase));
            }
            else {
                builder.storeBit(false);
            }
            if (src.creditPhase) {
                builder.storeBit(true);
                builder.store((0, TransactionCreditPhase_1.storeTransactionCreditPhase)(src.creditPhase));
            }
            else {
                builder.storeBit(false);
            }
            builder.store((0, TransactionComputePhase_1.storeTransactionComputePhase)(src.computePhase));
            if (src.actionPhase) {
                builder.storeBit(true);
                builder.storeRef((0, Builder_1.beginCell)().store((0, TransactionActionPhase_1.storeTransactionActionPhase)(src.actionPhase)));
            }
            else {
                builder.storeBit(false);
            }
            builder.storeBit(src.aborted);
            if (src.bouncePhase) {
                builder.storeBit(true);
                builder.store((0, TransactionBouncePhase_1.storeTransactionBouncePhase)(src.bouncePhase));
            }
            else {
                builder.storeBit(false);
            }
            builder.storeBit(src.destroyed);
        }
        else if (src.type === 'storage') {
            builder.storeUint(0x01, 4);
            builder.store((0, TransactionStoragePhase_1.storeTransactionsStoragePhase)(src.storagePhase));
        }
        else if (src.type === 'tick-tock') {
            builder.storeUint(src.isTock ? 0x03 : 0x02, 4);
            builder.store((0, TransactionStoragePhase_1.storeTransactionsStoragePhase)(src.storagePhase));
            builder.store((0, TransactionComputePhase_1.storeTransactionComputePhase)(src.computePhase));
            if (src.actionPhase) {
                builder.storeBit(true);
                builder.storeRef((0, Builder_1.beginCell)().store((0, TransactionActionPhase_1.storeTransactionActionPhase)(src.actionPhase)));
            }
            else {
                builder.storeBit(false);
            }
            builder.storeBit(src.aborted);
            builder.storeBit(src.destroyed);
        }
        else if (src.type === 'split-prepare') {
            builder.storeUint(0x04, 4);
            builder.store((0, SplitMergeInfo_1.storeSplitMergeInfo)(src.splitInfo));
            if (src.storagePhase) {
                builder.storeBit(true);
                builder.store((0, TransactionStoragePhase_1.storeTransactionsStoragePhase)(src.storagePhase));
            }
            else {
                builder.storeBit(false);
            }
            builder.store((0, TransactionComputePhase_1.storeTransactionComputePhase)(src.computePhase));
            if (src.actionPhase) {
                builder.storeBit(true);
                builder.store((0, TransactionActionPhase_1.storeTransactionActionPhase)(src.actionPhase));
            }
            else {
                builder.storeBit(false);
            }
            builder.storeBit(src.aborted);
            builder.storeBit(src.destroyed);
        }
        else if (src.type === 'split-install') {
            builder.storeUint(0x05, 4);
            builder.store((0, SplitMergeInfo_1.storeSplitMergeInfo)(src.splitInfo));
            builder.storeRef((0, Builder_1.beginCell)().store((0, Transaction_1.storeTransaction)(src.prepareTransaction)));
            builder.storeBit(src.installed);
        }
        else {
            throw Error(`Unsupported transaction description type ${src.type}`);
        }
    };
}
exports.storeTransactionDescription = storeTransactionDescription;

},{"../boc/Builder":16,"./SplitMergeInfo":64,"./Transaction":70,"./TransactionActionPhase":71,"./TransactionBouncePhase":72,"./TransactionComputePhase":73,"./TransactionCreditPhase":74,"./TransactionStoragePhase":76}],76:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeTransactionsStoragePhase = exports.loadTransactionStoragePhase = void 0;
const AccountStatusChange_1 = require("./AccountStatusChange");
function loadTransactionStoragePhase(slice) {
    const storageFeesCollected = slice.loadCoins();
    let storageFeesDue = undefined;
    if (slice.loadBit()) {
        storageFeesDue = slice.loadCoins();
    }
    const statusChange = (0, AccountStatusChange_1.loadAccountStatusChange)(slice);
    return {
        storageFeesCollected,
        storageFeesDue,
        statusChange
    };
}
exports.loadTransactionStoragePhase = loadTransactionStoragePhase;
function storeTransactionsStoragePhase(src) {
    return (builder) => {
        builder.storeCoins(src.storageFeesCollected);
        if (src.storageFeesDue === null || src.storageFeesDue === undefined) {
            builder.storeBit(false);
        }
        else {
            builder.storeBit(true);
            builder.storeCoins(src.storageFeesDue);
        }
        builder.store((0, AccountStatusChange_1.storeAccountStatusChange)(src.statusChange));
    };
}
exports.storeTransactionsStoragePhase = storeTransactionsStoragePhase;

},{"./AccountStatusChange":47}],77:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStorageUsedShort = exports.storeStorageUsed = exports.loadStorageUsed = exports.storeStorageInfo = exports.loadStorageInfo = exports.storeStateInit = exports.loadStateInit = exports.storeSplitMergeInfo = exports.loadSplitMergeInfo = exports.storeSimpleLibrary = exports.loadSimpleLibrary = exports.loadShardStateUnsplit = exports.storeShardIdent = exports.loadShardIdent = exports.storeShardAccounts = exports.loadShardAccounts = exports.ShardAccountRefValue = exports.storeShardAccount = exports.loadShardAccount = exports.SendMode = exports.storeMessageRelaxed = exports.loadMessageRelaxed = exports.storeMessage = exports.loadMessage = exports.loadMasterchainStateExtra = exports.storeHashUpdate = exports.loadHashUpdate = exports.storeDepthBalanceInfo = exports.loadDepthBalanceInfo = exports.storeCurrencyCollection = exports.loadCurrencyCollection = exports.storeComputeSkipReason = exports.loadComputeSkipReason = exports.storeCommonMessageInfoRelaxed = exports.loadCommonMessageInfoRelaxed = exports.storeCommonMessageInfo = exports.loadCommonMessageInfo = exports.storeAccountStorage = exports.loadAccountStorage = exports.storeAccountStatusChange = exports.loadAccountStatusChange = exports.storeAccountStatus = exports.loadAccountStatus = exports.storeAccountState = exports.loadAccountState = exports.storeAccount = exports.loadAccount = exports.comment = exports.external = exports.internal = void 0;
exports.storeTransactionsStoragePhase = exports.loadTransactionStoragePhase = exports.storeTransactionDescription = exports.loadTransactionDescription = exports.storeTransactionCreditPhase = exports.loadTransactionCreditPhase = exports.storeTransactionComputePhase = exports.loadTransactionComputePhase = exports.storeTransactionBouncePhase = exports.loadTransactionBouncePhase = exports.storeTransactionActionPhase = exports.loadTransactionActionPhase = exports.storeTransaction = exports.loadTransaction = exports.storeTickTock = exports.loadTickTock = exports.storeStorageUsedShort = void 0;
var _helpers_1 = require("./_helpers");
Object.defineProperty(exports, "internal", { enumerable: true, get: function () { return _helpers_1.internal; } });
Object.defineProperty(exports, "external", { enumerable: true, get: function () { return _helpers_1.external; } });
Object.defineProperty(exports, "comment", { enumerable: true, get: function () { return _helpers_1.comment; } });
var Account_1 = require("./Account");
Object.defineProperty(exports, "loadAccount", { enumerable: true, get: function () { return Account_1.loadAccount; } });
Object.defineProperty(exports, "storeAccount", { enumerable: true, get: function () { return Account_1.storeAccount; } });
var AccountState_1 = require("./AccountState");
Object.defineProperty(exports, "loadAccountState", { enumerable: true, get: function () { return AccountState_1.loadAccountState; } });
Object.defineProperty(exports, "storeAccountState", { enumerable: true, get: function () { return AccountState_1.storeAccountState; } });
var AccountStatus_1 = require("./AccountStatus");
Object.defineProperty(exports, "loadAccountStatus", { enumerable: true, get: function () { return AccountStatus_1.loadAccountStatus; } });
Object.defineProperty(exports, "storeAccountStatus", { enumerable: true, get: function () { return AccountStatus_1.storeAccountStatus; } });
var AccountStatusChange_1 = require("./AccountStatusChange");
Object.defineProperty(exports, "loadAccountStatusChange", { enumerable: true, get: function () { return AccountStatusChange_1.loadAccountStatusChange; } });
Object.defineProperty(exports, "storeAccountStatusChange", { enumerable: true, get: function () { return AccountStatusChange_1.storeAccountStatusChange; } });
var AccountStorage_1 = require("./AccountStorage");
Object.defineProperty(exports, "loadAccountStorage", { enumerable: true, get: function () { return AccountStorage_1.loadAccountStorage; } });
Object.defineProperty(exports, "storeAccountStorage", { enumerable: true, get: function () { return AccountStorage_1.storeAccountStorage; } });
var CommonMessageInfo_1 = require("./CommonMessageInfo");
Object.defineProperty(exports, "loadCommonMessageInfo", { enumerable: true, get: function () { return CommonMessageInfo_1.loadCommonMessageInfo; } });
Object.defineProperty(exports, "storeCommonMessageInfo", { enumerable: true, get: function () { return CommonMessageInfo_1.storeCommonMessageInfo; } });
var CommonMessageInfoRelaxed_1 = require("./CommonMessageInfoRelaxed");
Object.defineProperty(exports, "loadCommonMessageInfoRelaxed", { enumerable: true, get: function () { return CommonMessageInfoRelaxed_1.loadCommonMessageInfoRelaxed; } });
Object.defineProperty(exports, "storeCommonMessageInfoRelaxed", { enumerable: true, get: function () { return CommonMessageInfoRelaxed_1.storeCommonMessageInfoRelaxed; } });
var ComputeSkipReason_1 = require("./ComputeSkipReason");
Object.defineProperty(exports, "loadComputeSkipReason", { enumerable: true, get: function () { return ComputeSkipReason_1.loadComputeSkipReason; } });
Object.defineProperty(exports, "storeComputeSkipReason", { enumerable: true, get: function () { return ComputeSkipReason_1.storeComputeSkipReason; } });
var CurrencyCollection_1 = require("./CurrencyCollection");
Object.defineProperty(exports, "loadCurrencyCollection", { enumerable: true, get: function () { return CurrencyCollection_1.loadCurrencyCollection; } });
Object.defineProperty(exports, "storeCurrencyCollection", { enumerable: true, get: function () { return CurrencyCollection_1.storeCurrencyCollection; } });
var DepthBalanceInfo_1 = require("./DepthBalanceInfo");
Object.defineProperty(exports, "loadDepthBalanceInfo", { enumerable: true, get: function () { return DepthBalanceInfo_1.loadDepthBalanceInfo; } });
Object.defineProperty(exports, "storeDepthBalanceInfo", { enumerable: true, get: function () { return DepthBalanceInfo_1.storeDepthBalanceInfo; } });
var HashUpdate_1 = require("./HashUpdate");
Object.defineProperty(exports, "loadHashUpdate", { enumerable: true, get: function () { return HashUpdate_1.loadHashUpdate; } });
Object.defineProperty(exports, "storeHashUpdate", { enumerable: true, get: function () { return HashUpdate_1.storeHashUpdate; } });
var MasterchainStateExtra_1 = require("./MasterchainStateExtra");
Object.defineProperty(exports, "loadMasterchainStateExtra", { enumerable: true, get: function () { return MasterchainStateExtra_1.loadMasterchainStateExtra; } });
var Message_1 = require("./Message");
Object.defineProperty(exports, "loadMessage", { enumerable: true, get: function () { return Message_1.loadMessage; } });
Object.defineProperty(exports, "storeMessage", { enumerable: true, get: function () { return Message_1.storeMessage; } });
var MessageRelaxed_1 = require("./MessageRelaxed");
Object.defineProperty(exports, "loadMessageRelaxed", { enumerable: true, get: function () { return MessageRelaxed_1.loadMessageRelaxed; } });
Object.defineProperty(exports, "storeMessageRelaxed", { enumerable: true, get: function () { return MessageRelaxed_1.storeMessageRelaxed; } });
var SendMode_1 = require("./SendMode");
Object.defineProperty(exports, "SendMode", { enumerable: true, get: function () { return SendMode_1.SendMode; } });
var ShardAccount_1 = require("./ShardAccount");
Object.defineProperty(exports, "loadShardAccount", { enumerable: true, get: function () { return ShardAccount_1.loadShardAccount; } });
Object.defineProperty(exports, "storeShardAccount", { enumerable: true, get: function () { return ShardAccount_1.storeShardAccount; } });
var ShardAccounts_1 = require("./ShardAccounts");
Object.defineProperty(exports, "ShardAccountRefValue", { enumerable: true, get: function () { return ShardAccounts_1.ShardAccountRefValue; } });
Object.defineProperty(exports, "loadShardAccounts", { enumerable: true, get: function () { return ShardAccounts_1.loadShardAccounts; } });
Object.defineProperty(exports, "storeShardAccounts", { enumerable: true, get: function () { return ShardAccounts_1.storeShardAccounts; } });
var ShardIdent_1 = require("./ShardIdent");
Object.defineProperty(exports, "loadShardIdent", { enumerable: true, get: function () { return ShardIdent_1.loadShardIdent; } });
Object.defineProperty(exports, "storeShardIdent", { enumerable: true, get: function () { return ShardIdent_1.storeShardIdent; } });
var ShardStateUnsplit_1 = require("./ShardStateUnsplit");
Object.defineProperty(exports, "loadShardStateUnsplit", { enumerable: true, get: function () { return ShardStateUnsplit_1.loadShardStateUnsplit; } });
var SimpleLibrary_1 = require("./SimpleLibrary");
Object.defineProperty(exports, "loadSimpleLibrary", { enumerable: true, get: function () { return SimpleLibrary_1.loadSimpleLibrary; } });
Object.defineProperty(exports, "storeSimpleLibrary", { enumerable: true, get: function () { return SimpleLibrary_1.storeSimpleLibrary; } });
var SplitMergeInfo_1 = require("./SplitMergeInfo");
Object.defineProperty(exports, "loadSplitMergeInfo", { enumerable: true, get: function () { return SplitMergeInfo_1.loadSplitMergeInfo; } });
Object.defineProperty(exports, "storeSplitMergeInfo", { enumerable: true, get: function () { return SplitMergeInfo_1.storeSplitMergeInfo; } });
var StateInit_1 = require("./StateInit");
Object.defineProperty(exports, "loadStateInit", { enumerable: true, get: function () { return StateInit_1.loadStateInit; } });
Object.defineProperty(exports, "storeStateInit", { enumerable: true, get: function () { return StateInit_1.storeStateInit; } });
var StorageInto_1 = require("./StorageInto");
Object.defineProperty(exports, "loadStorageInfo", { enumerable: true, get: function () { return StorageInto_1.loadStorageInfo; } });
Object.defineProperty(exports, "storeStorageInfo", { enumerable: true, get: function () { return StorageInto_1.storeStorageInfo; } });
var StorageUsed_1 = require("./StorageUsed");
Object.defineProperty(exports, "loadStorageUsed", { enumerable: true, get: function () { return StorageUsed_1.loadStorageUsed; } });
Object.defineProperty(exports, "storeStorageUsed", { enumerable: true, get: function () { return StorageUsed_1.storeStorageUsed; } });
var StorageUsedShort_1 = require("./StorageUsedShort");
Object.defineProperty(exports, "loadStorageUsedShort", { enumerable: true, get: function () { return StorageUsedShort_1.loadStorageUsedShort; } });
Object.defineProperty(exports, "storeStorageUsedShort", { enumerable: true, get: function () { return StorageUsedShort_1.storeStorageUsedShort; } });
var TickTock_1 = require("./TickTock");
Object.defineProperty(exports, "loadTickTock", { enumerable: true, get: function () { return TickTock_1.loadTickTock; } });
Object.defineProperty(exports, "storeTickTock", { enumerable: true, get: function () { return TickTock_1.storeTickTock; } });
var Transaction_1 = require("./Transaction");
Object.defineProperty(exports, "loadTransaction", { enumerable: true, get: function () { return Transaction_1.loadTransaction; } });
Object.defineProperty(exports, "storeTransaction", { enumerable: true, get: function () { return Transaction_1.storeTransaction; } });
var TransactionActionPhase_1 = require("./TransactionActionPhase");
Object.defineProperty(exports, "loadTransactionActionPhase", { enumerable: true, get: function () { return TransactionActionPhase_1.loadTransactionActionPhase; } });
Object.defineProperty(exports, "storeTransactionActionPhase", { enumerable: true, get: function () { return TransactionActionPhase_1.storeTransactionActionPhase; } });
var TransactionBouncePhase_1 = require("./TransactionBouncePhase");
Object.defineProperty(exports, "loadTransactionBouncePhase", { enumerable: true, get: function () { return TransactionBouncePhase_1.loadTransactionBouncePhase; } });
Object.defineProperty(exports, "storeTransactionBouncePhase", { enumerable: true, get: function () { return TransactionBouncePhase_1.storeTransactionBouncePhase; } });
var TransactionComputePhase_1 = require("./TransactionComputePhase");
Object.defineProperty(exports, "loadTransactionComputePhase", { enumerable: true, get: function () { return TransactionComputePhase_1.loadTransactionComputePhase; } });
Object.defineProperty(exports, "storeTransactionComputePhase", { enumerable: true, get: function () { return TransactionComputePhase_1.storeTransactionComputePhase; } });
var TransactionCreditPhase_1 = require("./TransactionCreditPhase");
Object.defineProperty(exports, "loadTransactionCreditPhase", { enumerable: true, get: function () { return TransactionCreditPhase_1.loadTransactionCreditPhase; } });
Object.defineProperty(exports, "storeTransactionCreditPhase", { enumerable: true, get: function () { return TransactionCreditPhase_1.storeTransactionCreditPhase; } });
var TransactionDescription_1 = require("./TransactionDescription");
Object.defineProperty(exports, "loadTransactionDescription", { enumerable: true, get: function () { return TransactionDescription_1.loadTransactionDescription; } });
Object.defineProperty(exports, "storeTransactionDescription", { enumerable: true, get: function () { return TransactionDescription_1.storeTransactionDescription; } });
var TransactionStoragePhase_1 = require("./TransactionStoragePhase");
Object.defineProperty(exports, "loadTransactionStoragePhase", { enumerable: true, get: function () { return TransactionStoragePhase_1.loadTransactionStoragePhase; } });
Object.defineProperty(exports, "storeTransactionsStoragePhase", { enumerable: true, get: function () { return TransactionStoragePhase_1.storeTransactionsStoragePhase; } });

},{"./Account":44,"./AccountState":45,"./AccountStatus":46,"./AccountStatusChange":47,"./AccountStorage":48,"./CommonMessageInfo":49,"./CommonMessageInfoRelaxed":50,"./ComputeSkipReason":51,"./CurrencyCollection":52,"./DepthBalanceInfo":53,"./HashUpdate":54,"./MasterchainStateExtra":55,"./Message":56,"./MessageRelaxed":57,"./SendMode":58,"./ShardAccount":59,"./ShardAccounts":60,"./ShardIdent":61,"./ShardStateUnsplit":62,"./SimpleLibrary":63,"./SplitMergeInfo":64,"./StateInit":65,"./StorageInto":66,"./StorageUsed":67,"./StorageUsedShort":68,"./TickTock":69,"./Transaction":70,"./TransactionActionPhase":71,"./TransactionBouncePhase":72,"./TransactionComputePhase":73,"./TransactionCreditPhase":74,"./TransactionDescription":75,"./TransactionStoragePhase":76,"./_helpers":78}],78:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.comment = exports.external = exports.internal = void 0;
const Address_1 = require("../address/Address");
const Cell_1 = require("../boc/Cell");
const Builder_1 = require("../boc/Builder");
const convert_1 = require("../utils/convert");
function internal(src) {
    // Resolve bounce
    let bounce = true;
    if (src.bounce !== null && src.bounce !== undefined) {
        bounce = src.bounce;
    }
    // Resolve address
    let to;
    if (typeof src.to === 'string') {
        to = Address_1.Address.parse(src.to);
    }
    else if (Address_1.Address.isAddress(src.to)) {
        to = src.to;
    }
    else {
        throw new Error(`Invalid address ${src.to}`);
    }
    // Resolve value
    let value;
    if (typeof src.value === 'string') {
        value = (0, convert_1.toNano)(src.value);
    }
    else {
        value = src.value;
    }
    // Resolve body
    let body = Cell_1.Cell.EMPTY;
    if (typeof src.body === 'string') {
        body = (0, Builder_1.beginCell)().storeUint(0, 32).storeStringTail(src.body).endCell();
    }
    else if (src.body) {
        body = src.body;
    }
    // Create message
    return {
        info: {
            type: 'internal',
            dest: to,
            value: { coins: value },
            bounce,
            ihrDisabled: true,
            bounced: false,
            ihrFee: 0n,
            forwardFee: 0n,
            createdAt: 0,
            createdLt: 0n
        },
        init: src.init ? { code: src.init.code, data: src.init.data } : undefined,
        body: body
    };
}
exports.internal = internal;
function external(src) {
    // Resolve address
    let to;
    if (typeof src.to === 'string') {
        to = Address_1.Address.parse(src.to);
    }
    else if (Address_1.Address.isAddress(src.to)) {
        to = src.to;
    }
    else {
        throw new Error(`Invalid address ${src.to}`);
    }
    return {
        info: {
            type: 'external-in',
            dest: to,
            importFee: 0n
        },
        init: src.init ? { code: src.init.code, data: src.init.data } : undefined,
        body: src.body || Cell_1.Cell.EMPTY
    };
}
exports.external = external;
function comment(src) {
    return (0, Builder_1.beginCell)()
        .storeUint(0, 32)
        .storeStringTail(src)
        .endCell();
}
exports.comment = comment;

},{"../address/Address":10,"../boc/Builder":16,"../boc/Cell":17,"../utils/convert":81}],79:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.base32Decode = exports.base32Encode = void 0;
const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
function base32Encode(buffer) {
    const length = buffer.byteLength;
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
}
exports.base32Encode = base32Encode;
function readChar(alphabet, char) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
        throw new Error('Invalid character found: ' + char);
    }
    return idx;
}
function base32Decode(input) {
    let cleanedInput;
    cleanedInput = input.toLowerCase();
    const { length } = cleanedInput;
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(((length * 5) / 8) | 0);
    for (let i = 0; i < length; i++) {
        value = (value << 5) | readChar(alphabet, cleanedInput[i]);
        bits += 5;
        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return output;
}
exports.base32Decode = base32Decode;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],80:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitsForNumber = void 0;
function bitsForNumber(src, mode) {
    let v = BigInt(src);
    // Handle negative values
    if (mode === 'int') {
        // Corner case for zero or -1 value
        if (v === 0n || v === -1n) {
            return 1;
        }
        let v2 = v > 0 ? v : -v;
        return (v2.toString(2).length + 1 /* Sign bit */);
    }
    else if (mode === 'uint') {
        if (v < 0) {
            throw Error(`value is negative. Got ${src}`);
        }
        return (v.toString(2).length);
    }
    else {
        throw Error(`invalid mode. Got ${mode}`);
    }
}
exports.bitsForNumber = bitsForNumber;

},{}],81:[function(require,module,exports){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromNano = exports.toNano = void 0;
function toNano(src) {
    if (typeof src === 'bigint') {
        return src * 1000000000n;
    }
    else if (typeof src === 'number') {
        return BigInt(src) * 1000000000n;
    }
    else {
        // Check sign
        let neg = false;
        while (src.startsWith('-')) {
            neg = !neg;
            src = src.slice(1);
        }
        // Split string
        if (src === '.') {
            throw Error('Invalid number');
        }
        let parts = src.split('.');
        if (parts.length > 2) {
            throw Error('Invalid number');
        }
        // Prepare parts
        let whole = parts[0];
        let frac = parts[1];
        if (!whole) {
            whole = '0';
        }
        if (!frac) {
            frac = '0';
        }
        if (frac.length > 9) {
            throw Error('Invalid number');
        }
        while (frac.length < 9) {
            frac += '0';
        }
        // Convert
        let r = BigInt(whole) * 1000000000n + BigInt(frac);
        if (neg) {
            r = -r;
        }
        return r;
    }
}
exports.toNano = toNano;
function fromNano(src) {
    let v = BigInt(src);
    let neg = false;
    if (v < 0) {
        neg = true;
        v = -v;
    }
    // Convert fraction
    let frac = v % 1000000000n;
    let facStr = frac.toString();
    while (facStr.length < 9) {
        facStr = '0' + facStr;
    }
    facStr = facStr.match(/^([0-9]*[1-9]|0)(0*)/)[1];
    // Convert whole
    let whole = v / 1000000000n;
    let wholeStr = whole.toString();
    // Value
    let value = `${wholeStr}${facStr === '0' ? '' : `.${facStr}`}`;
    if (neg) {
        value = '-' + value;
    }
    return value;
}
exports.fromNano = fromNano;

},{}],82:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crc16 = void 0;
function crc16(data) {
    const poly = 0x1021;
    let reg = 0;
    const message = Buffer.alloc(data.length + 2);
    message.set(data);
    for (let byte of message) {
        let mask = 0x80;
        while (mask > 0) {
            reg <<= 1;
            if (byte & mask) {
                reg += 1;
            }
            mask >>= 1;
            if (reg > 0xffff) {
                reg &= 0xffff;
                reg ^= poly;
            }
        }
    }
    return Buffer.from([Math.floor(reg / 256), reg % 256]);
}
exports.crc16 = crc16;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],83:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crc32c = void 0;
const POLY = 0x82f63b78;
function crc32c(source) {
    let crc = 0 ^ 0xffffffff;
    for (let n = 0; n < source.length; n++) {
        crc ^= source[n];
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
        crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
    }
    crc = crc ^ 0xffffffff;
    // Convert endianness
    let res = Buffer.alloc(4);
    res.writeInt32LE(crc);
    return res;
}
exports.crc32c = crc32c;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],84:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMethodId = void 0;
const TABLE = new Int16Array([
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
    0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
    0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
    0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
    0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
    0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
    0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
    0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
    0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
    0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
    0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
    0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
    0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
    0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
    0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
    0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
    0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
    0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
    0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
    0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
    0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
    0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
]);
function crc16(data) {
    if (!(data instanceof Buffer)) {
        data = Buffer.from(data);
    }
    let crc = 0;
    for (let index = 0; index < data.length; index++) {
        const byte = data[index];
        crc = (TABLE[((crc >> 8) ^ byte) & 0xff] ^ (crc << 8)) & 0xffff;
    }
    return crc;
}
function getMethodId(name) {
    return (crc16(name) & 0xffff) | 0x10000;
}
exports.getMethodId = getMethodId;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],85:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512 = exports.sha256 = exports.pbkdf2_sha512 = exports.hmac_sha512 = exports.getSecureRandomWords = exports.getSecureRandomBytes = void 0;
var getSecureRandom_1 = require("./browser/getSecureRandom");
Object.defineProperty(exports, "getSecureRandomBytes", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomBytes; } });
Object.defineProperty(exports, "getSecureRandomWords", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomWords; } });
var hmac_sha512_1 = require("./browser/hmac_sha512");
Object.defineProperty(exports, "hmac_sha512", { enumerable: true, get: function () { return hmac_sha512_1.hmac_sha512; } });
var pbkdf2_sha512_1 = require("./browser/pbkdf2_sha512");
Object.defineProperty(exports, "pbkdf2_sha512", { enumerable: true, get: function () { return pbkdf2_sha512_1.pbkdf2_sha512; } });
var sha256_1 = require("./browser/sha256");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha256_1.sha256; } });
var sha512_1 = require("./browser/sha512");
Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return sha512_1.sha512; } });

},{"./browser/getSecureRandom":86,"./browser/hmac_sha512":87,"./browser/pbkdf2_sha512":88,"./browser/sha256":89,"./browser/sha512":90}],86:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecureRandomWords = exports.getSecureRandomBytes = void 0;
function getSecureRandomBytes(size) {
    return Buffer.from(window.crypto.getRandomValues(new Uint8Array(size)));
}
exports.getSecureRandomBytes = getSecureRandomBytes;
function getSecureRandomWords(size) {
    return window.crypto.getRandomValues(new Uint16Array(size));
}
exports.getSecureRandomWords = getSecureRandomWords;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],87:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac_sha512 = void 0;
async function hmac_sha512(key, data) {
    let keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    let dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const hmacAlgo = { name: "HMAC", hash: "SHA-512" };
    const hmacKey = await window.crypto.subtle.importKey("raw", keyBuffer, hmacAlgo, false, ["sign"]);
    return Buffer.from(await crypto.subtle.sign(hmacAlgo, hmacKey, dataBuffer));
}
exports.hmac_sha512 = hmac_sha512;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],88:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2_sha512 = void 0;
async function pbkdf2_sha512(key, salt, iterations, keyLen) {
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'utf-8') : salt;
    const pbkdf2_key = await window.crypto.subtle.importKey("raw", keyBuffer, { name: "PBKDF2" }, false, ["deriveBits"]);
    const derivedBits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-512", salt: saltBuffer, iterations: iterations }, pbkdf2_key, keyLen * 8);
    return Buffer.from(derivedBits);
}
exports.pbkdf2_sha512 = pbkdf2_sha512;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],89:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = void 0;
async function sha256(source) {
    if (typeof source === 'string') {
        return Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from(source, 'utf-8')));
    }
    return Buffer.from(await crypto.subtle.digest("SHA-256", source));
}
exports.sha256 = sha256;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],90:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512 = void 0;
async function sha512(source) {
    if (typeof source === 'string') {
        return Buffer.from(await crypto.subtle.digest("SHA-512", Buffer.from(source, 'utf-8')));
    }
    return Buffer.from(await crypto.subtle.digest("SHA-512", source));
}
exports.sha512 = sha512;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],91:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveEd25519Path = exports.deriveED25519HardenedKey = exports.getED25519MasterKeyFromSeed = void 0;
const hmac_sha512_1 = require("../primitives/hmac_sha512");
const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;
async function getED25519MasterKeyFromSeed(seed) {
    const I = await (0, hmac_sha512_1.hmac_sha512)(ED25519_CURVE, seed);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.getED25519MasterKeyFromSeed = getED25519MasterKeyFromSeed;
;
async function deriveED25519HardenedKey(parent, index) {
    if (index >= HARDENED_OFFSET) {
        throw Error('Key index must be less than offset');
    }
    // Key Derive Path: 0x00 + parent.key + index;
    const indexBuffer = Buffer.alloc(4);
    indexBuffer.writeUInt32BE(index + HARDENED_OFFSET, 0);
    const data = Buffer.concat([Buffer.alloc(1, 0), parent.key, indexBuffer]);
    // Derive key
    const I = await (0, hmac_sha512_1.hmac_sha512)(parent.chainCode, data);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.deriveED25519HardenedKey = deriveED25519HardenedKey;
;
async function deriveEd25519Path(seed, path) {
    let state = await getED25519MasterKeyFromSeed(seed);
    let remaining = [...path];
    while (remaining.length > 0) {
        let index = remaining[0];
        remaining = remaining.slice(1);
        state = await deriveED25519HardenedKey(state, index);
    }
    return state.key;
}
exports.deriveEd25519Path = deriveEd25519Path;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../primitives/hmac_sha512":101,"buffer":3}],92:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveMnemonicsPath = exports.deriveMnemonicHardenedKey = exports.getMnemonicsMasterKeyFromSeed = void 0;
const mnemonic_1 = require("../mnemonic/mnemonic");
const hmac_sha512_1 = require("../primitives/hmac_sha512");
const HARDENED_OFFSET = 0x80000000;
const MNEMONICS_SEED = 'TON Mnemonics HD seed';
async function getMnemonicsMasterKeyFromSeed(seed) {
    const I = await (0, hmac_sha512_1.hmac_sha512)(MNEMONICS_SEED, seed);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.getMnemonicsMasterKeyFromSeed = getMnemonicsMasterKeyFromSeed;
;
async function deriveMnemonicHardenedKey(parent, index) {
    if (index >= HARDENED_OFFSET) {
        throw Error('Key index must be less than offset');
    }
    // Key Derive Path: 0x00 + parent.key + index;
    const indexBuffer = Buffer.alloc(4);
    indexBuffer.writeUInt32BE(index + HARDENED_OFFSET, 0);
    const data = Buffer.concat([Buffer.alloc(1, 0), parent.key, indexBuffer]);
    // Derive key
    const I = await (0, hmac_sha512_1.hmac_sha512)(parent.chainCode, data);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.deriveMnemonicHardenedKey = deriveMnemonicHardenedKey;
async function deriveMnemonicsPath(seed, path, wordsCount = 24, password) {
    let state = await getMnemonicsMasterKeyFromSeed(seed);
    let remaining = [...path];
    while (remaining.length > 0) {
        let index = remaining[0];
        remaining = remaining.slice(1);
        state = await deriveMnemonicHardenedKey(state, index);
    }
    return await (0, mnemonic_1.mnemonicFromRandomSeed)(state.key, wordsCount, password);
}
exports.deriveMnemonicsPath = deriveMnemonicsPath;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../mnemonic/mnemonic":95,"../primitives/hmac_sha512":101,"buffer":3}],93:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSymmetricPath = exports.deriveSymmetricHardenedKey = exports.getSymmetricMasterKeyFromSeed = void 0;
const hmac_sha512_1 = require("../primitives/hmac_sha512");
const SYMMETRIC_SEED = 'Symmetric key seed';
async function getSymmetricMasterKeyFromSeed(seed) {
    const I = await (0, hmac_sha512_1.hmac_sha512)(SYMMETRIC_SEED, seed);
    const IL = I.slice(32);
    const IR = I.slice(0, 32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.getSymmetricMasterKeyFromSeed = getSymmetricMasterKeyFromSeed;
;
async function deriveSymmetricHardenedKey(parent, offset) {
    // Prepare data
    const data = Buffer.concat([Buffer.alloc(1, 0), Buffer.from(offset)]);
    // Derive key
    const I = await (0, hmac_sha512_1.hmac_sha512)(parent.chainCode, data);
    const IL = I.slice(32);
    const IR = I.slice(0, 32);
    return {
        key: IL,
        chainCode: IR,
    };
}
exports.deriveSymmetricHardenedKey = deriveSymmetricHardenedKey;
async function deriveSymmetricPath(seed, path) {
    let state = await getSymmetricMasterKeyFromSeed(seed);
    let remaining = [...path];
    while (remaining.length > 0) {
        let index = remaining[0];
        remaining = remaining.slice(1);
        state = await deriveSymmetricHardenedKey(state, index);
    }
    return state.key;
}
exports.deriveSymmetricPath = deriveSymmetricPath;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../primitives/hmac_sha512":101,"buffer":3}],94:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMnemonicsMasterKeyFromSeed = exports.deriveMnemonicHardenedKey = exports.deriveMnemonicsPath = exports.deriveSymmetricPath = exports.deriveSymmetricHardenedKey = exports.getSymmetricMasterKeyFromSeed = exports.deriveEd25519Path = exports.deriveED25519HardenedKey = exports.getED25519MasterKeyFromSeed = exports.signVerify = exports.sign = exports.keyPairFromSecretKey = exports.keyPairFromSeed = exports.openBox = exports.sealBox = exports.mnemonicWordList = exports.mnemonicToHDSeed = exports.mnemonicToSeed = exports.mnemonicToWalletKey = exports.mnemonicToPrivateKey = exports.mnemonicValidate = exports.mnemonicNew = exports.newSecurePassphrase = exports.newSecureWords = exports.getSecureRandomNumber = exports.getSecureRandomWords = exports.getSecureRandomBytes = exports.hmac_sha512 = exports.pbkdf2_sha512 = exports.sha512_sync = exports.sha512 = exports.sha256_sync = exports.sha256 = void 0;
var sha256_1 = require("./primitives/sha256");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha256_1.sha256; } });
Object.defineProperty(exports, "sha256_sync", { enumerable: true, get: function () { return sha256_1.sha256_sync; } });
var sha512_1 = require("./primitives/sha512");
Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return sha512_1.sha512; } });
Object.defineProperty(exports, "sha512_sync", { enumerable: true, get: function () { return sha512_1.sha512_sync; } });
var pbkdf2_sha512_1 = require("./primitives/pbkdf2_sha512");
Object.defineProperty(exports, "pbkdf2_sha512", { enumerable: true, get: function () { return pbkdf2_sha512_1.pbkdf2_sha512; } });
var hmac_sha512_1 = require("./primitives/hmac_sha512");
Object.defineProperty(exports, "hmac_sha512", { enumerable: true, get: function () { return hmac_sha512_1.hmac_sha512; } });
var getSecureRandom_1 = require("./primitives/getSecureRandom");
Object.defineProperty(exports, "getSecureRandomBytes", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomBytes; } });
Object.defineProperty(exports, "getSecureRandomWords", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomWords; } });
Object.defineProperty(exports, "getSecureRandomNumber", { enumerable: true, get: function () { return getSecureRandom_1.getSecureRandomNumber; } });
var newSecureWords_1 = require("./passwords/newSecureWords");
Object.defineProperty(exports, "newSecureWords", { enumerable: true, get: function () { return newSecureWords_1.newSecureWords; } });
var newSecurePassphrase_1 = require("./passwords/newSecurePassphrase");
Object.defineProperty(exports, "newSecurePassphrase", { enumerable: true, get: function () { return newSecurePassphrase_1.newSecurePassphrase; } });
var mnemonic_1 = require("./mnemonic/mnemonic");
Object.defineProperty(exports, "mnemonicNew", { enumerable: true, get: function () { return mnemonic_1.mnemonicNew; } });
Object.defineProperty(exports, "mnemonicValidate", { enumerable: true, get: function () { return mnemonic_1.mnemonicValidate; } });
Object.defineProperty(exports, "mnemonicToPrivateKey", { enumerable: true, get: function () { return mnemonic_1.mnemonicToPrivateKey; } });
Object.defineProperty(exports, "mnemonicToWalletKey", { enumerable: true, get: function () { return mnemonic_1.mnemonicToWalletKey; } });
Object.defineProperty(exports, "mnemonicToSeed", { enumerable: true, get: function () { return mnemonic_1.mnemonicToSeed; } });
Object.defineProperty(exports, "mnemonicToHDSeed", { enumerable: true, get: function () { return mnemonic_1.mnemonicToHDSeed; } });
var wordlist_1 = require("./mnemonic/wordlist");
Object.defineProperty(exports, "mnemonicWordList", { enumerable: true, get: function () { return wordlist_1.wordlist; } });
var nacl_1 = require("./primitives/nacl");
Object.defineProperty(exports, "sealBox", { enumerable: true, get: function () { return nacl_1.sealBox; } });
Object.defineProperty(exports, "openBox", { enumerable: true, get: function () { return nacl_1.openBox; } });
var nacl_2 = require("./primitives/nacl");
Object.defineProperty(exports, "keyPairFromSeed", { enumerable: true, get: function () { return nacl_2.keyPairFromSeed; } });
Object.defineProperty(exports, "keyPairFromSecretKey", { enumerable: true, get: function () { return nacl_2.keyPairFromSecretKey; } });
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return nacl_2.sign; } });
Object.defineProperty(exports, "signVerify", { enumerable: true, get: function () { return nacl_2.signVerify; } });
var ed25519_1 = require("./hd/ed25519");
Object.defineProperty(exports, "getED25519MasterKeyFromSeed", { enumerable: true, get: function () { return ed25519_1.getED25519MasterKeyFromSeed; } });
Object.defineProperty(exports, "deriveED25519HardenedKey", { enumerable: true, get: function () { return ed25519_1.deriveED25519HardenedKey; } });
Object.defineProperty(exports, "deriveEd25519Path", { enumerable: true, get: function () { return ed25519_1.deriveEd25519Path; } });
var symmetric_1 = require("./hd/symmetric");
Object.defineProperty(exports, "getSymmetricMasterKeyFromSeed", { enumerable: true, get: function () { return symmetric_1.getSymmetricMasterKeyFromSeed; } });
Object.defineProperty(exports, "deriveSymmetricHardenedKey", { enumerable: true, get: function () { return symmetric_1.deriveSymmetricHardenedKey; } });
Object.defineProperty(exports, "deriveSymmetricPath", { enumerable: true, get: function () { return symmetric_1.deriveSymmetricPath; } });
var mnemonics_1 = require("./hd/mnemonics");
Object.defineProperty(exports, "deriveMnemonicsPath", { enumerable: true, get: function () { return mnemonics_1.deriveMnemonicsPath; } });
Object.defineProperty(exports, "deriveMnemonicHardenedKey", { enumerable: true, get: function () { return mnemonics_1.deriveMnemonicHardenedKey; } });
Object.defineProperty(exports, "getMnemonicsMasterKeyFromSeed", { enumerable: true, get: function () { return mnemonics_1.getMnemonicsMasterKeyFromSeed; } });

},{"./hd/ed25519":91,"./hd/mnemonics":92,"./hd/symmetric":93,"./mnemonic/mnemonic":95,"./mnemonic/wordlist":96,"./passwords/newSecurePassphrase":97,"./passwords/newSecureWords":98,"./primitives/getSecureRandom":100,"./primitives/hmac_sha512":101,"./primitives/nacl":102,"./primitives/pbkdf2_sha512":103,"./primitives/sha256":104,"./primitives/sha512":105}],95:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mnemonicFromRandomSeed = exports.mnemonicIndexesToBytes = exports.bytesToMnemonics = exports.bytesToMnemonicIndexes = exports.mnemonicNew = exports.mnemonicValidate = exports.mnemonicToHDSeed = exports.mnemonicToWalletKey = exports.mnemonicToPrivateKey = exports.mnemonicToSeed = exports.mnemonicToEntropy = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const getSecureRandom_1 = require("../primitives/getSecureRandom");
const hmac_sha512_1 = require("../primitives/hmac_sha512");
const pbkdf2_sha512_1 = require("../primitives/pbkdf2_sha512");
const binary_1 = require("../utils/binary");
const wordlist_1 = require("./wordlist");
const PBKDF_ITERATIONS = 100000;
async function isPasswordNeeded(mnemonicArray) {
    const passlessEntropy = await mnemonicToEntropy(mnemonicArray);
    return (await isPasswordSeed(passlessEntropy)) && !(await isBasicSeed(passlessEntropy));
}
function normalizeMnemonic(src) {
    return src.map((v) => v.toLowerCase().trim());
}
async function isBasicSeed(entropy) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L68
    // bool Mnemonic::is_basic_seed() {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON seed version", td::max(1, PBKDF_ITERATIONS / 256),
    //                     hash.as_mutable_slice());
    //   return hash.as_slice()[0] == 0;
    // }
    const seed = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, 'TON seed version', Math.max(1, Math.floor(PBKDF_ITERATIONS / 256)), 64);
    return seed[0] == 0;
}
async function isPasswordSeed(entropy) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L75
    // bool Mnemonic::is_password_seed() {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON fast seed version", 1, hash.as_mutable_slice());
    //   return hash.as_slice()[0] == 1;
    // }
    const seed = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, 'TON fast seed version', 1, 64);
    return seed[0] == 1;
}
async function mnemonicToEntropy(mnemonicArray, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L52
    // td::SecureString Mnemonic::to_entropy() const {
    //   td::SecureString res(64);
    //   td::hmac_sha512(join(words_), password_, res.as_mutable_slice());
    //   return res;
    // }
    return await (0, hmac_sha512_1.hmac_sha512)(mnemonicArray.join(' '), password && password.length > 0 ? password : '');
}
exports.mnemonicToEntropy = mnemonicToEntropy;
async function mnemonicToSeed(mnemonicArray, seed, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L58
    // td::SecureString Mnemonic::to_seed() const {
    //   td::SecureString hash(64);
    //   td::pbkdf2_sha512(as_slice(to_entropy()), "TON default seed", PBKDF_ITERATIONS, hash.as_mutable_slice());
    //   return hash;
    // }
    const entropy = await mnemonicToEntropy(mnemonicArray, password);
    return await (0, pbkdf2_sha512_1.pbkdf2_sha512)(entropy, seed, PBKDF_ITERATIONS, 64);
}
exports.mnemonicToSeed = mnemonicToSeed;
/**
 * Extract private key from mnemonic
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns Key Pair
 */
async function mnemonicToPrivateKey(mnemonicArray, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L64
    // td::Ed25519::PrivateKey Mnemonic::to_private_key() const {
    //   return td::Ed25519::PrivateKey(td::SecureString(as_slice(to_seed()).substr(0, td::Ed25519::PrivateKey::LENGTH)));
    // }
    mnemonicArray = normalizeMnemonic(mnemonicArray);
    const seed = (await mnemonicToSeed(mnemonicArray, 'TON default seed', password));
    let keyPair = tweetnacl_1.default.sign.keyPair.fromSeed(seed.slice(0, 32));
    return {
        publicKey: Buffer.from(keyPair.publicKey),
        secretKey: Buffer.from(keyPair.secretKey)
    };
}
exports.mnemonicToPrivateKey = mnemonicToPrivateKey;
/**
 * Convert mnemonic to wallet key pair
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns Key Pair
 */
async function mnemonicToWalletKey(mnemonicArray, password) {
    let seedPk = await mnemonicToPrivateKey(mnemonicArray, password);
    let seedSecret = seedPk.secretKey.slice(0, 32);
    const keyPair = tweetnacl_1.default.sign.keyPair.fromSeed(seedSecret);
    return {
        publicKey: Buffer.from(keyPair.publicKey),
        secretKey: Buffer.from(keyPair.secretKey)
    };
}
exports.mnemonicToWalletKey = mnemonicToWalletKey;
/**
 * Convert mnemonics to HD seed
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns 64 byte seed
 */
async function mnemonicToHDSeed(mnemonicArray, password) {
    mnemonicArray = normalizeMnemonic(mnemonicArray);
    return (await mnemonicToSeed(mnemonicArray, 'TON HD Keys seed', password));
}
exports.mnemonicToHDSeed = mnemonicToHDSeed;
/**
 * Validate Mnemonic
 * @param mnemonicArray mnemonic array
 * @param password mnemonic password
 * @returns true for valid mnemonic
 */
async function mnemonicValidate(mnemonicArray, password) {
    // Normalize
    mnemonicArray = normalizeMnemonic(mnemonicArray);
    // Validate mnemonic words
    for (let word of mnemonicArray) {
        if (wordlist_1.wordlist.indexOf(word) < 0) {
            return false;
        }
    }
    // Check password
    if (password && password.length > 0) {
        if (!await isPasswordNeeded(mnemonicArray)) {
            return false;
        }
    }
    // Validate seed
    return await isBasicSeed(await mnemonicToEntropy(mnemonicArray, password));
}
exports.mnemonicValidate = mnemonicValidate;
/**
 * Generate new Mnemonic
 * @param wordsCount number of words to generate
 * @param password mnemonic password
 * @returns
 */
async function mnemonicNew(wordsCount = 24, password) {
    // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/tonlib/tonlib/keys/Mnemonic.cpp#L159
    let mnemonicArray = [];
    while (true) {
        // Regenerate new mnemonics
        mnemonicArray = [];
        for (let i = 0; i < wordsCount; i++) {
            let ind = await (0, getSecureRandom_1.getSecureRandomNumber)(0, wordlist_1.wordlist.length);
            mnemonicArray.push(wordlist_1.wordlist[ind]);
        }
        // Chek password conformance
        if (password && password.length > 0) {
            if (!await isPasswordNeeded(mnemonicArray)) {
                continue;
            }
        }
        // Check if basic seed correct
        if (!(await isBasicSeed(await mnemonicToEntropy(mnemonicArray, password)))) {
            continue;
        }
        break;
    }
    return mnemonicArray;
}
exports.mnemonicNew = mnemonicNew;
/**
 * Converts bytes to mnemonics array (could be invalid for TON)
 * @param src source buffer
 * @param wordsCount number of words
 */
function bytesToMnemonicIndexes(src, wordsCount) {
    let bits = (0, binary_1.bytesToBits)(src);
    let indexes = [];
    for (let i = 0; i < wordsCount; i++) {
        let sl = bits.slice(i * 11, i * 11 + 11);
        indexes.push(parseInt(sl, 2));
    }
    return indexes;
}
exports.bytesToMnemonicIndexes = bytesToMnemonicIndexes;
function bytesToMnemonics(src, wordsCount) {
    let mnemonics = bytesToMnemonicIndexes(src, wordsCount);
    let res = [];
    for (let m of mnemonics) {
        res.push(wordlist_1.wordlist[m]);
    }
    return res;
}
exports.bytesToMnemonics = bytesToMnemonics;
/**
 * Converts mnemonics indexes to buffer with zero padding in the end
 * @param src source indexes
 * @returns Buffer
 */
function mnemonicIndexesToBytes(src) {
    let res = '';
    for (let s of src) {
        if (!Number.isSafeInteger(s)) {
            throw Error('Invalid input');
        }
        if (s < 0 || s >= 2028) {
            throw Error('Invalid input');
        }
        res += (0, binary_1.lpad)(s.toString(2), '0', 11);
    }
    while (res.length % 8 !== 0) {
        res = res + '0';
    }
    return (0, binary_1.bitsToBytes)(res);
}
exports.mnemonicIndexesToBytes = mnemonicIndexesToBytes;
/**
 * Generates deterministically mnemonics
 * @param seed
 * @param wordsCount
 * @param password
 */
async function mnemonicFromRandomSeed(seed, wordsCount = 24, password) {
    const bytesLength = Math.ceil(wordsCount * 11 / 8);
    let currentSeed = seed;
    while (true) {
        // Create entropy
        let entropy = await (0, pbkdf2_sha512_1.pbkdf2_sha512)(currentSeed, 'TON mnemonic seed', Math.max(1, Math.floor(PBKDF_ITERATIONS / 256)), bytesLength);
        // Create mnemonics
        let mnemonics = bytesToMnemonics(entropy, wordsCount);
        // Check if mnemonics are valid
        if (await mnemonicValidate(mnemonics, password)) {
            return mnemonics;
        }
        currentSeed = entropy;
    }
}
exports.mnemonicFromRandomSeed = mnemonicFromRandomSeed;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../primitives/getSecureRandom":100,"../primitives/hmac_sha512":101,"../primitives/pbkdf2_sha512":103,"../utils/binary":106,"./wordlist":96,"buffer":3,"tweetnacl":107}],96:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordlist = void 0;
const EN = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
    'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz',
    'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen', 'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle',
    'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust', 'dutch', 'duty', 'dwarf', 'dynamic',
    'eager', 'eagle', 'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion', 'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute', 'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow',
    'fabric', 'face', 'faculty', 'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature', 'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever', 'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find', 'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness', 'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock', 'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow', 'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil', 'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog', 'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury', 'future',
    'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym',
    'habit', 'hair', 'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello', 'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire', 'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge', 'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid',
    'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale', 'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve', 'iron', 'island', 'isolate', 'issue', 'item', 'ivory',
    'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge', 'juice', 'jump', 'jungle', 'junior', 'junk', 'just',
    'kangaroo', 'keen', 'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know',
    'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure', 'lemon', 'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library', 'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list', 'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber', 'lunar', 'lunch', 'luxury', 'lyrics',
    'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member', 'memory', 'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal', 'method', 'middle', 'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself', 'mystery', 'myth',
    'naive', 'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle', 'normal', 'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear', 'number', 'nurse', 'nut',
    'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original', 'orphan', 'ostrich', 'other', 'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own', 'owner', 'oxygen', 'oyster', 'ozone',
    'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper', 'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic', 'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol', 'pitch', 'pizza', 'place', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge', 'pluck', 'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool', 'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice', 'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary', 'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program', 'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose', 'purse', 'push', 'put', 'puzzle', 'pyramid',
    'quality', 'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote',
    'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce', 'reflect', 'reform', 'refuse', 'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember', 'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat', 'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich', 'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual', 'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie', 'room', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug', 'rule', 'run', 'runway', 'rural',
    'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene', 'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea', 'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment', 'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine', 'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove', 'shrimp', 'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege', 'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing', 'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull', 'slab', 'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slogan', 'slot', 'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap', 'sniff', 'snow', 'soap', 'soccer', 'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid', 'solution', 'solve', 'someone', 'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south', 'space', 'spare', 'spatial', 'spawn', 'speak', 'special', 'speed', 'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon', 'sport', 'spot', 'spray', 'spread', 'spring', 'spy', 'square', 'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage', 'stairs', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel', 'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stock', 'stomach', 'stone', 'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong', 'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit', 'subway', 'success', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure', 'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap', 'swarm', 'swear', 'sweet', 'swift', 'swim', 'swing', 'switch', 'sword', 'symbol', 'symptom', 'syrup', 'system',
    'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task', 'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent', 'term', 'test', 'text', 'thank', 'that', 'theme', 'then', 'theory', 'there', 'they', 'thing', 'this', 'thought', 'three', 'thrive', 'throw', 'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time', 'tiny', 'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco', 'today', 'toddler', 'toe', 'together', 'toilet', 'token', 'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track', 'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap', 'trash', 'travel', 'tray', 'treat', 'tree', 'trend', 'trial', 'tribe', 'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet', 'trust', 'truth', 'try', 'tube', 'tuition', 'tumble', 'tuna', 'tunnel', 'turkey', 'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical',
    'ugly', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy', 'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'urge', 'usage', 'use', 'used', 'useful', 'useless', 'usual', 'utility',
    'vacant', 'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various', 'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vicious', 'victory', 'video', 'view', 'village', 'vintage', 'violin', 'virtual', 'virus', 'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume', 'vote', 'voyage',
    'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel', 'weather', 'web', 'wedding', 'weekend', 'weird', 'welcome', 'west', 'wet', 'whale', 'what', 'wheat', 'wheel', 'when', 'where', 'whip', 'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win', 'window', 'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish', 'witness', 'wolf', 'woman', 'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry', 'worth', 'wrap', 'wreck', 'wrestle', 'wrist', 'write', 'wrong',
    'yard', 'year', 'yellow', 'you', 'young', 'youth',
    'zebra', 'zero', 'zone', 'zoo'];
exports.wordlist = EN;

},{}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSecurePassphrase = void 0;
const __1 = require("..");
async function newSecurePassphrase(size = 6) {
    return (await (0, __1.newSecureWords)(size)).join('-');
}
exports.newSecurePassphrase = newSecurePassphrase;

},{"..":94}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSecureWords = void 0;
const getSecureRandom_1 = require("../primitives/getSecureRandom");
const wordlist_1 = require("./wordlist");
async function newSecureWords(size = 6) {
    let words = [];
    for (let i = 0; i < size; i++) {
        words.push(wordlist_1.wordlist[await (0, getSecureRandom_1.getSecureRandomNumber)(0, wordlist_1.wordlist.length)]);
    }
    return words;
}
exports.newSecureWords = newSecureWords;

},{"../primitives/getSecureRandom":100,"./wordlist":99}],99:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordlist = void 0;
// Source https://www.eff.org/dice
exports.wordlist = [
    'abacus',
    'abdomen',
    'abdominal',
    'abide',
    'abiding',
    'ability',
    'ablaze',
    'able',
    'abnormal',
    'abrasion',
    'abrasive',
    'abreast',
    'abridge',
    'abroad',
    'abruptly',
    'absence',
    'absentee',
    'absently',
    'absinthe',
    'absolute',
    'absolve',
    'abstain',
    'abstract',
    'absurd',
    'accent',
    'acclaim',
    'acclimate',
    'accompany',
    'account',
    'accuracy',
    'accurate',
    'accustom',
    'acetone',
    'achiness',
    'aching',
    'acid',
    'acorn',
    'acquaint',
    'acquire',
    'acre',
    'acrobat',
    'acronym',
    'acting',
    'action',
    'activate',
    'activator',
    'active',
    'activism',
    'activist',
    'activity',
    'actress',
    'acts',
    'acutely',
    'acuteness',
    'aeration',
    'aerobics',
    'aerosol',
    'aerospace',
    'afar',
    'affair',
    'affected',
    'affecting',
    'affection',
    'affidavit',
    'affiliate',
    'affirm',
    'affix',
    'afflicted',
    'affluent',
    'afford',
    'affront',
    'aflame',
    'afloat',
    'aflutter',
    'afoot',
    'afraid',
    'afterglow',
    'afterlife',
    'aftermath',
    'aftermost',
    'afternoon',
    'aged',
    'ageless',
    'agency',
    'agenda',
    'agent',
    'aggregate',
    'aghast',
    'agile',
    'agility',
    'aging',
    'agnostic',
    'agonize',
    'agonizing',
    'agony',
    'agreeable',
    'agreeably',
    'agreed',
    'agreeing',
    'agreement',
    'aground',
    'ahead',
    'ahoy',
    'aide',
    'aids',
    'aim',
    'ajar',
    'alabaster',
    'alarm',
    'albatross',
    'album',
    'alfalfa',
    'algebra',
    'algorithm',
    'alias',
    'alibi',
    'alienable',
    'alienate',
    'aliens',
    'alike',
    'alive',
    'alkaline',
    'alkalize',
    'almanac',
    'almighty',
    'almost',
    'aloe',
    'aloft',
    'aloha',
    'alone',
    'alongside',
    'aloof',
    'alphabet',
    'alright',
    'although',
    'altitude',
    'alto',
    'aluminum',
    'alumni',
    'always',
    'amaretto',
    'amaze',
    'amazingly',
    'amber',
    'ambiance',
    'ambiguity',
    'ambiguous',
    'ambition',
    'ambitious',
    'ambulance',
    'ambush',
    'amendable',
    'amendment',
    'amends',
    'amenity',
    'amiable',
    'amicably',
    'amid',
    'amigo',
    'amino',
    'amiss',
    'ammonia',
    'ammonium',
    'amnesty',
    'amniotic',
    'among',
    'amount',
    'amperage',
    'ample',
    'amplifier',
    'amplify',
    'amply',
    'amuck',
    'amulet',
    'amusable',
    'amused',
    'amusement',
    'amuser',
    'amusing',
    'anaconda',
    'anaerobic',
    'anagram',
    'anatomist',
    'anatomy',
    'anchor',
    'anchovy',
    'ancient',
    'android',
    'anemia',
    'anemic',
    'aneurism',
    'anew',
    'angelfish',
    'angelic',
    'anger',
    'angled',
    'angler',
    'angles',
    'angling',
    'angrily',
    'angriness',
    'anguished',
    'angular',
    'animal',
    'animate',
    'animating',
    'animation',
    'animator',
    'anime',
    'animosity',
    'ankle',
    'annex',
    'annotate',
    'announcer',
    'annoying',
    'annually',
    'annuity',
    'anointer',
    'another',
    'answering',
    'antacid',
    'antarctic',
    'anteater',
    'antelope',
    'antennae',
    'anthem',
    'anthill',
    'anthology',
    'antibody',
    'antics',
    'antidote',
    'antihero',
    'antiquely',
    'antiques',
    'antiquity',
    'antirust',
    'antitoxic',
    'antitrust',
    'antiviral',
    'antivirus',
    'antler',
    'antonym',
    'antsy',
    'anvil',
    'anybody',
    'anyhow',
    'anymore',
    'anyone',
    'anyplace',
    'anything',
    'anytime',
    'anyway',
    'anywhere',
    'aorta',
    'apache',
    'apostle',
    'appealing',
    'appear',
    'appease',
    'appeasing',
    'appendage',
    'appendix',
    'appetite',
    'appetizer',
    'applaud',
    'applause',
    'apple',
    'appliance',
    'applicant',
    'applied',
    'apply',
    'appointee',
    'appraisal',
    'appraiser',
    'apprehend',
    'approach',
    'approval',
    'approve',
    'apricot',
    'april',
    'apron',
    'aptitude',
    'aptly',
    'aqua',
    'aqueduct',
    'arbitrary',
    'arbitrate',
    'ardently',
    'area',
    'arena',
    'arguable',
    'arguably',
    'argue',
    'arise',
    'armadillo',
    'armband',
    'armchair',
    'armed',
    'armful',
    'armhole',
    'arming',
    'armless',
    'armoire',
    'armored',
    'armory',
    'armrest',
    'army',
    'aroma',
    'arose',
    'around',
    'arousal',
    'arrange',
    'array',
    'arrest',
    'arrival',
    'arrive',
    'arrogance',
    'arrogant',
    'arson',
    'art',
    'ascend',
    'ascension',
    'ascent',
    'ascertain',
    'ashamed',
    'ashen',
    'ashes',
    'ashy',
    'aside',
    'askew',
    'asleep',
    'asparagus',
    'aspect',
    'aspirate',
    'aspire',
    'aspirin',
    'astonish',
    'astound',
    'astride',
    'astrology',
    'astronaut',
    'astronomy',
    'astute',
    'atlantic',
    'atlas',
    'atom',
    'atonable',
    'atop',
    'atrium',
    'atrocious',
    'atrophy',
    'attach',
    'attain',
    'attempt',
    'attendant',
    'attendee',
    'attention',
    'attentive',
    'attest',
    'attic',
    'attire',
    'attitude',
    'attractor',
    'attribute',
    'atypical',
    'auction',
    'audacious',
    'audacity',
    'audible',
    'audibly',
    'audience',
    'audio',
    'audition',
    'augmented',
    'august',
    'authentic',
    'author',
    'autism',
    'autistic',
    'autograph',
    'automaker',
    'automated',
    'automatic',
    'autopilot',
    'available',
    'avalanche',
    'avatar',
    'avenge',
    'avenging',
    'avenue',
    'average',
    'aversion',
    'avert',
    'aviation',
    'aviator',
    'avid',
    'avoid',
    'await',
    'awaken',
    'award',
    'aware',
    'awhile',
    'awkward',
    'awning',
    'awoke',
    'awry',
    'axis',
    'babble',
    'babbling',
    'babied',
    'baboon',
    'backache',
    'backboard',
    'backboned',
    'backdrop',
    'backed',
    'backer',
    'backfield',
    'backfire',
    'backhand',
    'backing',
    'backlands',
    'backlash',
    'backless',
    'backlight',
    'backlit',
    'backlog',
    'backpack',
    'backpedal',
    'backrest',
    'backroom',
    'backshift',
    'backside',
    'backslid',
    'backspace',
    'backspin',
    'backstab',
    'backstage',
    'backtalk',
    'backtrack',
    'backup',
    'backward',
    'backwash',
    'backwater',
    'backyard',
    'bacon',
    'bacteria',
    'bacterium',
    'badass',
    'badge',
    'badland',
    'badly',
    'badness',
    'baffle',
    'baffling',
    'bagel',
    'bagful',
    'baggage',
    'bagged',
    'baggie',
    'bagginess',
    'bagging',
    'baggy',
    'bagpipe',
    'baguette',
    'baked',
    'bakery',
    'bakeshop',
    'baking',
    'balance',
    'balancing',
    'balcony',
    'balmy',
    'balsamic',
    'bamboo',
    'banana',
    'banish',
    'banister',
    'banjo',
    'bankable',
    'bankbook',
    'banked',
    'banker',
    'banking',
    'banknote',
    'bankroll',
    'banner',
    'bannister',
    'banshee',
    'banter',
    'barbecue',
    'barbed',
    'barbell',
    'barber',
    'barcode',
    'barge',
    'bargraph',
    'barista',
    'baritone',
    'barley',
    'barmaid',
    'barman',
    'barn',
    'barometer',
    'barrack',
    'barracuda',
    'barrel',
    'barrette',
    'barricade',
    'barrier',
    'barstool',
    'bartender',
    'barterer',
    'bash',
    'basically',
    'basics',
    'basil',
    'basin',
    'basis',
    'basket',
    'batboy',
    'batch',
    'bath',
    'baton',
    'bats',
    'battalion',
    'battered',
    'battering',
    'battery',
    'batting',
    'battle',
    'bauble',
    'bazooka',
    'blabber',
    'bladder',
    'blade',
    'blah',
    'blame',
    'blaming',
    'blanching',
    'blandness',
    'blank',
    'blaspheme',
    'blasphemy',
    'blast',
    'blatancy',
    'blatantly',
    'blazer',
    'blazing',
    'bleach',
    'bleak',
    'bleep',
    'blemish',
    'blend',
    'bless',
    'blighted',
    'blimp',
    'bling',
    'blinked',
    'blinker',
    'blinking',
    'blinks',
    'blip',
    'blissful',
    'blitz',
    'blizzard',
    'bloated',
    'bloating',
    'blob',
    'blog',
    'bloomers',
    'blooming',
    'blooper',
    'blot',
    'blouse',
    'blubber',
    'bluff',
    'bluish',
    'blunderer',
    'blunt',
    'blurb',
    'blurred',
    'blurry',
    'blurt',
    'blush',
    'blustery',
    'boaster',
    'boastful',
    'boasting',
    'boat',
    'bobbed',
    'bobbing',
    'bobble',
    'bobcat',
    'bobsled',
    'bobtail',
    'bodacious',
    'body',
    'bogged',
    'boggle',
    'bogus',
    'boil',
    'bok',
    'bolster',
    'bolt',
    'bonanza',
    'bonded',
    'bonding',
    'bondless',
    'boned',
    'bonehead',
    'boneless',
    'bonelike',
    'boney',
    'bonfire',
    'bonnet',
    'bonsai',
    'bonus',
    'bony',
    'boogeyman',
    'boogieman',
    'book',
    'boondocks',
    'booted',
    'booth',
    'bootie',
    'booting',
    'bootlace',
    'bootleg',
    'boots',
    'boozy',
    'borax',
    'boring',
    'borough',
    'borrower',
    'borrowing',
    'boss',
    'botanical',
    'botanist',
    'botany',
    'botch',
    'both',
    'bottle',
    'bottling',
    'bottom',
    'bounce',
    'bouncing',
    'bouncy',
    'bounding',
    'boundless',
    'bountiful',
    'bovine',
    'boxcar',
    'boxer',
    'boxing',
    'boxlike',
    'boxy',
    'breach',
    'breath',
    'breeches',
    'breeching',
    'breeder',
    'breeding',
    'breeze',
    'breezy',
    'brethren',
    'brewery',
    'brewing',
    'briar',
    'bribe',
    'brick',
    'bride',
    'bridged',
    'brigade',
    'bright',
    'brilliant',
    'brim',
    'bring',
    'brink',
    'brisket',
    'briskly',
    'briskness',
    'bristle',
    'brittle',
    'broadband',
    'broadcast',
    'broaden',
    'broadly',
    'broadness',
    'broadside',
    'broadways',
    'broiler',
    'broiling',
    'broken',
    'broker',
    'bronchial',
    'bronco',
    'bronze',
    'bronzing',
    'brook',
    'broom',
    'brought',
    'browbeat',
    'brownnose',
    'browse',
    'browsing',
    'bruising',
    'brunch',
    'brunette',
    'brunt',
    'brush',
    'brussels',
    'brute',
    'brutishly',
    'bubble',
    'bubbling',
    'bubbly',
    'buccaneer',
    'bucked',
    'bucket',
    'buckle',
    'buckshot',
    'buckskin',
    'bucktooth',
    'buckwheat',
    'buddhism',
    'buddhist',
    'budding',
    'buddy',
    'budget',
    'buffalo',
    'buffed',
    'buffer',
    'buffing',
    'buffoon',
    'buggy',
    'bulb',
    'bulge',
    'bulginess',
    'bulgur',
    'bulk',
    'bulldog',
    'bulldozer',
    'bullfight',
    'bullfrog',
    'bullhorn',
    'bullion',
    'bullish',
    'bullpen',
    'bullring',
    'bullseye',
    'bullwhip',
    'bully',
    'bunch',
    'bundle',
    'bungee',
    'bunion',
    'bunkbed',
    'bunkhouse',
    'bunkmate',
    'bunny',
    'bunt',
    'busboy',
    'bush',
    'busily',
    'busload',
    'bust',
    'busybody',
    'buzz',
    'cabana',
    'cabbage',
    'cabbie',
    'cabdriver',
    'cable',
    'caboose',
    'cache',
    'cackle',
    'cacti',
    'cactus',
    'caddie',
    'caddy',
    'cadet',
    'cadillac',
    'cadmium',
    'cage',
    'cahoots',
    'cake',
    'calamari',
    'calamity',
    'calcium',
    'calculate',
    'calculus',
    'caliber',
    'calibrate',
    'calm',
    'caloric',
    'calorie',
    'calzone',
    'camcorder',
    'cameo',
    'camera',
    'camisole',
    'camper',
    'campfire',
    'camping',
    'campsite',
    'campus',
    'canal',
    'canary',
    'cancel',
    'candied',
    'candle',
    'candy',
    'cane',
    'canine',
    'canister',
    'cannabis',
    'canned',
    'canning',
    'cannon',
    'cannot',
    'canola',
    'canon',
    'canopener',
    'canopy',
    'canteen',
    'canyon',
    'capable',
    'capably',
    'capacity',
    'cape',
    'capillary',
    'capital',
    'capitol',
    'capped',
    'capricorn',
    'capsize',
    'capsule',
    'caption',
    'captivate',
    'captive',
    'captivity',
    'capture',
    'caramel',
    'carat',
    'caravan',
    'carbon',
    'cardboard',
    'carded',
    'cardiac',
    'cardigan',
    'cardinal',
    'cardstock',
    'carefully',
    'caregiver',
    'careless',
    'caress',
    'caretaker',
    'cargo',
    'caring',
    'carless',
    'carload',
    'carmaker',
    'carnage',
    'carnation',
    'carnival',
    'carnivore',
    'carol',
    'carpenter',
    'carpentry',
    'carpool',
    'carport',
    'carried',
    'carrot',
    'carrousel',
    'carry',
    'cartel',
    'cartload',
    'carton',
    'cartoon',
    'cartridge',
    'cartwheel',
    'carve',
    'carving',
    'carwash',
    'cascade',
    'case',
    'cash',
    'casing',
    'casino',
    'casket',
    'cassette',
    'casually',
    'casualty',
    'catacomb',
    'catalog',
    'catalyst',
    'catalyze',
    'catapult',
    'cataract',
    'catatonic',
    'catcall',
    'catchable',
    'catcher',
    'catching',
    'catchy',
    'caterer',
    'catering',
    'catfight',
    'catfish',
    'cathedral',
    'cathouse',
    'catlike',
    'catnap',
    'catnip',
    'catsup',
    'cattail',
    'cattishly',
    'cattle',
    'catty',
    'catwalk',
    'caucasian',
    'caucus',
    'causal',
    'causation',
    'cause',
    'causing',
    'cauterize',
    'caution',
    'cautious',
    'cavalier',
    'cavalry',
    'caviar',
    'cavity',
    'cedar',
    'celery',
    'celestial',
    'celibacy',
    'celibate',
    'celtic',
    'cement',
    'census',
    'ceramics',
    'ceremony',
    'certainly',
    'certainty',
    'certified',
    'certify',
    'cesarean',
    'cesspool',
    'chafe',
    'chaffing',
    'chain',
    'chair',
    'chalice',
    'challenge',
    'chamber',
    'chamomile',
    'champion',
    'chance',
    'change',
    'channel',
    'chant',
    'chaos',
    'chaperone',
    'chaplain',
    'chapped',
    'chaps',
    'chapter',
    'character',
    'charbroil',
    'charcoal',
    'charger',
    'charging',
    'chariot',
    'charity',
    'charm',
    'charred',
    'charter',
    'charting',
    'chase',
    'chasing',
    'chaste',
    'chastise',
    'chastity',
    'chatroom',
    'chatter',
    'chatting',
    'chatty',
    'cheating',
    'cheddar',
    'cheek',
    'cheer',
    'cheese',
    'cheesy',
    'chef',
    'chemicals',
    'chemist',
    'chemo',
    'cherisher',
    'cherub',
    'chess',
    'chest',
    'chevron',
    'chevy',
    'chewable',
    'chewer',
    'chewing',
    'chewy',
    'chief',
    'chihuahua',
    'childcare',
    'childhood',
    'childish',
    'childless',
    'childlike',
    'chili',
    'chill',
    'chimp',
    'chip',
    'chirping',
    'chirpy',
    'chitchat',
    'chivalry',
    'chive',
    'chloride',
    'chlorine',
    'choice',
    'chokehold',
    'choking',
    'chomp',
    'chooser',
    'choosing',
    'choosy',
    'chop',
    'chosen',
    'chowder',
    'chowtime',
    'chrome',
    'chubby',
    'chuck',
    'chug',
    'chummy',
    'chump',
    'chunk',
    'churn',
    'chute',
    'cider',
    'cilantro',
    'cinch',
    'cinema',
    'cinnamon',
    'circle',
    'circling',
    'circular',
    'circulate',
    'circus',
    'citable',
    'citadel',
    'citation',
    'citizen',
    'citric',
    'citrus',
    'city',
    'civic',
    'civil',
    'clad',
    'claim',
    'clambake',
    'clammy',
    'clamor',
    'clamp',
    'clamshell',
    'clang',
    'clanking',
    'clapped',
    'clapper',
    'clapping',
    'clarify',
    'clarinet',
    'clarity',
    'clash',
    'clasp',
    'class',
    'clatter',
    'clause',
    'clavicle',
    'claw',
    'clay',
    'clean',
    'clear',
    'cleat',
    'cleaver',
    'cleft',
    'clench',
    'clergyman',
    'clerical',
    'clerk',
    'clever',
    'clicker',
    'client',
    'climate',
    'climatic',
    'cling',
    'clinic',
    'clinking',
    'clip',
    'clique',
    'cloak',
    'clobber',
    'clock',
    'clone',
    'cloning',
    'closable',
    'closure',
    'clothes',
    'clothing',
    'cloud',
    'clover',
    'clubbed',
    'clubbing',
    'clubhouse',
    'clump',
    'clumsily',
    'clumsy',
    'clunky',
    'clustered',
    'clutch',
    'clutter',
    'coach',
    'coagulant',
    'coastal',
    'coaster',
    'coasting',
    'coastland',
    'coastline',
    'coat',
    'coauthor',
    'cobalt',
    'cobbler',
    'cobweb',
    'cocoa',
    'coconut',
    'cod',
    'coeditor',
    'coerce',
    'coexist',
    'coffee',
    'cofounder',
    'cognition',
    'cognitive',
    'cogwheel',
    'coherence',
    'coherent',
    'cohesive',
    'coil',
    'coke',
    'cola',
    'cold',
    'coleslaw',
    'coliseum',
    'collage',
    'collapse',
    'collar',
    'collected',
    'collector',
    'collide',
    'collie',
    'collision',
    'colonial',
    'colonist',
    'colonize',
    'colony',
    'colossal',
    'colt',
    'coma',
    'come',
    'comfort',
    'comfy',
    'comic',
    'coming',
    'comma',
    'commence',
    'commend',
    'comment',
    'commerce',
    'commode',
    'commodity',
    'commodore',
    'common',
    'commotion',
    'commute',
    'commuting',
    'compacted',
    'compacter',
    'compactly',
    'compactor',
    'companion',
    'company',
    'compare',
    'compel',
    'compile',
    'comply',
    'component',
    'composed',
    'composer',
    'composite',
    'compost',
    'composure',
    'compound',
    'compress',
    'comprised',
    'computer',
    'computing',
    'comrade',
    'concave',
    'conceal',
    'conceded',
    'concept',
    'concerned',
    'concert',
    'conch',
    'concierge',
    'concise',
    'conclude',
    'concrete',
    'concur',
    'condense',
    'condiment',
    'condition',
    'condone',
    'conducive',
    'conductor',
    'conduit',
    'cone',
    'confess',
    'confetti',
    'confidant',
    'confident',
    'confider',
    'confiding',
    'configure',
    'confined',
    'confining',
    'confirm',
    'conflict',
    'conform',
    'confound',
    'confront',
    'confused',
    'confusing',
    'confusion',
    'congenial',
    'congested',
    'congrats',
    'congress',
    'conical',
    'conjoined',
    'conjure',
    'conjuror',
    'connected',
    'connector',
    'consensus',
    'consent',
    'console',
    'consoling',
    'consonant',
    'constable',
    'constant',
    'constrain',
    'constrict',
    'construct',
    'consult',
    'consumer',
    'consuming',
    'contact',
    'container',
    'contempt',
    'contend',
    'contented',
    'contently',
    'contents',
    'contest',
    'context',
    'contort',
    'contour',
    'contrite',
    'control',
    'contusion',
    'convene',
    'convent',
    'copartner',
    'cope',
    'copied',
    'copier',
    'copilot',
    'coping',
    'copious',
    'copper',
    'copy',
    'coral',
    'cork',
    'cornball',
    'cornbread',
    'corncob',
    'cornea',
    'corned',
    'corner',
    'cornfield',
    'cornflake',
    'cornhusk',
    'cornmeal',
    'cornstalk',
    'corny',
    'coronary',
    'coroner',
    'corporal',
    'corporate',
    'corral',
    'correct',
    'corridor',
    'corrode',
    'corroding',
    'corrosive',
    'corsage',
    'corset',
    'cortex',
    'cosigner',
    'cosmetics',
    'cosmic',
    'cosmos',
    'cosponsor',
    'cost',
    'cottage',
    'cotton',
    'couch',
    'cough',
    'could',
    'countable',
    'countdown',
    'counting',
    'countless',
    'country',
    'county',
    'courier',
    'covenant',
    'cover',
    'coveted',
    'coveting',
    'coyness',
    'cozily',
    'coziness',
    'cozy',
    'crabbing',
    'crabgrass',
    'crablike',
    'crabmeat',
    'cradle',
    'cradling',
    'crafter',
    'craftily',
    'craftsman',
    'craftwork',
    'crafty',
    'cramp',
    'cranberry',
    'crane',
    'cranial',
    'cranium',
    'crank',
    'crate',
    'crave',
    'craving',
    'crawfish',
    'crawlers',
    'crawling',
    'crayfish',
    'crayon',
    'crazed',
    'crazily',
    'craziness',
    'crazy',
    'creamed',
    'creamer',
    'creamlike',
    'crease',
    'creasing',
    'creatable',
    'create',
    'creation',
    'creative',
    'creature',
    'credible',
    'credibly',
    'credit',
    'creed',
    'creme',
    'creole',
    'crepe',
    'crept',
    'crescent',
    'crested',
    'cresting',
    'crestless',
    'crevice',
    'crewless',
    'crewman',
    'crewmate',
    'crib',
    'cricket',
    'cried',
    'crier',
    'crimp',
    'crimson',
    'cringe',
    'cringing',
    'crinkle',
    'crinkly',
    'crisped',
    'crisping',
    'crisply',
    'crispness',
    'crispy',
    'criteria',
    'critter',
    'croak',
    'crock',
    'crook',
    'croon',
    'crop',
    'cross',
    'crouch',
    'crouton',
    'crowbar',
    'crowd',
    'crown',
    'crucial',
    'crudely',
    'crudeness',
    'cruelly',
    'cruelness',
    'cruelty',
    'crumb',
    'crummiest',
    'crummy',
    'crumpet',
    'crumpled',
    'cruncher',
    'crunching',
    'crunchy',
    'crusader',
    'crushable',
    'crushed',
    'crusher',
    'crushing',
    'crust',
    'crux',
    'crying',
    'cryptic',
    'crystal',
    'cubbyhole',
    'cube',
    'cubical',
    'cubicle',
    'cucumber',
    'cuddle',
    'cuddly',
    'cufflink',
    'culinary',
    'culminate',
    'culpable',
    'culprit',
    'cultivate',
    'cultural',
    'culture',
    'cupbearer',
    'cupcake',
    'cupid',
    'cupped',
    'cupping',
    'curable',
    'curator',
    'curdle',
    'cure',
    'curfew',
    'curing',
    'curled',
    'curler',
    'curliness',
    'curling',
    'curly',
    'curry',
    'curse',
    'cursive',
    'cursor',
    'curtain',
    'curtly',
    'curtsy',
    'curvature',
    'curve',
    'curvy',
    'cushy',
    'cusp',
    'cussed',
    'custard',
    'custodian',
    'custody',
    'customary',
    'customer',
    'customize',
    'customs',
    'cut',
    'cycle',
    'cyclic',
    'cycling',
    'cyclist',
    'cylinder',
    'cymbal',
    'cytoplasm',
    'cytoplast',
    'dab',
    'dad',
    'daffodil',
    'dagger',
    'daily',
    'daintily',
    'dainty',
    'dairy',
    'daisy',
    'dallying',
    'dance',
    'dancing',
    'dandelion',
    'dander',
    'dandruff',
    'dandy',
    'danger',
    'dangle',
    'dangling',
    'daredevil',
    'dares',
    'daringly',
    'darkened',
    'darkening',
    'darkish',
    'darkness',
    'darkroom',
    'darling',
    'darn',
    'dart',
    'darwinism',
    'dash',
    'dastardly',
    'data',
    'datebook',
    'dating',
    'daughter',
    'daunting',
    'dawdler',
    'dawn',
    'daybed',
    'daybreak',
    'daycare',
    'daydream',
    'daylight',
    'daylong',
    'dayroom',
    'daytime',
    'dazzler',
    'dazzling',
    'deacon',
    'deafening',
    'deafness',
    'dealer',
    'dealing',
    'dealmaker',
    'dealt',
    'dean',
    'debatable',
    'debate',
    'debating',
    'debit',
    'debrief',
    'debtless',
    'debtor',
    'debug',
    'debunk',
    'decade',
    'decaf',
    'decal',
    'decathlon',
    'decay',
    'deceased',
    'deceit',
    'deceiver',
    'deceiving',
    'december',
    'decency',
    'decent',
    'deception',
    'deceptive',
    'decibel',
    'decidable',
    'decimal',
    'decimeter',
    'decipher',
    'deck',
    'declared',
    'decline',
    'decode',
    'decompose',
    'decorated',
    'decorator',
    'decoy',
    'decrease',
    'decree',
    'dedicate',
    'dedicator',
    'deduce',
    'deduct',
    'deed',
    'deem',
    'deepen',
    'deeply',
    'deepness',
    'deface',
    'defacing',
    'defame',
    'default',
    'defeat',
    'defection',
    'defective',
    'defendant',
    'defender',
    'defense',
    'defensive',
    'deferral',
    'deferred',
    'defiance',
    'defiant',
    'defile',
    'defiling',
    'define',
    'definite',
    'deflate',
    'deflation',
    'deflator',
    'deflected',
    'deflector',
    'defog',
    'deforest',
    'defraud',
    'defrost',
    'deftly',
    'defuse',
    'defy',
    'degraded',
    'degrading',
    'degrease',
    'degree',
    'dehydrate',
    'deity',
    'dejected',
    'delay',
    'delegate',
    'delegator',
    'delete',
    'deletion',
    'delicacy',
    'delicate',
    'delicious',
    'delighted',
    'delirious',
    'delirium',
    'deliverer',
    'delivery',
    'delouse',
    'delta',
    'deluge',
    'delusion',
    'deluxe',
    'demanding',
    'demeaning',
    'demeanor',
    'demise',
    'democracy',
    'democrat',
    'demote',
    'demotion',
    'demystify',
    'denatured',
    'deniable',
    'denial',
    'denim',
    'denote',
    'dense',
    'density',
    'dental',
    'dentist',
    'denture',
    'deny',
    'deodorant',
    'deodorize',
    'departed',
    'departure',
    'depict',
    'deplete',
    'depletion',
    'deplored',
    'deploy',
    'deport',
    'depose',
    'depraved',
    'depravity',
    'deprecate',
    'depress',
    'deprive',
    'depth',
    'deputize',
    'deputy',
    'derail',
    'deranged',
    'derby',
    'derived',
    'desecrate',
    'deserve',
    'deserving',
    'designate',
    'designed',
    'designer',
    'designing',
    'deskbound',
    'desktop',
    'deskwork',
    'desolate',
    'despair',
    'despise',
    'despite',
    'destiny',
    'destitute',
    'destruct',
    'detached',
    'detail',
    'detection',
    'detective',
    'detector',
    'detention',
    'detergent',
    'detest',
    'detonate',
    'detonator',
    'detoxify',
    'detract',
    'deuce',
    'devalue',
    'deviancy',
    'deviant',
    'deviate',
    'deviation',
    'deviator',
    'device',
    'devious',
    'devotedly',
    'devotee',
    'devotion',
    'devourer',
    'devouring',
    'devoutly',
    'dexterity',
    'dexterous',
    'diabetes',
    'diabetic',
    'diabolic',
    'diagnoses',
    'diagnosis',
    'diagram',
    'dial',
    'diameter',
    'diaper',
    'diaphragm',
    'diary',
    'dice',
    'dicing',
    'dictate',
    'dictation',
    'dictator',
    'difficult',
    'diffused',
    'diffuser',
    'diffusion',
    'diffusive',
    'dig',
    'dilation',
    'diligence',
    'diligent',
    'dill',
    'dilute',
    'dime',
    'diminish',
    'dimly',
    'dimmed',
    'dimmer',
    'dimness',
    'dimple',
    'diner',
    'dingbat',
    'dinghy',
    'dinginess',
    'dingo',
    'dingy',
    'dining',
    'dinner',
    'diocese',
    'dioxide',
    'diploma',
    'dipped',
    'dipper',
    'dipping',
    'directed',
    'direction',
    'directive',
    'directly',
    'directory',
    'direness',
    'dirtiness',
    'disabled',
    'disagree',
    'disallow',
    'disarm',
    'disarray',
    'disaster',
    'disband',
    'disbelief',
    'disburse',
    'discard',
    'discern',
    'discharge',
    'disclose',
    'discolor',
    'discount',
    'discourse',
    'discover',
    'discuss',
    'disdain',
    'disengage',
    'disfigure',
    'disgrace',
    'dish',
    'disinfect',
    'disjoin',
    'disk',
    'dislike',
    'disliking',
    'dislocate',
    'dislodge',
    'disloyal',
    'dismantle',
    'dismay',
    'dismiss',
    'dismount',
    'disobey',
    'disorder',
    'disown',
    'disparate',
    'disparity',
    'dispatch',
    'dispense',
    'dispersal',
    'dispersed',
    'disperser',
    'displace',
    'display',
    'displease',
    'disposal',
    'dispose',
    'disprove',
    'dispute',
    'disregard',
    'disrupt',
    'dissuade',
    'distance',
    'distant',
    'distaste',
    'distill',
    'distinct',
    'distort',
    'distract',
    'distress',
    'district',
    'distrust',
    'ditch',
    'ditto',
    'ditzy',
    'dividable',
    'divided',
    'dividend',
    'dividers',
    'dividing',
    'divinely',
    'diving',
    'divinity',
    'divisible',
    'divisibly',
    'division',
    'divisive',
    'divorcee',
    'dizziness',
    'dizzy',
    'doable',
    'docile',
    'dock',
    'doctrine',
    'document',
    'dodge',
    'dodgy',
    'doily',
    'doing',
    'dole',
    'dollar',
    'dollhouse',
    'dollop',
    'dolly',
    'dolphin',
    'domain',
    'domelike',
    'domestic',
    'dominion',
    'dominoes',
    'donated',
    'donation',
    'donator',
    'donor',
    'donut',
    'doodle',
    'doorbell',
    'doorframe',
    'doorknob',
    'doorman',
    'doormat',
    'doornail',
    'doorpost',
    'doorstep',
    'doorstop',
    'doorway',
    'doozy',
    'dork',
    'dormitory',
    'dorsal',
    'dosage',
    'dose',
    'dotted',
    'doubling',
    'douche',
    'dove',
    'down',
    'dowry',
    'doze',
    'drab',
    'dragging',
    'dragonfly',
    'dragonish',
    'dragster',
    'drainable',
    'drainage',
    'drained',
    'drainer',
    'drainpipe',
    'dramatic',
    'dramatize',
    'drank',
    'drapery',
    'drastic',
    'draw',
    'dreaded',
    'dreadful',
    'dreadlock',
    'dreamboat',
    'dreamily',
    'dreamland',
    'dreamless',
    'dreamlike',
    'dreamt',
    'dreamy',
    'drearily',
    'dreary',
    'drench',
    'dress',
    'drew',
    'dribble',
    'dried',
    'drier',
    'drift',
    'driller',
    'drilling',
    'drinkable',
    'drinking',
    'dripping',
    'drippy',
    'drivable',
    'driven',
    'driver',
    'driveway',
    'driving',
    'drizzle',
    'drizzly',
    'drone',
    'drool',
    'droop',
    'drop-down',
    'dropbox',
    'dropkick',
    'droplet',
    'dropout',
    'dropper',
    'drove',
    'drown',
    'drowsily',
    'drudge',
    'drum',
    'dry',
    'dubbed',
    'dubiously',
    'duchess',
    'duckbill',
    'ducking',
    'duckling',
    'ducktail',
    'ducky',
    'duct',
    'dude',
    'duffel',
    'dugout',
    'duh',
    'duke',
    'duller',
    'dullness',
    'duly',
    'dumping',
    'dumpling',
    'dumpster',
    'duo',
    'dupe',
    'duplex',
    'duplicate',
    'duplicity',
    'durable',
    'durably',
    'duration',
    'duress',
    'during',
    'dusk',
    'dust',
    'dutiful',
    'duty',
    'duvet',
    'dwarf',
    'dweeb',
    'dwelled',
    'dweller',
    'dwelling',
    'dwindle',
    'dwindling',
    'dynamic',
    'dynamite',
    'dynasty',
    'dyslexia',
    'dyslexic',
    'each',
    'eagle',
    'earache',
    'eardrum',
    'earflap',
    'earful',
    'earlobe',
    'early',
    'earmark',
    'earmuff',
    'earphone',
    'earpiece',
    'earplugs',
    'earring',
    'earshot',
    'earthen',
    'earthlike',
    'earthling',
    'earthly',
    'earthworm',
    'earthy',
    'earwig',
    'easeful',
    'easel',
    'easiest',
    'easily',
    'easiness',
    'easing',
    'eastbound',
    'eastcoast',
    'easter',
    'eastward',
    'eatable',
    'eaten',
    'eatery',
    'eating',
    'eats',
    'ebay',
    'ebony',
    'ebook',
    'ecard',
    'eccentric',
    'echo',
    'eclair',
    'eclipse',
    'ecologist',
    'ecology',
    'economic',
    'economist',
    'economy',
    'ecosphere',
    'ecosystem',
    'edge',
    'edginess',
    'edging',
    'edgy',
    'edition',
    'editor',
    'educated',
    'education',
    'educator',
    'eel',
    'effective',
    'effects',
    'efficient',
    'effort',
    'eggbeater',
    'egging',
    'eggnog',
    'eggplant',
    'eggshell',
    'egomaniac',
    'egotism',
    'egotistic',
    'either',
    'eject',
    'elaborate',
    'elastic',
    'elated',
    'elbow',
    'eldercare',
    'elderly',
    'eldest',
    'electable',
    'election',
    'elective',
    'elephant',
    'elevate',
    'elevating',
    'elevation',
    'elevator',
    'eleven',
    'elf',
    'eligible',
    'eligibly',
    'eliminate',
    'elite',
    'elitism',
    'elixir',
    'elk',
    'ellipse',
    'elliptic',
    'elm',
    'elongated',
    'elope',
    'eloquence',
    'eloquent',
    'elsewhere',
    'elude',
    'elusive',
    'elves',
    'email',
    'embargo',
    'embark',
    'embassy',
    'embattled',
    'embellish',
    'ember',
    'embezzle',
    'emblaze',
    'emblem',
    'embody',
    'embolism',
    'emboss',
    'embroider',
    'emcee',
    'emerald',
    'emergency',
    'emission',
    'emit',
    'emote',
    'emoticon',
    'emotion',
    'empathic',
    'empathy',
    'emperor',
    'emphases',
    'emphasis',
    'emphasize',
    'emphatic',
    'empirical',
    'employed',
    'employee',
    'employer',
    'emporium',
    'empower',
    'emptier',
    'emptiness',
    'empty',
    'emu',
    'enable',
    'enactment',
    'enamel',
    'enchanted',
    'enchilada',
    'encircle',
    'enclose',
    'enclosure',
    'encode',
    'encore',
    'encounter',
    'encourage',
    'encroach',
    'encrust',
    'encrypt',
    'endanger',
    'endeared',
    'endearing',
    'ended',
    'ending',
    'endless',
    'endnote',
    'endocrine',
    'endorphin',
    'endorse',
    'endowment',
    'endpoint',
    'endurable',
    'endurance',
    'enduring',
    'energetic',
    'energize',
    'energy',
    'enforced',
    'enforcer',
    'engaged',
    'engaging',
    'engine',
    'engorge',
    'engraved',
    'engraver',
    'engraving',
    'engross',
    'engulf',
    'enhance',
    'enigmatic',
    'enjoyable',
    'enjoyably',
    'enjoyer',
    'enjoying',
    'enjoyment',
    'enlarged',
    'enlarging',
    'enlighten',
    'enlisted',
    'enquirer',
    'enrage',
    'enrich',
    'enroll',
    'enslave',
    'ensnare',
    'ensure',
    'entail',
    'entangled',
    'entering',
    'entertain',
    'enticing',
    'entire',
    'entitle',
    'entity',
    'entomb',
    'entourage',
    'entrap',
    'entree',
    'entrench',
    'entrust',
    'entryway',
    'entwine',
    'enunciate',
    'envelope',
    'enviable',
    'enviably',
    'envious',
    'envision',
    'envoy',
    'envy',
    'enzyme',
    'epic',
    'epidemic',
    'epidermal',
    'epidermis',
    'epidural',
    'epilepsy',
    'epileptic',
    'epilogue',
    'epiphany',
    'episode',
    'equal',
    'equate',
    'equation',
    'equator',
    'equinox',
    'equipment',
    'equity',
    'equivocal',
    'eradicate',
    'erasable',
    'erased',
    'eraser',
    'erasure',
    'ergonomic',
    'errand',
    'errant',
    'erratic',
    'error',
    'erupt',
    'escalate',
    'escalator',
    'escapable',
    'escapade',
    'escapist',
    'escargot',
    'eskimo',
    'esophagus',
    'espionage',
    'espresso',
    'esquire',
    'essay',
    'essence',
    'essential',
    'establish',
    'estate',
    'esteemed',
    'estimate',
    'estimator',
    'estranged',
    'estrogen',
    'etching',
    'eternal',
    'eternity',
    'ethanol',
    'ether',
    'ethically',
    'ethics',
    'euphemism',
    'evacuate',
    'evacuee',
    'evade',
    'evaluate',
    'evaluator',
    'evaporate',
    'evasion',
    'evasive',
    'even',
    'everglade',
    'evergreen',
    'everybody',
    'everyday',
    'everyone',
    'evict',
    'evidence',
    'evident',
    'evil',
    'evoke',
    'evolution',
    'evolve',
    'exact',
    'exalted',
    'example',
    'excavate',
    'excavator',
    'exceeding',
    'exception',
    'excess',
    'exchange',
    'excitable',
    'exciting',
    'exclaim',
    'exclude',
    'excluding',
    'exclusion',
    'exclusive',
    'excretion',
    'excretory',
    'excursion',
    'excusable',
    'excusably',
    'excuse',
    'exemplary',
    'exemplify',
    'exemption',
    'exerciser',
    'exert',
    'exes',
    'exfoliate',
    'exhale',
    'exhaust',
    'exhume',
    'exile',
    'existing',
    'exit',
    'exodus',
    'exonerate',
    'exorcism',
    'exorcist',
    'expand',
    'expanse',
    'expansion',
    'expansive',
    'expectant',
    'expedited',
    'expediter',
    'expel',
    'expend',
    'expenses',
    'expensive',
    'expert',
    'expire',
    'expiring',
    'explain',
    'expletive',
    'explicit',
    'explode',
    'exploit',
    'explore',
    'exploring',
    'exponent',
    'exporter',
    'exposable',
    'expose',
    'exposure',
    'express',
    'expulsion',
    'exquisite',
    'extended',
    'extending',
    'extent',
    'extenuate',
    'exterior',
    'external',
    'extinct',
    'extortion',
    'extradite',
    'extras',
    'extrovert',
    'extrude',
    'extruding',
    'exuberant',
    'fable',
    'fabric',
    'fabulous',
    'facebook',
    'facecloth',
    'facedown',
    'faceless',
    'facelift',
    'faceplate',
    'faceted',
    'facial',
    'facility',
    'facing',
    'facsimile',
    'faction',
    'factoid',
    'factor',
    'factsheet',
    'factual',
    'faculty',
    'fade',
    'fading',
    'failing',
    'falcon',
    'fall',
    'false',
    'falsify',
    'fame',
    'familiar',
    'family',
    'famine',
    'famished',
    'fanatic',
    'fancied',
    'fanciness',
    'fancy',
    'fanfare',
    'fang',
    'fanning',
    'fantasize',
    'fantastic',
    'fantasy',
    'fascism',
    'fastball',
    'faster',
    'fasting',
    'fastness',
    'faucet',
    'favorable',
    'favorably',
    'favored',
    'favoring',
    'favorite',
    'fax',
    'feast',
    'federal',
    'fedora',
    'feeble',
    'feed',
    'feel',
    'feisty',
    'feline',
    'felt-tip',
    'feminine',
    'feminism',
    'feminist',
    'feminize',
    'femur',
    'fence',
    'fencing',
    'fender',
    'ferment',
    'fernlike',
    'ferocious',
    'ferocity',
    'ferret',
    'ferris',
    'ferry',
    'fervor',
    'fester',
    'festival',
    'festive',
    'festivity',
    'fetal',
    'fetch',
    'fever',
    'fiber',
    'fiction',
    'fiddle',
    'fiddling',
    'fidelity',
    'fidgeting',
    'fidgety',
    'fifteen',
    'fifth',
    'fiftieth',
    'fifty',
    'figment',
    'figure',
    'figurine',
    'filing',
    'filled',
    'filler',
    'filling',
    'film',
    'filter',
    'filth',
    'filtrate',
    'finale',
    'finalist',
    'finalize',
    'finally',
    'finance',
    'financial',
    'finch',
    'fineness',
    'finer',
    'finicky',
    'finished',
    'finisher',
    'finishing',
    'finite',
    'finless',
    'finlike',
    'fiscally',
    'fit',
    'five',
    'flaccid',
    'flagman',
    'flagpole',
    'flagship',
    'flagstick',
    'flagstone',
    'flail',
    'flakily',
    'flaky',
    'flame',
    'flammable',
    'flanked',
    'flanking',
    'flannels',
    'flap',
    'flaring',
    'flashback',
    'flashbulb',
    'flashcard',
    'flashily',
    'flashing',
    'flashy',
    'flask',
    'flatbed',
    'flatfoot',
    'flatly',
    'flatness',
    'flatten',
    'flattered',
    'flatterer',
    'flattery',
    'flattop',
    'flatware',
    'flatworm',
    'flavored',
    'flavorful',
    'flavoring',
    'flaxseed',
    'fled',
    'fleshed',
    'fleshy',
    'flick',
    'flier',
    'flight',
    'flinch',
    'fling',
    'flint',
    'flip',
    'flirt',
    'float',
    'flock',
    'flogging',
    'flop',
    'floral',
    'florist',
    'floss',
    'flounder',
    'flyable',
    'flyaway',
    'flyer',
    'flying',
    'flyover',
    'flypaper',
    'foam',
    'foe',
    'fog',
    'foil',
    'folic',
    'folk',
    'follicle',
    'follow',
    'fondling',
    'fondly',
    'fondness',
    'fondue',
    'font',
    'food',
    'fool',
    'footage',
    'football',
    'footbath',
    'footboard',
    'footer',
    'footgear',
    'foothill',
    'foothold',
    'footing',
    'footless',
    'footman',
    'footnote',
    'footpad',
    'footpath',
    'footprint',
    'footrest',
    'footsie',
    'footsore',
    'footwear',
    'footwork',
    'fossil',
    'foster',
    'founder',
    'founding',
    'fountain',
    'fox',
    'foyer',
    'fraction',
    'fracture',
    'fragile',
    'fragility',
    'fragment',
    'fragrance',
    'fragrant',
    'frail',
    'frame',
    'framing',
    'frantic',
    'fraternal',
    'frayed',
    'fraying',
    'frays',
    'freckled',
    'freckles',
    'freebase',
    'freebee',
    'freebie',
    'freedom',
    'freefall',
    'freehand',
    'freeing',
    'freeload',
    'freely',
    'freemason',
    'freeness',
    'freestyle',
    'freeware',
    'freeway',
    'freewill',
    'freezable',
    'freezing',
    'freight',
    'french',
    'frenzied',
    'frenzy',
    'frequency',
    'frequent',
    'fresh',
    'fretful',
    'fretted',
    'friction',
    'friday',
    'fridge',
    'fried',
    'friend',
    'frighten',
    'frightful',
    'frigidity',
    'frigidly',
    'frill',
    'fringe',
    'frisbee',
    'frisk',
    'fritter',
    'frivolous',
    'frolic',
    'from',
    'front',
    'frostbite',
    'frosted',
    'frostily',
    'frosting',
    'frostlike',
    'frosty',
    'froth',
    'frown',
    'frozen',
    'fructose',
    'frugality',
    'frugally',
    'fruit',
    'frustrate',
    'frying',
    'gab',
    'gaffe',
    'gag',
    'gainfully',
    'gaining',
    'gains',
    'gala',
    'gallantly',
    'galleria',
    'gallery',
    'galley',
    'gallon',
    'gallows',
    'gallstone',
    'galore',
    'galvanize',
    'gambling',
    'game',
    'gaming',
    'gamma',
    'gander',
    'gangly',
    'gangrene',
    'gangway',
    'gap',
    'garage',
    'garbage',
    'garden',
    'gargle',
    'garland',
    'garlic',
    'garment',
    'garnet',
    'garnish',
    'garter',
    'gas',
    'gatherer',
    'gathering',
    'gating',
    'gauging',
    'gauntlet',
    'gauze',
    'gave',
    'gawk',
    'gazing',
    'gear',
    'gecko',
    'geek',
    'geiger',
    'gem',
    'gender',
    'generic',
    'generous',
    'genetics',
    'genre',
    'gentile',
    'gentleman',
    'gently',
    'gents',
    'geography',
    'geologic',
    'geologist',
    'geology',
    'geometric',
    'geometry',
    'geranium',
    'gerbil',
    'geriatric',
    'germicide',
    'germinate',
    'germless',
    'germproof',
    'gestate',
    'gestation',
    'gesture',
    'getaway',
    'getting',
    'getup',
    'giant',
    'gibberish',
    'giblet',
    'giddily',
    'giddiness',
    'giddy',
    'gift',
    'gigabyte',
    'gigahertz',
    'gigantic',
    'giggle',
    'giggling',
    'giggly',
    'gigolo',
    'gilled',
    'gills',
    'gimmick',
    'girdle',
    'giveaway',
    'given',
    'giver',
    'giving',
    'gizmo',
    'gizzard',
    'glacial',
    'glacier',
    'glade',
    'gladiator',
    'gladly',
    'glamorous',
    'glamour',
    'glance',
    'glancing',
    'glandular',
    'glare',
    'glaring',
    'glass',
    'glaucoma',
    'glazing',
    'gleaming',
    'gleeful',
    'glider',
    'gliding',
    'glimmer',
    'glimpse',
    'glisten',
    'glitch',
    'glitter',
    'glitzy',
    'gloater',
    'gloating',
    'gloomily',
    'gloomy',
    'glorified',
    'glorifier',
    'glorify',
    'glorious',
    'glory',
    'gloss',
    'glove',
    'glowing',
    'glowworm',
    'glucose',
    'glue',
    'gluten',
    'glutinous',
    'glutton',
    'gnarly',
    'gnat',
    'goal',
    'goatskin',
    'goes',
    'goggles',
    'going',
    'goldfish',
    'goldmine',
    'goldsmith',
    'golf',
    'goliath',
    'gonad',
    'gondola',
    'gone',
    'gong',
    'good',
    'gooey',
    'goofball',
    'goofiness',
    'goofy',
    'google',
    'goon',
    'gopher',
    'gore',
    'gorged',
    'gorgeous',
    'gory',
    'gosling',
    'gossip',
    'gothic',
    'gotten',
    'gout',
    'gown',
    'grab',
    'graceful',
    'graceless',
    'gracious',
    'gradation',
    'graded',
    'grader',
    'gradient',
    'grading',
    'gradually',
    'graduate',
    'graffiti',
    'grafted',
    'grafting',
    'grain',
    'granddad',
    'grandkid',
    'grandly',
    'grandma',
    'grandpa',
    'grandson',
    'granite',
    'granny',
    'granola',
    'grant',
    'granular',
    'grape',
    'graph',
    'grapple',
    'grappling',
    'grasp',
    'grass',
    'gratified',
    'gratify',
    'grating',
    'gratitude',
    'gratuity',
    'gravel',
    'graveness',
    'graves',
    'graveyard',
    'gravitate',
    'gravity',
    'gravy',
    'gray',
    'grazing',
    'greasily',
    'greedily',
    'greedless',
    'greedy',
    'green',
    'greeter',
    'greeting',
    'grew',
    'greyhound',
    'grid',
    'grief',
    'grievance',
    'grieving',
    'grievous',
    'grill',
    'grimace',
    'grimacing',
    'grime',
    'griminess',
    'grimy',
    'grinch',
    'grinning',
    'grip',
    'gristle',
    'grit',
    'groggily',
    'groggy',
    'groin',
    'groom',
    'groove',
    'grooving',
    'groovy',
    'grope',
    'ground',
    'grouped',
    'grout',
    'grove',
    'grower',
    'growing',
    'growl',
    'grub',
    'grudge',
    'grudging',
    'grueling',
    'gruffly',
    'grumble',
    'grumbling',
    'grumbly',
    'grumpily',
    'grunge',
    'grunt',
    'guacamole',
    'guidable',
    'guidance',
    'guide',
    'guiding',
    'guileless',
    'guise',
    'gulf',
    'gullible',
    'gully',
    'gulp',
    'gumball',
    'gumdrop',
    'gumminess',
    'gumming',
    'gummy',
    'gurgle',
    'gurgling',
    'guru',
    'gush',
    'gusto',
    'gusty',
    'gutless',
    'guts',
    'gutter',
    'guy',
    'guzzler',
    'gyration',
    'habitable',
    'habitant',
    'habitat',
    'habitual',
    'hacked',
    'hacker',
    'hacking',
    'hacksaw',
    'had',
    'haggler',
    'haiku',
    'half',
    'halogen',
    'halt',
    'halved',
    'halves',
    'hamburger',
    'hamlet',
    'hammock',
    'hamper',
    'hamster',
    'hamstring',
    'handbag',
    'handball',
    'handbook',
    'handbrake',
    'handcart',
    'handclap',
    'handclasp',
    'handcraft',
    'handcuff',
    'handed',
    'handful',
    'handgrip',
    'handgun',
    'handheld',
    'handiness',
    'handiwork',
    'handlebar',
    'handled',
    'handler',
    'handling',
    'handmade',
    'handoff',
    'handpick',
    'handprint',
    'handrail',
    'handsaw',
    'handset',
    'handsfree',
    'handshake',
    'handstand',
    'handwash',
    'handwork',
    'handwoven',
    'handwrite',
    'handyman',
    'hangnail',
    'hangout',
    'hangover',
    'hangup',
    'hankering',
    'hankie',
    'hanky',
    'haphazard',
    'happening',
    'happier',
    'happiest',
    'happily',
    'happiness',
    'happy',
    'harbor',
    'hardcopy',
    'hardcore',
    'hardcover',
    'harddisk',
    'hardened',
    'hardener',
    'hardening',
    'hardhat',
    'hardhead',
    'hardiness',
    'hardly',
    'hardness',
    'hardship',
    'hardware',
    'hardwired',
    'hardwood',
    'hardy',
    'harmful',
    'harmless',
    'harmonica',
    'harmonics',
    'harmonize',
    'harmony',
    'harness',
    'harpist',
    'harsh',
    'harvest',
    'hash',
    'hassle',
    'haste',
    'hastily',
    'hastiness',
    'hasty',
    'hatbox',
    'hatchback',
    'hatchery',
    'hatchet',
    'hatching',
    'hatchling',
    'hate',
    'hatless',
    'hatred',
    'haunt',
    'haven',
    'hazard',
    'hazelnut',
    'hazily',
    'haziness',
    'hazing',
    'hazy',
    'headache',
    'headband',
    'headboard',
    'headcount',
    'headdress',
    'headed',
    'header',
    'headfirst',
    'headgear',
    'heading',
    'headlamp',
    'headless',
    'headlock',
    'headphone',
    'headpiece',
    'headrest',
    'headroom',
    'headscarf',
    'headset',
    'headsman',
    'headstand',
    'headstone',
    'headway',
    'headwear',
    'heap',
    'heat',
    'heave',
    'heavily',
    'heaviness',
    'heaving',
    'hedge',
    'hedging',
    'heftiness',
    'hefty',
    'helium',
    'helmet',
    'helper',
    'helpful',
    'helping',
    'helpless',
    'helpline',
    'hemlock',
    'hemstitch',
    'hence',
    'henchman',
    'henna',
    'herald',
    'herbal',
    'herbicide',
    'herbs',
    'heritage',
    'hermit',
    'heroics',
    'heroism',
    'herring',
    'herself',
    'hertz',
    'hesitancy',
    'hesitant',
    'hesitate',
    'hexagon',
    'hexagram',
    'hubcap',
    'huddle',
    'huddling',
    'huff',
    'hug',
    'hula',
    'hulk',
    'hull',
    'human',
    'humble',
    'humbling',
    'humbly',
    'humid',
    'humiliate',
    'humility',
    'humming',
    'hummus',
    'humongous',
    'humorist',
    'humorless',
    'humorous',
    'humpback',
    'humped',
    'humvee',
    'hunchback',
    'hundredth',
    'hunger',
    'hungrily',
    'hungry',
    'hunk',
    'hunter',
    'hunting',
    'huntress',
    'huntsman',
    'hurdle',
    'hurled',
    'hurler',
    'hurling',
    'hurray',
    'hurricane',
    'hurried',
    'hurry',
    'hurt',
    'husband',
    'hush',
    'husked',
    'huskiness',
    'hut',
    'hybrid',
    'hydrant',
    'hydrated',
    'hydration',
    'hydrogen',
    'hydroxide',
    'hyperlink',
    'hypertext',
    'hyphen',
    'hypnoses',
    'hypnosis',
    'hypnotic',
    'hypnotism',
    'hypnotist',
    'hypnotize',
    'hypocrisy',
    'hypocrite',
    'ibuprofen',
    'ice',
    'iciness',
    'icing',
    'icky',
    'icon',
    'icy',
    'idealism',
    'idealist',
    'idealize',
    'ideally',
    'idealness',
    'identical',
    'identify',
    'identity',
    'ideology',
    'idiocy',
    'idiom',
    'idly',
    'igloo',
    'ignition',
    'ignore',
    'iguana',
    'illicitly',
    'illusion',
    'illusive',
    'image',
    'imaginary',
    'imagines',
    'imaging',
    'imbecile',
    'imitate',
    'imitation',
    'immature',
    'immerse',
    'immersion',
    'imminent',
    'immobile',
    'immodest',
    'immorally',
    'immortal',
    'immovable',
    'immovably',
    'immunity',
    'immunize',
    'impaired',
    'impale',
    'impart',
    'impatient',
    'impeach',
    'impeding',
    'impending',
    'imperfect',
    'imperial',
    'impish',
    'implant',
    'implement',
    'implicate',
    'implicit',
    'implode',
    'implosion',
    'implosive',
    'imply',
    'impolite',
    'important',
    'importer',
    'impose',
    'imposing',
    'impotence',
    'impotency',
    'impotent',
    'impound',
    'imprecise',
    'imprint',
    'imprison',
    'impromptu',
    'improper',
    'improve',
    'improving',
    'improvise',
    'imprudent',
    'impulse',
    'impulsive',
    'impure',
    'impurity',
    'iodine',
    'iodize',
    'ion',
    'ipad',
    'iphone',
    'ipod',
    'irate',
    'irk',
    'iron',
    'irregular',
    'irrigate',
    'irritable',
    'irritably',
    'irritant',
    'irritate',
    'islamic',
    'islamist',
    'isolated',
    'isolating',
    'isolation',
    'isotope',
    'issue',
    'issuing',
    'italicize',
    'italics',
    'item',
    'itinerary',
    'itunes',
    'ivory',
    'ivy',
    'jab',
    'jackal',
    'jacket',
    'jackknife',
    'jackpot',
    'jailbird',
    'jailbreak',
    'jailer',
    'jailhouse',
    'jalapeno',
    'jam',
    'janitor',
    'january',
    'jargon',
    'jarring',
    'jasmine',
    'jaundice',
    'jaunt',
    'java',
    'jawed',
    'jawless',
    'jawline',
    'jaws',
    'jaybird',
    'jaywalker',
    'jazz',
    'jeep',
    'jeeringly',
    'jellied',
    'jelly',
    'jersey',
    'jester',
    'jet',
    'jiffy',
    'jigsaw',
    'jimmy',
    'jingle',
    'jingling',
    'jinx',
    'jitters',
    'jittery',
    'job',
    'jockey',
    'jockstrap',
    'jogger',
    'jogging',
    'john',
    'joining',
    'jokester',
    'jokingly',
    'jolliness',
    'jolly',
    'jolt',
    'jot',
    'jovial',
    'joyfully',
    'joylessly',
    'joyous',
    'joyride',
    'joystick',
    'jubilance',
    'jubilant',
    'judge',
    'judgingly',
    'judicial',
    'judiciary',
    'judo',
    'juggle',
    'juggling',
    'jugular',
    'juice',
    'juiciness',
    'juicy',
    'jujitsu',
    'jukebox',
    'july',
    'jumble',
    'jumbo',
    'jump',
    'junction',
    'juncture',
    'june',
    'junior',
    'juniper',
    'junkie',
    'junkman',
    'junkyard',
    'jurist',
    'juror',
    'jury',
    'justice',
    'justifier',
    'justify',
    'justly',
    'justness',
    'juvenile',
    'kabob',
    'kangaroo',
    'karaoke',
    'karate',
    'karma',
    'kebab',
    'keenly',
    'keenness',
    'keep',
    'keg',
    'kelp',
    'kennel',
    'kept',
    'kerchief',
    'kerosene',
    'kettle',
    'kick',
    'kiln',
    'kilobyte',
    'kilogram',
    'kilometer',
    'kilowatt',
    'kilt',
    'kimono',
    'kindle',
    'kindling',
    'kindly',
    'kindness',
    'kindred',
    'kinetic',
    'kinfolk',
    'king',
    'kinship',
    'kinsman',
    'kinswoman',
    'kissable',
    'kisser',
    'kissing',
    'kitchen',
    'kite',
    'kitten',
    'kitty',
    'kiwi',
    'kleenex',
    'knapsack',
    'knee',
    'knelt',
    'knickers',
    'knoll',
    'koala',
    'kooky',
    'kosher',
    'krypton',
    'kudos',
    'kung',
    'labored',
    'laborer',
    'laboring',
    'laborious',
    'labrador',
    'ladder',
    'ladies',
    'ladle',
    'ladybug',
    'ladylike',
    'lagged',
    'lagging',
    'lagoon',
    'lair',
    'lake',
    'lance',
    'landed',
    'landfall',
    'landfill',
    'landing',
    'landlady',
    'landless',
    'landline',
    'landlord',
    'landmark',
    'landmass',
    'landmine',
    'landowner',
    'landscape',
    'landside',
    'landslide',
    'language',
    'lankiness',
    'lanky',
    'lantern',
    'lapdog',
    'lapel',
    'lapped',
    'lapping',
    'laptop',
    'lard',
    'large',
    'lark',
    'lash',
    'lasso',
    'last',
    'latch',
    'late',
    'lather',
    'latitude',
    'latrine',
    'latter',
    'latticed',
    'launch',
    'launder',
    'laundry',
    'laurel',
    'lavender',
    'lavish',
    'laxative',
    'lazily',
    'laziness',
    'lazy',
    'lecturer',
    'left',
    'legacy',
    'legal',
    'legend',
    'legged',
    'leggings',
    'legible',
    'legibly',
    'legislate',
    'lego',
    'legroom',
    'legume',
    'legwarmer',
    'legwork',
    'lemon',
    'lend',
    'length',
    'lens',
    'lent',
    'leotard',
    'lesser',
    'letdown',
    'lethargic',
    'lethargy',
    'letter',
    'lettuce',
    'level',
    'leverage',
    'levers',
    'levitate',
    'levitator',
    'liability',
    'liable',
    'liberty',
    'librarian',
    'library',
    'licking',
    'licorice',
    'lid',
    'life',
    'lifter',
    'lifting',
    'liftoff',
    'ligament',
    'likely',
    'likeness',
    'likewise',
    'liking',
    'lilac',
    'lilly',
    'lily',
    'limb',
    'limeade',
    'limelight',
    'limes',
    'limit',
    'limping',
    'limpness',
    'line',
    'lingo',
    'linguini',
    'linguist',
    'lining',
    'linked',
    'linoleum',
    'linseed',
    'lint',
    'lion',
    'lip',
    'liquefy',
    'liqueur',
    'liquid',
    'lisp',
    'list',
    'litigate',
    'litigator',
    'litmus',
    'litter',
    'little',
    'livable',
    'lived',
    'lively',
    'liver',
    'livestock',
    'lividly',
    'living',
    'lizard',
    'lubricant',
    'lubricate',
    'lucid',
    'luckily',
    'luckiness',
    'luckless',
    'lucrative',
    'ludicrous',
    'lugged',
    'lukewarm',
    'lullaby',
    'lumber',
    'luminance',
    'luminous',
    'lumpiness',
    'lumping',
    'lumpish',
    'lunacy',
    'lunar',
    'lunchbox',
    'luncheon',
    'lunchroom',
    'lunchtime',
    'lung',
    'lurch',
    'lure',
    'luridness',
    'lurk',
    'lushly',
    'lushness',
    'luster',
    'lustfully',
    'lustily',
    'lustiness',
    'lustrous',
    'lusty',
    'luxurious',
    'luxury',
    'lying',
    'lyrically',
    'lyricism',
    'lyricist',
    'lyrics',
    'macarena',
    'macaroni',
    'macaw',
    'mace',
    'machine',
    'machinist',
    'magazine',
    'magenta',
    'maggot',
    'magical',
    'magician',
    'magma',
    'magnesium',
    'magnetic',
    'magnetism',
    'magnetize',
    'magnifier',
    'magnify',
    'magnitude',
    'magnolia',
    'mahogany',
    'maimed',
    'majestic',
    'majesty',
    'majorette',
    'majority',
    'makeover',
    'maker',
    'makeshift',
    'making',
    'malformed',
    'malt',
    'mama',
    'mammal',
    'mammary',
    'mammogram',
    'manager',
    'managing',
    'manatee',
    'mandarin',
    'mandate',
    'mandatory',
    'mandolin',
    'manger',
    'mangle',
    'mango',
    'mangy',
    'manhandle',
    'manhole',
    'manhood',
    'manhunt',
    'manicotti',
    'manicure',
    'manifesto',
    'manila',
    'mankind',
    'manlike',
    'manliness',
    'manly',
    'manmade',
    'manned',
    'mannish',
    'manor',
    'manpower',
    'mantis',
    'mantra',
    'manual',
    'many',
    'map',
    'marathon',
    'marauding',
    'marbled',
    'marbles',
    'marbling',
    'march',
    'mardi',
    'margarine',
    'margarita',
    'margin',
    'marigold',
    'marina',
    'marine',
    'marital',
    'maritime',
    'marlin',
    'marmalade',
    'maroon',
    'married',
    'marrow',
    'marry',
    'marshland',
    'marshy',
    'marsupial',
    'marvelous',
    'marxism',
    'mascot',
    'masculine',
    'mashed',
    'mashing',
    'massager',
    'masses',
    'massive',
    'mastiff',
    'matador',
    'matchbook',
    'matchbox',
    'matcher',
    'matching',
    'matchless',
    'material',
    'maternal',
    'maternity',
    'math',
    'mating',
    'matriarch',
    'matrimony',
    'matrix',
    'matron',
    'matted',
    'matter',
    'maturely',
    'maturing',
    'maturity',
    'mauve',
    'maverick',
    'maximize',
    'maximum',
    'maybe',
    'mayday',
    'mayflower',
    'moaner',
    'moaning',
    'mobile',
    'mobility',
    'mobilize',
    'mobster',
    'mocha',
    'mocker',
    'mockup',
    'modified',
    'modify',
    'modular',
    'modulator',
    'module',
    'moisten',
    'moistness',
    'moisture',
    'molar',
    'molasses',
    'mold',
    'molecular',
    'molecule',
    'molehill',
    'mollusk',
    'mom',
    'monastery',
    'monday',
    'monetary',
    'monetize',
    'moneybags',
    'moneyless',
    'moneywise',
    'mongoose',
    'mongrel',
    'monitor',
    'monkhood',
    'monogamy',
    'monogram',
    'monologue',
    'monopoly',
    'monorail',
    'monotone',
    'monotype',
    'monoxide',
    'monsieur',
    'monsoon',
    'monstrous',
    'monthly',
    'monument',
    'moocher',
    'moodiness',
    'moody',
    'mooing',
    'moonbeam',
    'mooned',
    'moonlight',
    'moonlike',
    'moonlit',
    'moonrise',
    'moonscape',
    'moonshine',
    'moonstone',
    'moonwalk',
    'mop',
    'morale',
    'morality',
    'morally',
    'morbidity',
    'morbidly',
    'morphine',
    'morphing',
    'morse',
    'mortality',
    'mortally',
    'mortician',
    'mortified',
    'mortify',
    'mortuary',
    'mosaic',
    'mossy',
    'most',
    'mothball',
    'mothproof',
    'motion',
    'motivate',
    'motivator',
    'motive',
    'motocross',
    'motor',
    'motto',
    'mountable',
    'mountain',
    'mounted',
    'mounting',
    'mourner',
    'mournful',
    'mouse',
    'mousiness',
    'moustache',
    'mousy',
    'mouth',
    'movable',
    'move',
    'movie',
    'moving',
    'mower',
    'mowing',
    'much',
    'muck',
    'mud',
    'mug',
    'mulberry',
    'mulch',
    'mule',
    'mulled',
    'mullets',
    'multiple',
    'multiply',
    'multitask',
    'multitude',
    'mumble',
    'mumbling',
    'mumbo',
    'mummified',
    'mummify',
    'mummy',
    'mumps',
    'munchkin',
    'mundane',
    'municipal',
    'muppet',
    'mural',
    'murkiness',
    'murky',
    'murmuring',
    'muscular',
    'museum',
    'mushily',
    'mushiness',
    'mushroom',
    'mushy',
    'music',
    'musket',
    'muskiness',
    'musky',
    'mustang',
    'mustard',
    'muster',
    'mustiness',
    'musty',
    'mutable',
    'mutate',
    'mutation',
    'mute',
    'mutilated',
    'mutilator',
    'mutiny',
    'mutt',
    'mutual',
    'muzzle',
    'myself',
    'myspace',
    'mystified',
    'mystify',
    'myth',
    'nacho',
    'nag',
    'nail',
    'name',
    'naming',
    'nanny',
    'nanometer',
    'nape',
    'napkin',
    'napped',
    'napping',
    'nappy',
    'narrow',
    'nastily',
    'nastiness',
    'national',
    'native',
    'nativity',
    'natural',
    'nature',
    'naturist',
    'nautical',
    'navigate',
    'navigator',
    'navy',
    'nearby',
    'nearest',
    'nearly',
    'nearness',
    'neatly',
    'neatness',
    'nebula',
    'nebulizer',
    'nectar',
    'negate',
    'negation',
    'negative',
    'neglector',
    'negligee',
    'negligent',
    'negotiate',
    'nemeses',
    'nemesis',
    'neon',
    'nephew',
    'nerd',
    'nervous',
    'nervy',
    'nest',
    'net',
    'neurology',
    'neuron',
    'neurosis',
    'neurotic',
    'neuter',
    'neutron',
    'never',
    'next',
    'nibble',
    'nickname',
    'nicotine',
    'niece',
    'nifty',
    'nimble',
    'nimbly',
    'nineteen',
    'ninetieth',
    'ninja',
    'nintendo',
    'ninth',
    'nuclear',
    'nuclei',
    'nucleus',
    'nugget',
    'nullify',
    'number',
    'numbing',
    'numbly',
    'numbness',
    'numeral',
    'numerate',
    'numerator',
    'numeric',
    'numerous',
    'nuptials',
    'nursery',
    'nursing',
    'nurture',
    'nutcase',
    'nutlike',
    'nutmeg',
    'nutrient',
    'nutshell',
    'nuttiness',
    'nutty',
    'nuzzle',
    'nylon',
    'oaf',
    'oak',
    'oasis',
    'oat',
    'obedience',
    'obedient',
    'obituary',
    'object',
    'obligate',
    'obliged',
    'oblivion',
    'oblivious',
    'oblong',
    'obnoxious',
    'oboe',
    'obscure',
    'obscurity',
    'observant',
    'observer',
    'observing',
    'obsessed',
    'obsession',
    'obsessive',
    'obsolete',
    'obstacle',
    'obstinate',
    'obstruct',
    'obtain',
    'obtrusive',
    'obtuse',
    'obvious',
    'occultist',
    'occupancy',
    'occupant',
    'occupier',
    'occupy',
    'ocean',
    'ocelot',
    'octagon',
    'octane',
    'october',
    'octopus',
    'ogle',
    'oil',
    'oink',
    'ointment',
    'okay',
    'old',
    'olive',
    'olympics',
    'omega',
    'omen',
    'ominous',
    'omission',
    'omit',
    'omnivore',
    'onboard',
    'oncoming',
    'ongoing',
    'onion',
    'online',
    'onlooker',
    'only',
    'onscreen',
    'onset',
    'onshore',
    'onslaught',
    'onstage',
    'onto',
    'onward',
    'onyx',
    'oops',
    'ooze',
    'oozy',
    'opacity',
    'opal',
    'open',
    'operable',
    'operate',
    'operating',
    'operation',
    'operative',
    'operator',
    'opium',
    'opossum',
    'opponent',
    'oppose',
    'opposing',
    'opposite',
    'oppressed',
    'oppressor',
    'opt',
    'opulently',
    'osmosis',
    'other',
    'otter',
    'ouch',
    'ought',
    'ounce',
    'outage',
    'outback',
    'outbid',
    'outboard',
    'outbound',
    'outbreak',
    'outburst',
    'outcast',
    'outclass',
    'outcome',
    'outdated',
    'outdoors',
    'outer',
    'outfield',
    'outfit',
    'outflank',
    'outgoing',
    'outgrow',
    'outhouse',
    'outing',
    'outlast',
    'outlet',
    'outline',
    'outlook',
    'outlying',
    'outmatch',
    'outmost',
    'outnumber',
    'outplayed',
    'outpost',
    'outpour',
    'output',
    'outrage',
    'outrank',
    'outreach',
    'outright',
    'outscore',
    'outsell',
    'outshine',
    'outshoot',
    'outsider',
    'outskirts',
    'outsmart',
    'outsource',
    'outspoken',
    'outtakes',
    'outthink',
    'outward',
    'outweigh',
    'outwit',
    'oval',
    'ovary',
    'oven',
    'overact',
    'overall',
    'overarch',
    'overbid',
    'overbill',
    'overbite',
    'overblown',
    'overboard',
    'overbook',
    'overbuilt',
    'overcast',
    'overcoat',
    'overcome',
    'overcook',
    'overcrowd',
    'overdraft',
    'overdrawn',
    'overdress',
    'overdrive',
    'overdue',
    'overeager',
    'overeater',
    'overexert',
    'overfed',
    'overfeed',
    'overfill',
    'overflow',
    'overfull',
    'overgrown',
    'overhand',
    'overhang',
    'overhaul',
    'overhead',
    'overhear',
    'overheat',
    'overhung',
    'overjoyed',
    'overkill',
    'overlabor',
    'overlaid',
    'overlap',
    'overlay',
    'overload',
    'overlook',
    'overlord',
    'overlying',
    'overnight',
    'overpass',
    'overpay',
    'overplant',
    'overplay',
    'overpower',
    'overprice',
    'overrate',
    'overreach',
    'overreact',
    'override',
    'overripe',
    'overrule',
    'overrun',
    'overshoot',
    'overshot',
    'oversight',
    'oversized',
    'oversleep',
    'oversold',
    'overspend',
    'overstate',
    'overstay',
    'overstep',
    'overstock',
    'overstuff',
    'oversweet',
    'overtake',
    'overthrow',
    'overtime',
    'overtly',
    'overtone',
    'overture',
    'overturn',
    'overuse',
    'overvalue',
    'overview',
    'overwrite',
    'owl',
    'oxford',
    'oxidant',
    'oxidation',
    'oxidize',
    'oxidizing',
    'oxygen',
    'oxymoron',
    'oyster',
    'ozone',
    'paced',
    'pacemaker',
    'pacific',
    'pacifier',
    'pacifism',
    'pacifist',
    'pacify',
    'padded',
    'padding',
    'paddle',
    'paddling',
    'padlock',
    'pagan',
    'pager',
    'paging',
    'pajamas',
    'palace',
    'palatable',
    'palm',
    'palpable',
    'palpitate',
    'paltry',
    'pampered',
    'pamperer',
    'pampers',
    'pamphlet',
    'panama',
    'pancake',
    'pancreas',
    'panda',
    'pandemic',
    'pang',
    'panhandle',
    'panic',
    'panning',
    'panorama',
    'panoramic',
    'panther',
    'pantomime',
    'pantry',
    'pants',
    'pantyhose',
    'paparazzi',
    'papaya',
    'paper',
    'paprika',
    'papyrus',
    'parabola',
    'parachute',
    'parade',
    'paradox',
    'paragraph',
    'parakeet',
    'paralegal',
    'paralyses',
    'paralysis',
    'paralyze',
    'paramedic',
    'parameter',
    'paramount',
    'parasail',
    'parasite',
    'parasitic',
    'parcel',
    'parched',
    'parchment',
    'pardon',
    'parish',
    'parka',
    'parking',
    'parkway',
    'parlor',
    'parmesan',
    'parole',
    'parrot',
    'parsley',
    'parsnip',
    'partake',
    'parted',
    'parting',
    'partition',
    'partly',
    'partner',
    'partridge',
    'party',
    'passable',
    'passably',
    'passage',
    'passcode',
    'passenger',
    'passerby',
    'passing',
    'passion',
    'passive',
    'passivism',
    'passover',
    'passport',
    'password',
    'pasta',
    'pasted',
    'pastel',
    'pastime',
    'pastor',
    'pastrami',
    'pasture',
    'pasty',
    'patchwork',
    'patchy',
    'paternal',
    'paternity',
    'path',
    'patience',
    'patient',
    'patio',
    'patriarch',
    'patriot',
    'patrol',
    'patronage',
    'patronize',
    'pauper',
    'pavement',
    'paver',
    'pavestone',
    'pavilion',
    'paving',
    'pawing',
    'payable',
    'payback',
    'paycheck',
    'payday',
    'payee',
    'payer',
    'paying',
    'payment',
    'payphone',
    'payroll',
    'pebble',
    'pebbly',
    'pecan',
    'pectin',
    'peculiar',
    'peddling',
    'pediatric',
    'pedicure',
    'pedigree',
    'pedometer',
    'pegboard',
    'pelican',
    'pellet',
    'pelt',
    'pelvis',
    'penalize',
    'penalty',
    'pencil',
    'pendant',
    'pending',
    'penholder',
    'penknife',
    'pennant',
    'penniless',
    'penny',
    'penpal',
    'pension',
    'pentagon',
    'pentagram',
    'pep',
    'perceive',
    'percent',
    'perch',
    'percolate',
    'perennial',
    'perfected',
    'perfectly',
    'perfume',
    'periscope',
    'perish',
    'perjurer',
    'perjury',
    'perkiness',
    'perky',
    'perm',
    'peroxide',
    'perpetual',
    'perplexed',
    'persecute',
    'persevere',
    'persuaded',
    'persuader',
    'pesky',
    'peso',
    'pessimism',
    'pessimist',
    'pester',
    'pesticide',
    'petal',
    'petite',
    'petition',
    'petri',
    'petroleum',
    'petted',
    'petticoat',
    'pettiness',
    'petty',
    'petunia',
    'phantom',
    'phobia',
    'phoenix',
    'phonebook',
    'phoney',
    'phonics',
    'phoniness',
    'phony',
    'phosphate',
    'photo',
    'phrase',
    'phrasing',
    'placard',
    'placate',
    'placidly',
    'plank',
    'planner',
    'plant',
    'plasma',
    'plaster',
    'plastic',
    'plated',
    'platform',
    'plating',
    'platinum',
    'platonic',
    'platter',
    'platypus',
    'plausible',
    'plausibly',
    'playable',
    'playback',
    'player',
    'playful',
    'playgroup',
    'playhouse',
    'playing',
    'playlist',
    'playmaker',
    'playmate',
    'playoff',
    'playpen',
    'playroom',
    'playset',
    'plaything',
    'playtime',
    'plaza',
    'pleading',
    'pleat',
    'pledge',
    'plentiful',
    'plenty',
    'plethora',
    'plexiglas',
    'pliable',
    'plod',
    'plop',
    'plot',
    'plow',
    'ploy',
    'pluck',
    'plug',
    'plunder',
    'plunging',
    'plural',
    'plus',
    'plutonium',
    'plywood',
    'poach',
    'pod',
    'poem',
    'poet',
    'pogo',
    'pointed',
    'pointer',
    'pointing',
    'pointless',
    'pointy',
    'poise',
    'poison',
    'poker',
    'poking',
    'polar',
    'police',
    'policy',
    'polio',
    'polish',
    'politely',
    'polka',
    'polo',
    'polyester',
    'polygon',
    'polygraph',
    'polymer',
    'poncho',
    'pond',
    'pony',
    'popcorn',
    'pope',
    'poplar',
    'popper',
    'poppy',
    'popsicle',
    'populace',
    'popular',
    'populate',
    'porcupine',
    'pork',
    'porous',
    'porridge',
    'portable',
    'portal',
    'portfolio',
    'porthole',
    'portion',
    'portly',
    'portside',
    'poser',
    'posh',
    'posing',
    'possible',
    'possibly',
    'possum',
    'postage',
    'postal',
    'postbox',
    'postcard',
    'posted',
    'poster',
    'posting',
    'postnasal',
    'posture',
    'postwar',
    'pouch',
    'pounce',
    'pouncing',
    'pound',
    'pouring',
    'pout',
    'powdered',
    'powdering',
    'powdery',
    'power',
    'powwow',
    'pox',
    'praising',
    'prance',
    'prancing',
    'pranker',
    'prankish',
    'prankster',
    'prayer',
    'praying',
    'preacher',
    'preaching',
    'preachy',
    'preamble',
    'precinct',
    'precise',
    'precision',
    'precook',
    'precut',
    'predator',
    'predefine',
    'predict',
    'preface',
    'prefix',
    'preflight',
    'preformed',
    'pregame',
    'pregnancy',
    'pregnant',
    'preheated',
    'prelaunch',
    'prelaw',
    'prelude',
    'premiere',
    'premises',
    'premium',
    'prenatal',
    'preoccupy',
    'preorder',
    'prepaid',
    'prepay',
    'preplan',
    'preppy',
    'preschool',
    'prescribe',
    'preseason',
    'preset',
    'preshow',
    'president',
    'presoak',
    'press',
    'presume',
    'presuming',
    'preteen',
    'pretended',
    'pretender',
    'pretense',
    'pretext',
    'pretty',
    'pretzel',
    'prevail',
    'prevalent',
    'prevent',
    'preview',
    'previous',
    'prewar',
    'prewashed',
    'prideful',
    'pried',
    'primal',
    'primarily',
    'primary',
    'primate',
    'primer',
    'primp',
    'princess',
    'print',
    'prior',
    'prism',
    'prison',
    'prissy',
    'pristine',
    'privacy',
    'private',
    'privatize',
    'prize',
    'proactive',
    'probable',
    'probably',
    'probation',
    'probe',
    'probing',
    'probiotic',
    'problem',
    'procedure',
    'process',
    'proclaim',
    'procreate',
    'procurer',
    'prodigal',
    'prodigy',
    'produce',
    'product',
    'profane',
    'profanity',
    'professed',
    'professor',
    'profile',
    'profound',
    'profusely',
    'progeny',
    'prognosis',
    'program',
    'progress',
    'projector',
    'prologue',
    'prolonged',
    'promenade',
    'prominent',
    'promoter',
    'promotion',
    'prompter',
    'promptly',
    'prone',
    'prong',
    'pronounce',
    'pronto',
    'proofing',
    'proofread',
    'proofs',
    'propeller',
    'properly',
    'property',
    'proponent',
    'proposal',
    'propose',
    'props',
    'prorate',
    'protector',
    'protegee',
    'proton',
    'prototype',
    'protozoan',
    'protract',
    'protrude',
    'proud',
    'provable',
    'proved',
    'proven',
    'provided',
    'provider',
    'providing',
    'province',
    'proving',
    'provoke',
    'provoking',
    'provolone',
    'prowess',
    'prowler',
    'prowling',
    'proximity',
    'proxy',
    'prozac',
    'prude',
    'prudishly',
    'prune',
    'pruning',
    'pry',
    'psychic',
    'public',
    'publisher',
    'pucker',
    'pueblo',
    'pug',
    'pull',
    'pulmonary',
    'pulp',
    'pulsate',
    'pulse',
    'pulverize',
    'puma',
    'pumice',
    'pummel',
    'punch',
    'punctual',
    'punctuate',
    'punctured',
    'pungent',
    'punisher',
    'punk',
    'pupil',
    'puppet',
    'puppy',
    'purchase',
    'pureblood',
    'purebred',
    'purely',
    'pureness',
    'purgatory',
    'purge',
    'purging',
    'purifier',
    'purify',
    'purist',
    'puritan',
    'purity',
    'purple',
    'purplish',
    'purposely',
    'purr',
    'purse',
    'pursuable',
    'pursuant',
    'pursuit',
    'purveyor',
    'pushcart',
    'pushchair',
    'pusher',
    'pushiness',
    'pushing',
    'pushover',
    'pushpin',
    'pushup',
    'pushy',
    'putdown',
    'putt',
    'puzzle',
    'puzzling',
    'pyramid',
    'pyromania',
    'python',
    'quack',
    'quadrant',
    'quail',
    'quaintly',
    'quake',
    'quaking',
    'qualified',
    'qualifier',
    'qualify',
    'quality',
    'qualm',
    'quantum',
    'quarrel',
    'quarry',
    'quartered',
    'quarterly',
    'quarters',
    'quartet',
    'quench',
    'query',
    'quicken',
    'quickly',
    'quickness',
    'quicksand',
    'quickstep',
    'quiet',
    'quill',
    'quilt',
    'quintet',
    'quintuple',
    'quirk',
    'quit',
    'quiver',
    'quizzical',
    'quotable',
    'quotation',
    'quote',
    'rabid',
    'race',
    'racing',
    'racism',
    'rack',
    'racoon',
    'radar',
    'radial',
    'radiance',
    'radiantly',
    'radiated',
    'radiation',
    'radiator',
    'radio',
    'radish',
    'raffle',
    'raft',
    'rage',
    'ragged',
    'raging',
    'ragweed',
    'raider',
    'railcar',
    'railing',
    'railroad',
    'railway',
    'raisin',
    'rake',
    'raking',
    'rally',
    'ramble',
    'rambling',
    'ramp',
    'ramrod',
    'ranch',
    'rancidity',
    'random',
    'ranged',
    'ranger',
    'ranging',
    'ranked',
    'ranking',
    'ransack',
    'ranting',
    'rants',
    'rare',
    'rarity',
    'rascal',
    'rash',
    'rasping',
    'ravage',
    'raven',
    'ravine',
    'raving',
    'ravioli',
    'ravishing',
    'reabsorb',
    'reach',
    'reacquire',
    'reaction',
    'reactive',
    'reactor',
    'reaffirm',
    'ream',
    'reanalyze',
    'reappear',
    'reapply',
    'reappoint',
    'reapprove',
    'rearrange',
    'rearview',
    'reason',
    'reassign',
    'reassure',
    'reattach',
    'reawake',
    'rebalance',
    'rebate',
    'rebel',
    'rebirth',
    'reboot',
    'reborn',
    'rebound',
    'rebuff',
    'rebuild',
    'rebuilt',
    'reburial',
    'rebuttal',
    'recall',
    'recant',
    'recapture',
    'recast',
    'recede',
    'recent',
    'recess',
    'recharger',
    'recipient',
    'recital',
    'recite',
    'reckless',
    'reclaim',
    'recliner',
    'reclining',
    'recluse',
    'reclusive',
    'recognize',
    'recoil',
    'recollect',
    'recolor',
    'reconcile',
    'reconfirm',
    'reconvene',
    'recopy',
    'record',
    'recount',
    'recoup',
    'recovery',
    'recreate',
    'rectal',
    'rectangle',
    'rectified',
    'rectify',
    'recycled',
    'recycler',
    'recycling',
    'reemerge',
    'reenact',
    'reenter',
    'reentry',
    'reexamine',
    'referable',
    'referee',
    'reference',
    'refill',
    'refinance',
    'refined',
    'refinery',
    'refining',
    'refinish',
    'reflected',
    'reflector',
    'reflex',
    'reflux',
    'refocus',
    'refold',
    'reforest',
    'reformat',
    'reformed',
    'reformer',
    'reformist',
    'refract',
    'refrain',
    'refreeze',
    'refresh',
    'refried',
    'refueling',
    'refund',
    'refurbish',
    'refurnish',
    'refusal',
    'refuse',
    'refusing',
    'refutable',
    'refute',
    'regain',
    'regalia',
    'regally',
    'reggae',
    'regime',
    'region',
    'register',
    'registrar',
    'registry',
    'regress',
    'regretful',
    'regroup',
    'regular',
    'regulate',
    'regulator',
    'rehab',
    'reheat',
    'rehire',
    'rehydrate',
    'reimburse',
    'reissue',
    'reiterate',
    'rejoice',
    'rejoicing',
    'rejoin',
    'rekindle',
    'relapse',
    'relapsing',
    'relatable',
    'related',
    'relation',
    'relative',
    'relax',
    'relay',
    'relearn',
    'release',
    'relenting',
    'reliable',
    'reliably',
    'reliance',
    'reliant',
    'relic',
    'relieve',
    'relieving',
    'relight',
    'relish',
    'relive',
    'reload',
    'relocate',
    'relock',
    'reluctant',
    'rely',
    'remake',
    'remark',
    'remarry',
    'rematch',
    'remedial',
    'remedy',
    'remember',
    'reminder',
    'remindful',
    'remission',
    'remix',
    'remnant',
    'remodeler',
    'remold',
    'remorse',
    'remote',
    'removable',
    'removal',
    'removed',
    'remover',
    'removing',
    'rename',
    'renderer',
    'rendering',
    'rendition',
    'renegade',
    'renewable',
    'renewably',
    'renewal',
    'renewed',
    'renounce',
    'renovate',
    'renovator',
    'rentable',
    'rental',
    'rented',
    'renter',
    'reoccupy',
    'reoccur',
    'reopen',
    'reorder',
    'repackage',
    'repacking',
    'repaint',
    'repair',
    'repave',
    'repaying',
    'repayment',
    'repeal',
    'repeated',
    'repeater',
    'repent',
    'rephrase',
    'replace',
    'replay',
    'replica',
    'reply',
    'reporter',
    'repose',
    'repossess',
    'repost',
    'repressed',
    'reprimand',
    'reprint',
    'reprise',
    'reproach',
    'reprocess',
    'reproduce',
    'reprogram',
    'reps',
    'reptile',
    'reptilian',
    'repugnant',
    'repulsion',
    'repulsive',
    'repurpose',
    'reputable',
    'reputably',
    'request',
    'require',
    'requisite',
    'reroute',
    'rerun',
    'resale',
    'resample',
    'rescuer',
    'reseal',
    'research',
    'reselect',
    'reseller',
    'resemble',
    'resend',
    'resent',
    'reset',
    'reshape',
    'reshoot',
    'reshuffle',
    'residence',
    'residency',
    'resident',
    'residual',
    'residue',
    'resigned',
    'resilient',
    'resistant',
    'resisting',
    'resize',
    'resolute',
    'resolved',
    'resonant',
    'resonate',
    'resort',
    'resource',
    'respect',
    'resubmit',
    'result',
    'resume',
    'resupply',
    'resurface',
    'resurrect',
    'retail',
    'retainer',
    'retaining',
    'retake',
    'retaliate',
    'retention',
    'rethink',
    'retinal',
    'retired',
    'retiree',
    'retiring',
    'retold',
    'retool',
    'retorted',
    'retouch',
    'retrace',
    'retract',
    'retrain',
    'retread',
    'retreat',
    'retrial',
    'retrieval',
    'retriever',
    'retry',
    'return',
    'retying',
    'retype',
    'reunion',
    'reunite',
    'reusable',
    'reuse',
    'reveal',
    'reveler',
    'revenge',
    'revenue',
    'reverb',
    'revered',
    'reverence',
    'reverend',
    'reversal',
    'reverse',
    'reversing',
    'reversion',
    'revert',
    'revisable',
    'revise',
    'revision',
    'revisit',
    'revivable',
    'revival',
    'reviver',
    'reviving',
    'revocable',
    'revoke',
    'revolt',
    'revolver',
    'revolving',
    'reward',
    'rewash',
    'rewind',
    'rewire',
    'reword',
    'rework',
    'rewrap',
    'rewrite',
    'rhyme',
    'ribbon',
    'ribcage',
    'rice',
    'riches',
    'richly',
    'richness',
    'rickety',
    'ricotta',
    'riddance',
    'ridden',
    'ride',
    'riding',
    'rifling',
    'rift',
    'rigging',
    'rigid',
    'rigor',
    'rimless',
    'rimmed',
    'rind',
    'rink',
    'rinse',
    'rinsing',
    'riot',
    'ripcord',
    'ripeness',
    'ripening',
    'ripping',
    'ripple',
    'rippling',
    'riptide',
    'rise',
    'rising',
    'risk',
    'risotto',
    'ritalin',
    'ritzy',
    'rival',
    'riverbank',
    'riverbed',
    'riverboat',
    'riverside',
    'riveter',
    'riveting',
    'roamer',
    'roaming',
    'roast',
    'robbing',
    'robe',
    'robin',
    'robotics',
    'robust',
    'rockband',
    'rocker',
    'rocket',
    'rockfish',
    'rockiness',
    'rocking',
    'rocklike',
    'rockslide',
    'rockstar',
    'rocky',
    'rogue',
    'roman',
    'romp',
    'rope',
    'roping',
    'roster',
    'rosy',
    'rotten',
    'rotting',
    'rotunda',
    'roulette',
    'rounding',
    'roundish',
    'roundness',
    'roundup',
    'roundworm',
    'routine',
    'routing',
    'rover',
    'roving',
    'royal',
    'rubbed',
    'rubber',
    'rubbing',
    'rubble',
    'rubdown',
    'ruby',
    'ruckus',
    'rudder',
    'rug',
    'ruined',
    'rule',
    'rumble',
    'rumbling',
    'rummage',
    'rumor',
    'runaround',
    'rundown',
    'runner',
    'running',
    'runny',
    'runt',
    'runway',
    'rupture',
    'rural',
    'ruse',
    'rush',
    'rust',
    'rut',
    'sabbath',
    'sabotage',
    'sacrament',
    'sacred',
    'sacrifice',
    'sadden',
    'saddlebag',
    'saddled',
    'saddling',
    'sadly',
    'sadness',
    'safari',
    'safeguard',
    'safehouse',
    'safely',
    'safeness',
    'saffron',
    'saga',
    'sage',
    'sagging',
    'saggy',
    'said',
    'saint',
    'sake',
    'salad',
    'salami',
    'salaried',
    'salary',
    'saline',
    'salon',
    'saloon',
    'salsa',
    'salt',
    'salutary',
    'salute',
    'salvage',
    'salvaging',
    'salvation',
    'same',
    'sample',
    'sampling',
    'sanction',
    'sanctity',
    'sanctuary',
    'sandal',
    'sandbag',
    'sandbank',
    'sandbar',
    'sandblast',
    'sandbox',
    'sanded',
    'sandfish',
    'sanding',
    'sandlot',
    'sandpaper',
    'sandpit',
    'sandstone',
    'sandstorm',
    'sandworm',
    'sandy',
    'sanitary',
    'sanitizer',
    'sank',
    'santa',
    'sapling',
    'sappiness',
    'sappy',
    'sarcasm',
    'sarcastic',
    'sardine',
    'sash',
    'sasquatch',
    'sassy',
    'satchel',
    'satiable',
    'satin',
    'satirical',
    'satisfied',
    'satisfy',
    'saturate',
    'saturday',
    'sauciness',
    'saucy',
    'sauna',
    'savage',
    'savanna',
    'saved',
    'savings',
    'savior',
    'savor',
    'saxophone',
    'say',
    'scabbed',
    'scabby',
    'scalded',
    'scalding',
    'scale',
    'scaling',
    'scallion',
    'scallop',
    'scalping',
    'scam',
    'scandal',
    'scanner',
    'scanning',
    'scant',
    'scapegoat',
    'scarce',
    'scarcity',
    'scarecrow',
    'scared',
    'scarf',
    'scarily',
    'scariness',
    'scarring',
    'scary',
    'scavenger',
    'scenic',
    'schedule',
    'schematic',
    'scheme',
    'scheming',
    'schilling',
    'schnapps',
    'scholar',
    'science',
    'scientist',
    'scion',
    'scoff',
    'scolding',
    'scone',
    'scoop',
    'scooter',
    'scope',
    'scorch',
    'scorebook',
    'scorecard',
    'scored',
    'scoreless',
    'scorer',
    'scoring',
    'scorn',
    'scorpion',
    'scotch',
    'scoundrel',
    'scoured',
    'scouring',
    'scouting',
    'scouts',
    'scowling',
    'scrabble',
    'scraggly',
    'scrambled',
    'scrambler',
    'scrap',
    'scratch',
    'scrawny',
    'screen',
    'scribble',
    'scribe',
    'scribing',
    'scrimmage',
    'script',
    'scroll',
    'scrooge',
    'scrounger',
    'scrubbed',
    'scrubber',
    'scruffy',
    'scrunch',
    'scrutiny',
    'scuba',
    'scuff',
    'sculptor',
    'sculpture',
    'scurvy',
    'scuttle',
    'secluded',
    'secluding',
    'seclusion',
    'second',
    'secrecy',
    'secret',
    'sectional',
    'sector',
    'secular',
    'securely',
    'security',
    'sedan',
    'sedate',
    'sedation',
    'sedative',
    'sediment',
    'seduce',
    'seducing',
    'segment',
    'seismic',
    'seizing',
    'seldom',
    'selected',
    'selection',
    'selective',
    'selector',
    'self',
    'seltzer',
    'semantic',
    'semester',
    'semicolon',
    'semifinal',
    'seminar',
    'semisoft',
    'semisweet',
    'senate',
    'senator',
    'send',
    'senior',
    'senorita',
    'sensation',
    'sensitive',
    'sensitize',
    'sensually',
    'sensuous',
    'sepia',
    'september',
    'septic',
    'septum',
    'sequel',
    'sequence',
    'sequester',
    'series',
    'sermon',
    'serotonin',
    'serpent',
    'serrated',
    'serve',
    'service',
    'serving',
    'sesame',
    'sessions',
    'setback',
    'setting',
    'settle',
    'settling',
    'setup',
    'sevenfold',
    'seventeen',
    'seventh',
    'seventy',
    'severity',
    'shabby',
    'shack',
    'shaded',
    'shadily',
    'shadiness',
    'shading',
    'shadow',
    'shady',
    'shaft',
    'shakable',
    'shakily',
    'shakiness',
    'shaking',
    'shaky',
    'shale',
    'shallot',
    'shallow',
    'shame',
    'shampoo',
    'shamrock',
    'shank',
    'shanty',
    'shape',
    'shaping',
    'share',
    'sharpener',
    'sharper',
    'sharpie',
    'sharply',
    'sharpness',
    'shawl',
    'sheath',
    'shed',
    'sheep',
    'sheet',
    'shelf',
    'shell',
    'shelter',
    'shelve',
    'shelving',
    'sherry',
    'shield',
    'shifter',
    'shifting',
    'shiftless',
    'shifty',
    'shimmer',
    'shimmy',
    'shindig',
    'shine',
    'shingle',
    'shininess',
    'shining',
    'shiny',
    'ship',
    'shirt',
    'shivering',
    'shock',
    'shone',
    'shoplift',
    'shopper',
    'shopping',
    'shoptalk',
    'shore',
    'shortage',
    'shortcake',
    'shortcut',
    'shorten',
    'shorter',
    'shorthand',
    'shortlist',
    'shortly',
    'shortness',
    'shorts',
    'shortwave',
    'shorty',
    'shout',
    'shove',
    'showbiz',
    'showcase',
    'showdown',
    'shower',
    'showgirl',
    'showing',
    'showman',
    'shown',
    'showoff',
    'showpiece',
    'showplace',
    'showroom',
    'showy',
    'shrank',
    'shrapnel',
    'shredder',
    'shredding',
    'shrewdly',
    'shriek',
    'shrill',
    'shrimp',
    'shrine',
    'shrink',
    'shrivel',
    'shrouded',
    'shrubbery',
    'shrubs',
    'shrug',
    'shrunk',
    'shucking',
    'shudder',
    'shuffle',
    'shuffling',
    'shun',
    'shush',
    'shut',
    'shy',
    'siamese',
    'siberian',
    'sibling',
    'siding',
    'sierra',
    'siesta',
    'sift',
    'sighing',
    'silenced',
    'silencer',
    'silent',
    'silica',
    'silicon',
    'silk',
    'silliness',
    'silly',
    'silo',
    'silt',
    'silver',
    'similarly',
    'simile',
    'simmering',
    'simple',
    'simplify',
    'simply',
    'sincere',
    'sincerity',
    'singer',
    'singing',
    'single',
    'singular',
    'sinister',
    'sinless',
    'sinner',
    'sinuous',
    'sip',
    'siren',
    'sister',
    'sitcom',
    'sitter',
    'sitting',
    'situated',
    'situation',
    'sixfold',
    'sixteen',
    'sixth',
    'sixties',
    'sixtieth',
    'sixtyfold',
    'sizable',
    'sizably',
    'size',
    'sizing',
    'sizzle',
    'sizzling',
    'skater',
    'skating',
    'skedaddle',
    'skeletal',
    'skeleton',
    'skeptic',
    'sketch',
    'skewed',
    'skewer',
    'skid',
    'skied',
    'skier',
    'skies',
    'skiing',
    'skilled',
    'skillet',
    'skillful',
    'skimmed',
    'skimmer',
    'skimming',
    'skimpily',
    'skincare',
    'skinhead',
    'skinless',
    'skinning',
    'skinny',
    'skintight',
    'skipper',
    'skipping',
    'skirmish',
    'skirt',
    'skittle',
    'skydiver',
    'skylight',
    'skyline',
    'skype',
    'skyrocket',
    'skyward',
    'slab',
    'slacked',
    'slacker',
    'slacking',
    'slackness',
    'slacks',
    'slain',
    'slam',
    'slander',
    'slang',
    'slapping',
    'slapstick',
    'slashed',
    'slashing',
    'slate',
    'slather',
    'slaw',
    'sled',
    'sleek',
    'sleep',
    'sleet',
    'sleeve',
    'slept',
    'sliceable',
    'sliced',
    'slicer',
    'slicing',
    'slick',
    'slider',
    'slideshow',
    'sliding',
    'slighted',
    'slighting',
    'slightly',
    'slimness',
    'slimy',
    'slinging',
    'slingshot',
    'slinky',
    'slip',
    'slit',
    'sliver',
    'slobbery',
    'slogan',
    'sloped',
    'sloping',
    'sloppily',
    'sloppy',
    'slot',
    'slouching',
    'slouchy',
    'sludge',
    'slug',
    'slum',
    'slurp',
    'slush',
    'sly',
    'small',
    'smartly',
    'smartness',
    'smasher',
    'smashing',
    'smashup',
    'smell',
    'smelting',
    'smile',
    'smilingly',
    'smirk',
    'smite',
    'smith',
    'smitten',
    'smock',
    'smog',
    'smoked',
    'smokeless',
    'smokiness',
    'smoking',
    'smoky',
    'smolder',
    'smooth',
    'smother',
    'smudge',
    'smudgy',
    'smuggler',
    'smuggling',
    'smugly',
    'smugness',
    'snack',
    'snagged',
    'snaking',
    'snap',
    'snare',
    'snarl',
    'snazzy',
    'sneak',
    'sneer',
    'sneeze',
    'sneezing',
    'snide',
    'sniff',
    'snippet',
    'snipping',
    'snitch',
    'snooper',
    'snooze',
    'snore',
    'snoring',
    'snorkel',
    'snort',
    'snout',
    'snowbird',
    'snowboard',
    'snowbound',
    'snowcap',
    'snowdrift',
    'snowdrop',
    'snowfall',
    'snowfield',
    'snowflake',
    'snowiness',
    'snowless',
    'snowman',
    'snowplow',
    'snowshoe',
    'snowstorm',
    'snowsuit',
    'snowy',
    'snub',
    'snuff',
    'snuggle',
    'snugly',
    'snugness',
    'speak',
    'spearfish',
    'spearhead',
    'spearman',
    'spearmint',
    'species',
    'specimen',
    'specked',
    'speckled',
    'specks',
    'spectacle',
    'spectator',
    'spectrum',
    'speculate',
    'speech',
    'speed',
    'spellbind',
    'speller',
    'spelling',
    'spendable',
    'spender',
    'spending',
    'spent',
    'spew',
    'sphere',
    'spherical',
    'sphinx',
    'spider',
    'spied',
    'spiffy',
    'spill',
    'spilt',
    'spinach',
    'spinal',
    'spindle',
    'spinner',
    'spinning',
    'spinout',
    'spinster',
    'spiny',
    'spiral',
    'spirited',
    'spiritism',
    'spirits',
    'spiritual',
    'splashed',
    'splashing',
    'splashy',
    'splatter',
    'spleen',
    'splendid',
    'splendor',
    'splice',
    'splicing',
    'splinter',
    'splotchy',
    'splurge',
    'spoilage',
    'spoiled',
    'spoiler',
    'spoiling',
    'spoils',
    'spoken',
    'spokesman',
    'sponge',
    'spongy',
    'sponsor',
    'spoof',
    'spookily',
    'spooky',
    'spool',
    'spoon',
    'spore',
    'sporting',
    'sports',
    'sporty',
    'spotless',
    'spotlight',
    'spotted',
    'spotter',
    'spotting',
    'spotty',
    'spousal',
    'spouse',
    'spout',
    'sprain',
    'sprang',
    'sprawl',
    'spray',
    'spree',
    'sprig',
    'spring',
    'sprinkled',
    'sprinkler',
    'sprint',
    'sprite',
    'sprout',
    'spruce',
    'sprung',
    'spry',
    'spud',
    'spur',
    'sputter',
    'spyglass',
    'squabble',
    'squad',
    'squall',
    'squander',
    'squash',
    'squatted',
    'squatter',
    'squatting',
    'squeak',
    'squealer',
    'squealing',
    'squeamish',
    'squeegee',
    'squeeze',
    'squeezing',
    'squid',
    'squiggle',
    'squiggly',
    'squint',
    'squire',
    'squirt',
    'squishier',
    'squishy',
    'stability',
    'stabilize',
    'stable',
    'stack',
    'stadium',
    'staff',
    'stage',
    'staging',
    'stagnant',
    'stagnate',
    'stainable',
    'stained',
    'staining',
    'stainless',
    'stalemate',
    'staleness',
    'stalling',
    'stallion',
    'stamina',
    'stammer',
    'stamp',
    'stand',
    'stank',
    'staple',
    'stapling',
    'starboard',
    'starch',
    'stardom',
    'stardust',
    'starfish',
    'stargazer',
    'staring',
    'stark',
    'starless',
    'starlet',
    'starlight',
    'starlit',
    'starring',
    'starry',
    'starship',
    'starter',
    'starting',
    'startle',
    'startling',
    'startup',
    'starved',
    'starving',
    'stash',
    'state',
    'static',
    'statistic',
    'statue',
    'stature',
    'status',
    'statute',
    'statutory',
    'staunch',
    'stays',
    'steadfast',
    'steadier',
    'steadily',
    'steadying',
    'steam',
    'steed',
    'steep',
    'steerable',
    'steering',
    'steersman',
    'stegosaur',
    'stellar',
    'stem',
    'stench',
    'stencil',
    'step',
    'stereo',
    'sterile',
    'sterility',
    'sterilize',
    'sterling',
    'sternness',
    'sternum',
    'stew',
    'stick',
    'stiffen',
    'stiffly',
    'stiffness',
    'stifle',
    'stifling',
    'stillness',
    'stilt',
    'stimulant',
    'stimulate',
    'stimuli',
    'stimulus',
    'stinger',
    'stingily',
    'stinging',
    'stingray',
    'stingy',
    'stinking',
    'stinky',
    'stipend',
    'stipulate',
    'stir',
    'stitch',
    'stock',
    'stoic',
    'stoke',
    'stole',
    'stomp',
    'stonewall',
    'stoneware',
    'stonework',
    'stoning',
    'stony',
    'stood',
    'stooge',
    'stool',
    'stoop',
    'stoplight',
    'stoppable',
    'stoppage',
    'stopped',
    'stopper',
    'stopping',
    'stopwatch',
    'storable',
    'storage',
    'storeroom',
    'storewide',
    'storm',
    'stout',
    'stove',
    'stowaway',
    'stowing',
    'straddle',
    'straggler',
    'strained',
    'strainer',
    'straining',
    'strangely',
    'stranger',
    'strangle',
    'strategic',
    'strategy',
    'stratus',
    'straw',
    'stray',
    'streak',
    'stream',
    'street',
    'strength',
    'strenuous',
    'strep',
    'stress',
    'stretch',
    'strewn',
    'stricken',
    'strict',
    'stride',
    'strife',
    'strike',
    'striking',
    'strive',
    'striving',
    'strobe',
    'strode',
    'stroller',
    'strongbox',
    'strongly',
    'strongman',
    'struck',
    'structure',
    'strudel',
    'struggle',
    'strum',
    'strung',
    'strut',
    'stubbed',
    'stubble',
    'stubbly',
    'stubborn',
    'stucco',
    'stuck',
    'student',
    'studied',
    'studio',
    'study',
    'stuffed',
    'stuffing',
    'stuffy',
    'stumble',
    'stumbling',
    'stump',
    'stung',
    'stunned',
    'stunner',
    'stunning',
    'stunt',
    'stupor',
    'sturdily',
    'sturdy',
    'styling',
    'stylishly',
    'stylist',
    'stylized',
    'stylus',
    'suave',
    'subarctic',
    'subatomic',
    'subdivide',
    'subdued',
    'subduing',
    'subfloor',
    'subgroup',
    'subheader',
    'subject',
    'sublease',
    'sublet',
    'sublevel',
    'sublime',
    'submarine',
    'submerge',
    'submersed',
    'submitter',
    'subpanel',
    'subpar',
    'subplot',
    'subprime',
    'subscribe',
    'subscript',
    'subsector',
    'subside',
    'subsiding',
    'subsidize',
    'subsidy',
    'subsoil',
    'subsonic',
    'substance',
    'subsystem',
    'subtext',
    'subtitle',
    'subtly',
    'subtotal',
    'subtract',
    'subtype',
    'suburb',
    'subway',
    'subwoofer',
    'subzero',
    'succulent',
    'such',
    'suction',
    'sudden',
    'sudoku',
    'suds',
    'sufferer',
    'suffering',
    'suffice',
    'suffix',
    'suffocate',
    'suffrage',
    'sugar',
    'suggest',
    'suing',
    'suitable',
    'suitably',
    'suitcase',
    'suitor',
    'sulfate',
    'sulfide',
    'sulfite',
    'sulfur',
    'sulk',
    'sullen',
    'sulphate',
    'sulphuric',
    'sultry',
    'superbowl',
    'superglue',
    'superhero',
    'superior',
    'superjet',
    'superman',
    'supermom',
    'supernova',
    'supervise',
    'supper',
    'supplier',
    'supply',
    'support',
    'supremacy',
    'supreme',
    'surcharge',
    'surely',
    'sureness',
    'surface',
    'surfacing',
    'surfboard',
    'surfer',
    'surgery',
    'surgical',
    'surging',
    'surname',
    'surpass',
    'surplus',
    'surprise',
    'surreal',
    'surrender',
    'surrogate',
    'surround',
    'survey',
    'survival',
    'survive',
    'surviving',
    'survivor',
    'sushi',
    'suspect',
    'suspend',
    'suspense',
    'sustained',
    'sustainer',
    'swab',
    'swaddling',
    'swagger',
    'swampland',
    'swan',
    'swapping',
    'swarm',
    'sway',
    'swear',
    'sweat',
    'sweep',
    'swell',
    'swept',
    'swerve',
    'swifter',
    'swiftly',
    'swiftness',
    'swimmable',
    'swimmer',
    'swimming',
    'swimsuit',
    'swimwear',
    'swinger',
    'swinging',
    'swipe',
    'swirl',
    'switch',
    'swivel',
    'swizzle',
    'swooned',
    'swoop',
    'swoosh',
    'swore',
    'sworn',
    'swung',
    'sycamore',
    'sympathy',
    'symphonic',
    'symphony',
    'symptom',
    'synapse',
    'syndrome',
    'synergy',
    'synopses',
    'synopsis',
    'synthesis',
    'synthetic',
    'syrup',
    'system',
    't-shirt',
    'tabasco',
    'tabby',
    'tableful',
    'tables',
    'tablet',
    'tableware',
    'tabloid',
    'tackiness',
    'tacking',
    'tackle',
    'tackling',
    'tacky',
    'taco',
    'tactful',
    'tactical',
    'tactics',
    'tactile',
    'tactless',
    'tadpole',
    'taekwondo',
    'tag',
    'tainted',
    'take',
    'taking',
    'talcum',
    'talisman',
    'tall',
    'talon',
    'tamale',
    'tameness',
    'tamer',
    'tamper',
    'tank',
    'tanned',
    'tannery',
    'tanning',
    'tantrum',
    'tapeless',
    'tapered',
    'tapering',
    'tapestry',
    'tapioca',
    'tapping',
    'taps',
    'tarantula',
    'target',
    'tarmac',
    'tarnish',
    'tarot',
    'tartar',
    'tartly',
    'tartness',
    'task',
    'tassel',
    'taste',
    'tastiness',
    'tasting',
    'tasty',
    'tattered',
    'tattle',
    'tattling',
    'tattoo',
    'taunt',
    'tavern',
    'thank',
    'that',
    'thaw',
    'theater',
    'theatrics',
    'thee',
    'theft',
    'theme',
    'theology',
    'theorize',
    'thermal',
    'thermos',
    'thesaurus',
    'these',
    'thesis',
    'thespian',
    'thicken',
    'thicket',
    'thickness',
    'thieving',
    'thievish',
    'thigh',
    'thimble',
    'thing',
    'think',
    'thinly',
    'thinner',
    'thinness',
    'thinning',
    'thirstily',
    'thirsting',
    'thirsty',
    'thirteen',
    'thirty',
    'thong',
    'thorn',
    'those',
    'thousand',
    'thrash',
    'thread',
    'threaten',
    'threefold',
    'thrift',
    'thrill',
    'thrive',
    'thriving',
    'throat',
    'throbbing',
    'throng',
    'throttle',
    'throwaway',
    'throwback',
    'thrower',
    'throwing',
    'thud',
    'thumb',
    'thumping',
    'thursday',
    'thus',
    'thwarting',
    'thyself',
    'tiara',
    'tibia',
    'tidal',
    'tidbit',
    'tidiness',
    'tidings',
    'tidy',
    'tiger',
    'tighten',
    'tightly',
    'tightness',
    'tightrope',
    'tightwad',
    'tigress',
    'tile',
    'tiling',
    'till',
    'tilt',
    'timid',
    'timing',
    'timothy',
    'tinderbox',
    'tinfoil',
    'tingle',
    'tingling',
    'tingly',
    'tinker',
    'tinkling',
    'tinsel',
    'tinsmith',
    'tint',
    'tinwork',
    'tiny',
    'tipoff',
    'tipped',
    'tipper',
    'tipping',
    'tiptoeing',
    'tiptop',
    'tiring',
    'tissue',
    'trace',
    'tracing',
    'track',
    'traction',
    'tractor',
    'trade',
    'trading',
    'tradition',
    'traffic',
    'tragedy',
    'trailing',
    'trailside',
    'train',
    'traitor',
    'trance',
    'tranquil',
    'transfer',
    'transform',
    'translate',
    'transpire',
    'transport',
    'transpose',
    'trapdoor',
    'trapeze',
    'trapezoid',
    'trapped',
    'trapper',
    'trapping',
    'traps',
    'trash',
    'travel',
    'traverse',
    'travesty',
    'tray',
    'treachery',
    'treading',
    'treadmill',
    'treason',
    'treat',
    'treble',
    'tree',
    'trekker',
    'tremble',
    'trembling',
    'tremor',
    'trench',
    'trend',
    'trespass',
    'triage',
    'trial',
    'triangle',
    'tribesman',
    'tribunal',
    'tribune',
    'tributary',
    'tribute',
    'triceps',
    'trickery',
    'trickily',
    'tricking',
    'trickle',
    'trickster',
    'tricky',
    'tricolor',
    'tricycle',
    'trident',
    'tried',
    'trifle',
    'trifocals',
    'trillion',
    'trilogy',
    'trimester',
    'trimmer',
    'trimming',
    'trimness',
    'trinity',
    'trio',
    'tripod',
    'tripping',
    'triumph',
    'trivial',
    'trodden',
    'trolling',
    'trombone',
    'trophy',
    'tropical',
    'tropics',
    'trouble',
    'troubling',
    'trough',
    'trousers',
    'trout',
    'trowel',
    'truce',
    'truck',
    'truffle',
    'trump',
    'trunks',
    'trustable',
    'trustee',
    'trustful',
    'trusting',
    'trustless',
    'truth',
    'try',
    'tubby',
    'tubeless',
    'tubular',
    'tucking',
    'tuesday',
    'tug',
    'tuition',
    'tulip',
    'tumble',
    'tumbling',
    'tummy',
    'turban',
    'turbine',
    'turbofan',
    'turbojet',
    'turbulent',
    'turf',
    'turkey',
    'turmoil',
    'turret',
    'turtle',
    'tusk',
    'tutor',
    'tutu',
    'tux',
    'tweak',
    'tweed',
    'tweet',
    'tweezers',
    'twelve',
    'twentieth',
    'twenty',
    'twerp',
    'twice',
    'twiddle',
    'twiddling',
    'twig',
    'twilight',
    'twine',
    'twins',
    'twirl',
    'twistable',
    'twisted',
    'twister',
    'twisting',
    'twisty',
    'twitch',
    'twitter',
    'tycoon',
    'tying',
    'tyke',
    'udder',
    'ultimate',
    'ultimatum',
    'ultra',
    'umbilical',
    'umbrella',
    'umpire',
    'unabashed',
    'unable',
    'unadorned',
    'unadvised',
    'unafraid',
    'unaired',
    'unaligned',
    'unaltered',
    'unarmored',
    'unashamed',
    'unaudited',
    'unawake',
    'unaware',
    'unbaked',
    'unbalance',
    'unbeaten',
    'unbend',
    'unbent',
    'unbiased',
    'unbitten',
    'unblended',
    'unblessed',
    'unblock',
    'unbolted',
    'unbounded',
    'unboxed',
    'unbraided',
    'unbridle',
    'unbroken',
    'unbuckled',
    'unbundle',
    'unburned',
    'unbutton',
    'uncanny',
    'uncapped',
    'uncaring',
    'uncertain',
    'unchain',
    'unchanged',
    'uncharted',
    'uncheck',
    'uncivil',
    'unclad',
    'unclaimed',
    'unclamped',
    'unclasp',
    'uncle',
    'unclip',
    'uncloak',
    'unclog',
    'unclothed',
    'uncoated',
    'uncoiled',
    'uncolored',
    'uncombed',
    'uncommon',
    'uncooked',
    'uncork',
    'uncorrupt',
    'uncounted',
    'uncouple',
    'uncouth',
    'uncover',
    'uncross',
    'uncrown',
    'uncrushed',
    'uncured',
    'uncurious',
    'uncurled',
    'uncut',
    'undamaged',
    'undated',
    'undaunted',
    'undead',
    'undecided',
    'undefined',
    'underage',
    'underarm',
    'undercoat',
    'undercook',
    'undercut',
    'underdog',
    'underdone',
    'underfed',
    'underfeed',
    'underfoot',
    'undergo',
    'undergrad',
    'underhand',
    'underline',
    'underling',
    'undermine',
    'undermost',
    'underpaid',
    'underpass',
    'underpay',
    'underrate',
    'undertake',
    'undertone',
    'undertook',
    'undertow',
    'underuse',
    'underwear',
    'underwent',
    'underwire',
    'undesired',
    'undiluted',
    'undivided',
    'undocked',
    'undoing',
    'undone',
    'undrafted',
    'undress',
    'undrilled',
    'undusted',
    'undying',
    'unearned',
    'unearth',
    'unease',
    'uneasily',
    'uneasy',
    'uneatable',
    'uneaten',
    'unedited',
    'unelected',
    'unending',
    'unengaged',
    'unenvied',
    'unequal',
    'unethical',
    'uneven',
    'unexpired',
    'unexposed',
    'unfailing',
    'unfair',
    'unfasten',
    'unfazed',
    'unfeeling',
    'unfiled',
    'unfilled',
    'unfitted',
    'unfitting',
    'unfixable',
    'unfixed',
    'unflawed',
    'unfocused',
    'unfold',
    'unfounded',
    'unframed',
    'unfreeze',
    'unfrosted',
    'unfrozen',
    'unfunded',
    'unglazed',
    'ungloved',
    'unglue',
    'ungodly',
    'ungraded',
    'ungreased',
    'unguarded',
    'unguided',
    'unhappily',
    'unhappy',
    'unharmed',
    'unhealthy',
    'unheard',
    'unhearing',
    'unheated',
    'unhelpful',
    'unhidden',
    'unhinge',
    'unhitched',
    'unholy',
    'unhook',
    'unicorn',
    'unicycle',
    'unified',
    'unifier',
    'uniformed',
    'uniformly',
    'unify',
    'unimpeded',
    'uninjured',
    'uninstall',
    'uninsured',
    'uninvited',
    'union',
    'uniquely',
    'unisexual',
    'unison',
    'unissued',
    'unit',
    'universal',
    'universe',
    'unjustly',
    'unkempt',
    'unkind',
    'unknotted',
    'unknowing',
    'unknown',
    'unlaced',
    'unlatch',
    'unlawful',
    'unleaded',
    'unlearned',
    'unleash',
    'unless',
    'unleveled',
    'unlighted',
    'unlikable',
    'unlimited',
    'unlined',
    'unlinked',
    'unlisted',
    'unlit',
    'unlivable',
    'unloaded',
    'unloader',
    'unlocked',
    'unlocking',
    'unlovable',
    'unloved',
    'unlovely',
    'unloving',
    'unluckily',
    'unlucky',
    'unmade',
    'unmanaged',
    'unmanned',
    'unmapped',
    'unmarked',
    'unmasked',
    'unmasking',
    'unmatched',
    'unmindful',
    'unmixable',
    'unmixed',
    'unmolded',
    'unmoral',
    'unmovable',
    'unmoved',
    'unmoving',
    'unnamable',
    'unnamed',
    'unnatural',
    'unneeded',
    'unnerve',
    'unnerving',
    'unnoticed',
    'unopened',
    'unopposed',
    'unpack',
    'unpadded',
    'unpaid',
    'unpainted',
    'unpaired',
    'unpaved',
    'unpeeled',
    'unpicked',
    'unpiloted',
    'unpinned',
    'unplanned',
    'unplanted',
    'unpleased',
    'unpledged',
    'unplowed',
    'unplug',
    'unpopular',
    'unproven',
    'unquote',
    'unranked',
    'unrated',
    'unraveled',
    'unreached',
    'unread',
    'unreal',
    'unreeling',
    'unrefined',
    'unrelated',
    'unrented',
    'unrest',
    'unretired',
    'unrevised',
    'unrigged',
    'unripe',
    'unrivaled',
    'unroasted',
    'unrobed',
    'unroll',
    'unruffled',
    'unruly',
    'unrushed',
    'unsaddle',
    'unsafe',
    'unsaid',
    'unsalted',
    'unsaved',
    'unsavory',
    'unscathed',
    'unscented',
    'unscrew',
    'unsealed',
    'unseated',
    'unsecured',
    'unseeing',
    'unseemly',
    'unseen',
    'unselect',
    'unselfish',
    'unsent',
    'unsettled',
    'unshackle',
    'unshaken',
    'unshaved',
    'unshaven',
    'unsheathe',
    'unshipped',
    'unsightly',
    'unsigned',
    'unskilled',
    'unsliced',
    'unsmooth',
    'unsnap',
    'unsocial',
    'unsoiled',
    'unsold',
    'unsolved',
    'unsorted',
    'unspoiled',
    'unspoken',
    'unstable',
    'unstaffed',
    'unstamped',
    'unsteady',
    'unsterile',
    'unstirred',
    'unstitch',
    'unstopped',
    'unstuck',
    'unstuffed',
    'unstylish',
    'unsubtle',
    'unsubtly',
    'unsuited',
    'unsure',
    'unsworn',
    'untagged',
    'untainted',
    'untaken',
    'untamed',
    'untangled',
    'untapped',
    'untaxed',
    'unthawed',
    'unthread',
    'untidy',
    'untie',
    'until',
    'untimed',
    'untimely',
    'untitled',
    'untoasted',
    'untold',
    'untouched',
    'untracked',
    'untrained',
    'untreated',
    'untried',
    'untrimmed',
    'untrue',
    'untruth',
    'unturned',
    'untwist',
    'untying',
    'unusable',
    'unused',
    'unusual',
    'unvalued',
    'unvaried',
    'unvarying',
    'unveiled',
    'unveiling',
    'unvented',
    'unviable',
    'unvisited',
    'unvocal',
    'unwanted',
    'unwarlike',
    'unwary',
    'unwashed',
    'unwatched',
    'unweave',
    'unwed',
    'unwelcome',
    'unwell',
    'unwieldy',
    'unwilling',
    'unwind',
    'unwired',
    'unwitting',
    'unwomanly',
    'unworldly',
    'unworn',
    'unworried',
    'unworthy',
    'unwound',
    'unwoven',
    'unwrapped',
    'unwritten',
    'unzip',
    'upbeat',
    'upchuck',
    'upcoming',
    'upcountry',
    'update',
    'upfront',
    'upgrade',
    'upheaval',
    'upheld',
    'uphill',
    'uphold',
    'uplifted',
    'uplifting',
    'upload',
    'upon',
    'upper',
    'upright',
    'uprising',
    'upriver',
    'uproar',
    'uproot',
    'upscale',
    'upside',
    'upstage',
    'upstairs',
    'upstart',
    'upstate',
    'upstream',
    'upstroke',
    'upswing',
    'uptake',
    'uptight',
    'uptown',
    'upturned',
    'upward',
    'upwind',
    'uranium',
    'urban',
    'urchin',
    'urethane',
    'urgency',
    'urgent',
    'urging',
    'urologist',
    'urology',
    'usable',
    'usage',
    'useable',
    'used',
    'uselessly',
    'user',
    'usher',
    'usual',
    'utensil',
    'utility',
    'utilize',
    'utmost',
    'utopia',
    'utter',
    'vacancy',
    'vacant',
    'vacate',
    'vacation',
    'vagabond',
    'vagrancy',
    'vagrantly',
    'vaguely',
    'vagueness',
    'valiant',
    'valid',
    'valium',
    'valley',
    'valuables',
    'value',
    'vanilla',
    'vanish',
    'vanity',
    'vanquish',
    'vantage',
    'vaporizer',
    'variable',
    'variably',
    'varied',
    'variety',
    'various',
    'varmint',
    'varnish',
    'varsity',
    'varying',
    'vascular',
    'vaseline',
    'vastly',
    'vastness',
    'veal',
    'vegan',
    'veggie',
    'vehicular',
    'velcro',
    'velocity',
    'velvet',
    'vendetta',
    'vending',
    'vendor',
    'veneering',
    'vengeful',
    'venomous',
    'ventricle',
    'venture',
    'venue',
    'venus',
    'verbalize',
    'verbally',
    'verbose',
    'verdict',
    'verify',
    'verse',
    'version',
    'versus',
    'vertebrae',
    'vertical',
    'vertigo',
    'very',
    'vessel',
    'vest',
    'veteran',
    'veto',
    'vexingly',
    'viability',
    'viable',
    'vibes',
    'vice',
    'vicinity',
    'victory',
    'video',
    'viewable',
    'viewer',
    'viewing',
    'viewless',
    'viewpoint',
    'vigorous',
    'village',
    'villain',
    'vindicate',
    'vineyard',
    'vintage',
    'violate',
    'violation',
    'violator',
    'violet',
    'violin',
    'viper',
    'viral',
    'virtual',
    'virtuous',
    'virus',
    'visa',
    'viscosity',
    'viscous',
    'viselike',
    'visible',
    'visibly',
    'vision',
    'visiting',
    'visitor',
    'visor',
    'vista',
    'vitality',
    'vitalize',
    'vitally',
    'vitamins',
    'vivacious',
    'vividly',
    'vividness',
    'vixen',
    'vocalist',
    'vocalize',
    'vocally',
    'vocation',
    'voice',
    'voicing',
    'void',
    'volatile',
    'volley',
    'voltage',
    'volumes',
    'voter',
    'voting',
    'voucher',
    'vowed',
    'vowel',
    'voyage',
    'wackiness',
    'wad',
    'wafer',
    'waffle',
    'waged',
    'wager',
    'wages',
    'waggle',
    'wagon',
    'wake',
    'waking',
    'walk',
    'walmart',
    'walnut',
    'walrus',
    'waltz',
    'wand',
    'wannabe',
    'wanted',
    'wanting',
    'wasabi',
    'washable',
    'washbasin',
    'washboard',
    'washbowl',
    'washcloth',
    'washday',
    'washed',
    'washer',
    'washhouse',
    'washing',
    'washout',
    'washroom',
    'washstand',
    'washtub',
    'wasp',
    'wasting',
    'watch',
    'water',
    'waviness',
    'waving',
    'wavy',
    'whacking',
    'whacky',
    'wham',
    'wharf',
    'wheat',
    'whenever',
    'whiff',
    'whimsical',
    'whinny',
    'whiny',
    'whisking',
    'whoever',
    'whole',
    'whomever',
    'whoopee',
    'whooping',
    'whoops',
    'why',
    'wick',
    'widely',
    'widen',
    'widget',
    'widow',
    'width',
    'wieldable',
    'wielder',
    'wife',
    'wifi',
    'wikipedia',
    'wildcard',
    'wildcat',
    'wilder',
    'wildfire',
    'wildfowl',
    'wildland',
    'wildlife',
    'wildly',
    'wildness',
    'willed',
    'willfully',
    'willing',
    'willow',
    'willpower',
    'wilt',
    'wimp',
    'wince',
    'wincing',
    'wind',
    'wing',
    'winking',
    'winner',
    'winnings',
    'winter',
    'wipe',
    'wired',
    'wireless',
    'wiring',
    'wiry',
    'wisdom',
    'wise',
    'wish',
    'wisplike',
    'wispy',
    'wistful',
    'wizard',
    'wobble',
    'wobbling',
    'wobbly',
    'wok',
    'wolf',
    'wolverine',
    'womanhood',
    'womankind',
    'womanless',
    'womanlike',
    'womanly',
    'womb',
    'woof',
    'wooing',
    'wool',
    'woozy',
    'word',
    'work',
    'worried',
    'worrier',
    'worrisome',
    'worry',
    'worsening',
    'worshiper',
    'worst',
    'wound',
    'woven',
    'wow',
    'wrangle',
    'wrath',
    'wreath',
    'wreckage',
    'wrecker',
    'wrecking',
    'wrench',
    'wriggle',
    'wriggly',
    'wrinkle',
    'wrinkly',
    'wrist',
    'writing',
    'written',
    'wrongdoer',
    'wronged',
    'wrongful',
    'wrongly',
    'wrongness',
    'wrought',
    'xbox',
    'xerox',
    'yahoo',
    'yam',
    'yanking',
    'yapping',
    'yard',
    'yarn',
    'yeah',
    'yearbook',
    'yearling',
    'yearly',
    'yearning',
    'yeast',
    'yelling',
    'yelp',
    'yen',
    'yesterday',
    'yiddish',
    'yield',
    'yin',
    'yippee',
    'yo-yo',
    'yodel',
    'yoga',
    'yogurt',
    'yonder',
    'yoyo',
    'yummy',
    'zap',
    'zealous',
    'zebra',
    'zen',
    'zeppelin',
    'zero',
    'zestfully',
    'zesty',
    'zigzagged',
    'zipfile',
    'zipping',
    'zippy',
    'zips',
    'zit',
    'zodiac',
    'zombie',
    'zone',
    'zoning',
    'zookeeper',
    'zoologist',
    'zoology',
    'zoom',
];

},{}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecureRandomNumber = exports.getSecureRandomWords = exports.getSecureRandomBytes = void 0;
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
async function getSecureRandomBytes(size) {
    return (0, ton_crypto_primitives_1.getSecureRandomBytes)(size);
}
exports.getSecureRandomBytes = getSecureRandomBytes;
async function getSecureRandomWords(size) {
    return getSecureRandomWords(size);
}
exports.getSecureRandomWords = getSecureRandomWords;
async function getSecureRandomNumber(min, max) {
    let range = max - min;
    var bitsNeeded = Math.ceil(Math.log2(range));
    if (bitsNeeded > 53) {
        throw new Error('Range is too large');
    }
    var bytesNeeded = Math.ceil(bitsNeeded / 8);
    var mask = Math.pow(2, bitsNeeded) - 1;
    while (true) {
        let res = await getSecureRandomBytes(bitsNeeded);
        let power = (bytesNeeded - 1) * 8;
        let numberValue = 0;
        for (var i = 0; i < bytesNeeded; i++) {
            numberValue += res[i] * Math.pow(2, power);
            power -= 8;
        }
        numberValue = numberValue & mask; // Truncate
        if (numberValue >= range) {
            continue;
        }
        return min + numberValue;
    }
}
exports.getSecureRandomNumber = getSecureRandomNumber;

},{"ton-crypto-primitives":85}],101:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmac_sha512 = exports.hmac_sha512_fallback = void 0;
const jssha_1 = __importDefault(require("jssha"));
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
async function hmac_sha512_fallback(key, data) {
    let keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf-8') : key;
    let dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const shaObj = new jssha_1.default("SHA-512", "HEX", {
        hmacKey: { value: keyBuffer.toString('hex'), format: "HEX" },
    });
    shaObj.update(dataBuffer.toString('hex'));
    const hmac = shaObj.getHash("HEX");
    return Buffer.from(hmac, 'hex');
}
exports.hmac_sha512_fallback = hmac_sha512_fallback;
function hmac_sha512(key, data) {
    return (0, ton_crypto_primitives_1.hmac_sha512)(key, data);
}
exports.hmac_sha512 = hmac_sha512;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"jssha":7,"ton-crypto-primitives":85}],102:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBox = exports.sealBox = exports.signVerify = exports.sign = exports.keyPairFromSeed = exports.keyPairFromSecretKey = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
function keyPairFromSecretKey(secretKey) {
    let res = tweetnacl_1.default.sign.keyPair.fromSecretKey(new Uint8Array(secretKey));
    return {
        publicKey: Buffer.from(res.publicKey),
        secretKey: Buffer.from(res.secretKey),
    };
}
exports.keyPairFromSecretKey = keyPairFromSecretKey;
function keyPairFromSeed(secretKey) {
    let res = tweetnacl_1.default.sign.keyPair.fromSeed(new Uint8Array(secretKey));
    return {
        publicKey: Buffer.from(res.publicKey),
        secretKey: Buffer.from(res.secretKey),
    };
}
exports.keyPairFromSeed = keyPairFromSeed;
function sign(data, secretKey) {
    return Buffer.from(tweetnacl_1.default.sign.detached(new Uint8Array(data), new Uint8Array(secretKey)));
}
exports.sign = sign;
function signVerify(data, signature, publicKey) {
    return tweetnacl_1.default.sign.detached.verify(new Uint8Array(data), new Uint8Array(signature), new Uint8Array(publicKey));
}
exports.signVerify = signVerify;
function sealBox(data, nonce, key) {
    return Buffer.from(tweetnacl_1.default.secretbox(data, nonce, key));
}
exports.sealBox = sealBox;
function openBox(data, nonce, key) {
    let res = tweetnacl_1.default.secretbox.open(data, nonce, key);
    if (!res) {
        return null;
    }
    return Buffer.from(res);
}
exports.openBox = openBox;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"tweetnacl":107}],103:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pbkdf2_sha512 = void 0;
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
function pbkdf2_sha512(key, salt, iterations, keyLen) {
    return (0, ton_crypto_primitives_1.pbkdf2_sha512)(key, salt, iterations, keyLen);
}
exports.pbkdf2_sha512 = pbkdf2_sha512;

},{"ton-crypto-primitives":85}],104:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.sha256_fallback = exports.sha256_sync = void 0;
const jssha_1 = __importDefault(require("jssha"));
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
function sha256_sync(source) {
    let src;
    if (typeof source === 'string') {
        src = Buffer.from(source, 'utf-8').toString('hex');
    }
    else {
        src = source.toString('hex');
    }
    let hasher = new jssha_1.default('SHA-256', 'HEX');
    hasher.update(src);
    let res = hasher.getHash('HEX');
    return Buffer.from(res, 'hex');
}
exports.sha256_sync = sha256_sync;
async function sha256_fallback(source) {
    return sha256_sync(source);
}
exports.sha256_fallback = sha256_fallback;
function sha256(source) {
    return (0, ton_crypto_primitives_1.sha256)(source);
}
exports.sha256 = sha256;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"jssha":7,"ton-crypto-primitives":85}],105:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512 = exports.sha512_fallback = exports.sha512_sync = void 0;
const jssha_1 = __importDefault(require("jssha"));
const ton_crypto_primitives_1 = require("ton-crypto-primitives");
function sha512_sync(source) {
    let src;
    if (typeof source === 'string') {
        src = Buffer.from(source, 'utf-8').toString('hex');
    }
    else {
        src = source.toString('hex');
    }
    let hasher = new jssha_1.default('SHA-512', 'HEX');
    hasher.update(src);
    let res = hasher.getHash('HEX');
    return Buffer.from(res, 'hex');
}
exports.sha512_sync = sha512_sync;
async function sha512_fallback(source) {
    return sha512_sync(source);
}
exports.sha512_fallback = sha512_fallback;
async function sha512(source) {
    return (0, ton_crypto_primitives_1.sha512)(source);
}
exports.sha512 = sha512;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"jssha":7,"ton-crypto-primitives":85}],106:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitsToBytes = exports.bytesToBits = exports.lpad = void 0;
function lpad(str, padString, length) {
    while (str.length < length) {
        str = padString + str;
    }
    return str;
}
exports.lpad = lpad;
function bytesToBits(bytes) {
    let res = '';
    for (let i = 0; i < bytes.length; i++) {
        let x = bytes.at(i);
        res += lpad(x.toString(2), '0', 8);
    }
    return res;
}
exports.bytesToBits = bytesToBits;
function bitsToBytes(src) {
    if (src.length % 8 !== 0) {
        throw Error('Uneven bits');
    }
    let res = [];
    while (src.length > 0) {
        res.push(parseInt(src.slice(0, 8), 2));
        src = src.slice(8);
    }
    return Buffer.from(res);
}
exports.bitsToBytes = bitsToBytes;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],107:[function(require,module,exports){
(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = Math.floor((x[j] + 128) / 256);
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  return n;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES,

  gf: gf,
  D: D,
  L: L,
  pack25519: pack25519,
  unpack25519: unpack25519,
  M: M,
  A: A,
  S: S,
  Z: Z,
  pow2523: pow2523,
  add: add,
  set25519: set25519,
  modL: modL,
  scalarmult: scalarmult,
  scalarbase: scalarbase,
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  for (var i = 0; i < arguments.length; i++) {
    if (!(arguments[i] instanceof Uint8Array))
      throw new TypeError('unexpected type, use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return null;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));

},{"crypto":2}],108:[function(require,module,exports){
const TonCore = require("ton-core");
window.TonCore = TonCore;
window.Buffer = require("buffer/").Buffer;

},{"buffer/":4,"ton-core":40}]},{},[108]);
