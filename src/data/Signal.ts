import { useSyncExternalStore } from 'react';

export class Signal<T> {
  private readonly listeners: Set<() => void>;
  private value: T;

  constructor(value: T) {
    this.listeners = new Set();
    this.value = value;
  }

  get() {
    return this.value;
  }

  set(value: T) {
    this.value = value;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((onChange) => onChange());
  }

  private subscribe(onChange: () => void) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  use() {
    return useSyncExternalStore(this.subscribe.bind(this), this.get.bind(this));
  }
}
