
export function assert(condition, message)
{
    if (!RELEASE && !condition)
    {
        throw new Error(message);
    }
}

export function assertType(condition, message)
{
    if (!RELEASE && !condition)
    {
        throw new TypeError(message);
    }
}
