export function stagingPrepareTimeouts(options={}) {
 const providerTimeoutMs=options.providerTimeoutMs===undefined?5000:options.providerTimeoutMs;
 const prepareTimeoutMs=options.prepareTimeoutMs===undefined?60000:options.prepareTimeoutMs;
 if(!Number.isInteger(providerTimeoutMs)||providerTimeoutMs<5||providerTimeoutMs>10000||
    !Number.isInteger(prepareTimeoutMs)||prepareTimeoutMs<10||prepareTimeoutMs>60000||
    prepareTimeoutMs<=providerTimeoutMs)throw Error('Invalid staging preparation timeouts');
 return Object.freeze({providerTimeoutMs,prepareTimeoutMs});
}
