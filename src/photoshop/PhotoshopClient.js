// Original code:
/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import { createPhotoshopCrypto } from './PhotoshopCrypto.js';

// Constants
// Connection constants
const DEFAULT_PASSWORD = 'password',
    DEFAULT_PORT = 49494,
    DEFAULT_HOSTNAME = '127.0.0.1',
    SOCKET_KEEPALIVE_DELAY = 1000; // milliseconds

const CONNECTION_STATES = {
    NONE: 0,
    CONNECTING: 1,
    OPEN: 2,
    CLOSING: 3,
    CLOSED: 4,
    DESTROYED: 5
};

// Protocol constants
const MESSAGE_LENGTH_OFFSET = 0,
    MESSAGE_STATUS_OFFSET = 4,
    MESSAGE_STATUS_LENGTH = 4,
    MESSAGE_PAYLOAD_OFFSET = MESSAGE_STATUS_OFFSET + MESSAGE_STATUS_LENGTH,
    PAYLOAD_HEADER_LENGTH = 12,
    PAYLOAD_PROTOCOL_OFFSET = 0,
    PAYLOAD_ID_OFFSET = 4,
    PAYLOAD_TYPE_OFFSET = 8,
    MAX_MESSAGE_ID = 256 * 256 * 256,
    PROTOCOL_VERSION = 1,
    MESSAGE_TYPE_ERROR = 1,
    MESSAGE_TYPE_JAVASCRIPT = 2,
    MESSAGE_TYPE_PIXMAP = 3,
    MESSAGE_TYPE_ICC_PROFILE = 4,
    MESSAGE_TYPE_KEEPALIVE = 6,
    STATUS_NO_COMM_ERROR = 0;

// 64 kB (maximum size of the TCP packages on the Mac)
const INITIAL_MESSAGE_BUFFER_SIZE = 65536,
    // Known strings to be sent as messages, that should not be parsed as JSON
    KNOWN_LITERAL_STRING_MESSAGES = ['', '[ActionDescriptor]', 'Yep, still alive'];

// Helper Functions

function ensureBufferSize(buffer, minimumSize, contentSize)
{
    if (buffer.length >= minimumSize)
    {
        return buffer;
    }

    var newBuffer = new Buffer(minimumSize);

    if (contentSize)
    {
        buffer.copy(newBuffer, 0, 0, contentSize);
    }
    else
    {
        buffer.copy(newBuffer);
    }

    return newBuffer;
}

function round(value, decimals)
{
    var factor = Math.pow(10, decimals);
    return Math.round(factor * value) / factor;
}

// Needed to fix "function not found" errors in CC 2021
// See: https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_10.x/Documentation/CEP%2010.0%20HTML%20Extension%20Cookbook.md#user-content-migration-from-cep-9-to-cep-10
(function __compat()
{
    var Duplex = require('stream').Duplex;
    var Writable = require('stream').Writable;

    const keys = Object.keys(Writable.prototype);
    for (var v = 0; v < keys.length; v++)
    {     
        const method = keys[v];
        if (!Duplex.prototype[method])
        {
            Duplex.prototype[method] = Writable.prototype[method];
        }
    }
})();

/**
 * PhotoshopClient
 */
