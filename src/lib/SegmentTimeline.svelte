<script lang="ts">
  import {
    type Segment,
    DEFAULT_PACE_SECONDS_PER_KM,
    addSegment,
    segmentTotalSeconds,
    defaultSegments,
    removeLastSegment,
    setBoundary,
    setSegmentPace,
    singleSegment,
    splitMarkers,
  } from './segments';
  import { untrack } from 'svelte';
  import { formatPace, formatTime, parsePace } from './pace';
  import { DISTANCES, DISTANCE_KEYS, type DistanceKey } from './distance';

  type Props = {
    distanceKey: DistanceKey;
    onDistanceChange: (key: DistanceKey) => void;
  };

  let { distanceKey, onDistanceChange }: Props = $props();

  const distanceKm = $derived(DISTANCES[distanceKey]);

  let segments = $state<Segment[]>(untrack(() => defaultSegments(DISTANCES[distanceKey])));
  let paceInputs = $state<string[]>([formatPace(DEFAULT_PACE_SECONDS_PER_KM)]);
  let paceInvalid = $state<boolean[]>([false]);
  let activeHandle = $state<number | null>(null);

  let barEl = $state<HTMLDivElement | undefined>();

  function reseed() {
    paceInputs = segments.map((c) => formatPace(c.paceSecondsPerKm));
    paceInvalid = segments.map(() => false);
  }

  function onAdd() {
    segments = addSegment(segments);
    reseed();
  }

  function onRemove() {
    segments = removeLastSegment(segments);
    reseed();
  }

  function onDistanceSelect(event: Event) {
    const next = (event.currentTarget as HTMLSelectElement).value as DistanceKey;
    const prevPace = segments[0]?.paceSecondsPerKm ?? DEFAULT_PACE_SECONDS_PER_KM;
    segments = singleSegment(DISTANCES[next], prevPace);
    reseed();
    onDistanceChange(next);
  }

  function onHandlePointerDown(event: PointerEvent, handleIndex: number) {
    activeHandle = handleIndex;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onHandlePointerMove(event: PointerEvent, handleIndex: number) {
    if (activeHandle !== handleIndex || !barEl) return;
    const rect = barEl.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const km = ratio * distanceKm;
    segments = setBoundary(segments, handleIndex, km);
    paceInputs = segments.map((c, i) => paceInputs[i] ?? formatPace(c.paceSecondsPerKm));
  }

  function onHandlePointerUp(event: PointerEvent) {
    activeHandle = null;
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function onPaceInput(event: Event, index: number) {
    const value = (event.currentTarget as HTMLInputElement).value;
    paceInputs[index] = value;
    const sec = parsePace(value);
    if (sec === null) {
      paceInvalid[index] = true;
      return;
    }
    paceInvalid[index] = false;
    segments = setSegmentPace(segments, index, sec);
  }

  const total = $derived(formatTime(segmentTotalSeconds(segments)));
  const markers = $derived(splitMarkers(segments));

  function segmentStartKm(i: number): number {
    if (i === 0) return 0;
    return markers[i - 1]?.km ?? 0;
  }

  function pct(km: number): number {
    return (km / distanceKm) * 100;
  }
</script>

<section class="segments">
  <header class="section-header">
    <h2>Pace bands</h2>
    <label class="distance-picker">
      <span class="distance-label">Distance:</span>
      <select value={distanceKey} onchange={onDistanceSelect} aria-label="Race distance">
        {#each DISTANCE_KEYS as key (key)}
          <option value={key}>{key}</option>
        {/each}
      </select>
    </label>
  </header>
  <p class="muted">Split the race into segments. Drag handles to adjust distances; edit each segment's pace below.</p>

  <div class="total">
    <span class="total-label">Total finish</span>
    <span class="total-value">{total}</span>
  </div>

  <div class="controls">
    <button type="button" onclick={onAdd} aria-label="Add segment">+ Add segment</button>
    <button type="button" onclick={onRemove} disabled={segments.length <= 1} aria-label="Remove last segment">− Remove last</button>
  </div>

  <div class="timeline">
    <div class="ticks-above">
      {#each markers as marker, i (i)}
        {#if i !== markers.length - 1 && i % 2 === 0}
          <div class="tick tick-above" style="left: {pct(marker.km)}%;">
            <span class="tick-time">{formatTime(marker.seconds)}</span>
            <span class="tick-km">{marker.km.toFixed(2)} km</span>
          </div>
        {/if}
      {/each}
    </div>

    <div class="bar" bind:this={barEl} role="presentation">
      {#each segments as segment, i (i)}
        <div class="segment" style="width: {pct(segment.km)}%;">
          <span class="segment-pace">{formatPace(segment.paceSecondsPerKm)}</span>
        </div>
      {/each}

      {#each markers.slice(0, -1) as marker, i (i)}
        <button
          type="button"
          class="handle"
          class:active={activeHandle === i}
          aria-label="Drag to adjust split {i + 1} (currently at {marker.km.toFixed(2)} km)"
          style="left: {pct(marker.km)}%;"
          onpointerdown={(e) => onHandlePointerDown(e, i)}
          onpointermove={(e) => onHandlePointerMove(e, i)}
          onpointerup={onHandlePointerUp}
          onpointercancel={onHandlePointerUp}
        ></button>
      {/each}
    </div>

    <div class="ticks-below">
      <div class="tick tick-start" style="left: 0%;">
        <span class="tick-km">0 km</span>
        <span class="tick-time">00:00:00</span>
      </div>
      {#each markers as marker, i (i)}
        {#if i === markers.length - 1 || i % 2 !== 0}
          <div
            class="tick"
            class:tick-end={i === markers.length - 1}
            style="left: {pct(marker.km)}%;"
          >
            <span class="tick-km">{marker.km.toFixed(2)} km</span>
            <span class="tick-time">{formatTime(marker.seconds)}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <ul class="paces">
    {#each segments as segment, i (i)}
      <li class="pace-row">
        <span class="pace-label">
          <strong>Segment {i + 1}</strong>
          <span class="pace-range">{segmentStartKm(i).toFixed(2)}–{(markers[i]?.km ?? 0).toFixed(2)} km</span>
        </span>
        <div class="pace-input-row">
          <input
            type="text"
            autocomplete="off"
            spellcheck="false"
            class:invalid={paceInvalid[i]}
            value={paceInputs[i] ?? formatPace(segment.paceSecondsPerKm)}
            oninput={(e) => onPaceInput(e, i)}
            aria-label="Pace for segment {i + 1}"
          />
          <span class="unit">min/km</span>
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .segments {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #2a2f3a;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0 0 0.5rem;
    flex-wrap: wrap;
  }
  h2 {
    font-size: 1.125rem;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .distance-picker {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  .distance-label {
    white-space: nowrap;
  }
  .distance-picker select {
    min-height: 2.5rem;
    padding: 0.375rem 0.625rem;
    border: 1px solid #2a2f3a;
    border-radius: 0.5rem;
    background: #161a22;
    color: var(--color-fg);
    font: inherit;
    font-size: 0.9375rem;
    font-variant-numeric: tabular-nums;
  }
  .distance-picker select:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .muted {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }
  .total {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
  }
  .total-label {
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .total-value {
    font-size: 1.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-accent);
    letter-spacing: -0.01em;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .controls button {
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid #2a2f3a;
    border-radius: 0.5rem;
    background: #161a22;
    color: var(--color-fg);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .controls button:hover:not(:disabled) {
    border-color: var(--color-accent);
  }
  .controls button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .timeline {
    margin-bottom: 4rem;
  }
  .bar {
    position: relative;
    display: flex;
    height: 2.75rem;
    border-radius: 0.5rem;
    overflow: visible;
    background: #161a22;
    touch-action: none;
  }
  .segment {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border-right: 1px solid var(--color-bg);
    background: linear-gradient(180deg, #1f2937, #161e2c);
    overflow: hidden;
  }
  .segment:first-child {
    border-radius: 0.5rem 0 0 0.5rem;
  }
  .segment:last-child {
    border-right: none;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  .segment-pace {
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: var(--color-fg);
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .handle {
    position: absolute;
    top: 50%;
    width: 2.75rem;
    height: 2.75rem;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    transform: translate(-50%, -50%);
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
  }
  .handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.5rem;
    height: 3.25rem;
    border-radius: 0.25rem;
    background: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-bg);
    transform: translate(-50%, -50%);
    transition: width 0.1s ease;
  }
  .handle:hover::before,
  .handle.active::before {
    width: 0.75rem;
  }
  .handle:focus-visible {
    outline: none;
  }
  .handle:focus-visible::before {
    box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);
  }

  .ticks-above,
  .ticks-below {
    position: relative;
    height: 2.25rem;
  }
  .ticks-above {
    margin-bottom: 0.375rem;
  }
  .ticks-above:empty {
    display: none;
    margin: 0;
  }
  .ticks-below {
    margin-top: 0.375rem;
  }
  .tick {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .ticks-below .tick {
    top: 0;
  }
  .ticks-above .tick {
    bottom: 0;
  }
  .ticks-below .tick::before {
    content: '';
    width: 1px;
    height: 0.375rem;
    background: var(--color-muted);
    margin-bottom: 0.125rem;
  }
  .ticks-above .tick::after {
    content: '';
    width: 1px;
    height: 0.375rem;
    background: var(--color-muted);
    margin-top: 0.125rem;
  }
  .tick-km {
    font-size: 0.75rem;
    color: var(--color-fg);
  }
  .tick-time {
    font-size: 0.6875rem;
    color: var(--color-muted);
  }
  .tick.tick-start {
    transform: translateX(0);
    align-items: flex-start;
  }
  .tick.tick-end {
    transform: translateX(-100%);
    align-items: flex-end;
  }

  .paces {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .pace-row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.75rem;
    border: 1px solid #2a2f3a;
    border-radius: 0.5rem;
    background: #11151c;
  }
  .pace-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .pace-label strong {
    color: var(--color-fg);
    font-weight: 600;
  }
  .pace-range {
    color: var(--color-muted);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }
  .pace-input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .pace-input-row input {
    flex: 1;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #2a2f3a;
    border-radius: 0.5rem;
    background: #161a22;
    color: var(--color-fg);
    font: inherit;
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
  }
  .pace-input-row input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .pace-input-row input.invalid {
    border-color: #d97757;
  }
  .pace-input-row .unit {
    color: var(--color-muted);
    font-size: 0.875rem;
    min-width: 4.5rem;
  }
</style>
