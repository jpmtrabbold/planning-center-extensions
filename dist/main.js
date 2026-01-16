// node_modules/@trpc/server/dist/observable-ade1bad8.mjs
function identity(x) {
  return x;
}
function pipeFromArray(fns) {
  if (fns.length === 0) {
    return identity;
  }
  if (fns.length === 1) {
    return fns[0];
  }
  return function piped(input) {
    return fns.reduce((prev, fn) => fn(prev), input);
  };
}
function observable(subscribe) {
  const self = {
    subscribe(observer) {
      let teardownRef = null;
      let isDone = false;
      let unsubscribed = false;
      let teardownImmediately = false;
      function unsubscribe() {
        if (teardownRef === null) {
          teardownImmediately = true;
          return;
        }
        if (unsubscribed) {
          return;
        }
        unsubscribed = true;
        if (typeof teardownRef === "function") {
          teardownRef();
        } else if (teardownRef) {
          teardownRef.unsubscribe();
        }
      }
      teardownRef = subscribe({
        next(value) {
          if (isDone) {
            return;
          }
          observer.next?.(value);
        },
        error(err) {
          if (isDone) {
            return;
          }
          isDone = true;
          observer.error?.(err);
          unsubscribe();
        },
        complete() {
          if (isDone) {
            return;
          }
          isDone = true;
          observer.complete?.();
          unsubscribe();
        }
      });
      if (teardownImmediately) {
        unsubscribe();
      }
      return {
        unsubscribe
      };
    },
    pipe(...operations) {
      return pipeFromArray(operations)(self);
    }
  };
  return self;
}

// node_modules/@trpc/server/dist/observable/index.mjs
function share(_opts) {
  return (originalObserver) => {
    let refCount = 0;
    let subscription = null;
    const observers = [];
    function startIfNeeded() {
      if (subscription) {
        return;
      }
      subscription = originalObserver.subscribe({
        next(value) {
          for (const observer of observers) {
            observer.next?.(value);
          }
        },
        error(error) {
          for (const observer of observers) {
            observer.error?.(error);
          }
        },
        complete() {
          for (const observer of observers) {
            observer.complete?.();
          }
        }
      });
    }
    function resetIfNeeded() {
      if (refCount === 0 && subscription) {
        const _sub = subscription;
        subscription = null;
        _sub.unsubscribe();
      }
    }
    return {
      subscribe(observer) {
        refCount++;
        observers.push(observer);
        startIfNeeded();
        return {
          unsubscribe() {
            refCount--;
            resetIfNeeded();
            const index = observers.findIndex((v) => v === observer);
            if (index > -1) {
              observers.splice(index, 1);
            }
          }
        };
      }
    };
  };
}
var ObservableAbortError = class _ObservableAbortError extends Error {
  constructor(message) {
    super(message);
    this.name = "ObservableAbortError";
    Object.setPrototypeOf(this, _ObservableAbortError.prototype);
  }
};
function observableToPromise(observable2) {
  let abort;
  const promise = new Promise((resolve, reject) => {
    let isDone = false;
    function onDone() {
      if (isDone) {
        return;
      }
      isDone = true;
      reject(new ObservableAbortError("This operation was aborted."));
      obs$.unsubscribe();
    }
    const obs$ = observable2.subscribe({
      next(data) {
        isDone = true;
        resolve(data);
        onDone();
      },
      error(data) {
        isDone = true;
        reject(data);
        onDone();
      },
      complete() {
        isDone = true;
        onDone();
      }
    });
    abort = onDone;
  });
  return {
    promise,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    abort
  };
}

// node_modules/@trpc/client/dist/splitLink-4c75f7be.mjs
function createChain(opts) {
  return observable((observer) => {
    function execute(index = 0, op = opts.op) {
      const next = opts.links[index];
      if (!next) {
        throw new Error("No more links to execute - did you forget to add an ending link?");
      }
      const subscription = next({
        op,
        next(nextOp) {
          const nextObserver = execute(index + 1, nextOp);
          return nextObserver;
        }
      });
      return subscription;
    }
    const obs$ = execute();
    return obs$.subscribe(observer);
  });
}

// node_modules/@trpc/server/dist/codes-c924c3db.mjs
function invert(obj) {
  const newObj = /* @__PURE__ */ Object.create(null);
  for (const key in obj) {
    const v = obj[key];
    newObj[v] = key;
  }
  return newObj;
}
var TRPC_ERROR_CODES_BY_KEY = {
  /**
  * Invalid JSON was received by the server.
  * An error occurred on the server while parsing the JSON text.
  */
  PARSE_ERROR: -32700,
  /**
  * The JSON sent is not a valid Request object.
  */
  BAD_REQUEST: -32600,
  // Internal JSON-RPC error
  INTERNAL_SERVER_ERROR: -32603,
  NOT_IMPLEMENTED: -32603,
  // Implementation specific errors
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  METHOD_NOT_SUPPORTED: -32005,
  TIMEOUT: -32008,
  CONFLICT: -32009,
  PRECONDITION_FAILED: -32012,
  PAYLOAD_TOO_LARGE: -32013,
  UNPROCESSABLE_CONTENT: -32022,
  TOO_MANY_REQUESTS: -32029,
  CLIENT_CLOSED_REQUEST: -32099
};
var TRPC_ERROR_CODES_BY_NUMBER = invert(TRPC_ERROR_CODES_BY_KEY);

// node_modules/@trpc/server/dist/index-f91d720c.mjs
var TRPC_ERROR_CODES_BY_NUMBER2 = invert(TRPC_ERROR_CODES_BY_KEY);
var noop = () => {
};
function createInnerProxy(callback, path) {
  const proxy = new Proxy(noop, {
    get(_obj, key) {
      if (typeof key !== "string" || key === "then") {
        return void 0;
      }
      return createInnerProxy(callback, [
        ...path,
        key
      ]);
    },
    apply(_1, _2, args) {
      const isApply = path[path.length - 1] === "apply";
      return callback({
        args: isApply ? args.length >= 2 ? args[1] : [] : args,
        path: isApply ? path.slice(0, -1) : path
      });
    }
  });
  return proxy;
}
var createRecursiveProxy = (callback) => createInnerProxy(callback, []);
var createFlatProxy = (callback) => {
  return new Proxy(noop, {
    get(_obj, name) {
      if (typeof name !== "string" || name === "then") {
        return void 0;
      }
      return callback(name);
    }
  });
};

// node_modules/@trpc/server/dist/getCauseFromUnknown-2d66414a.mjs
function isObject(value) {
  return !!value && !Array.isArray(value) && typeof value === "object";
}
var UnknownCauseError = class extends Error {
};
function getCauseFromUnknown(cause) {
  if (cause instanceof Error) {
    return cause;
  }
  const type = typeof cause;
  if (type === "undefined" || type === "function" || cause === null) {
    return void 0;
  }
  if (type !== "object") {
    return new Error(String(cause));
  }
  if (isObject(cause)) {
    const err = new UnknownCauseError();
    for (const key in cause) {
      err[key] = cause[key];
    }
    return err;
  }
  return void 0;
}

// node_modules/@trpc/client/dist/transformResult-ace864b8.mjs
function isObject2(value) {
  return !!value && !Array.isArray(value) && typeof value === "object";
}
function transformResultInner(response, runtime) {
  if ("error" in response) {
    const error = runtime.transformer.deserialize(response.error);
    return {
      ok: false,
      error: {
        ...response,
        error
      }
    };
  }
  const result = {
    ...response.result,
    ...(!response.result.type || response.result.type === "data") && {
      type: "data",
      data: runtime.transformer.deserialize(response.result.data)
    }
  };
  return {
    ok: true,
    result
  };
}
var TransformResultError = class extends Error {
  constructor() {
    super("Unable to transform response from server");
  }
};
function transformResult(response, runtime) {
  let result;
  try {
    result = transformResultInner(response, runtime);
  } catch (err) {
    throw new TransformResultError();
  }
  if (!result.ok && (!isObject2(result.error.error) || typeof result.error.error.code !== "number")) {
    throw new TransformResultError();
  }
  if (result.ok && !isObject2(result.result)) {
    throw new TransformResultError();
  }
  return result;
}

