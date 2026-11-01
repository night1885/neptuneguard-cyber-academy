export function stagingPrepareTimeouts(options={}) {
 const providerTimeoutMs=options.providerTimeoutMs??5000;
 const prepareTimeoutMs=options.prepareTimeoutMs??60000;
 if(!Number.isInteger(providerTimeoutMs)||providerTimeoutMs<5||providerTimeoutMs>10000||
    !Number.isInteger(prepareTimeoutMs)||prepareTimeoutMs<10||prepareTimeoutMs>60000||
    prepareTimeoutMs<=providerTimeoutMs)throw Error('Invalid staging preparation timeouts');
 return Object.freeze({providerTimeoutMs,prepareTimeoutMs});
}