export default class PhotoshopClient extends EventEmitter
{
    constructor(options, connectListener)
    {
        super();
        options = options || {};

        const hasOwnProperty = Object.prototype.hasOwnProperty;
        let password = DEFAULT_PASSWORD;

        if (hasOwnProperty.call(options, 'password')) { password = options.password; }
        if (hasOwnProperty.call(options, 'port')) { this._port = options.port; }
        if (hasOwnProperty.call(options, 'hostname')) { this._hostname = options.hostname; }
        if (hasOwnProperty.call(options, 'inputFd')) { this._inputFd = options.inputFd; }
        if (hasOwnProperty.call(options, 'outputFd')) { this._outputFd = options.outputFd; }

        this._receiveBuffer = new Buffer(INITIAL_MESSAGE_BUFFER_SIZE);
        this._receivedBytes = 0;
        this._writeQueue = [];

        if (connectListener)
        {
            this.once('connect', connectListener);
        }

        var connectionPromise = null,
            cryptoPromise = null;

        if ((typeof this._inputFd === 'number' && typeof this._outputFd === 'number') ||
            (typeof this._inputFd === 'string' && typeof this._outputFd === 'string'))
        {
            connectionPromise = this._connectPipe();
            cryptoPromise = Promise.resolve();
        }
        else if (this._hostname && typeof this._port === 'number')
        {
            connectionPromise = this._connectSocket();
            cryptoPromise = this._initCrypto(password);
        }
        else
        {
            connectionPromise = Promise.reject();
        }

        Promise.all([
            connectionPromise,
            cryptoPromise
        ]).then(() =>
        {
            this.emit('connect');

        }).catch((error) =>
        {
            this.emit('error', error);
            this.disconnect();

        });
    }