// node_modules/@trpc/client/dist/TRPCClientError-38f9a32a.mjs
function isTRPCClientError(cause) {
  return cause instanceof TRPCClientError || /**
  * @deprecated
  * Delete in next major
  */
  cause instanceof Error && cause.name === "TRPCClientError";
}
function isTRPCErrorResponse(obj) {
  return isObject2(obj) && isObject2(obj.error) && typeof obj.error.code === "number" && typeof obj.error.message === "string";
}
var TRPCClientError = class _TRPCClientError extends Error {
  static from(_cause, opts = {}) {
    const cause = _cause;
    if (isTRPCClientError(cause)) {
      if (opts.meta) {
        cause.meta = {
          ...cause.meta,
          ...opts.meta
        };
      }
      return cause;
    }
    if (isTRPCErrorResponse(cause)) {
      return new _TRPCClientError(cause.error.message, {
        ...opts,
        result: cause
      });
    }
    if (!(cause instanceof Error)) {
      return new _TRPCClientError("Unknown error", {
        ...opts,
        cause
      });
    }
    return new _TRPCClientError(cause.message, {
      ...opts,
      cause: getCauseFromUnknown(cause)
    });
  }
  constructor(message, opts) {
    const cause = opts?.cause;
    super(message, {
      cause
    });
    this.meta = opts?.meta;
    this.cause = cause;
    this.shape = opts?.result?.error;
    this.data = opts?.result?.error.data;
    this.name = "TRPCClientError";
    Object.setPrototypeOf(this, _TRPCClientError.prototype);
  }
};

// node_modules/@trpc/client/dist/httpUtils-b9d0cb48.mjs
var isFunction = (fn) => typeof fn === "function";
function getFetch(customFetchImpl) {
  if (customFetchImpl) {
    return customFetchImpl;
  }
  if (typeof window !== "undefined" && isFunction(window.fetch)) {
    return window.fetch;
  }
  if (typeof globalThis !== "undefined" && isFunction(globalThis.fetch)) {
    return globalThis.fetch;
  }
  throw new Error("No fetch implementation found");
}
function getAbortController(customAbortControllerImpl) {
  if (customAbortControllerImpl) {
    return customAbortControllerImpl;
  }
  if (typeof window !== "undefined" && window.AbortController) {
    return window.AbortController;
  }
  if (typeof globalThis !== "undefined" && globalThis.AbortController) {
    return globalThis.AbortController;
  }
  return null;
}
function resolveHTTPLinkOptions(opts) {
  return {
    url: opts.url.toString().replace(/\/$/, ""),
    fetch: opts.fetch,
    AbortController: getAbortController(opts.AbortController)
  };
}
function arrayToDict(array) {
  const dict = {};
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    dict[index] = element;
  }
  return dict;
}
var METHOD = {
  query: "GET",
  mutation: "POST"
};
function getInput(opts) {
  return "input" in opts ? opts.runtime.transformer.serialize(opts.input) : arrayToDict(opts.inputs.map((_input) => opts.runtime.transformer.serialize(_input)));
}
var getUrl = (opts) => {
  let url = opts.url + "/" + opts.path;
  const queryParts = [];
  if ("inputs" in opts) {
    queryParts.push("batch=1");
  }
  if (opts.type === "query") {
    const input = getInput(opts);
    if (input !== void 0) {
      queryParts.push(`input=${encodeURIComponent(JSON.stringify(input))}`);
    }
  }
  if (queryParts.length) {
    url += "?" + queryParts.join("&");
  }
  return url;
};
var getBody = (opts) => {
  if (opts.type === "query") {
    return void 0;
  }
  const input = getInput(opts);
  return input !== void 0 ? JSON.stringify(input) : void 0;
};
var jsonHttpRequester = (opts) => {
  return httpRequest({
    ...opts,
    contentTypeHeader: "application/json",
    getUrl,
    getBody
  });
};
async function fetchHTTPResponse(opts, ac) {
  const url = opts.getUrl(opts);
  const body = opts.getBody(opts);
  const { type } = opts;
  const resolvedHeaders = await opts.headers();
  if (type === "subscription") {
    throw new Error("Subscriptions should use wsLink");
  }
  const headers = {
    ...opts.contentTypeHeader ? {
      "content-type": opts.contentTypeHeader
    } : {},
    ...opts.batchModeHeader ? {
      "trpc-batch-mode": opts.batchModeHeader
    } : {},
    ...resolvedHeaders
  };
  return getFetch(opts.fetch)(url, {
    method: METHOD[type],
    signal: ac?.signal,
    body,
    headers
  });
}
function httpRequest(opts) {
  const ac = opts.AbortController ? new opts.AbortController() : null;
  const meta = {};
  let done = false;
  const promise = new Promise((resolve, reject) => {
    fetchHTTPResponse(opts, ac).then((_res) => {
      meta.response = _res;
      done = true;
      return _res.json();
    }).then((json) => {
      meta.responseJSON = json;
      resolve({
        json,
        meta
      });
    }).catch((err) => {
      done = true;
      reject(TRPCClientError.from(err, {
        meta
      }));
    });
  });
  const cancel = () => {
    if (!done) {
      ac?.abort();
    }
  };
  return {
    promise,
    cancel
  };
}

