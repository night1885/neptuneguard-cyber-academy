import {createWebRehearsalCore} from './standalone-web-rehearsal-core.mjs';
const unavailable = () => Object.freeze({outcome:'unavailable'});
const bounded = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;

export function createBoundedWebRehearsal(config = {}, ports = {}) {
  if (config.enabled !== true) return Object.freeze({enabled:false});
  const {providerMs=250, drainMs=1000, maxOperations=20, maxInflight=8} = config;
  if (!bounded(providerMs,5,1000) || !bounded(drainMs,5,2000) || !bounded(maxOperations,1,20) || !bounded(maxInflight,1,8)) throw Error('Explicit lifecycle bounds required');
  if (typeof ports.authorize !== 'function' || typeof ports.loadPage !== 'function' || typeof ports.progress?.read !== 'function' || typeof ports.progress?.compareAndSet !== 'function') throw Error('Reviewed providers required');
  let stopped=false, closing=null;
  const operations=new Set(), inflight=new Set();
  async function invoke(fn, args) {
    if (stopped || inflight.size >= maxInflight) throw Error('Unavailable');
    const work=Promise.resolve().then(() => {
      if (stopped) throw Error('Stopped');
      return fn(...args);
    });
    inflight.add(work);
    void work.then(() => inflight.delete(work), () => inflight.delete(work));
    let timer;
    try {
      const value=await Promise.race([work,new Promise((_,reject) => {
        timer=setTimeout(() => reject(Error('Provider outcome unknown')),providerMs);
      })]);
      if (stopped) throw Error('Stopped');
      return value;
    } finally {clearTimeout(timer);}
  }
  const core=createWebRehearsalCore(config,{
    authorize:(...args) => invoke((...a) => ports.authorize(...a),args),
    loadPage:(...args) => invoke((...a) => ports.loadPage(...a),args),
    progress:{
      read:(...args) => invoke((...a) => ports.progress.read(...a),args),
      compareAndSet:(...args) => invoke((...a) => ports.progress.compareAndSet(...a),args)
    }
  });
  return Object.freeze({enabled:true,
    run(request) {
      if (stopped || operations.size >= maxOperations) return Promise.resolve(unavailable());
      const task=core.run(request).then(result => stopped ? unavailable() : result, unavailable);
      operations.add(task);
      void task.then(() => operations.delete(task), () => operations.delete(task));
      return task;
    },
    stop() {
      if (!closing) {
        stopped=true;
        core.stop();
        let timer;
        closing=Promise.race([
          Promise.allSettled([...operations,...inflight]).then(() => Object.freeze({drained:true})),
          new Promise(resolve => {timer=setTimeout(() => resolve(Object.freeze({drained:false})),drainMs);})
        ]).finally(() => clearTimeout(timer));
      }
      return closing;
    }
  });
}
