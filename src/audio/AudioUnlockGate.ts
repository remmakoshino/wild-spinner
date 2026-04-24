export function bindAudioUnlock(target: HTMLElement, onUnlock: () => Promise<void>): void {
  const run = async (): Promise<void> => {
    target.removeEventListener('pointerdown', run);
    target.removeEventListener('keydown', run);
    await onUnlock();
  };

  target.addEventListener('pointerdown', run, { once: true });
  target.addEventListener('keydown', run, { once: true });
}