// node_modules/@trpc/client/dist/httpBatchLink-d0f9eac9.mjs
var throwFatalError = () => {
  throw new Error("Something went wrong. Please submit an issue at https://github.com/trpc/trpc/issues/new");
};
function dataLoader(batchLoader) {
  let pendingItems = null;
  let dispatchTimer = null;
  const destroyTimerAndPendingItems = () => {
    clearTimeout(dispatchTimer);
    dispatchTimer = null;
    pendingItems = null;
  };
  function groupItems(items) {
    const groupedItems = [
      []
    ];
    let index = 0;
    while (true) {
      const item = items[index];
      if (!item) {
        break;
      }
      const lastGroup = groupedItems[groupedItems.length - 1];
      if (item.aborted) {
        item.reject?.(new Error("Aborted"));
        index++;
        continue;
      }
      const isValid = batchLoader.validate(lastGroup.concat(item).map((it) => it.key));
      if (isValid) {
        lastGroup.push(item);
        index++;
        continue;
      }
      if (lastGroup.length === 0) {
        item.reject?.(new Error("Input is too big for a single dispatch"));
        index++;
        continue;
      }
      groupedItems.push([]);
    }
    return groupedItems;
  }
  function dispatch() {
    const groupedItems = groupItems(pendingItems);
    destroyTimerAndPendingItems();
    for (const items of groupedItems) {
      if (!items.length) {
        continue;
      }
      const batch = {
        items,
        cancel: throwFatalError
      };
      for (const item of items) {
        item.batch = batch;
      }
      const unitResolver = (index, value) => {
        const item = batch.items[index];
        item.resolve?.(value);
        item.batch = null;
        item.reject = null;
        item.resolve = null;
      };
      const { promise, cancel } = batchLoader.fetch(batch.items.map((_item) => _item.key), unitResolver);
      batch.cancel = cancel;
      promise.then((result) => {
        for (let i = 0; i < result.length; i++) {
          const value = result[i];
          unitResolver(i, value);
        }
        for (const item of batch.items) {
          item.reject?.(new Error("Missing result"));
          item.batch = null;
        }
      }).catch((cause) => {
        for (const item of batch.items) {
          item.reject?.(cause);
          item.batch = null;
        }
      });
    }
  }
  function load(key) {
    const item = {
      aborted: false,
      key,
      batch: null,
      resolve: throwFatalError,
      reject: throwFatalError
    };
    const promise = new Promise((resolve, reject) => {
      item.reject = reject;
      item.resolve = resolve;
      if (!pendingItems) {
        pendingItems = [];
      }
      pendingItems.push(item);
    });
    if (!dispatchTimer) {
      dispatchTimer = setTimeout(dispatch);
    }
    const cancel = () => {
      item.aborted = true;
      if (item.batch?.items.every((item2) => item2.aborted)) {
        item.batch.cancel();
        item.batch = null;
      }
    };
    return {
      promise,
      cancel
    };
  }
  return {
    load
  };
}
function createHTTPBatchLink(requester) {
  return function httpBatchLink2(opts) {
    const resolvedOpts = resolveHTTPLinkOptions(opts);
    const maxURLLength = opts.maxURLLength ?? Infinity;
    return (runtime) => {
      const batchLoader = (type) => {
        const validate = (batchOps) => {
          if (maxURLLength === Infinity) {
            return true;
          }
          const path = batchOps.map((op) => op.path).join(",");
          const inputs = batchOps.map((op) => op.input);
          const url = getUrl({
            ...resolvedOpts,
            runtime,
            type,
            path,
            inputs
          });
          return url.length <= maxURLLength;
        };
        const fetch = requester({
          ...resolvedOpts,
          runtime,
          type,
          opts
        });
        return {
          validate,
          fetch
        };
      };
      const query = dataLoader(batchLoader("query"));
      const mutation = dataLoader(batchLoader("mutation"));
      const subscription = dataLoader(batchLoader("subscription"));
      const loaders = {
        query,
        subscription,
        mutation
      };
      return ({ op }) => {
        return observable((observer) => {
          const loader = loaders[op.type];
          const { promise, cancel } = loader.load(op);
          let _res = void 0;
          promise.then((res) => {
            _res = res;
            const transformed = transformResult(res.json, runtime);
            if (!transformed.ok) {
              observer.error(TRPCClientError.from(transformed.error, {
                meta: res.meta
              }));
              return;
            }
            observer.next({
              context: res.meta,
              result: transformed.result
            });
            observer.complete();
          }).catch((err) => {
            observer.error(TRPCClientError.from(err, {
              meta: _res?.meta
            }));
          });
          return () => {
            cancel();
          };
        });
      };
    };
  };
}
var batchRequester = (requesterOpts) => {
  return (batchOps) => {
    const path = batchOps.map((op) => op.path).join(",");
    const inputs = batchOps.map((op) => op.input);
    const { promise, cancel } = jsonHttpRequester({
      ...requesterOpts,
      path,
      inputs,
      headers() {
        if (!requesterOpts.opts.headers) {
          return {};
        }
        if (typeof requesterOpts.opts.headers === "function") {
          return requesterOpts.opts.headers({
            opList: batchOps
          });
        }
        return requesterOpts.opts.headers;
      }
    });
    return {
      promise: promise.then((res) => {
        const resJSON = Array.isArray(res.json) ? res.json : batchOps.map(() => res.json);
        const result = resJSON.map((item) => ({
          meta: res.meta,
          json: item
        }));
        return result;
      }),
      cancel
    };
  };
};
var httpBatchLink = createHTTPBatchLink(batchRequester);

// node_modules/@trpc/client/dist/links/httpLink.mjs
function httpLinkFactory(factoryOpts) {
  return (opts) => {
    const resolvedOpts = resolveHTTPLinkOptions(opts);
    return (runtime) => ({ op }) => observable((observer) => {
      const { path, input, type } = op;
      const { promise, cancel } = factoryOpts.requester({
        ...resolvedOpts,
        runtime,
        type,
        path,
        input,
        headers() {
          if (!opts.headers) {
            return {};
          }
          if (typeof opts.headers === "function") {
            return opts.headers({
              op
            });
          }
          return opts.headers;
        }
      });
      let meta = void 0;
      promise.then((res) => {
        meta = res.meta;
        const transformed = transformResult(res.json, runtime);
        if (!transformed.ok) {
          observer.error(TRPCClientError.from(transformed.error, {
            meta
          }));
          return;
        }
        observer.next({
          context: res.meta,
          result: transformed.result
        });
        observer.complete();
      }).catch((cause) => {
        observer.error(TRPCClientError.from(cause, {
          meta
        }));
      });
      return () => {
        cancel();
      };
    });
  };
}
var httpLink = httpLinkFactory({
  requester: jsonHttpRequester
});

