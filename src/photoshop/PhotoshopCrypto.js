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

import { createDecipheriv, createCipheriv, pbkdf2 } from 'crypto';

// Constants
const SALT = 'Adobe Photoshop',
    NUM_ITERATIONS = 1000,
    ALGORITHM = 'des-ede3-cbc',
    KEY_LENGTH = 24,
    IV = new Buffer('000000005d260000', 'hex'); // 0000 0000 5d26 0000    

/**
 * PhotoshopCrypto
 */
class PhotoshopCrypto
{
    constructor(derivedKey)
    {
        this._derivedKey = derivedKey;
    }

    decipher(buf)
    {
        const d = createDecipheriv(ALGORITHM, this._derivedKey, IV);
        return new Buffer(d.update(buf, 'binary', 'binary') + d.final('binary'), 'binary');
    }

    cipher(buf)
    {
        const c = createCipheriv(ALGORITHM, this._derivedKey, IV);
        return new Buffer(c.update(buf, 'binary', 'binary') + c.final('binary'), 'binary');
    }

}

export function createPhotoshopCrypto(password, callback)
{
    const pbkdf2Callback = function (err, derivedKey)
    {
        if (err)
        {
            callback(err, null);
        }
        else
        {
            callback(null, new PhotoshopCrypto(derivedKey));
        }
    };

    // Phothoshop CC 2015 ships with NodeJS 0.8.2 which doesn't support the [digest] parameter in the function signature
    if (process.version === 'v0.8.22')
    {
        pbkdf2(password, SALT, NUM_ITERATIONS, KEY_LENGTH, pbkdf2Callback);
    }
    else
    {
        pbkdf2(password, SALT, NUM_ITERATIONS, KEY_LENGTH, 'sha1', pbkdf2Callback);
    }
}
