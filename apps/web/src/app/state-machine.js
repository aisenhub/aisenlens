export function createStateMachine({ initial, transitions = {}, onTransition = () => {}, onInvalidTransition = () => {} } = {}) {
  let current = initial;

  const resolveNext = (definition, payload) => (
    typeof definition === 'function' ? definition(payload, current) : definition
  );

  const transition = (event, payload) => {
    const definition = transitions[current]?.[event];
    if (definition === undefined) {
      onInvalidTransition({ state: current, event, payload });
      return false;
    }
    const previous = current;
    const next = resolveNext(definition, payload);
    if (!next || next === current) return false;
    current = next;
    onTransition({ previous, next, event, payload });
    return true;
  };

  return {
    get state() { return current; },
    can: event => transitions[current]?.[event] !== undefined,
    transition,
    reset: nextState => { current = nextState ?? initial; },
    getTransitions: () => ({ ...transitions[current] })
  };
}

export function createTransitionError(state, event) {
  const error = new Error(`非法状态迁移：${state} -> ${event}`);
  error.code = 'STATE_TRANSITION_INVALID';
  error.state = state;
  error.event = event;
  return error;
}