// node_modules/@trpc/client/dist/index.mjs
var TRPCUntypedClient = class {
  $request({ type, input, path, context = {} }) {
    const chain$ = createChain({
      links: this.links,
      op: {
        id: ++this.requestId,
        type,
        path,
        input,
        context
      }
    });
    return chain$.pipe(share());
  }
  requestAsPromise(opts) {
    const req$ = this.$request(opts);
    const { promise, abort } = observableToPromise(req$);
    const abortablePromise = new Promise((resolve, reject) => {
      opts.signal?.addEventListener("abort", abort);
      promise.then((envelope) => {
        resolve(envelope.result.data);
      }).catch((err) => {
        reject(TRPCClientError.from(err));
      });
    });
    return abortablePromise;
  }
  query(path, input, opts) {
    return this.requestAsPromise({
      type: "query",
      path,
      input,
      context: opts?.context,
      signal: opts?.signal
    });
  }
  mutation(path, input, opts) {
    return this.requestAsPromise({
      type: "mutation",
      path,
      input,
      context: opts?.context,
      signal: opts?.signal
    });
  }
  subscription(path, input, opts) {
    const observable$ = this.$request({
      type: "subscription",
      path,
      input,
      context: opts?.context
    });
    return observable$.subscribe({
      next(envelope) {
        if (envelope.result.type === "started") {
          opts.onStarted?.();
        } else if (envelope.result.type === "stopped") {
          opts.onStopped?.();
        } else {
          opts.onData?.(envelope.result.data);
        }
      },
      error(err) {
        opts.onError?.(err);
      },
      complete() {
        opts.onComplete?.();
      }
    });
  }
  constructor(opts) {
    this.requestId = 0;
    const combinedTransformer = (() => {
      const transformer = opts.transformer;
      if (!transformer) {
        return {
          input: {
            serialize: (data) => data,
            deserialize: (data) => data
          },
          output: {
            serialize: (data) => data,
            deserialize: (data) => data
          }
        };
      }
      if ("input" in transformer) {
        return opts.transformer;
      }
      return {
        input: transformer,
        output: transformer
      };
    })();
    this.runtime = {
      transformer: {
        serialize: (data) => combinedTransformer.input.serialize(data),
        deserialize: (data) => combinedTransformer.output.deserialize(data)
      },
      combinedTransformer
    };
    this.links = opts.links.map((link) => link(this.runtime));
  }
};
var clientCallTypeMap = {
  query: "query",
  mutate: "mutation",
  subscribe: "subscription"
};
var clientCallTypeToProcedureType = (clientCallType) => {
  return clientCallTypeMap[clientCallType];
};
function createTRPCClientProxy(client) {
  return createFlatProxy((key) => {
    if (client.hasOwnProperty(key)) {
      return client[key];
    }
    if (key === "__untypedClient") {
      return client;
    }
    return createRecursiveProxy(({ path, args }) => {
      const pathCopy = [
        key,
        ...path
      ];
      const procedureType = clientCallTypeToProcedureType(pathCopy.pop());
      const fullPath = pathCopy.join(".");
      return client[procedureType](fullPath, ...args);
    });
  });
}
function createTRPCProxyClient(opts) {
  const client = new TRPCUntypedClient(opts);
  const proxy = createTRPCClientProxy(client);
  return proxy;
}
function getTextDecoder(customTextDecoder) {
  if (customTextDecoder) {
    return customTextDecoder;
  }
  if (typeof window !== "undefined" && window.TextDecoder) {
    return new window.TextDecoder();
  }
  if (typeof globalThis !== "undefined" && globalThis.TextDecoder) {
    return new globalThis.TextDecoder();
  }
  throw new Error("No TextDecoder implementation found");
}
async function parseJSONStream(opts) {
  const parse2 = opts.parse ?? JSON.parse;
  const onLine = (line) => {
    if (opts.signal?.aborted) return;
    if (!line || line === "}") {
      return;
    }
    const indexOfColon = line.indexOf(":");
    const indexAsStr = line.substring(2, indexOfColon - 1);
    const text = line.substring(indexOfColon + 1);
    opts.onSingle(Number(indexAsStr), parse2(text));
  };
  await readLines(opts.readableStream, onLine, opts.textDecoder);
}
async function readLines(readableStream, onLine, textDecoder) {
  let partOfLine = "";
  const onChunk = (chunk) => {
    const chunkText = textDecoder.decode(chunk);
    const chunkLines = chunkText.split("\n");
    if (chunkLines.length === 1) {
      partOfLine += chunkLines[0];
    } else if (chunkLines.length > 1) {
      onLine(partOfLine + chunkLines[0]);
      for (let i = 1; i < chunkLines.length - 1; i++) {
        onLine(chunkLines[i]);
      }
      partOfLine = chunkLines[chunkLines.length - 1];
    }
  };
  if ("getReader" in readableStream) {
    await readStandardChunks(readableStream, onChunk);
  } else {
    await readNodeChunks(readableStream, onChunk);
  }
  onLine(partOfLine);
}
function readNodeChunks(stream, onChunk) {
  return new Promise((resolve) => {
    stream.on("data", onChunk);
    stream.on("end", resolve);
  });
}
async function readStandardChunks(stream, onChunk) {
  const reader = stream.getReader();
  let readResult = await reader.read();
  while (!readResult.done) {
    onChunk(readResult.value);
    readResult = await reader.read();
  }
}
var streamingJsonHttpRequester = (opts, onSingle) => {
  const ac = opts.AbortController ? new opts.AbortController() : null;
  const responsePromise = fetchHTTPResponse({
    ...opts,
    contentTypeHeader: "application/json",
    batchModeHeader: "stream",
    getUrl,
    getBody
  }, ac);
  const cancel = () => ac?.abort();
  const promise = responsePromise.then(async (res) => {
    if (!res.body) throw new Error("Received response without body");
    const meta = {
      response: res
    };
    return parseJSONStream({
      readableStream: res.body,
      onSingle,
      parse: (string) => ({
        json: JSON.parse(string),
        meta
      }),
      signal: ac?.signal,
      textDecoder: opts.textDecoder
    });
  });
  return {
    cancel,
    promise
  };
};
var streamRequester = (requesterOpts) => {
  const textDecoder = getTextDecoder(requesterOpts.opts.textDecoder);
  return (batchOps, unitResolver) => {
    const path = batchOps.map((op) => op.path).join(",");
    const inputs = batchOps.map((op) => op.input);
    const { cancel, promise } = streamingJsonHttpRequester({
      ...requesterOpts,
      textDecoder,
      path,
      inputs,
      headers() {
        if (!requesterOpts.opts.headers) {
          return {};
        }
        if (typeof requesterOpts.opts.headers === "function") {
          return requesterOpts.opts.headers({
            opList: batchOps
          });
        }
        return requesterOpts.opts.headers;
      }
    }, (index, res) => {
      unitResolver(index, res);
    });
    return {
      /**
      * return an empty array because the batchLoader expects an array of results
      * but we've already called the `unitResolver` for each of them, there's
      * nothing left to do here.
      */
      promise: promise.then(() => []),
      cancel
    };
  };
};
var unstable_httpBatchStreamLink = createHTTPBatchLink(streamRequester);
var getBody2 = (opts) => {
  if (!("input" in opts)) {
    return void 0;
  }
  if (!(opts.input instanceof FormData)) {
    throw new Error("Input is not FormData");
  }
  return opts.input;
};
var formDataRequester = (opts) => {
  if (opts.type !== "mutation") {
    throw new Error("We only handle mutations with formdata");
  }
  return httpRequest({
    ...opts,
    getUrl() {
      return `${opts.url}/${opts.path}`;
    },
    getBody: getBody2
  });
};
var experimental_formDataLink = httpLinkFactory({
  requester: formDataRequester
});

// node_modules/superjson/dist/double-indexed-kv.js
var DoubleIndexedKV = class {
  constructor() {
    this.keyToValue = /* @__PURE__ */ new Map();
    this.valueToKey = /* @__PURE__ */ new Map();
  }
  set(key, value) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }
  getByKey(key) {
    return this.keyToValue.get(key);
  }
  getByValue(value) {
    return this.valueToKey.get(value);
  }
  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
};

// node_modules/superjson/dist/registry.js
var Registry = class {
  constructor(generateIdentifier) {
    this.generateIdentifier = generateIdentifier;
    this.kv = new DoubleIndexedKV();
  }
  register(value, identifier) {
    if (this.kv.getByValue(value)) {
      return;
    }
    if (!identifier) {
      identifier = this.generateIdentifier(value);
    }
    this.kv.set(identifier, value);
  }
  clear() {
    this.kv.clear();
  }
  getIdentifier(value) {
    return this.kv.getByValue(value);
  }
  getValue(identifier) {
    return this.kv.getByKey(identifier);
  }
};

// node_modules/superjson/dist/class-registry.js
var ClassRegistry = class extends Registry {
  constructor() {
    super((c) => c.name);
    this.classToAllowedProps = /* @__PURE__ */ new Map();
  }
  register(value, options) {
    if (typeof options === "object") {
      if (options.allowProps) {
        this.classToAllowedProps.set(value, options.allowProps);
      }
      super.register(value, options.identifier);
    } else {
      super.register(value, options);
    }
  }
  getAllowedProps(value) {
    return this.classToAllowedProps.get(value);
  }
};