    _initCrypto(password)
    {
        var self = this;

        return new Promise(function (resolve, reject)
        {
            createPhotoshopCrypto(password, function (err, crypto)
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    self._crypto = crypto;
                    resolve();
                }
            });
        });
    }

    _connectPipe()
    {
        var self = this,
            fs = require('fs'),
            result = false;

        try
        {
            self._connectionState = CONNECTION_STATES.CONNECTING;

            if (typeof self._inputFd === 'number')
            {
                self._readStream = fs.createReadStream(null, { fd: self._inputFd });
            }
            else
            {
                // named pipe
                self.emit('info', 'using named read pipe ' + self._inputFd);
                self._readStream = fs.createReadStream(self._inputFd);
            }

            self._readStream.on('data', function (incomingBuffer)
            {
                var isNewMessage = self._receivedBytes === 0,
                    minimumSize = incomingBuffer.length + self._receivedBytes;

                self._receiveBuffer = ensureBufferSize(self._receiveBuffer, minimumSize);
                incomingBuffer.copy(self._receiveBuffer, self._receivedBytes);
                self._receivedBytes += incomingBuffer.length;

                self._processReceiveBuffer(isNewMessage);
            });

            self._readStream.on('error', function (err)
            {
                self.emit('error', 'Pipe error: ' + err);
                self.disconnect();
            });

            self._readStream.on('close', function ()
            {
                self._connectionState = CONNECTION_STATES.CLOSED;
                self.emit('close');
            });

            self._readStream.resume();

            if (typeof self._outputFd === 'number')
            {
                self._writeStream = fs.createWriteStream(null, { fd: self._outputFd });
            }
            else
            {
                // named pipe
                self.emit('info', 'using named write pipe ' + self._outputFd);
                self._writeStream = fs.createWriteStream(self._outputFd);
            }

            self._writeStream.on('error', function (err)
            {
                self.emit('error', 'Pipe error: ' + err);
                self.disconnect();
            });

            self._writeStream.on('close', function ()
            {
                self._connectionState = CONNECTION_STATES.CLOSED;
                self.emit('close');
            });

            self._writeStream.on('drain', function ()
            {
                self._doPendingWrites();
            });

            result = true;
        }
        catch (e)
        {
            self.emit('error', 'Pipe error: ' + e);
            self.disconnect();
        }

        return result;
    }

    _connectSocket()
    {
        var self = this;

        return new Promise(function (resolve, reject)
        {
            self._socket = new net.Socket();
            self._connectionState = CONNECTION_STATES.CONNECTING;

            // Register event handlers for socket
            self._socket.on('connect', function ()
            {
                self._connectionState = CONNECTION_STATES.OPEN;
                self._socket.setKeepAlive(true, SOCKET_KEEPALIVE_DELAY);
                self._socket.setNoDelay();
                resolve(self);
                self._writeStream = self._socket;
            });

            self._socket.on('error', function (err)
            {
                reject(err);
                self.emit('error', 'Socket error: ' + err);
                self.disconnect();
            });

            self._socket.on('close', function ()
            {
                self._connectionState = CONNECTION_STATES.CLOSED;
                self.emit('close');
            });

            self._socket.on('data', function (incomingBuffer)
            {
                var isNewMessage = self._receivedBytes === 0,
                    minimumSize = incomingBuffer.length + self._receivedBytes;

                self._receiveBuffer = ensureBufferSize(self._receiveBuffer, minimumSize);
                incomingBuffer.copy(self._receiveBuffer, self._receivedBytes);
                self._receivedBytes += incomingBuffer.length;

                self._processReceiveBuffer(isNewMessage);
            });

            self._socket.on('drain', function ()
            {
                self._doPendingWrites();
            });

            self._socket.connect(self._port, self._hostname);
        });
    }

    _writeWhenFree(buffer)
    {
        var self = this;
        self._writeQueue.push(buffer);
        process.nextTick(function () { self._doPendingWrites(); });
    }

    _doPendingWrites()
    {
        if (this._writeStream && this._writeQueue.length > 0 && !this._writeStream.busy)
        {
            var bufferToWrite = this._writeQueue.shift(),
                writeStatus = this._writeStream.write(bufferToWrite);

            if (writeStatus && this._writeQueue.length > 0)
            {
                this._doPendingWrites();
            }
        }

        // Continue to try writing as long as there is something left to write
        if (this._writeStream && this._writeQueue.length > 0)
        {
            process.nextTick(this._doPendingWrites.bind(this));
        }
    }

    isConnected()
    {
        return (this._connectionState === CONNECTION_STATES.OPEN);
    }

    disconnect(listener)
    {
        // NOTE: This method *must* do any actual cleanup of os resources
        // (e.g. sockets, pipes) synchronously. Listeners may be called asynchronously
        // after those resources actually close. In cases where disconnect is called
        // at process.exit, listeners may not get called.
        if (!listener)
        {
            listener = function () { };
        }

        if (this._socket)
        {
            var currentState = this._connectionState;

            switch (currentState)
            {
                case CONNECTION_STATES.NONE:
                    this._connectionState = CONNECTION_STATES.CLOSED;
                    process.nextTick(listener);
                    return true;

                case CONNECTION_STATES.CONNECTING:
                    this._connectionState = CONNECTION_STATES.CLOSING;
                    this._socket.once('close', listener);
                    this._socket.end();
                    return true;

                case CONNECTION_STATES.OPEN:
                    this._connectionState = CONNECTION_STATES.CLOSING;
                    this._socket.once('close', listener);
                    this._socket.end();
                    return true;

                case CONNECTION_STATES.CLOSING:
                    this._socket.once('close', listener);
                    return true;

                case CONNECTION_STATES.CLOSED:
                    process.nextTick(listener);
                    return true;

                case CONNECTION_STATES.DESTROYED:
                    process.nextTick(listener);
                    return true;
            }
        }
        else
        {
            if (this._readStream)
            {
                try
                {
                    this._readStream.close();
                }
                catch (readCloseError)
                {
                    // do nothing
                }

                this._readStream = null;
            }

            if (this._writeStream)
            {
                try
                {
                    this._writeStream.close();
                }
                catch (writeCloseError)
                {
                    // do nothing
                }

                this._writeStream = null;
            }

            this._connectionState = CONNECTION_STATES.CLOSED;
            process.nextTick(listener);
            return true;
        }
    }

    destroy()
    {
        this._connectionState = CONNECTION_STATES.DESTROYED;

        if (this._socket)
        {
            this._socket.destroy();
        }
    }

    _sendMessage(payloadBuffer)
    {
        var cipheredPayloadBuffer = this._crypto ? this._crypto.cipher(payloadBuffer) : payloadBuffer;
        var headerBuffer = new Buffer(MESSAGE_PAYLOAD_OFFSET);

        // message length includes status and payload, but not the UInt32 specifying message length
        var messageLength = cipheredPayloadBuffer.length + MESSAGE_STATUS_LENGTH;
        headerBuffer.writeUInt32BE(messageLength, MESSAGE_LENGTH_OFFSET);
        headerBuffer.writeInt32BE(STATUS_NO_COMM_ERROR, MESSAGE_STATUS_OFFSET);

        this._writeWhenFree(headerBuffer);
        this._writeWhenFree(cipheredPayloadBuffer);
    }

    sendKeepAlive()
    {
        var id = this._lastMessageID = (this._lastMessageID + 1) % MAX_MESSAGE_ID,
            payloadBuffer = new Buffer(PAYLOAD_HEADER_LENGTH);

        payloadBuffer.writeUInt32BE(PROTOCOL_VERSION, PAYLOAD_PROTOCOL_OFFSET);
        payloadBuffer.writeUInt32BE(id, PAYLOAD_ID_OFFSET);
        payloadBuffer.writeUInt32BE(MESSAGE_TYPE_KEEPALIVE, PAYLOAD_TYPE_OFFSET);

        this._sendMessage(payloadBuffer);
        return id;
    }

    sendCommand(javascript)
    {
        var id = this._lastMessageID = (this._lastMessageID + 1) % MAX_MESSAGE_ID,
            codeBuffer = new Buffer(javascript, 'utf8'),
            payloadBuffer = new Buffer(codeBuffer.length + PAYLOAD_HEADER_LENGTH);

        payloadBuffer.writeUInt32BE(PROTOCOL_VERSION, PAYLOAD_PROTOCOL_OFFSET);
        payloadBuffer.writeUInt32BE(id, PAYLOAD_ID_OFFSET);
        payloadBuffer.writeUInt32BE(MESSAGE_TYPE_JAVASCRIPT, PAYLOAD_TYPE_OFFSET);
        codeBuffer.copy(payloadBuffer, PAYLOAD_HEADER_LENGTH);

        this._sendMessage(payloadBuffer);
        return id;
    }

    _processReceiveBuffer(isNewMessage)
    {
        if (!RELEASE)
        {
            // Log when the message started to come in so we can analyze the performance
            if (isNewMessage && this._receivedBytes > 0)
            {
                this.messageStartTime = new Date().getTime();
            }
        }

        // The header hasn't arrived yet: stop here
        if (this._receivedBytes < MESSAGE_PAYLOAD_OFFSET)
        {
            return;
        }

        // Evaluate communication status
        var commStatus = this._receiveBuffer.readInt32BE(MESSAGE_STATUS_OFFSET);

        if (commStatus !== STATUS_NO_COMM_ERROR)
        {
            console.error('Communication error: ' + commStatus);
            this.emit('communicationsError', 'Photoshop communication error: ' + commStatus);
            this.disconnect();
            return;
        }

        // Message length includes status and payload, but not the UInt32 specifying message length
        var messageLength = this._receiveBuffer.readUInt32BE(MESSAGE_LENGTH_OFFSET),
            totalLength = messageLength + MESSAGE_STATUS_OFFSET;

        // Make sure the buffer is large enough to contain the whole message
        this._receiveBuffer = ensureBufferSize(this._receiveBuffer, totalLength, this._receivedBytes);

        // Unless the entire message has already been received, stop here
        if (this._receivedBytes < totalLength)
        {
            return;
        }

        if (!RELEASE)
        {
            // Performance evaluation
            var duration = new Date().getTime() - this.messageStartTime;

            if (duration > 10)
            {
                var size = this._receivedBytes / 1024,
                    speed = size / (duration / 1000);

                console.info(duration + 'ms to receive ' + round(size, 1) + ' kB (' + round(speed, 1) + ' kB/s)');
            }
        }

        // Extract the message
        var cipheredBody = this._receiveBuffer.slice(MESSAGE_PAYLOAD_OFFSET, totalLength),
            remainingBytes = this._receivedBytes - totalLength,
            preferredBufferSize = Math.max(INITIAL_MESSAGE_BUFFER_SIZE, remainingBytes);

        // Prepare the buffer for the next message
        var oldBuffer = this._receiveBuffer;
        this._receiveBuffer = new Buffer(preferredBufferSize);

        if (remainingBytes > 0)
        {
            oldBuffer.copy(this._receiveBuffer, 0, totalLength, this._receivedBytes);
        }

        this._receivedBytes = remainingBytes;

        // Decrypt the message
        if (!RELEASE)
        {
            var startTime = new Date().getTime();
        }

        var bodyBuffer = this._crypto ? this._crypto.decipher(cipheredBody) : cipheredBody;

        if (!RELEASE)
        {
            duration = new Date().getTime() - startTime;

            if (duration > 10)
            {
                console.info(duration + 'ms to decrypt buffer');
            }
        }

        // Process message
        this._processMessage(bodyBuffer);

        // Receive buffer might have more than one message, so process again
        this._processReceiveBuffer(true);
    }

    _processMessage(bodyBuffer)
    {
        var protocolVersion = bodyBuffer.readUInt32BE(PAYLOAD_PROTOCOL_OFFSET),
            messageID = bodyBuffer.readUInt32BE(PAYLOAD_ID_OFFSET),
            messageType = bodyBuffer.readUInt32BE(PAYLOAD_TYPE_OFFSET),
            messageBody = bodyBuffer.slice(PAYLOAD_HEADER_LENGTH);

        var rawMessage = {
            protocolVersion: protocolVersion,
            id: messageID,
            type: messageType,
            body: messageBody
        };

        if (protocolVersion !== PROTOCOL_VERSION)
        {
            this.emit('communicationsError', 'unknown protocol version', protocolVersion);
        }
        else if (messageType === MESSAGE_TYPE_JAVASCRIPT)
        {
            var messageBodyString = messageBody.toString('utf8');
            var messageBodyParts = messageBodyString.split('\r');
            var eventName = null;
            var parsedValue = null;

            if (messageBodyParts.length === 2)
            {
                eventName = messageBodyParts[0];
            }

            parsedValue = messageBodyParts[messageBodyParts.length - 1];

            // Most commands pass JSON back. However, some pass strings that result from
            // toStrings of un-JSON-ifiable data (e.g. '[ActionDescriptor]'). Still others
            // pass actual strings (that are not JSON) that we want to use (e.g. requests
            // for the Photoshop path). So, we try to parse as JSON, and if we fail, we just
            // use the string as the parsedValue. For some known strings, we don't try,
            // in order to avoid uninformative error messages for the console and the logs.
            //
            // TODO: In the future, it might make more sense to have a different slot in
            // the message that gives parsed data (if available) and unparsed string (always)
            if (KNOWN_LITERAL_STRING_MESSAGES.indexOf(parsedValue) === -1)
            {
                try
                {
                    parsedValue = JSON.parse(parsedValue);
                }
                catch (jsonParseException)
                {
                    // do nothing; this is not unexpected
                }
            }

            if (eventName)
            {
                this.emit('event', messageID, eventName, parsedValue, rawMessage);
            }
            else
            {
                this.emit('message', messageID, parsedValue, rawMessage);
            }
        }
        else if (messageType === MESSAGE_TYPE_PIXMAP)
        {
            this.emit('pixmap', messageID, messageBody, rawMessage);
        }
        else if (messageType === MESSAGE_TYPE_ICC_PROFILE)
        {
            this.emit("iccProfile", messageID, messageBody, rawMessage);
        }
        else if (messageType === MESSAGE_TYPE_ERROR)
        {
            this.emit('error', { id: messageID, body: messageBody.toString('utf8') });
        }
        else
        {
            this.emit('communicationsError', 'unknown message type', messageType);
        }
    }

}

// Member Variables

PhotoshopClient.prototype._port = DEFAULT_PORT;
PhotoshopClient.prototype._hostname = DEFAULT_HOSTNAME;
PhotoshopClient.prototype._connectionState = CONNECTION_STATES.NONE;
PhotoshopClient.prototype._lastMessageID = 0;
PhotoshopClient.prototype._crypto = null;
PhotoshopClient.prototype._receiveBuffer = null;
PhotoshopClient.prototype._receivedBytes = 0;
PhotoshopClient.prototype._writeQueue = null;
PhotoshopClient.prototype._commandDeferreds = null;
