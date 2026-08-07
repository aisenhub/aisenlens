export function createActionRegistry({
  getContext = () => ({}),
  onError = () => {},
  onUnavailable = () => {}
} = {}) {
  const actions = new Map();
  const bindings = new Map();

  const register = (id, handler, { isActive = () => true, getDisabledReason = () => '', metadata = null } = {}) => {
    if (!id || typeof handler !== 'function') throw new TypeError('Action requires an id and handler');
    actions.set(String(id), { handler, isActive, getDisabledReason, metadata });
    return () => actions.delete(String(id));
  };

  const isActive = (id, args) => {
    const action = actions.get(String(id));
    return !!action && action.isActive(getContext(), args) !== false;
  };

  const getAvailability = (id, args) => {
    const action = actions.get(String(id));
    if (!action) return { active: false, reason: '当前操作不可用' };
    const context = getContext();
    const active = action.isActive(context, args) !== false;
    return { active, reason: active ? '' : String(action.getDisabledReason(context, args) || '当前操作不可用') };
  };

  const invoke = async (id, args) => {
    const action = actions.get(String(id));
    if (!action) return { handled: false, value: null, reason: '当前操作不可用' };
    const availability = getAvailability(id, args);
    if (!availability.active) {
      onUnavailable(String(id), availability.reason, args);
      return { handled: false, value: null, reason: availability.reason };
    }
    try {
      return { handled: true, value: await action.handler(args, getContext()) };
    } catch (error) {
      onError(error, id);
      return { handled: true, error };
    }
  };

  const bind = (target, eventName, id, getArgs = event => event) => {
    if (!target?.addEventListener) return () => {};
    const listener = event => invoke(id, getArgs(event));
    target.addEventListener(eventName, listener);
    const key = `${id}:${eventName}`;
    bindings.set(key, { target, eventName, listener });
    return () => unbind(id, eventName);
  };

  const unbind = (id, eventName) => {
    const key = `${id}:${eventName}`;
    const binding = bindings.get(key);
    if (!binding) return false;
    binding.target.removeEventListener(binding.eventName, binding.listener);
    bindings.delete(key);
    return true;
  };

  const clear = () => {
    for (const binding of bindings.values()) binding.target.removeEventListener(binding.eventName, binding.listener);
    bindings.clear();
    actions.clear();
  };

  const describe = id => actions.get(String(id))?.metadata || null;

  return { register, bind, unbind, invoke, isActive, getAvailability, clear, describe, actions };
}