// node_modules/superjson/dist/util.js
function valuesOfObj(record) {
  if ("values" in Object) {
    return Object.values(record);
  }
  const values = [];
  for (const key in record) {
    if (record.hasOwnProperty(key)) {
      values.push(record[key]);
    }
  }
  return values;
}
function find(record, predicate) {
  const values = valuesOfObj(record);
  if ("find" in values) {
    return values.find(predicate);
  }
  const valuesNotNever = values;
  for (let i = 0; i < valuesNotNever.length; i++) {
    const value = valuesNotNever[i];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}
function forEach(record, run) {
  Object.entries(record).forEach(([key, value]) => run(value, key));
}
function includes(arr, value) {
  return arr.indexOf(value) !== -1;
}
function findArr(record, predicate) {
  for (let i = 0; i < record.length; i++) {
    const value = record[i];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}

// node_modules/superjson/dist/custom-transformer-registry.js
var CustomTransformerRegistry = class {
  constructor() {
    this.transfomers = {};
  }
  register(transformer) {
    this.transfomers[transformer.name] = transformer;
  }
  findApplicable(v) {
    return find(this.transfomers, (transformer) => transformer.isApplicable(v));
  }
  findByName(name) {
    return this.transfomers[name];
  }
};

// node_modules/superjson/dist/is.js
var getType = (payload) => Object.prototype.toString.call(payload).slice(8, -1);
var isUndefined = (payload) => typeof payload === "undefined";
var isNull = (payload) => payload === null;
var isPlainObject = (payload) => {
  if (typeof payload !== "object" || payload === null)
    return false;
  if (payload === Object.prototype)
    return false;
  if (Object.getPrototypeOf(payload) === null)
    return true;
  return Object.getPrototypeOf(payload) === Object.prototype;
};
var isEmptyObject = (payload) => isPlainObject(payload) && Object.keys(payload).length === 0;
var isArray = (payload) => Array.isArray(payload);
var isString = (payload) => typeof payload === "string";
var isNumber = (payload) => typeof payload === "number" && !isNaN(payload);
var isBoolean = (payload) => typeof payload === "boolean";
var isRegExp = (payload) => payload instanceof RegExp;
var isMap = (payload) => payload instanceof Map;
var isSet = (payload) => payload instanceof Set;
var isSymbol = (payload) => getType(payload) === "Symbol";
var isDate = (payload) => payload instanceof Date && !isNaN(payload.valueOf());
var isError = (payload) => payload instanceof Error;
var isNaNValue = (payload) => typeof payload === "number" && isNaN(payload);
var isPrimitive = (payload) => isBoolean(payload) || isNull(payload) || isUndefined(payload) || isNumber(payload) || isString(payload) || isSymbol(payload);
var isBigint = (payload) => typeof payload === "bigint";
var isInfinite = (payload) => payload === Infinity || payload === -Infinity;
var isTypedArray = (payload) => ArrayBuffer.isView(payload) && !(payload instanceof DataView);
var isURL = (payload) => payload instanceof URL;

// node_modules/superjson/dist/pathstringifier.js
var escapeKey = (key) => key.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
var stringifyPath = (path) => path.map(String).map(escapeKey).join(".");
var parsePath = (string, legacyPaths) => {
  const result = [];
  let segment = "";
  for (let i = 0; i < string.length; i++) {
    let char = string.charAt(i);
    if (!legacyPaths && char === "\\") {
      const escaped = string.charAt(i + 1);
      if (escaped === "\\") {
        segment += "\\";
        i++;
        continue;
      } else if (escaped !== ".") {
        throw Error("invalid path");
      }
    }
    const isEscapedDot = char === "\\" && string.charAt(i + 1) === ".";
    if (isEscapedDot) {
      segment += ".";
      i++;
      continue;
    }
    const isEndOfSegment = char === ".";
    if (isEndOfSegment) {
      result.push(segment);
      segment = "";
      continue;
    }
    segment += char;
  }
  const lastSegment = segment;
  result.push(lastSegment);
  return result;
};

// node_modules/superjson/dist/transformer.js
function simpleTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var simpleRules = [
  simpleTransformation(isUndefined, "undefined", () => null, () => void 0),
  simpleTransformation(isBigint, "bigint", (v) => v.toString(), (v) => {
    if (typeof BigInt !== "undefined") {
      return BigInt(v);
    }
    console.error("Please add a BigInt polyfill.");
    return v;
  }),
  simpleTransformation(isDate, "Date", (v) => v.toISOString(), (v) => new Date(v)),
  simpleTransformation(isError, "Error", (v, superJson) => {
    const baseError = {
      name: v.name,
      message: v.message
    };
    if ("cause" in v) {
      baseError.cause = v.cause;
    }
    superJson.allowedErrorProps.forEach((prop) => {
      baseError[prop] = v[prop];
    });
    return baseError;
  }, (v, superJson) => {
    const e = new Error(v.message, { cause: v.cause });
    e.name = v.name;
    e.stack = v.stack;
    superJson.allowedErrorProps.forEach((prop) => {
      e[prop] = v[prop];
    });
    return e;
  }),
  simpleTransformation(isRegExp, "regexp", (v) => "" + v, (regex) => {
    const body = regex.slice(1, regex.lastIndexOf("/"));
    const flags = regex.slice(regex.lastIndexOf("/") + 1);
    return new RegExp(body, flags);
  }),
  simpleTransformation(
    isSet,
    "set",
    // (sets only exist in es6+)
    // eslint-disable-next-line es5/no-es6-methods
    (v) => [...v.values()],
    (v) => new Set(v)
  ),
  simpleTransformation(isMap, "map", (v) => [...v.entries()], (v) => new Map(v)),
  simpleTransformation((v) => isNaNValue(v) || isInfinite(v), "number", (v) => {
    if (isNaNValue(v)) {
      return "NaN";
    }
    if (v > 0) {
      return "Infinity";
    } else {
      return "-Infinity";
    }
  }, Number),
  simpleTransformation((v) => v === 0 && 1 / v === -Infinity, "number", () => {
    return "-0";
  }, Number),
  simpleTransformation(isURL, "URL", (v) => v.toString(), (v) => new URL(v))
];
function compositeTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var symbolRule = compositeTransformation((s, superJson) => {
  if (isSymbol(s)) {
    const isRegistered = !!superJson.symbolRegistry.getIdentifier(s);
    return isRegistered;
  }
  return false;
}, (s, superJson) => {
  const identifier = superJson.symbolRegistry.getIdentifier(s);
  return ["symbol", identifier];
}, (v) => v.description, (_, a, superJson) => {
  const value = superJson.symbolRegistry.getValue(a[1]);
  if (!value) {
    throw new Error("Trying to deserialize unknown symbol");
  }
  return value;
});
var constructorToName = [
  Int8Array,
  Uint8Array,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  Uint8ClampedArray
].reduce((obj, ctor) => {
  obj[ctor.name] = ctor;
  return obj;
}, {});
var typedArrayRule = compositeTransformation(isTypedArray, (v) => ["typed-array", v.constructor.name], (v) => [...v], (v, a) => {
  const ctor = constructorToName[a[1]];
  if (!ctor) {
    throw new Error("Trying to deserialize unknown typed array");
  }
  return new ctor(v);
});
function isInstanceOfRegisteredClass(potentialClass, superJson) {
  if (potentialClass?.constructor) {
    const isRegistered = !!superJson.classRegistry.getIdentifier(potentialClass.constructor);
    return isRegistered;
  }
  return false;
}
var classRule = compositeTransformation(isInstanceOfRegisteredClass, (clazz, superJson) => {
  const identifier = superJson.classRegistry.getIdentifier(clazz.constructor);
  return ["class", identifier];
}, (clazz, superJson) => {
  const allowedProps = superJson.classRegistry.getAllowedProps(clazz.constructor);
  if (!allowedProps) {
    return { ...clazz };
  }
  const result = {};
  allowedProps.forEach((prop) => {
    result[prop] = clazz[prop];
  });
  return result;
}, (v, a, superJson) => {
  const clazz = superJson.classRegistry.getValue(a[1]);
  if (!clazz) {
    throw new Error(`Trying to deserialize unknown class '${a[1]}' - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564`);
  }
  return Object.assign(Object.create(clazz.prototype), v);
});
var customRule = compositeTransformation((value, superJson) => {
  return !!superJson.customTransformerRegistry.findApplicable(value);
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return ["custom", transformer.name];
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return transformer.serialize(value);
}, (v, a, superJson) => {
  const transformer = superJson.customTransformerRegistry.findByName(a[1]);
  if (!transformer) {
    throw new Error("Trying to deserialize unknown custom value");
  }
  return transformer.deserialize(v);
});
var compositeRules = [classRule, symbolRule, customRule, typedArrayRule];
var transformValue = (value, superJson) => {
  const applicableCompositeRule = findArr(compositeRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableCompositeRule) {
    return {
      value: applicableCompositeRule.transform(value, superJson),
      type: applicableCompositeRule.annotation(value, superJson)
    };
  }
  const applicableSimpleRule = findArr(simpleRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableSimpleRule) {
    return {
      value: applicableSimpleRule.transform(value, superJson),
      type: applicableSimpleRule.annotation
    };
  }
  return void 0;
};
var simpleRulesByAnnotation = {};
simpleRules.forEach((rule) => {
  simpleRulesByAnnotation[rule.annotation] = rule;
});
var untransformValue = (json, type, superJson) => {
  if (isArray(type)) {
    switch (type[0]) {
      case "symbol":
        return symbolRule.untransform(json, type, superJson);
      case "class":
        return classRule.untransform(json, type, superJson);
      case "custom":
        return customRule.untransform(json, type, superJson);
      case "typed-array":
        return typedArrayRule.untransform(json, type, superJson);
      default:
        throw new Error("Unknown transformation: " + type);
    }
  } else {
    const transformation = simpleRulesByAnnotation[type];
    if (!transformation) {
      throw new Error("Unknown transformation: " + type);
    }
    return transformation.untransform(json, superJson);
  }
};

// node_modules/superjson/dist/accessDeep.js
var getNthKey = (value, n) => {
  if (n > value.size)
    throw new Error("index out of bounds");
  const keys = value.keys();
  while (n > 0) {
    keys.next();
    n--;
  }
  return keys.next().value;
};
function validatePath(path) {
  if (includes(path, "__proto__")) {
    throw new Error("__proto__ is not allowed as a property");
  }
  if (includes(path, "prototype")) {
    throw new Error("prototype is not allowed as a property");
  }
  if (includes(path, "constructor")) {
    throw new Error("constructor is not allowed as a property");
  }
}
var getDeep = (object, path) => {
  validatePath(path);
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (isSet(object)) {
      object = getNthKey(object, +key);
    } else if (isMap(object)) {
      const row = +key;
      const type = +path[++i] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(object, row);
      switch (type) {
        case "key":
          object = keyOfRow;
          break;
        case "value":
          object = object.get(keyOfRow);
          break;
      }
    } else {
      object = object[key];
    }
  }
  return object;
};
var setDeep = (object, path, mapper) => {
  validatePath(path);
  if (path.length === 0) {
    return mapper(object);
  }
  let parent = object;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (isArray(parent)) {
      const index = +key;
      parent = parent[index];
    } else if (isPlainObject(parent)) {
      parent = parent[key];
    } else if (isSet(parent)) {
      const row = +key;
      parent = getNthKey(parent, row);
    } else if (isMap(parent)) {
      const isEnd = i === path.length - 2;
      if (isEnd) {
        break;
      }
      const row = +key;
      const type = +path[++i] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(parent, row);
      switch (type) {
        case "key":
          parent = keyOfRow;
          break;
        case "value":
          parent = parent.get(keyOfRow);
          break;
      }
    }
  }
  const lastKey = path[path.length - 1];
  if (isArray(parent)) {
    parent[+lastKey] = mapper(parent[+lastKey]);
  } else if (isPlainObject(parent)) {
    parent[lastKey] = mapper(parent[lastKey]);
  }
  if (isSet(parent)) {
    const oldValue = getNthKey(parent, +lastKey);
    const newValue = mapper(oldValue);
    if (oldValue !== newValue) {
      parent.delete(oldValue);
      parent.add(newValue);
    }
  }
  if (isMap(parent)) {
    const row = +path[path.length - 2];
    const keyToRow = getNthKey(parent, row);
    const type = +lastKey === 0 ? "key" : "value";
    switch (type) {
      case "key": {
        const newKey = mapper(keyToRow);
        parent.set(newKey, parent.get(keyToRow));
        if (newKey !== keyToRow) {
          parent.delete(keyToRow);
        }
        break;
      }
      case "value": {
        parent.set(keyToRow, mapper(parent.get(keyToRow)));
        break;
      }
    }
  }
  return object;
};

// node_modules/superjson/dist/plainer.js
var enableLegacyPaths = (version) => version < 1;
function traverse(tree, walker2, version, origin = []) {
  if (!tree) {
    return;
  }
  const legacyPaths = enableLegacyPaths(version);
  if (!isArray(tree)) {
    forEach(tree, (subtree, key) => traverse(subtree, walker2, version, [
      ...origin,
      ...parsePath(key, legacyPaths)
    ]));
    return;
  }
  const [nodeValue, children] = tree;
  if (children) {
    forEach(children, (child, key) => {
      traverse(child, walker2, version, [
        ...origin,
        ...parsePath(key, legacyPaths)
      ]);
    });
  }
  walker2(nodeValue, origin);
}
function applyValueAnnotations(plain, annotations, version, superJson) {
  traverse(annotations, (type, path) => {
    plain = setDeep(plain, path, (v) => untransformValue(v, type, superJson));
  }, version);
  return plain;
}
function applyReferentialEqualityAnnotations(plain, annotations, version) {
  const legacyPaths = enableLegacyPaths(version);
  function apply(identicalPaths, path) {
    const object = getDeep(plain, parsePath(path, legacyPaths));
    identicalPaths.map((path2) => parsePath(path2, legacyPaths)).forEach((identicalObjectPath) => {
      plain = setDeep(plain, identicalObjectPath, () => object);
    });
  }
  if (isArray(annotations)) {
    const [root, other] = annotations;
    root.forEach((identicalPath) => {
      plain = setDeep(plain, parsePath(identicalPath, legacyPaths), () => plain);
    });
    if (other) {
      forEach(other, apply);
    }
  } else {
    forEach(annotations, apply);
  }
  return plain;
}
var isDeep = (object, superJson) => isPlainObject(object) || isArray(object) || isMap(object) || isSet(object) || isError(object) || isInstanceOfRegisteredClass(object, superJson);
function addIdentity(object, path, identities) {
  const existingSet = identities.get(object);
  if (existingSet) {
    existingSet.push(path);
  } else {
    identities.set(object, [path]);
  }
}
function generateReferentialEqualityAnnotations(identitites, dedupe) {
  const result = {};
  let rootEqualityPaths = void 0;
  identitites.forEach((paths) => {
    if (paths.length <= 1) {
      return;
    }
    if (!dedupe) {
      paths = paths.map((path) => path.map(String)).sort((a, b) => a.length - b.length);
    }
    const [representativePath, ...identicalPaths] = paths;
    if (representativePath.length === 0) {
      rootEqualityPaths = identicalPaths.map(stringifyPath);
    } else {
      result[stringifyPath(representativePath)] = identicalPaths.map(stringifyPath);
    }
  });
  if (rootEqualityPaths) {
    if (isEmptyObject(result)) {
      return [rootEqualityPaths];
    } else {
      return [rootEqualityPaths, result];
    }
  } else {
    return isEmptyObject(result) ? void 0 : result;
  }
}
var walker = (object, identities, superJson, dedupe, path = [], objectsInThisPath = [], seenObjects = /* @__PURE__ */ new Map()) => {
  const primitive = isPrimitive(object);
  if (!primitive) {
    addIdentity(object, path, identities);
    const seen = seenObjects.get(object);
    if (seen) {
      return dedupe ? {
        transformedValue: null
      } : seen;
    }
  }
  if (!isDeep(object, superJson)) {
    const transformed2 = transformValue(object, superJson);
    const result2 = transformed2 ? {
      transformedValue: transformed2.value,
      annotations: [transformed2.type]
    } : {
      transformedValue: object
    };
    if (!primitive) {
      seenObjects.set(object, result2);
    }
    return result2;
  }
  if (includes(objectsInThisPath, object)) {
    return {
      transformedValue: null
    };
  }
  const transformationResult = transformValue(object, superJson);
  const transformed = transformationResult?.value ?? object;
  const transformedValue = isArray(transformed) ? [] : {};
  const innerAnnotations = {};
  forEach(transformed, (value, index) => {
    if (index === "__proto__" || index === "constructor" || index === "prototype") {
      throw new Error(`Detected property ${index}. This is a prototype pollution risk, please remove it from your object.`);
    }
    const recursiveResult = walker(value, identities, superJson, dedupe, [...path, index], [...objectsInThisPath, object], seenObjects);
    transformedValue[index] = recursiveResult.transformedValue;
    if (isArray(recursiveResult.annotations)) {
      innerAnnotations[escapeKey(index)] = recursiveResult.annotations;
    } else if (isPlainObject(recursiveResult.annotations)) {
      forEach(recursiveResult.annotations, (tree, key) => {
        innerAnnotations[escapeKey(index) + "." + key] = tree;
      });
    }
  });
  const result = isEmptyObject(innerAnnotations) ? {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type] : void 0
  } : {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type, innerAnnotations] : innerAnnotations
  };
  if (!primitive) {
    seenObjects.set(object, result);
  }
  return result;
};

// node_modules/is-what/dist/getType.js
function getType2(payload) {
  return Object.prototype.toString.call(payload).slice(8, -1);
}

// node_modules/is-what/dist/isArray.js
function isArray2(payload) {
  return getType2(payload) === "Array";
}

// node_modules/is-what/dist/isPlainObject.js
function isPlainObject2(payload) {
  if (getType2(payload) !== "Object")
    return false;
  const prototype = Object.getPrototypeOf(payload);
  return !!prototype && prototype.constructor === Object && prototype === Object.prototype;
}

// node_modules/copy-anything/dist/index.js
function assignProp(carry, key, newVal, originalObject, includeNonenumerable) {
  const propType = {}.propertyIsEnumerable.call(originalObject, key) ? "enumerable" : "nonenumerable";
  if (propType === "enumerable")
    carry[key] = newVal;
  if (includeNonenumerable && propType === "nonenumerable") {
    Object.defineProperty(carry, key, {
      value: newVal,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
}
function copy(target, options = {}) {
  if (isArray2(target)) {
    return target.map((item) => copy(item, options));
  }
  if (!isPlainObject2(target)) {
    return target;
  }
  const props = Object.getOwnPropertyNames(target);
  const symbols = Object.getOwnPropertySymbols(target);
  return [...props, ...symbols].reduce((carry, key) => {
    if (key === "__proto__")
      return carry;
    if (isArray2(options.props) && !options.props.includes(key)) {
      return carry;
    }
    const val = target[key];
    const newVal = copy(val, options);
    assignProp(carry, key, newVal, target, options.nonenumerable);
    return carry;
  }, {});
}

// node_modules/superjson/dist/index.js
var SuperJSON = class {
  /**
   * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
   */
  constructor({ dedupe = false } = {}) {
    this.classRegistry = new ClassRegistry();
    this.symbolRegistry = new Registry((s) => s.description ?? "");
    this.customTransformerRegistry = new CustomTransformerRegistry();
    this.allowedErrorProps = [];
    this.dedupe = dedupe;
  }
  serialize(object) {
    const identities = /* @__PURE__ */ new Map();
    const output = walker(object, identities, this, this.dedupe);
    const res = {
      json: output.transformedValue
    };
    if (output.annotations) {
      res.meta = {
        ...res.meta,
        values: output.annotations
      };
    }
    const equalityAnnotations = generateReferentialEqualityAnnotations(identities, this.dedupe);
    if (equalityAnnotations) {
      res.meta = {
        ...res.meta,
        referentialEqualities: equalityAnnotations
      };
    }
    if (res.meta)
      res.meta.v = 1;
    return res;
  }
  deserialize(payload, options) {
    const { json, meta } = payload;
    let result = options?.inPlace ? json : copy(json);
    if (meta?.values) {
      result = applyValueAnnotations(result, meta.values, meta.v ?? 0, this);
    }
    if (meta?.referentialEqualities) {
      result = applyReferentialEqualityAnnotations(result, meta.referentialEqualities, meta.v ?? 0);
    }
    return result;
  }
  stringify(object) {
    return JSON.stringify(this.serialize(object));
  }
  parse(string) {
    return this.deserialize(JSON.parse(string), { inPlace: true });
  }
  registerClass(v, options) {
    this.classRegistry.register(v, options);
  }
  registerSymbol(v, identifier) {
    this.symbolRegistry.register(v, identifier);
  }
  registerCustom(transformer, name) {
    this.customTransformerRegistry.register({
      name,
      ...transformer
    });
  }
  allowErrorProps(...props) {
    this.allowedErrorProps.push(...props);
  }
};
SuperJSON.defaultInstance = new SuperJSON();
SuperJSON.serialize = SuperJSON.defaultInstance.serialize.bind(SuperJSON.defaultInstance);
SuperJSON.deserialize = SuperJSON.defaultInstance.deserialize.bind(SuperJSON.defaultInstance);
SuperJSON.stringify = SuperJSON.defaultInstance.stringify.bind(SuperJSON.defaultInstance);
SuperJSON.parse = SuperJSON.defaultInstance.parse.bind(SuperJSON.defaultInstance);
SuperJSON.registerClass = SuperJSON.defaultInstance.registerClass.bind(SuperJSON.defaultInstance);
SuperJSON.registerSymbol = SuperJSON.defaultInstance.registerSymbol.bind(SuperJSON.defaultInstance);
SuperJSON.registerCustom = SuperJSON.defaultInstance.registerCustom.bind(SuperJSON.defaultInstance);
SuperJSON.allowErrorProps = SuperJSON.defaultInstance.allowErrorProps.bind(SuperJSON.defaultInstance);
var dist_default = SuperJSON;
var serialize = SuperJSON.serialize;
var deserialize = SuperJSON.deserialize;
var stringify = SuperJSON.stringify;
var parse = SuperJSON.parse;
var registerClass = SuperJSON.registerClass;
var registerCustom = SuperJSON.registerCustom;
var registerSymbol = SuperJSON.registerSymbol;
var allowErrorProps = SuperJSON.allowErrorProps;

// src/fuzzy.ts
var normalize = (value) => value.trim().toLowerCase();
var levenshtein = (a, b) => {
  const requireRow = (row, index) => {
    if (!row) {
      throw new Error(`Levenshtein row ${index} is missing.`);
    }
    return row;
  };
  const requireCell = (row, index) => {
    const value = row[index];
    if (value === void 0) {
      throw new Error(`Levenshtein cell [${index}] is missing.`);
    }
    return value;
  };
  const matrix = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i += 1) {
    const row = requireRow(matrix[i], i);
    row[0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    const row = requireRow(matrix[0], 0);
    row[j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const row = requireRow(matrix[i], i);
      const prevRow = requireRow(matrix[i - 1], i - 1);
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(
        requireCell(prevRow, j) + 1,
        requireCell(row, j - 1) + 1,
        requireCell(prevRow, j - 1) + cost
      );
    }
  }
  return requireCell(requireRow(matrix[a.length], a.length), b.length);
};
var similarityScore = (left, right) => {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
};

// src/main.ts
var appIdInput = document.querySelector("#app-id");
var appSecretInput = document.querySelector("#app-secret");
var serviceTypeInput = document.querySelector("#service-type-id");
var pageSizeInput = document.querySelector("#page-size");
var scoreThresholdInput = document.querySelector("#score-threshold");
var scanButton = document.querySelector("#scan-button");
var clearButton = document.querySelector("#clear-button");
var resultsBody = document.querySelector("#results-body");
var statusBadge = document.querySelector("#status");
var statusMessage = document.querySelector("#status-message");
var rememberCredentialsInput = document.querySelector("#remember-credentials");
var toastContainer = document.querySelector("#toast-container");
var assertElement = (element, name) => {
  if (!element) {
    throw new Error(`Missing element: ${name}`);
  }
  return element;
};
var elements = {
  appIdInput: assertElement(appIdInput, "app-id"),
  appSecretInput: assertElement(appSecretInput, "app-secret"),
  serviceTypeInput: assertElement(serviceTypeInput, "service-type-id"),
  pageSizeInput: assertElement(pageSizeInput, "page-size"),
  scoreThresholdInput: assertElement(scoreThresholdInput, "score-threshold"),
  scanButton: assertElement(scanButton, "scan-button"),
  clearButton: assertElement(clearButton, "clear-button"),
  resultsBody: assertElement(resultsBody, "results-body"),
  statusBadge: assertElement(statusBadge, "status"),
  statusMessage: assertElement(statusMessage, "status-message"),
  rememberCredentialsInput: assertElement(rememberCredentialsInput, "remember-credentials"),
  toastContainer: assertElement(toastContainer, "toast-container")
};
var setStatus = (state, message) => {
  elements.statusBadge.className = `status ${state}`;
  elements.statusBadge.textContent = state === "ok" ? "Ready" : state === "warn" ? "Waiting" : "Error";
  elements.statusMessage.textContent = message;
};
var STORAGE_KEY = "pce:form";
var loadCachedForm = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
var applyCachedForm = (cache) => {
  if (cache.serviceTypeId) {
    elements.serviceTypeInput.value = cache.serviceTypeId;
  }
  if (cache.pageSize) {
    elements.pageSizeInput.value = cache.pageSize;
  }
  if (cache.scoreThreshold) {
    elements.scoreThresholdInput.value = cache.scoreThreshold;
  }
  if (cache.rememberCredentials) {
    elements.rememberCredentialsInput.checked = true;
    if (cache.appId) {
      elements.appIdInput.value = cache.appId;
    }
    if (cache.appSecret) {
      elements.appSecretInput.value = cache.appSecret;
    }
  }
};
var buildCachedForm = () => {
  const cache = {
    serviceTypeId: elements.serviceTypeInput.value.trim(),
    pageSize: elements.pageSizeInput.value.trim(),
    scoreThreshold: elements.scoreThresholdInput.value.trim(),
    rememberCredentials: elements.rememberCredentialsInput.checked
  };
  if (elements.rememberCredentialsInput.checked) {
    cache.appId = elements.appIdInput.value.trim();
    cache.appSecret = elements.appSecretInput.value.trim();
  }
  return cache;
};
var saveCachedForm = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildCachedForm()));
  } catch {
  }
};
var toErrorMessage = (error) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error occurred.";
};
var toErrorDetails = (error) => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};
var showErrorToast = (error, context) => {
  const toast = document.createElement("div");
  toast.className = "toast";
  const title = document.createElement("h3");
  title.textContent = context;
  const message = document.createElement("p");
  message.textContent = toErrorMessage(error);
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "More details";
  const pre = document.createElement("pre");
  pre.textContent = toErrorDetails(error);
  details.append(summary, pre);
  const actions = document.createElement("div");
  actions.className = "toast-actions";
  const copyButton = document.createElement("button");
  copyButton.className = "primary";
  copyButton.textContent = "Copy details";
  copyButton.addEventListener("click", async () => {
    try {
      const payload = [
        `Context: ${context}`,
        `Message: ${toErrorMessage(error)}`,
        `Details:`,
        pre.textContent ?? ""
      ].join("\n");
      await navigator.clipboard.writeText(payload);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy details";
      }, 1500);
    } catch {
      copyButton.textContent = "Copy failed";
    }
  });
  const dismissButton = document.createElement("button");
  dismissButton.textContent = "Dismiss";
  dismissButton.addEventListener("click", () => {
    toast.remove();
  });
  actions.append(copyButton, dismissButton);
  toast.append(title, message, details, actions);
  elements.toastContainer.append(toast);
};
var trpcClient = createTRPCProxyClient({
  transformer: dist_default,
  links: [
    httpBatchLink({
      url: "/trpc"
    })
  ]
});
var getCredentials = () => {
  const appId = elements.appIdInput.value.trim();
  const appSecret = elements.appSecretInput.value.trim();
  if (!appId || !appSecret) {
    throw new Error("Please provide an application ID and secret.");
  }
  return { appId, appSecret };
};
var cachedForm = loadCachedForm();
if (cachedForm) {
  applyCachedForm(cachedForm);
}
var buildMatchResults = (items, songs, threshold) => {
  const results = [];
  for (const item of items) {
    if (!item.attributes.title) {
      continue;
    }
    let bestScore = 0;
    let bestSong = null;
    for (const song of songs) {
      const score = similarityScore(item.attributes.title, song.attributes.title);
      if (score > bestScore) {
        bestScore = score;
        bestSong = song;
      }
    }
    if (bestSong && bestScore >= threshold) {
      results.push({ item, song: bestSong, score: bestScore });
    }
  }
  return results.sort((a, b) => b.score - a.score);
};
var renderResults = (matches, serviceTypeId) => {
  elements.resultsBody.innerHTML = "";
  if (matches.length === 0) {
    setStatus("warn", "No matching unlinked songs found.");
    return;
  }
  for (const match of matches) {
    const row = document.createElement("tr");
    const planCell = document.createElement("td");
    planCell.textContent = `${match.item.plan.attributes.title} (${match.item.plan.attributes.dates})`;
    const itemCell = document.createElement("td");
    itemCell.textContent = match.item.attributes.title;
    const songCell = document.createElement("td");
    songCell.textContent = match.song.attributes.title;
    const scoreCell = document.createElement("td");
    scoreCell.textContent = match.score.toFixed(2);
    const actionCell = document.createElement("td");
    const linkButton = document.createElement("button");
    linkButton.textContent = "Link song";
    linkButton.addEventListener("click", async () => {
      try {
        linkButton.disabled = true;
        linkButton.textContent = "Linking...";
        await trpcClient.updatePlanItemSong.mutate({
          credentials: getCredentials(),
          serviceTypeId,
          planId: match.item.plan.id,
          itemId: match.item.id,
          songId: match.song.id
        });
        linkButton.textContent = "Linked \u2713";
      } catch (error) {
        linkButton.disabled = false;
        linkButton.textContent = "Retry";
        setStatus("error", error.message);
        showErrorToast(error, "Failed to link song");
      }
    });
    actionCell.append(linkButton);
    row.append(planCell, itemCell, songCell, scoreCell, actionCell);
    elements.resultsBody.appendChild(row);
  }
  setStatus("ok", `Found ${matches.length} potential matches.`);
};
var loadUnlinkedItems = async (plans, serviceTypeId) => {
  const unlinked = [];
  for (const plan of plans) {
    const items = await trpcClient.listPlanItems.query({
      credentials: getCredentials(),
      serviceTypeId,
      planId: plan.id
    });
    for (const item of items) {
      const hasSong = item.relationships?.song?.data?.id;
      if (!hasSong && item.attributes.title) {
        unlinked.push({ ...item, plan });
      }
    }
  }
  return unlinked;
};
var handleScan = async () => {
  try {
    elements.scanButton.disabled = true;
    setStatus("warn", "Scanning Planning Center...");
    const serviceTypeId = elements.serviceTypeInput.value.trim();
    if (!serviceTypeId) {
      throw new Error("Please provide a service type ID.");
    }
    const pageSize = Number.parseInt(elements.pageSizeInput.value, 10) || 10;
    const threshold = Number.parseFloat(elements.scoreThresholdInput.value) || 0.7;
    const [songs, plans] = await Promise.all([
      trpcClient.listSongs.query(getCredentials()),
      trpcClient.listPlans.query({
        credentials: getCredentials(),
        serviceTypeId,
        pageSize
      })
    ]);
    const unlinkedItems = await loadUnlinkedItems(plans, serviceTypeId);
    const matches = buildMatchResults(unlinkedItems, songs, threshold);
    renderResults(matches, serviceTypeId);
  } catch (error) {
    setStatus("error", error.message);
    showErrorToast(error, "Scan failed");
  } finally {
    elements.scanButton.disabled = false;
  }
};
var handleClear = () => {
  elements.resultsBody.innerHTML = "";
  setStatus("warn", "Results cleared. Ready for another scan.");
};
elements.scanButton.addEventListener("click", () => {
  void handleScan();
});
elements.clearButton.addEventListener("click", handleClear);
elements.appIdInput.addEventListener("input", saveCachedForm);
elements.appSecretInput.addEventListener("input", saveCachedForm);
elements.serviceTypeInput.addEventListener("input", saveCachedForm);
elements.pageSizeInput.addEventListener("input", saveCachedForm);
elements.scoreThresholdInput.addEventListener("input", saveCachedForm);
elements.rememberCredentialsInput.addEventListener("change", saveCachedForm);
/*! Bundled license information:

@trpc/client/dist/httpUtils-b9d0cb48.mjs:
  (* istanbul ignore if -- @preserve *)

@trpc/client/dist/links/wsLink.mjs:
  (* istanbul ignore next -- @preserve *)
*/
